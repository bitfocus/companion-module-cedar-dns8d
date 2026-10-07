import { InstanceBase, InstanceStatus, type SomeCompanionConfigField } from '@companion-module/base'
import { GetConfigFields, type ModuleConfig } from './config.js'
import { UpdateVariableDefinitions, type VariablesSchema } from './variables.js'
import { SetVarValues } from './updateVariableValues.js'
import { UpgradeScripts } from './upgrades.js'
import { ActionId, UpdateActions, type ActionSchema } from './actions.js'
import { AddToActionRecording } from './actionRecorder.js'
import { BuildMessage, ParameterType } from './message.js'
import { UpdateFeedbacks, type FeedbackSchema } from './feedbacks.js'
import { UpdatePresets } from './presets.js'
import { UpdateCompositeElements, type CompositeElementSchema } from './composites.js'
import PQueue from 'p-queue'

const reconnectInterval = 10000

/**
 * The device answers every message, so a quiet socket means it has gone: a power cut or pulled cable leaves the
 * connection open until TCP gives up, which can take minutes. Allow five poll intervals, but never under a second, as
 * each false alarm costs a reconnect and reconnectInterval offline.
 */
export const WATCHDOG_POLL_INTERVALS = 5
export const WATCHDOG_MIN_MS = 1000

export interface BandDetail {
	active1: number
	active2: number
	power1: number
	power2: number
	atten: number
	bias: number
}

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
	selectedGroupProps: DNS8Channel
	groupDetailView: BandDetail[]
}

export interface MessageOptions {
	group?: number
	band?: number
	priority?: number
	/** An action's context.signal, so a queued message the user no longer wants is dropped before it is sent */
	signal?: AbortSignal
}

export type ModuleTypes = {
	config: ModuleConfig
	secrets: undefined
	actions: ActionSchema
	feedbacks: FeedbackSchema
	variables: VariablesSchema
	compositeElements: CompositeElementSchema
}

export { UpgradeScripts }

