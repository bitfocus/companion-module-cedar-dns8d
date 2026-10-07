import { Regex, type SomeCompanionConfigField } from '@companion-module/base'
const pollInterval = 40

// A type alias, not an interface: InstanceTypes requires config to satisfy JsonObject, and interfaces don't
export type ModuleConfig = {
	host: string
	port: number
	interval: number
}

export function GetConfigFields(): SomeCompanionConfigField[] {
	return [
		{
			type: 'textinput',
			id: 'host',
			label: 'Host',
			width: 8,
			regex: Regex.HOSTNAME,
		},
		{
			type: 'number',
			id: 'port',
			label: 'Port',
			width: 4,
			min: 1,
			max: 65535,
			default: 80,
		},
		{
			type: 'number',
			id: 'interval',
			label: 'Poll Interval (mS)',
			width: 4,
			min: 40,
			max: 1000,
			default: pollInterval,
		},
	]
}
