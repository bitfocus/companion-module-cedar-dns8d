import type { CedarDNS8DInstance } from './main.js'
import {
	CompanionActionDefinition,
	CompanionInputFieldCheckbox,
	CompanionInputFieldDropdown,
	CompanionInputFieldTextInput,
	DropdownChoice,
} from '@companion-module/base'

export enum ActionId {
	channelLearn = 'channelLearn',
	channelOn = 'channelOn',
	channelAtten = 'channelAtten',
	channelBias = 'channelBias',
	channelName = 'channelName',
	globalLearn = 'globalLearn',
	globalOn = 'globalOn',
}

export const channelOption: CompanionInputFieldDropdown = {
	id: 'channel',
	type: 'dropdown',
	label: 'Channel',
	default: 1,
	allowCustom: true,
	tooltip: 'Variable should return channel number',
	choices: [],
}

const learnOption: CompanionInputFieldDropdown = {
	id: 'value',
	type: 'dropdown',
	label: 'Learn',
	choices: [
		{ id: '1', label: 'On' },
		{ id: '0', label: 'Off' },
		{ id: '2', label: 'Toggle' },
	],
	default: '2',
}

const onOption: CompanionInputFieldDropdown = {
	id: 'value',
	type: 'dropdown',
	label: 'On',
	choices: [
		{ id: '1', label: 'On' },
		{ id: '0', label: 'Off' },
		{ id: '2', label: 'Toggle' },
	],
	default: '2',
}

const attenOption: CompanionInputFieldTextInput = {
	id: 'value',
	type: 'textinput',
	label: 'Atten',
	default: '-6',
	useVariables: true,
	tooltip: 'Range: -20 to 0',
}

const biasOption: CompanionInputFieldTextInput = {
	id: 'value',
	type: 'textinput',
	label: 'Bias',
	default: '0',
	useVariables: true,
	tooltip: 'Range: -10 to 10',
}

const nameOption: CompanionInputFieldTextInput = {
	id: 'value',
	type: 'textinput',
	label: 'Name',
	default: '',
	useVariables: true,
}

const relativeOption: CompanionInputFieldCheckbox = {
	id: 'relative',
	type: 'checkbox',
	label: 'Relative',
	default: false,
}

function calcBooleanVal(actVal: string, curVal: boolean): string {
	return actVal === '2' ? (!curVal ? '1' : '0') : actVal
}

function calcAttenBiasVal(actVal: number, curVal: number, rel: boolean, min: number, max: number): number {
	let value = actVal
	if (rel) {
		value += curVal
	}
	return value > max ? max : value < min ? min : value
}

export function UpdateActions(self: CedarDNS8DInstance): void {
	const channels: DropdownChoice[] = []
	for (let i = 1; i <= 8; i++) {
		const chan = self.getChannel(i)
		channels.push({ id: i, label: chan.name })
	}
	const chanList = { ...channelOption, choices: channels }
	const actions: { [id in ActionId]: CompanionActionDefinition | undefined } = {
		[ActionId.channelLearn]: {
			name: 'Channel Learn',
			options: [chanList, learnOption],
			callback: async (action, context) => {
				const id = Number(await context.parseVariablesInString(action.options['channel']?.toString() ?? '0'))
				if (isNaN(id) || id < 1 || id > 8) return
				const chan = self.getChannel(id)
				const value = calcBooleanVal(action.options['value']?.toString() ?? '0', chan.learn)
				self.buildMessage(id, 'learn', value)
			},
		},
		[ActionId.channelOn]: {
			name: 'Channel On',
			options: [chanList, onOption],
			callback: async (action, context) => {
				const id = Number(await context.parseVariablesInString(action.options['channel']?.toString() ?? '0'))
				if (isNaN(id) || id < 1 || id > 8) return
				const chan = self.getChannel(id)
				const value = calcBooleanVal(action.options['value']?.toString() ?? '0', chan.on)
				self.buildMessage(id, 'on', value)
			},
		},
		[ActionId.channelAtten]: {
			name: 'Channel Attenuatiuon',
			options: [chanList, attenOption, relativeOption],
			callback: async (action, context) => {
				const id = Number(await context.parseVariablesInString(action.options['channel']?.toString() ?? '0'))
				let value = Number(await context.parseVariablesInString(action.options['value']?.toString() ?? '0'))
				if (isNaN(id) || id < 1 || id > 8 || isNaN(value)) return
				value = calcAttenBiasVal(value, self.getChannel(id).atten, Boolean(action.options['relative']), -20, 0)
				self.buildMessage(id, 'atten', value)
			},
		},
		[ActionId.channelBias]: {
			name: 'Channel Bias',
			options: [chanList, biasOption, relativeOption],
			callback: async (action, context) => {
				const id = Number(await context.parseVariablesInString(action.options['channel']?.toString() ?? '0'))
				let value = Number(await context.parseVariablesInString(action.options['value']?.toString() ?? '0'))
				if (isNaN(id) || id < 1 || id > 8 || isNaN(value)) return
				value = calcAttenBiasVal(value, self.getChannel(id).bias, Boolean(action.options['relative']), -10, 10)
				self.buildMessage(id, 'bias', value)
			},
		},
		[ActionId.channelName]: {
			name: 'Channel Name',
			options: [chanList, nameOption],
			callback: async (action, context) => {
				const id = Number(await context.parseVariablesInString(action.options['channel']?.toString() ?? '0'))
				const value = await context.parseVariablesInString(action.options['value']?.toString() ?? '')
				if (isNaN(id) || id < 1 || id > 8) return
				self.buildMessage(id, 'name', value)
			},
		},
		[ActionId.globalLearn]: {
			name: 'Global Learn',
			options: [learnOption],
			callback: (action) => {
				const value = calcBooleanVal(action.options['value']?.toString() ?? '0', self.dns8d.globalLearn)
				self.buildMessage(0, 'learn', value)
			},
		},
		[ActionId.globalOn]: {
			name: 'Global On',
			options: [onOption],
			callback: (action) => {
				const value = calcBooleanVal(action.options['value']?.toString() ?? '0', self.dns8d.globalOn)
				self.buildMessage(0, 'on', value)
			},
		},
	}
	self.setActionDefinitions(actions)
}
