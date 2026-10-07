import type CedarDNS8DInstance from './main.js'
import type { CompanionActionDefinitions } from '@companion-module/base'
import {
	bandOption,
	channelOption,
	learnOption,
	onOption,
	attenOption,
	biasOption,
	nameOption,
	relativeOption,
	type ToggleValue,
} from './options.js'
import { calcBooleanVal, calcAttenBiasVal, isBand, isChannel, parseStringFromBoolean } from './utils.js'
import { CHANNELS, ParameterType } from './message.js'

/**
 * Action ids. The values are the ids saved against every button using the action, so they must never change —
 * they predate this enum and are camelCase for that reason.
 */
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

type ChannelOptions = { channel: number }
type BandOptions = { band: number }
type ToggleOptions = { value: ToggleValue }
type LevelOptions = { value: number; relative: boolean }

export type ActionSchema = {
	[ActionId.bandAtten]: { options: BandOptions & LevelOptions }
	[ActionId.bandBias]: { options: BandOptions & LevelOptions }
	[ActionId.channelLearn]: { options: ChannelOptions & ToggleOptions }
	[ActionId.channelOn]: { options: ChannelOptions & ToggleOptions }
	[ActionId.channelAtten]: { options: ChannelOptions & LevelOptions }
	[ActionId.channelBias]: { options: ChannelOptions & LevelOptions }
	[ActionId.channelName]: { options: ChannelOptions & { value: string } }
	[ActionId.globalLearn]: { options: ToggleOptions }
	[ActionId.globalOn]: { options: ToggleOptions }
	[ActionId.groupSelect]: { options: ChannelOptions }
}

