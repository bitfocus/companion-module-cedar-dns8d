import type { CedarDNS8DInstance } from './main.js'
import { CompanionActionDefinition, DropdownChoice } from '@companion-module/base'
import { channelOption, learnOption, onOption, attenOption, biasOption, nameOption, relativeOption } from './options.js'
import { parseStringFromBoolean } from './utils.js'

import { calcBooleanVal, calcAttenBiasVal } from './utils.js'

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
	const chanList = { ...channelOption, choices: channels }
	const actions: { [id in ActionId]: CompanionActionDefinition | undefined } = {
		[ActionId.channelLearn]: {
			name: 'Channel Learn',
			options: [chanList, learnOption],
			callback: async (action, context) => {
				const id = Number(await context.parseVariablesInString(action.options['channel']?.toString() ?? '0'))
				if (isNaN(id) || id < 1 || id > 8) return
				const value = calcBooleanVal(action.options['value']?.toString() ?? '0', self.getChannel(id).learn)
				self.buildMessage(id, 'learn', value)
			},
			learn: async (action, context) => {
				const id = Number(await context.parseVariablesInString(action.options['channel']?.toString() ?? '0'))
				if (isNaN(id) || id < 1 || id > 8) return undefined
				return { ...action.options, value: parseStringFromBoolean(self.getChannel(id).learn) }
			},
		},
		[ActionId.channelOn]: {
			name: 'Channel On',
			options: [chanList, onOption],
			callback: async (action, context) => {
				const id = Number(await context.parseVariablesInString(action.options['channel']?.toString() ?? '0'))
				if (isNaN(id) || id < 1 || id > 8) return
				const value = calcBooleanVal(action.options['value']?.toString() ?? '0', self.getChannel(id).on)
				self.buildMessage(id, 'on', value)
			},
			learn: async (action, context) => {
				const id = Number(await context.parseVariablesInString(action.options['channel']?.toString() ?? '0'))
				if (isNaN(id) || id < 1 || id > 8) return undefined
				return { ...action.options, value: parseStringFromBoolean(self.getChannel(id).on) }
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
			learn: async (action, context) => {
				const id = Number(await context.parseVariablesInString(action.options['channel']?.toString() ?? '0'))
				if (isNaN(id) || id < 1 || id > 8) return undefined
				return { ...action.options, value: self.getChannel(id).atten.toString(), relative: false }
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
			learn: async (action, context) => {
				const id = Number(await context.parseVariablesInString(action.options['channel']?.toString() ?? '0'))
				if (isNaN(id) || id < 1 || id > 8) return undefined
				return { ...action.options, value: self.getChannel(id).bias.toString(), relative: false }
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
			learn: async (action, context) => {
				const id = Number(await context.parseVariablesInString(action.options['channel']?.toString() ?? '0'))
				if (isNaN(id) || id < 1 || id > 8) return undefined
				return { ...action.options, value: self.getChannel(id).name }
			},
		},
		[ActionId.globalLearn]: {
			name: 'Global Learn',
			options: [learnOption],
			callback: (action) => {
				const value = calcBooleanVal(action.options['value']?.toString() ?? '0', self.dns8d.globalLearn)
				self.buildMessage(0, 'learn', value)
			},
			learn: async (action) => {
				return { ...action.options, value: parseStringFromBoolean(self.dns8d.globalLearn) }
			},
		},
		[ActionId.globalOn]: {
			name: 'Global On',
			options: [onOption],
			callback: (action) => {
				const value = calcBooleanVal(action.options['value']?.toString() ?? '0', self.dns8d.globalOn)
				self.buildMessage(0, 'on', value)
			},
			learn: async (action) => {
				return { ...action.options, value: parseStringFromBoolean(self.dns8d.globalOn) }
			},
		},
	}
	self.setActionDefinitions(actions)
}
