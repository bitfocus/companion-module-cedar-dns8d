import type { CedarDNS8DInstance } from './main.js'
import { CompanionActionDefinition, DropdownChoice } from '@companion-module/base'

export enum ActionId {
	channelLearn = 'channelLearn',
	channelOn = 'channelOn',
	channelAtten = 'channelAtten',
	channelBias = 'channelBias',
	channelName = 'channelName',
	globalLearn = 'globalLearn',
	globalOn = 'globalOn',
}

export function UpdateActions(self: CedarDNS8DInstance): void {
	const channels: DropdownChoice[] = []
	for (let i = 1; i <= 8; i++) {
		const chan = self.getChannel(i)
		channels.push({ id: i, label: chan.name })
	}
	const actions: { [id in ActionId]: CompanionActionDefinition | undefined } = {
		[ActionId.channelLearn]: {
			name: 'Channel Learn',
			options: [
				{
					id: 'channel',
					type: 'dropdown',
					label: 'Channel',
					choices: channels,
					default: 1,
					allowCustom: true,
					tooltip: 'Variable should return channel number',
				},
				{
					id: 'value',
					type: 'dropdown',
					label: 'Learn',
					choices: [
						{ id: '1', label: 'On' },
						{ id: '0', label: 'Off' },
						{ id: '2', label: 'Toggle' },
					],
					default: '2',
				},
			],
			callback: async (action, context) => {
				const id = Number(await context.parseVariablesInString(action.options['channel']?.toString() ?? '0'))
				if (isNaN(id) || id < 1 || id > 8) return
				const chan = self.getChannel(id)
				const value =
					action.options['value']?.toString() === '2'
						? !chan.learn
							? '1'
							: '0'
						: (action.options['value']?.toString() ?? '0')
				self.buildMessage(id, 'learn', value)
			},
		},
		[ActionId.channelOn]: {
			name: 'Channel On',
			options: [
				{
					id: 'channel',
					type: 'dropdown',
					label: 'Channel',
					choices: channels,
					default: 1,
					allowCustom: true,
					tooltip: 'Variable should return channel number',
				},
				{
					id: 'value',
					type: 'dropdown',
					label: 'On',
					choices: [
						{ id: '1', label: 'On' },
						{ id: '0', label: 'Off' },
						{ id: '2', label: 'Toggle' },
					],
					default: '2',
				},
			],
			callback: async (action, context) => {
				const id = Number(await context.parseVariablesInString(action.options['channel']?.toString() ?? '0'))
				if (isNaN(id) || id < 1 || id > 8) return
				const chan = self.getChannel(id)
				const value =
					action.options['value']?.toString() === '2'
						? !chan.on
							? '1'
							: '0'
						: (action.options['value']?.toString() ?? '0')
				self.buildMessage(id, 'on', value)
			},
		},
		[ActionId.channelAtten]: {
			name: 'Channel Attenuatiuon',
			options: [
				{
					id: 'channel',
					type: 'dropdown',
					label: 'Channel',
					choices: channels,
					default: 1,
					allowCustom: true,
					tooltip: 'Variable should return channel number',
				},
				{
					id: 'value',
					type: 'textinput',
					label: 'Atten',
					default: '-6',
					useVariables: true,
					tooltip: 'Range: -20 to 0',
				},
				{
					id: 'relative',
					type: 'checkbox',
					label: 'Relative',
					default: false,
				},
			],
			callback: async (action, context) => {
				const id = Number(await context.parseVariablesInString(action.options['channel']?.toString() ?? '0'))
				let value = Number(await context.parseVariablesInString(action.options['value']?.toString() ?? '0'))
				if (isNaN(id) || id < 1 || id > 8) return
				if (isNaN(value)) return
				if (action.options['relative']) {
					const chan = self.getChannel(id)
					value += chan.atten
				}
				self.buildMessage(id, 'atten', value)
			},
		},
		[ActionId.channelBias]: {
			name: 'Channel Bias',
			options: [
				{
					id: 'channel',
					type: 'dropdown',
					label: 'Channel',
					choices: channels,
					default: 1,
					allowCustom: true,
					tooltip: 'Variable should return channel number',
				},
				{
					id: 'value',
					type: 'textinput',
					label: 'Bias',
					default: '0',
					useVariables: true,
					tooltip: 'Range: -10 to 10',
				},
				{
					id: 'relative',
					type: 'checkbox',
					label: 'Relative',
					default: false,
				},
			],
			callback: async (action, context) => {
				const id = Number(await context.parseVariablesInString(action.options['channel']?.toString() ?? '0'))
				let value = Number(await context.parseVariablesInString(action.options['value']?.toString() ?? '0'))
				if (isNaN(id) || id < 1 || id > 8) return
				if (isNaN(value)) return
				if (action.options['relative']) {
					const chan = self.getChannel(id)
					value += chan.bias
				}
				self.buildMessage(id, 'bias', value)
			},
		},
		[ActionId.channelName]: {
			name: 'Channel Name',
			options: [
				{
					id: 'channel',
					type: 'dropdown',
					label: 'Channel',
					choices: channels,
					default: 1,
					allowCustom: true,
					tooltip: 'Variable should return channel number',
				},
				{
					id: 'value',
					type: 'textinput',
					label: 'Name',
					default: '',
					useVariables: true,
				},
			],
			callback: async (action, context) => {
				const id = Number(await context.parseVariablesInString(action.options['channel']?.toString() ?? '0'))
				const value = await context.parseVariablesInString(action.options['value']?.toString() ?? '')
				if (isNaN(id) || id < 1 || id > 8) return
				self.buildMessage(id, 'name', value)
			},
		},
		[ActionId.globalLearn]: {
			name: 'Global Learn',
			options: [
				{
					id: 'value',
					type: 'dropdown',
					label: 'Learn',
					choices: [
						{ id: '1', label: 'On' },
						{ id: '0', label: 'Off' },
						{ id: '2', label: 'Toggle' },
					],
					default: '2',
				},
			],
			callback: (action) => {
				const value =
					action.options['value']?.toString() === '2'
						? !self.dns8d.globalLearn
							? '1'
							: '0'
						: (action.options['value']?.toString() ?? '0')
				self.buildMessage(0, 'learn', value)
			},
		},
		[ActionId.globalOn]: {
			name: 'Global On',
			options: [
				{
					id: 'value',
					type: 'dropdown',
					label: 'On',
					choices: [
						{ id: '1', label: 'On' },
						{ id: '0', label: 'Off' },
						{ id: '2', label: 'Toggle' },
					],
					default: '2',
				},
			],
			callback: (action) => {
				const value =
					action.options['value']?.toString() === '2'
						? !self.dns8d.globalOn
							? '1'
							: '0'
						: (action.options['value']?.toString() ?? '0')
				self.buildMessage(0, 'on', value)
			},
		},
	}
	self.setActionDefinitions(actions)
}
