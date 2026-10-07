import type { CompanionVariableDefinitions } from '@companion-module/base'
import type CedarDNS8DInstance from './main.js'
import { BANDS, CHANNELS, type BandNumber, type ChannelNumber } from './message.js'

type MeterVariables = { Active1: number; Active2: number; Power1: number; Power2: number }
type LevelVariables = { Bias: number; Attenuation: number }
type ChannelVariables = MeterVariables & LevelVariables & { Name: string; Learn: boolean; DSP: boolean; On: boolean }

/** Prefixes each key of T. A union prefix gives every combination: Prefixed<'a' | 'b', { X: 1 }> has a_X and b_X */
type Prefixed<TPrefix extends string, T> = { [K in keyof T & string as `${TPrefix}_${K}`]: T[K] }

export type VariablesSchema = {
	global_On: boolean
	global_Learn: boolean
	global_FallbackMode: boolean
	global_swVersion: number
	global_dspVersion: number
	selectedGroup_Number: number
} & Prefixed<`channel${ChannelNumber}` | 'selectedGroup', ChannelVariables> &
	Prefixed<`band${BandNumber}`, MeterVariables & LevelVariables>

export function UpdateVariableDefinitions(self: CedarDNS8DInstance): void {
	const variables: Partial<CompanionVariableDefinitions<VariablesSchema>> = {
		global_On: { name: 'Global: On' },
		global_Learn: { name: 'Global: Learn' },
		global_FallbackMode: { name: 'Global: Fallback Mode' },
		global_swVersion: { name: 'Global: Software Version' },
		global_dspVersion: { name: 'Global: DSP Version' },
	}
	for (const i of CHANNELS) {
		variables[`channel${i}_Active1`] = { name: `Channel ${i}: Active Reduction (Max)` }
		variables[`channel${i}_Active2`] = { name: `Channel ${i}: Active Reduction (Average)` }
		variables[`channel${i}_Power1`] = { name: `Channel ${i}: Power (Signal)` }
		variables[`channel${i}_Power2`] = { name: `Channel ${i}: Power (Noise)` }
		variables[`channel${i}_Name`] = { name: `Channel ${i}: Name` }
		variables[`channel${i}_Bias`] = { name: `Channel ${i}: Bias (dB)` }
		variables[`channel${i}_Attenuation`] = { name: `Channel ${i}: Attenuation (dB)` }
		variables[`channel${i}_Learn`] = { name: `Channel ${i}: Learn` }
		variables[`channel${i}_DSP`] = { name: `Channel ${i}: DSP` }
		variables[`channel${i}_On`] = { name: `Channel ${i}: On` }
	}
	variables.selectedGroup_Active1 = { name: `Selected Group Channel: Active Reduction (Max)` }
	variables.selectedGroup_Active2 = { name: `Selected Group Channel: Active Reduction (Average)` }
	variables.selectedGroup_Power1 = { name: `Selected Group Channel: Power (Signal)` }
	variables.selectedGroup_Power2 = { name: `Selected Group Channel: Power (Noise)` }
	variables.selectedGroup_Name = { name: `Selected Group Channel: Name` }
	variables.selectedGroup_Number = { name: `Selected Group Channel: Number` }
	variables.selectedGroup_Bias = { name: `Selected Group Channel: Bias (dB)` }
	variables.selectedGroup_Attenuation = { name: `Selected Group Channel: Attenuation (dB)` }
	variables.selectedGroup_Learn = { name: `Selected Group Channel: Learn` }
	variables.selectedGroup_DSP = { name: `Selected Group Channel: DSP` }
	variables.selectedGroup_On = { name: `Selected Group Channel: On` }
	for (const i of BANDS) {
		variables[`band${i}_Active1`] = { name: `Band ${i}: Active Reduction (Max)` }
		variables[`band${i}_Active2`] = { name: `Band ${i}: Active Reduction (Average)` }
		variables[`band${i}_Power1`] = { name: `Band ${i}: Power (Signal)` }
		variables[`band${i}_Power2`] = { name: `Band ${i}: Power (Noise)` }
		variables[`band${i}_Bias`] = { name: `Band ${i}: Bias (dB)` }
		variables[`band${i}_Attenuation`] = { name: `Band ${i}: Attenuation (dB)` }
	}
	// The loops fill every key, which the compiler can't follow through template literal keys. variables.spec.ts
	// checks these keys against the values SetVarValues writes.
	self.setVariableDefinitions(variables as CompanionVariableDefinitions<VariablesSchema>)
}
