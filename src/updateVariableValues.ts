import { ActionId } from './actions.js'
import { CedarDNS8DInstance } from './main.js'
import { parseBooleanFromString } from './utils.js'
import { XMLParser } from 'fast-xml-parser'
const parser = new XMLParser({ allowBooleanAttributes: true, ignoreAttributes: false })

export function SetVarValues(message: string, self: CedarDNS8DInstance): void {
	const data = parser.parse(message)
	let updateActionsFeedbacks = false
	const globalOn = parseBooleanFromString(data?.dns8d?.global[`@_on`] ?? '', self.dns8d.globalOn)
	const globalLearn = parseBooleanFromString(data?.dns8d?.global[`@_learn`] ?? '', self.dns8d.globalLearn)
	self.dns8d.fallbackMode = parseBooleanFromString(data?.dns8d?.global[`@_fallbackmode`] ?? '', self.dns8d.fallbackMode)
	if (self.dns8d.globalOn !== globalOn) {
		self.dns8d.globalOn = globalOn
		self.addToActionRecording(ActionId.globalOn, globalOn, 0)
	}
	if (self.dns8d.globalLearn !== globalLearn) {
		self.dns8d.globalLearn = globalLearn
		self.addToActionRecording(ActionId.globalLearn, globalLearn, 0)
	}
	self.dns8d.swVersion = Number(data?.dns8d?.global[`@_swVersion`] ?? self.dns8d.swVersion)
	self.dns8d.dspVersion = Number(data?.dns8d?.global[`@_dspVersion`] ?? self.dns8d.dspVersion)
	let varList = {
		global_On: self.dns8d.globalOn,
		global_Learn: self.dns8d.globalLearn,
		global_FallbackMode: self.dns8d.fallbackMode,
		global_swVersion: self.dns8d.swVersion,
		global_dspVersion: self.dns8d.dspVersion,
	}
	for (let i = 1; i <= 8; i++) {
		const chan = self.getChannel(i)
		const name = data?.dns8d?.chan[i - 1]?.name?.toString() ?? chan.name
		const bias = Number(data?.dns8d?.chan[i - 1]?.bias?.[`@_dB`] ?? chan.bias)
		const atten = Number(data?.dns8d?.chan[i - 1]?.atten?.[`@_dB`] ?? chan.atten)
		const learn = parseBooleanFromString(data?.dns8d?.chan[i - 1]?.dns?.[`@_learn`] ?? '', chan.learn)
		const on = parseBooleanFromString(data?.dns8d?.chan[i - 1]?.dns?.[`@_on`] ?? '', chan.on)
		chan.active1 = Number(data?.dns8d?.chan[i - 1]?.activ.split(' ')[0] ?? chan.active1)
		chan.active2 = Number(data?.dns8d?.chan[i - 1]?.activ.split(' ')[1] ?? chan.active2)
		chan.power1 = Number(data?.dns8d?.chan[i - 1]?.power.split(' ')[0] ?? chan.power1)
		chan.power2 = Number(data?.dns8d?.chan[i - 1]?.power.split(' ')[1] ?? chan.power2)
		chan.dsp = parseBooleanFromString(data?.dns8d?.chan[i - 1]?.dns?.[`@_dsp`] ?? '', chan.dsp)
		if (chan.name !== name) {
			chan.name = name
			updateActionsFeedbacks = true
			self.addToActionRecording(ActionId.channelName, name, i)
		}
		if (chan.bias !== bias) {
			chan.bias = bias
			self.addToActionRecording(ActionId.channelBias, bias, i)
		}
		if (chan.atten !== atten) {
			chan.atten = atten
			self.addToActionRecording(ActionId.channelAtten, atten, i)
		}
		if (chan.learn !== learn) {
			chan.learn = learn
			self.addToActionRecording(ActionId.channelLearn, learn, i)
		}
		if (chan.on !== on) {
			chan.on = on
			self.addToActionRecording(ActionId.channelOn, on, i)
		}
		varList = {
			...varList,
			[`channel${i}_Active1`]: chan.active1,
			[`channel${i}_Active2`]: chan.active2,
			[`channel${i}_Power1`]: chan.power1,
			[`channel${i}_Power2`]: chan.power2,
			[`channel${i}_Name`]: chan.name,
			[`channel${i}_Bias`]: chan.bias,
			[`channel${i}_Attenuation`]: chan.atten,
			[`channel${i}_Learn`]: chan.learn,
			[`channel${i}_DSP`]: chan.dsp,
			[`channel${i}_On`]: chan.on,
		}
	}
	self.setVariableValues(varList)
	if (updateActionsFeedbacks) {
		self.updateActions() // export actions
		self.updateFeedbacks() // export feedbacks
	}
	self.checkFeedbacks()
}