export default class CedarDNS8DInstance extends InstanceBase<ModuleTypes> {
	config!: ModuleConfig // Setup in init()
	private socket: WebSocket | undefined = undefined
	/**
	 * Aborted when the current socket is torn down. Its listeners are registered against it, so a replaced socket's own
	 * error and close events can't reach the instance, and its queued messages are dropped with their promises rejected.
	 */
	private connection = new AbortController()
	private queue = new PQueue({ concurrency: 1, interval: 40, intervalCap: 1 })
	private pollTimer: NodeJS.Timeout | undefined = undefined
	private reconnectTimer: NodeJS.Timeout | undefined = undefined
	private watchdogTimer: NodeJS.Timeout | undefined = undefined
	private messageErrorLogged = false
	/** Set by the first failure of an outage, cleared by the next successful connection */
	private outageLogged = false
	public isRecordingActions: boolean = false
	public dns8d: dns8d = {
		globalOn: false,
		globalLearn: false,
		fallbackMode: false,
		swVersion: 0,
		dspVersion: 0,
		channels: [],
		selectedGroup: 1,
		selectedGroupProps: {
			active1: 0,
			active2: 0,
			power1: -100,
			power2: -100,
			name: '',
			bias: 0,
			atten: 0,
			learn: false,
			on: false,
			dsp: false,
		},
		groupDetailView: [],
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
				power1: -100,
				power2: -100,
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

	public getBand(id: number): BandDetail {
		const bandId = Math.floor(id)
		if (this.dns8d.groupDetailView[bandId] === undefined) {
			this.dns8d.groupDetailView[bandId] = {
				active1: 0,
				active2: 0,
				power1: -100,
				power2: -100,
				bias: 0,
				atten: 0,
			}
		}
		return this.dns8d.groupDetailView[bandId]
	}

	public async buildMessage(
		channel: number,
		parameter: ParameterType,
		value: string | number,
		{ group = this.dns8d.selectedGroup, band = 1, priority = 1, signal }: MessageOptions = {},
	): Promise<void> {
		await this.sendMessage(
			BuildMessage(Math.floor(channel), parameter, value, Math.floor(group), Math.floor(band)),
			priority,
			signal,
		)
	}

	public async sendMessage(message: string, priority = 1, signal?: AbortSignal): Promise<void> {
		await this.queue.add(
			() => {
				if (this.socket?.readyState === WebSocket.OPEN) {
					this.socket.send(message)
				} else {
					this.log('warn', `Socket not open, message not sent.`)
				}
			},
			{ priority: priority, signal: this.combineSignal(signal) },
		)
	}

	/** A message dies with its connection, or when the caller (an action's context.signal) no longer wants it */
	private combineSignal(signal?: AbortSignal): AbortSignal {
		return signal ? AbortSignal.any([this.connection.signal, signal]) : this.connection.signal
	}

	startPolling(interval = this.config.interval): void {
		if (this.pollTimer !== undefined) {
			clearTimeout(this.pollTimer)
		}
		if (this.queue.size === 0) {
			// only add a poll query if there isn't already a message in the queue
			this.buildMessage(0, ParameterType.None, 0, { priority: 0 }).catch(() => {})
		}
		this.pollTimer = setTimeout(() => this.startPolling(), interval)
	}

	stopPolling(): void {
		if (this.pollTimer !== undefined) {
			clearTimeout(this.pollTimer)
			delete this.pollTimer
		}
	}

	/**
	 * Tears down the current socket and everything running for it. The listeners go first, so the socket's own error
	 * and close events, which close() can fire synchronously while it is still connecting, don't act on the instance.
	 */
	disconnect(): void {
		this.connection.abort(new Error('Connection reset before the message was sent'))
		this.connection = new AbortController()
		this.stopPolling()
		this.stopWatchdog()
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer)
			delete this.reconnectTimer
		}
		if (this.socket?.readyState === WebSocket.OPEN || this.socket?.readyState === WebSocket.CONNECTING) {
			this.socket.close(1000, 'Resetting connection')
		}
		this.socket = undefined
	}

	/** The one place a reconnect is scheduled, so there is never more than one pending */
	private scheduleReconnect(): void {
		if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
		this.reconnectTimer = setTimeout(() => {
			delete this.reconnectTimer
			this.newSocket()
		}, reconnectInterval)
	}

	private get watchdogTimeout(): number {
		return Math.max(this.config.interval * WATCHDOG_POLL_INTERVALS, WATCHDOG_MIN_MS)
	}

	private resetWatchdog(): void {
		this.stopWatchdog()
		this.watchdogTimer = setTimeout(() => {
			this.reportFailure('No response', `No message from the device for ${this.watchdogTimeout} ms, reconnecting`)
			this.disconnect()
			this.scheduleReconnect()
		}, this.watchdogTimeout)
	}

	private stopWatchdog(): void {
		if (this.watchdogTimer !== undefined) {
			clearTimeout(this.watchdogTimer)
			delete this.watchdogTimer
		}
	}

	/**
	 * Sets the status on every failure, but logs only the first of an outage: while the device is off, each reconnect
	 * attempt fails the same way.
	 */
	private reportFailure(status: string, logMessage: string): void {
		this.updateStatus(InstanceStatus.ConnectionFailure, status)
		if (!this.outageLogged) {
			this.log('warn', logMessage)
			this.outageLogged = true
		}
	}

	newSocket(host = this.config.host, port = this.config.port): void {
		this.disconnect()
		this.updateStatus(InstanceStatus.Connecting)
		const url = `ws://${host}:${Math.floor(port)}/info.ws`
		let socket: WebSocket
		try {
			socket = new WebSocket(url)
		} catch (err) {
			// An address that can't make a URL. Thrown from a reconnect timer, this would end the process
			this.updateStatus(InstanceStatus.BadConfig, err instanceof Error ? err.message : String(err))
			return
		}
		this.socket = socket
		const { signal } = this.connection
		let opened = false
		socket.addEventListener(
			'open',
			() => {
				opened = true
				this.outageLogged = false
				this.updateStatus(InstanceStatus.Ok)
				this.log('info', `Connected to ${url}`)
				this.startPolling()
				this.resetWatchdog()
			},
			{ signal },
		)
		socket.addEventListener(
			'message',
			(event) => {
				//this.log('debug', `Message from server:\n${JSON.stringify(data)}`)
				this.resetWatchdog()
				this.setVarValues(event.data)
			},
			{ signal },
		)
		// No error listener: a failure always fires close after error, and Node's error event says nothing about why. Its
		// message is empty whether the connection was refused, the host unknown or the upgrade rejected.
		socket.addEventListener(
			'close',
			(event) => {
				if (opened) {
					const reason = event.reason ? `: ${event.reason}` : ''
					this.reportFailure('Connection lost', `Lost connection to ${url} (close code ${event.code}${reason})`)
				} else {
					this.reportFailure('Could not connect', `Could not connect to ${url}`)
				}
				this.disconnect()
				this.scheduleReconnect()
			},
			{ signal },
		)
	}

	async init(config: ModuleConfig): Promise<void> {
		this.updateStatus(InstanceStatus.Connecting)
		this.updateActions() // export actions
		this.updateFeedbacks() // export feedbacks
		this.updateVariableDefinitions() // export variable definitions
		this.updateCompositeElements() // before presets, which place them
		this.updatePresets()
		await this.configUpdated(config)
	}
	// When module gets deleted
	async destroy(): Promise<void> {
		this.log('debug', `destroy ${this.id}`)
		this.disconnect()
	}

	async configUpdated(config: ModuleConfig): Promise<void> {
		this.config = config
		// Before deciding anything: without a host, the old socket and any pending reconnect must not carry on
		this.disconnect()
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

	updateCompositeElements(): void {
		UpdateCompositeElements(this)
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
		try {
			SetVarValues(message, this)
			this.messageErrorLogged = false
		} catch (err) {
			// This runs in the socket's message listener, where a throw would end the connection's process. Log only the
			// first of a run: the device answers every poll, so a message it keeps sending would otherwise flood the log
			if (!this.messageErrorLogged) {
				this.log('warn', `Could not read message from device: ${err instanceof Error ? err.message : String(err)}`)
				this.messageErrorLogged = true
			}
		}
	}
}
