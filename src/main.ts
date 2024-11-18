import { InstanceBase, runEntrypoint, InstanceStatus, SomeCompanionConfigField } from '@companion-module/base'
import { GetConfigFields, type ModuleConfig } from './config.js'
import { UpdateVariableDefinitions } from './variables.js'
import { UpgradeScripts } from './upgrades.js'
import { ActionId, UpdateActions } from './actions.js'
import { UpdateFeedbacks } from './feedbacks.js'
import { UpdatePresets } from './presets.js'
import { XMLParser } from 'fast-xml-parser'
import PQueue from 'p-queue'

const reconnectInterval = 10000
const pollMessage = `<dns8><chan idx="0"><name/><bias/><atten/><dns/></chan><chan idx="1"><name/><bias/><atten/><dns/></chan><chan idx="2"><name/><bias/><atten/><dns/></chan><chan idx="3"><name/><bias/><atten/><dns/></chan><chan idx="4"><name/><bias/><atten/><dns/></chan><chan idx="5"><name/><bias/><atten/><dns/></chan><chan idx="6"><name/><bias/><atten/><dns/></chan><chan idx="7"><name/><bias/><atten/><dns/></chan><group idx="0"><name/><bias/><atten/><band idx="0"><bias/><atten/></band><band idx="1"><bias/><atten/></band><band idx="2"><bias/><atten/></band><band idx="3"><bias/><atten/></band><band idx="4"><bias/><atten/></band><band idx="5"><bias/><atten/></band></group><global/></dns8>`
const parserOptions = {
	allowBooleanAttributes: true,
	ignoreAttributes: false,
}
const queue = new PQueue({ concurrency: 1, interval: 5, intervalCap: 1 })
const parser = new XMLParser(parserOptions)
export interface DNS8Channel {
	active1: number
	active2: number
	power1: number
	power2: number
	name: string
	bias: number
	atten: number
	learn: boolean
	dsp: boolean
	on: boolean
}

export interface dns8d {
	globalOn: boolean
	globalLearn: boolean
	fallbackMode: boolean
	swVersion: number
	dspVersion: number
	channels: DNS8Channel[]
}

export class CedarDNS8DInstance extends InstanceBase<ModuleConfig> {
	config!: ModuleConfig // Setup in init()
	private socket!: WebSocket
	private pollTimer: NodeJS.Timeout | undefined = undefined
	private reconnectTimer: NodeJS.Timeout | undefined = undefined
	private isRecordingActions: boolean = false
	public dns8d: dns8d = {
		globalOn: false,
		globalLearn: false,
		fallbackMode: false,
		swVersion: 0,
		dspVersion: 0,
		channels: [],
	}
	constructor(internal: unknown) {
		super(internal)
	}

	public getChannel(id: number): DNS8Channel {
		const chanId = Math.floor(id)
		if (this.dns8d.channels[chanId] === undefined) {
			this.dns8d.channels[chanId] = {
				active1: 0,
				active2: 0,
				power1: 0,
				power2: 0,
				name: `Ch ${id}`,
				bias: 0,
				atten: 0,
				learn: false,
				dsp: false,
				on: false,
			}
		}
		return this.dns8d.channels[chanId]
	}

	public buildMessage(
		channel: number,
		parameter: 'learn' | 'on' | 'bias' | 'atten' | 'name',
		value: string | number,
	): void {
		if (channel < 0 || channel > 8) return
		if (channel === 0 && !(parameter === 'learn' || parameter === 'on')) return
		if (parameter === 'bias' && (isNaN(Number(value)) || Number(value) > 10 || Number(value) < -10)) return
		if (parameter === 'atten' && (isNaN(Number(value)) || Number(value) > 0 || Number(value) < -20)) return
		if ((parameter === 'learn' || parameter === 'on') && !(value === '1' || value === '0')) return
		const safeValue = value.toString().substring(0, 17)
		let message = '<dns8>'
		for (let i = 1; i <= 8; i++) {
			if (i === channel) {
				message += `<chan idx="${i - 1}">`
				message += parameter === 'name' ? `<name>${safeValue}</name>` : `<name/>`
				message += parameter === 'bias' ? `<bias dB="${safeValue}"/>` : `<bias/>`
				message += parameter === 'atten' ? `<atten dB="${safeValue}"/>` : `<atten/>`
				if (parameter === 'learn') {
					message += `<dns learn="${safeValue}"/>`
				} else if (parameter === 'on') {
					message += `<dns on="${safeValue}"/>`
				} else {
					message += `<dns/>`
				}
				message += `</chan>`
			} else {
				message += `<chan idx="${i - 1}"><name/><bias/><atten/><dns/></chan>`
			}
		}
		message +=
			'<group idx="0"><name/><bias/><atten/><band idx="0"><bias/><atten/></band><band idx="1"><bias/><atten/></band><band idx="2"><bias/><atten/></band><band idx="3"><bias/><atten/></band><band idx="4"><bias/><atten/></band><band idx="5"><bias/><atten/></band></group>'
		if (channel === 0) {
			if (parameter === 'learn') {
				message += `<global learn="${safeValue}"/>`
			} else if (parameter === 'on') {
				message += `<global on="${safeValue}"/>`
			} else {
				message += `<global/>`
			}
		} else {
			message += `<global/>`
		}
		message += '</dns8>'
		//console.log(message)
		this.sendMessage(message).catch(() => {})
	}

