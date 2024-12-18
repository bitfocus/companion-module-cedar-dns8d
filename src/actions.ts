import type { CedarDNS8DInstance } from './main.js'
import { CompanionActionDefinition, DropdownChoice } from '@companion-module/base'
import {
	bandOption,
	channelOption,
	learnOption,
	onOption,
	attenOption,
	biasOption,
	nameOption,
	relativeOption,
} from './options.js'
import { calcBooleanVal, calcAttenBiasVal, parseStringFromBoolean } from './utils.js'
import { ParameterType } from './message.js'

export enum ActionId {
	bandAtten = 'bandAtten',
	bandBias = 'bandBias',
	channelLearn = 'channelLearn',
	channelOn = 'channelOn',
	channelAtten = 'channelAtten',
	channelBias = 'channelBias',
	channelName = 'channelName',
	globalLearn = 'globalLearn',
	globalOn = 'globalOn',
	groupSelect = 'groupSelect',
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
				await self.buildMessage(id, ParameterType.Learn, value)
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
				await self.buildMessage(id, ParameterType.On, value)
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
				await self.buildMessage(id, ParameterType.Attenuatiuon, value)
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
				await self.buildMessage(id, ParameterType.Bias, value)
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
				await self.buildMessage(id, ParameterType.Name, value)
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
			callback: async (action) => {
				const value = calcBooleanVal(action.options['value']?.toString() ?? '0', self.dns8d.globalLearn)
				await self.buildMessage(0, ParameterType.Learn, value)
			},
			learn: async (action) => {
				return { ...action.options, value: parseStringFromBoolean(self.dns8d.globalLearn) }
			},
		},
		[ActionId.globalOn]: {
			name: 'Global On',
			options: [onOption],
			callback: async (action) => {
				const value = calcBooleanVal(action.options['value']?.toString() ?? '0', self.dns8d.globalOn)
				await self.buildMessage(0, ParameterType.On, value)
			},
			learn: async (action) => {
				return { ...action.options, value: parseStringFromBoolean(self.dns8d.globalOn) }
			},
		},
		[ActionId.groupSelect]: {
			name: 'Detail Select Channel',
			options: [chanList],
			callback: async (action, context) => {
				const id = Number(await context.parseVariablesInString(action.options['channel']?.toString() ?? '0'))
				if (isNaN(id) || id < 1 || id > 8) return
				await self.buildMessage(id, ParameterType.None, 0, (self.dns8d.selectedGroup = id))
			},
			learn: async (action) => {
				return { ...action.options, channel: self.dns8d.selectedGroup }
			},
		},
		[ActionId.bandAtten]: {
			name: 'Detail Attenuatiuon',
			options: [bandOption, attenOption, relativeOption],
			callback: async (action, context) => {
				const id = Number(await context.parseVariablesInString(action.options['band']?.toString() ?? '0'))
				let value = Number(await context.parseVariablesInString(action.options['value']?.toString() ?? '0'))
				if (isNaN(id) || id < 1 || id > 8 || isNaN(value)) return
				value = calcAttenBiasVal(value, self.getBand(id).atten, Boolean(action.options['relative']), -20, 0)
				await self.buildMessage(0, ParameterType.AttenuatiuonBand, value, self.dns8d.selectedGroup, id)
			},
			learn: async (action, context) => {
				const id = Number(await context.parseVariablesInString(action.options['band']?.toString() ?? '0'))
				if (isNaN(id) || id < 1 || id > 8) return undefined
				return { ...action.options, value: self.getBand(id).atten.toString(), relative: false }
			},
		},
		[ActionId.bandBias]: {
			name: 'Detail Bias',
			options: [bandOption, biasOption, relativeOption],
			callback: async (action, context) => {
				const id = Number(await context.parseVariablesInString(action.options['band']?.toString() ?? '0'))
				let value = Number(await context.parseVariablesInString(action.options['value']?.toString() ?? '0'))
				if (isNaN(id) || id < 1 || id > 6 || isNaN(value)) return
				value = calcAttenBiasVal(value, self.getBand(id).bias, Boolean(action.options['relative']), -10, 10)
				await self.buildMessage(0, ParameterType.BiasBand, value, self.dns8d.selectedGroup, id)
			},
			learn: async (action, context) => {
				const id = Number(await context.parseVariablesInString(action.options['band']?.toString() ?? '0'))
				if (isNaN(id) || id < 1 || id > 6) return undefined
				return { ...action.options, value: self.getBand(id).bias.toString(), relative: false }
			},
		},
	}
	self.setActionDefinitions(actions)
}
