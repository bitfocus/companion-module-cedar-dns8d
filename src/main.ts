import { InstanceBase, runEntrypoint, InstanceStatus, SomeCompanionConfigField } from '@companion-module/base'
import { GetConfigFields, type ModuleConfig } from './config.js'
import { UpdateVariableDefinitions } from './variables.js'
import { SetVarValues } from './updateVariableValues.js'
import { UpgradeScripts } from './upgrades.js'
import { ActionId, UpdateActions } from './actions.js'
import { AddToActionRecording } from './actionRecorder.js'
import { BuildMessage, ParameterType } from './message.js'
import { UpdateFeedbacks } from './feedbacks.js'
import { UpdatePresets } from './presets.js'
import PQueue from 'p-queue'

const reconnectInterval = 10000

const queue = new PQueue({ concurrency: 1, interval: 5, intervalCap: 1 })
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
	selectedGroup: number
}

export class CedarDNS8DInstance extends InstanceBase<ModuleConfig> {
	config!: ModuleConfig // Setup in init()
	private socket!: WebSocket
	private pollTimer: NodeJS.Timeout | undefined = undefined
	private reconnectTimer: NodeJS.Timeout | undefined = undefined
	public isRecordingActions: boolean = false
	public dns8d: dns8d = {
		globalOn: false,
		globalLearn: false,
		fallbackMode: false,
		swVersion: 0,
		dspVersion: 0,
		channels: [],
		selectedGroup: 1,
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
				name: `Ch ${chanId}`,
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
		parameter: ParameterType,
		value: string | number,
		group = this.dns8d.selectedGroup,
		band = 1,
		priority = 1,
	): void {
		this.sendMessage(BuildMessage(channel, parameter, value, group, band), priority).catch(() => {})
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

	startPolling(interval = this.config.interval): void {
		if (this.pollTimer !== undefined) {
			clearTimeout(this.pollTimer)
		}
		if (queue.size === 0) {
			// only add a poll query if there isn't already a message in the queue
			this.buildMessage(0, ParameterType.None, 0, this.dns8d.selectedGroup, 1, 0)
			//this.sendMessage(pollMessage, 0).catch(() => {})
		}
		this.pollTimer = setTimeout(() => this.startPolling(), interval)
	}

	stopPolling(): void {
		if (this.pollTimer !== undefined) {
			clearTimeout(this.pollTimer)
			delete this.pollTimer
		}
	}

	newSocket(host = this.config.host, port = this.config.port): void {
		if (this.socket?.readyState === WebSocket.OPEN || this.socket?.readyState === WebSocket.CONNECTING) {
			this.socket.close(1000, 'Resetting connection')
		}
		queue.clear()
		this.socket = new WebSocket(`ws://${host}:${Math.floor(port)}/info.ws`)
		this.socket.addEventListener('open', () => {
			this.updateStatus(InstanceStatus.Ok)
			this.log('info', `Connected to ws://${host}:${Math.floor(port)}/`)
			this.startPolling()
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
			this.reconnectTimer = setTimeout(() => this.newSocket(), reconnectInterval)
		})
	}

	async init(config: ModuleConfig): Promise<void> {
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
			this.newSocket()
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

	addToActionRecording(action: ActionId, value: string | number | boolean, channel: number = 0): void {
		AddToActionRecording(action, value, channel, this)
	}

	setVarValues(message: string): void {
		SetVarValues(message, this)
	}
}

runEntrypoint(CedarDNS8DInstance, UpgradeScripts)