	public async sendMessage(message: string, priority = 1): Promise<void> {
		await queue.add(
			() => {
				if (this.socket?.readyState === WebSocket.OPEN) {
					this.socket.send(message)
				} else {
					this.log('warn', `Socket not open. Tried to send:\n${message}`)
				}
			},
			{ priority: priority },
		)
	}

	startPolling(interval: number): void {
		if (this.pollTimer !== undefined) {
			clearTimeout(this.pollTimer)
		}
		if (queue.sizeBy({ priority: 0 }) === 0) {
			// only add a poll query if there isn't already one in the queue
			this.sendMessage(pollMessage, 0).catch(() => {})
		}
		this.pollTimer = setTimeout(() => this.startPolling(interval), interval)
	}

	stopPolling(): void {
		if (this.pollTimer !== undefined) {
			clearTimeout(this.pollTimer)
			delete this.pollTimer
		}
	}

	newSocket(host: string, port: number = 80, interval: number = 40): void {
		if (this.socket?.readyState === WebSocket.OPEN || this.socket?.readyState === WebSocket.CONNECTING) {
			this.socket.close(1000, 'Resetting connection')
		}
		queue.clear()
		this.socket = new WebSocket(`ws://${host}:${Math.floor(port)}/info.ws`)
		this.socket.addEventListener('open', () => {
			this.updateStatus(InstanceStatus.Ok)
			this.log('info', `Connected to ws://${host}:${Math.floor(port)}/`)
			this.startPolling(interval)
			if (this.reconnectTimer) {
				clearTimeout(this.reconnectTimer)
				delete this.reconnectTimer
			}
		})
		this.socket.addEventListener('message', (event) => {
			//this.log('debug', `Message from server:\n${JSON.stringify(data)}`)
			this.setVarValues(event.data)
		})
		this.socket.addEventListener('error', (error) => {
			this.log('error', `Error from socket  ${error.message}`)
			this.updateStatus(InstanceStatus.UnknownError)
		})
		this.socket.addEventListener('close', (event) => {
			this.log('warn', `Socket Closed ${event.code} ${event.reason}`)
			this.updateStatus(InstanceStatus.ConnectionFailure)
			this.stopPolling()
			queue.clear()
			this.reconnectTimer = setTimeout(() => this.newSocket(host, port, interval), reconnectInterval)
		})
	}

	async init(config: ModuleConfig): Promise<void> {
		for (let i = 1; i <= 8; i++) {
			this.getChannel(i)
		}
		this.updateStatus(InstanceStatus.Connecting)
		this.updateActions() // export actions
		this.updateFeedbacks() // export feedbacks
		this.updateVariableDefinitions() // export variable definitions
		this.updatePresets()
		await this.configUpdated(config)
	}
	// When module gets deleted
	async destroy(): Promise<void> {
		this.log('debug', `destroy ${this.id}`)
		this.stopPolling()
		if (this.socket?.readyState === WebSocket.OPEN || this.socket?.readyState === WebSocket.CONNECTING) {
			this.socket.close(1000)
		}
	}

	async configUpdated(config: ModuleConfig): Promise<void> {
		this.stopPolling()
		this.config = config
		if (config.host) {
			this.newSocket(config.host, config.port, config.interval)
		} else {
			this.updateStatus(InstanceStatus.BadConfig)
		}
	}

	// Return config fields for web config
	getConfigFields(): SomeCompanionConfigField[] {
		return GetConfigFields()
	}

	updateActions(): void {
		UpdateActions(this)
	}

	updateFeedbacks(): void {
		UpdateFeedbacks(this)
	}

	updatePresets(): void {
		UpdatePresets(this)
	}

	updateVariableDefinitions(): void {
		UpdateVariableDefinitions(this)
	}

