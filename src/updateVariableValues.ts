import { CompanionVariableValues } from '@companion-module/base'
import { ActionId } from './actions.js'
import { CedarDNS8DInstance } from './main.js'
import { parseBooleanFromString } from './utils.js'
import { XMLParser } from 'fast-xml-parser'
const parser = new XMLParser({ allowBooleanAttributes: true, ignoreAttributes: false })

export function SetVarValues(message: string, self: CedarDNS8DInstance): void {
	const data = parser.parse(message)
	console.log(data)
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
	let varList: CompanionVariableValues = {
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
		chan.active1 = Number(data?.dns8d?.chan[i - 1]?.activ?.split(' ')[0] ?? chan.active1)
		chan.active2 = Number(data?.dns8d?.chan[i - 1]?.activ?.split(' ')[1] ?? chan.active2)
		chan.power1 = Number(data?.dns8d?.chan[i - 1]?.power?.split(' ')[0] ?? chan.power1)
		chan.power2 = Number(data?.dns8d?.chan[i - 1]?.power?.split(' ')[1] ?? chan.power2)
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
	const group = self.dns8d.selectedGroupProps
	const number = Number(data?.dns8d?.group?.[`@_idx`] ?? 0) + 1
	group.active1 = Number(data?.dns8d?.group?.activ?.split(' ')[0] ?? group.active1)
	group.active2 = Number(data?.dns8d?.group?.activ?.split(' ')[0] ?? group.active2)
	group.name = data?.dns8d?.group?.name?.toString() ?? group.name
	group.bias = Number(data?.dns8d?.group?.bias?.[`@_dB`] ?? group.bias)
	group.atten = Number(data?.dns8d?.group?.atten?.[`@_dB`] ?? group.atten)
	group.learn = parseBooleanFromString(data?.dns8d?.group?.dns?.[`@_learn`] ?? '', group.learn)
	group.on = parseBooleanFromString(data?.dns8d?.group?.dns?.[`@_on`] ?? '', group.on)
	group.dsp = parseBooleanFromString(data?.dns8d?.group?.dns?.[`@_dsp`] ?? '', group.dsp)
	varList = {
		...varList,
		[`selectedGroup_Active1`]: group.active1,
		[`selectedGroup_Active2`]: group.active2,
		[`selectedGroup_Power1`]: group.power1,
		[`selectedGroup_Power2`]: group.power2,
		[`selectedGroup_Name`]: group.name,
		[`selectedGroup_Number`]: number,
		[`selectedGroup_Bias`]: group.bias,
		[`selectedGroup_Attenuation`]: group.atten,
		[`selectedGroup_Learn`]: group.learn,
		[`selectedGroup_DSP`]: group.dsp,
		[`selectedGroup_On`]: group.on,
	}
	for (let i = 1; i <= 6; i++) {
		const band = self.getBand(i)
		band.active1 = Number(data?.dns8d?.group?.band[i - 1]?.activ?.split(' ')[0] ?? band.active1)
		band.active2 = Number(data?.dns8d?.group?.band[i - 1]?.activ?.split(' ')[1] ?? band.active2)
		band.power1 = Number(data?.dns8d?.group?.band[i - 1]?.power?.split(' ')[0] ?? band.power1)
		band.power2 = Number(data?.dns8d?.group?.band[i - 1]?.power?.split(' ')[1] ?? band.power2)
		band.bias = Number(data?.dns8d?.group?.band[i - 1]?.bias?.[`@_dB`] ?? band.bias)
		band.atten = Number(data?.dns8d?.group?.band[i - 1]?.atten?.[`@_dB`] ?? band.atten)
		varList = {
			...varList,
			[`band${i}_Active1`]: band.active1,
			[`band${i}_Active2`]: band.active2,
			[`band${i}_Power1`]: band.power1,
			[`band${i}_Power2`]: band.power2,
			[`band${i}_Bias`]: band.bias,
			[`band${i}_Attenuation`]: band.atten,
		}
	}
	self.setVariableValues(varList)
	if (updateActionsFeedbacks) {
		self.updateActions() // export actions
		self.updateFeedbacks() // export feedbacks
	}
	self.checkFeedbacks()
}
