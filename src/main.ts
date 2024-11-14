import { InstanceBase, runEntrypoint, InstanceStatus, SomeCompanionConfigField } from '@companion-module/base'
import { GetConfigFields, type ModuleConfig } from './config.js'
import { UpdateVariableDefinitions } from './variables.js'
import { UpgradeScripts } from './upgrades.js'
import { UpdateActions } from './actions.js'
import { UpdateFeedbacks } from './feedbacks.js'

const pollInterval = 40
const pollMessage = `<dns8><chan idx="0"><name/><bias/><atten/><dns/></chan><chan idx="1"><name/><bias/><atten/><dns/></chan><chan idx="2"><name/><bias/><atten/><dns/></chan><chan idx="3"><name/><bias/><atten/><dns/></chan><chan idx="4"><name/><bias/><atten/><dns/></chan><chan idx="5"><name/><bias/><atten/><dns/></chan><chan idx="6"><name/><bias/><atten/><dns/></chan><chan idx="7"><name/><bias/><atten/><dns/></chan><group idx="0"><name/><bias/><atten/><band idx="0"><bias/><atten/></band><band idx="1"><bias/><atten/></band><band idx="2"><bias/><atten/></band><band idx="3"><bias/><atten/></band><band idx="4"><bias/><atten/></band><band idx="5"><bias/><atten/></band></group><global/></dns8>`

export class CedarDNS8DInstance extends InstanceBase<ModuleConfig> {
	config!: ModuleConfig // Setup in init()
	private socket!: WebSocket
	private pollTimer!: NodeJS.Timeout | undefined

	constructor(internal: unknown) {
		super(internal)
	}

	startPolling(interval: number): void {
		if (this.pollTimer !== undefined) {
			clearTimeout(this.pollTimer)
		}
		this.socket.send(pollMessage)
		this.pollTimer = setTimeout(() => this.startPolling(interval), interval)
	}

	stopPolling(): void {
		if (this.pollTimer !== undefined) {
			clearTimeout(this.pollTimer)
			delete this.pollTimer
		}
	}

	newSocket(host: string, port: number): void {
		if (this.socket) {
			this.socket.close()
		}
		this.socket = new WebSocket(`ws://${host}:${Math.floor(port)}/info.ws`)
		this.socket.addEventListener('open', () => {
			this.updateStatus(InstanceStatus.Ok)
			this.log('info', `Connected to ws://${host}:${Math.floor(port)}/`)
			this.startPolling(pollInterval)
		})
		this.socket.addEventListener('message', (event) => {
			this.log('debug', `Message from server  ${event.data}`)
		})
		this.socket.addEventListener('error', (error) => {
			this.log('error', `Error from socket  ${error.message}`)
			this.updateStatus(InstanceStatus.UnknownError)
		})
		this.socket.addEventListener('close', (event) => {
			this.log('warn', `Socket Closed ${event.reason}`)
			this.updateStatus(InstanceStatus.ConnectionFailure)
			this.stopPolling()
		})
	}

	async init(config: ModuleConfig): Promise<void> {
		this.config = config

		this.updateStatus(InstanceStatus.Connecting)
		this.updateActions() // export actions
		this.updateFeedbacks() // export feedbacks
		this.updateVariableDefinitions() // export variable definitions
		if (config.host) {
			this.newSocket(config.host, config.port)
		} else {
			this.updateStatus(InstanceStatus.BadConfig)
		}
	}
	// When module gets deleted
	async destroy(): Promise<void> {
		this.log('debug', `destroy ${this.id}`)
		this.stopPolling()
		if (this.socket) {
			this.socket.close()
		}
	}

	async configUpdated(config: ModuleConfig): Promise<void> {
		this.stopPolling()
		this.config = config
		if (config.host) {
			this.newSocket(config.host, config.port)
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

	updateVariableDefinitions(): void {
		UpdateVariableDefinitions(this)
	}
}

runEntrypoint(CedarDNS8DInstance, UpgradeScripts)