	public handleStartStopRecordActions(isRecording: boolean): void {
		this.isRecordingActions = isRecording
	}

	addToActionRecording(action: ActionId, value: string, channel: number = 0): void {
		if (this.isRecordingActions) {
			this.recordAction(
				{
					actionId: action,
					options: {
						channel: channel.toString(),
						value: value.toString(),
						relative: false,
					},
				},
				`${action} ${channel}`,
			)
		}
	}

	setVarValues(message: string): void {
		const data = parser.parse(message)
		let updateActionsFeedbacks = false
		const globalOn =
			data?.dns8d?.global[`@_on`] == '1' ? true : data?.dns8d?.global[`@_on`] == '0' ? false : this.dns8d.globalOn
		const globalLearn =
			data?.dns8d?.global[`@_learn`] == '1'
				? true
				: data?.dns8d?.global[`@_learn`] == '0'
					? false
					: this.dns8d.globalLearn
		if (this.dns8d.globalOn !== globalOn) {
			this.dns8d.globalOn = globalOn
			this.addToActionRecording(ActionId.globalOn, globalOn ? '1' : '0', 0)
		}
		if (this.dns8d.globalLearn !== globalLearn) {
			this.dns8d.globalLearn = globalLearn
			this.addToActionRecording(ActionId.globalLearn, globalLearn ? '1' : '0', 0)
		}
		this.dns8d.fallbackMode =
			data?.dns8d?.global[`@_fallbackmode`] == '1'
				? true
				: data?.dns8d?.global[`@_fallbackmode`] == '0'
					? false
					: this.dns8d.fallbackMode
		this.dns8d.swVersion = Number(data?.dns8d?.global[`@_swVersion`] ?? this.dns8d.swVersion)
		this.dns8d.dspVersion = Number(data?.dns8d?.global[`@_dspVersion`] ?? this.dns8d.dspVersion)
		let varList = {
			global_On: this.dns8d.globalOn,
			global_Learn: this.dns8d.globalLearn,
			global_FallbackMode: this.dns8d.fallbackMode,
			global_swVersion: this.dns8d.swVersion,
			global_dspVersion: this.dns8d.dspVersion,
		}
		for (let i = 1; i <= 8; i++) {
			const chan = this.getChannel(i)
			const name = data?.dns8d?.chan[i - 1]?.name?.toString() ?? chan.name
			const bias = Number(data?.dns8d?.chan[i - 1]?.bias?.[`@_dB`] ?? chan.bias)
			const atten = Number(data?.dns8d?.chan[i - 1]?.atten?.[`@_dB`] ?? chan.atten)
			const learn = data?.dns8d?.chan[i - 1]?.dns?.[`@_learn`] == '1' ? true : false
			const on = data?.dns8d?.chan[i - 1]?.dns?.[`@_on`] == '1' ? true : false
			chan.active1 = Number(data?.dns8d?.chan[i - 1]?.activ.split(' ')[0] ?? chan.active1)
			chan.active2 = Number(data?.dns8d?.chan[i - 1]?.activ.split(' ')[1] ?? chan.active2)
			chan.power1 = Number(data?.dns8d?.chan[i - 1]?.power.split(' ')[0] ?? chan.power1)
			chan.power2 = Number(data?.dns8d?.chan[i - 1]?.power.split(' ')[1] ?? chan.power2)
			chan.dsp = data?.dns8d?.chan[i - 1]?.dns?.[`@_dsp`] == '1' ? true : false
			if (chan.name !== name) {
				chan.name = name
				updateActionsFeedbacks = true //update to reflect name change
				this.addToActionRecording(ActionId.channelName, name, i)
			}
			if (chan.bias !== bias) {
				chan.bias = bias
				this.addToActionRecording(ActionId.channelBias, bias.toString(), i)
			}
			if (chan.atten !== atten) {
				chan.atten = atten
				this.addToActionRecording(ActionId.channelAtten, atten.toString(), i)
			}
			if (chan.learn !== learn) {
				chan.learn = learn
				this.addToActionRecording(ActionId.channelLearn, learn ? '1' : '0', i)
			}
			if (chan.on !== on) {
				chan.on = on
				this.addToActionRecording(ActionId.channelOn, on ? '1' : '0', i)
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
		this.setVariableValues(varList)
		if (updateActionsFeedbacks) {
			this.updateActions() // export actions
			this.updateFeedbacks() // export feedbacks
		}
		this.checkFeedbacks()
	}
}

runEntrypoint(CedarDNS8DInstance, UpgradeScripts)