export function UpdateActions(self: CedarDNS8DInstance): void {
	const chanList = channelOption(CHANNELS.map((i) => self.getChannel(i).name))
	const actions: CompanionActionDefinitions<ActionSchema> = {
		[ActionId.channelLearn]: {
			name: 'Channel Learn',
			options: [chanList, learnOption],
			callback: async (action, context) => {
				const id = action.options.channel
				if (!isChannel(id)) throw new Error(`Invalid channel: ${id} - Channel Learn aborted`)
				const value = calcBooleanVal(action.options.value, self.getChannel(id).learn)
				await self.buildMessage(id, ParameterType.Learn, value, { signal: context.signal })
			},
			learn: (action) => {
				const id = action.options.channel
				if (!isChannel(id)) return undefined
				return { value: parseStringFromBoolean(self.getChannel(id).learn) }
			},
		},
		[ActionId.channelOn]: {
			name: 'Channel On',
			options: [chanList, onOption],
			callback: async (action, context) => {
				const id = action.options.channel
				if (!isChannel(id)) throw new Error(`Invalid channel: ${id} - Channel On aborted`)
				const value = calcBooleanVal(action.options.value, self.getChannel(id).on)
				await self.buildMessage(id, ParameterType.On, value, { signal: context.signal })
			},
			learn: (action) => {
				const id = action.options.channel
				if (!isChannel(id)) return undefined
				return { value: parseStringFromBoolean(self.getChannel(id).on) }
			},
		},
		[ActionId.channelAtten]: {
			name: 'Channel Attenuatiuon',
			options: [chanList, attenOption, relativeOption],
			callback: async (action, context) => {
				const id = action.options.channel
				if (!isChannel(id) || !Number.isFinite(action.options.value))
					throw new Error(`Invalid channel: ${id} - Channel Attenuation aborted`)
				const value = calcAttenBiasVal(action.options.value, self.getChannel(id).atten, action.options.relative, -20, 0)
				await self.buildMessage(id, ParameterType.Attenuatiuon, value, { signal: context.signal })
			},
			learn: (action) => {
				const id = action.options.channel
				if (!isChannel(id)) return undefined
				return { value: self.getChannel(id).atten, relative: false }
			},
		},
		[ActionId.channelBias]: {
			name: 'Channel Bias',
			options: [chanList, biasOption, relativeOption],
			callback: async (action, context) => {
				const id = action.options.channel
				if (!isChannel(id) || !Number.isFinite(action.options.value))
					throw new Error(`Invalid channel: ${id} - Channel Bias aborted`)
				const value = calcAttenBiasVal(action.options.value, self.getChannel(id).bias, action.options.relative, -10, 10)
				await self.buildMessage(id, ParameterType.Bias, value, { signal: context.signal })
			},
			learn: (action) => {
				const id = action.options.channel
				if (!isChannel(id)) return undefined
				return { value: self.getChannel(id).bias, relative: false }
			},
		},
		[ActionId.channelName]: {
			name: 'Channel Name',
			options: [chanList, nameOption],
			callback: async (action, context) => {
				const id = action.options.channel
				if (!isChannel(id)) throw new Error(`Invalid channel: ${id} - Channel Name aborted`)
				await self.buildMessage(id, ParameterType.Name, action.options.value ?? '', { signal: context.signal })
			},
			learn: (action) => {
				const id = action.options.channel
				if (!isChannel(id)) return undefined
				return { value: self.getChannel(id).name }
			},
		},
		[ActionId.globalLearn]: {
			name: 'Global Learn',
			options: [learnOption],
			callback: async (action, context) => {
				const value = calcBooleanVal(action.options.value, self.dns8d.globalLearn)
				await self.buildMessage(0, ParameterType.Learn, value, { signal: context.signal })
			},
			learn: () => {
				return { value: parseStringFromBoolean(self.dns8d.globalLearn) }
			},
		},
		[ActionId.globalOn]: {
			name: 'Global On',
			options: [onOption],
			callback: async (action, context) => {
				const value = calcBooleanVal(action.options.value, self.dns8d.globalOn)
				await self.buildMessage(0, ParameterType.On, value, { signal: context.signal })
			},
			learn: () => {
				return { value: parseStringFromBoolean(self.dns8d.globalOn) }
			},
		},
		[ActionId.groupSelect]: {
			name: 'Detail Select Channel',
			options: [chanList],
			callback: async (action, context) => {
				const id = action.options.channel
				if (!isChannel(id)) throw new Error(`Invalid channel: ${id} - Detail Select Channel aborted`)
				await self.buildMessage(id, ParameterType.None, 0, {
					group: (self.dns8d.selectedGroup = id),
					signal: context.signal,
				})
			},
			learn: () => {
				return { channel: self.dns8d.selectedGroup }
			},
		},
		[ActionId.bandAtten]: {
			name: 'Detail Attenuatiuon',
			options: [bandOption, attenOption, relativeOption],
			callback: async (action, context) => {
				const id = action.options.band
				if (!isBand(id) || !Number.isFinite(action.options.value))
					throw new Error(`Invalid channel: ${id} - Detail Attenuatiuon aborted`)
				const value = calcAttenBiasVal(action.options.value, self.getBand(id).atten, action.options.relative, -20, 0)
				await self.buildMessage(0, ParameterType.AttenuatiuonBand, value, { band: id, signal: context.signal })
			},
			learn: (action) => {
				const id = action.options.band
				if (!isBand(id)) return undefined
				return { value: self.getBand(id).atten, relative: false }
			},
		},
		[ActionId.bandBias]: {
			name: 'Detail Bias',
			options: [bandOption, biasOption, relativeOption],
			callback: async (action, context) => {
				const id = action.options.band
				if (!isBand(id) || !Number.isFinite(action.options.value))
					throw new Error(`Invalid channel: ${id} - Detail Bias aborted`)
				const value = calcAttenBiasVal(action.options.value, self.getBand(id).bias, action.options.relative, -10, 10)
				await self.buildMessage(0, ParameterType.BiasBand, value, { band: id, signal: context.signal })
			},
			learn: (action) => {
				const id = action.options.band
				if (!isBand(id)) return undefined
				return { value: self.getBand(id).bias, relative: false }
			},
		},
	}
	self.setActionDefinitions(actions)
}
