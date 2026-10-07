import type {
	CompanionInputFieldCheckbox,
	CompanionInputFieldDropdown,
	CompanionInputFieldNumber,
	CompanionInputFieldTextInput,
	DropdownChoice,
} from '@companion-module/base'
import { ParameterType, type BandNumber } from './message.js'

/** '1' on, '0' off, '2' toggle. Strings, as the device protocol writes them and as saved buttons store them */
export type ToggleValue = '0' | '1' | '2'

export type MeterType = ParameterType.AttenuatiuonBand | ParameterType.BiasBand

const TOGGLE_CHOICES = [
	{ id: '1', label: 'On' },
	{ id: '0', label: 'Off' },
	{ id: '2', label: 'Toggle' },
] as const satisfies DropdownChoice<ToggleValue>[]

const BAND_CHOICES = [
	{ id: 1, label: 'Band 1' },
	{ id: 2, label: 'Band 2' },
	{ id: 3, label: 'Band 3' },
	{ id: 4, label: 'Band 4' },
	{ id: 5, label: 'Band 5' },
	{ id: 6, label: 'Band 6' },
] as const satisfies DropdownChoice<BandNumber>[]

const METER_CHOICES = [
	{ id: ParameterType.AttenuatiuonBand, label: 'Attenuation' },
	{ id: ParameterType.BiasBand, label: 'Bias' },
] as const satisfies DropdownChoice<MeterType>[]

const onOffToggle: CompanionInputFieldDropdown<'value', ToggleValue> = {
	id: 'value',
	type: 'dropdown',
	label: '',
	choices: TOGGLE_CHOICES,
	default: TOGGLE_CHOICES[2].id,
}

/**
 * Was a dropdown with custom values before API 2.0, which is how variables got in. Expression mode replaces that, and
 * UpgradeScripts[0] converts saved custom values.
 */
export const bandOption: CompanionInputFieldDropdown<'band', BandNumber> = {
	id: 'band',
	type: 'dropdown',
	label: 'Band',
	default: BAND_CHOICES[0].id,
	expressionDescription: 'Should return a band number, 1 to 6',
	choices: BAND_CHOICES,
}

/**
 * As {@link bandOption}. Labelled with the number and the device's channel name, so two channels with the same name
 * can be told apart. The names come from the device, so the definitions are rebuilt when one changes.
 */
export function channelOption(names: readonly string[]): CompanionInputFieldDropdown<'channel', number> {
	return {
		id: 'channel',
		type: 'dropdown',
		label: 'Channel',
		// Channel 1. A literal because the choices are built from device names at runtime, so there is no fixed entry to reference
		default: 1,
		expressionDescription: 'Should return a channel number, 1 to 8',
		choices: names.map((name, index) => ({ id: index + 1, label: `${index + 1}: ${name}` })),
	}
}

export const meterOption: CompanionInputFieldDropdown<'type', MeterType> = {
	id: 'type',
	type: 'dropdown',
	label: 'Type',
	default: METER_CHOICES[0].id,
	choices: METER_CHOICES,
}

export const learnOption: CompanionInputFieldDropdown<'value', ToggleValue> = {
	...onOffToggle,
	label: 'Learn',
}

export const onOption: CompanionInputFieldDropdown<'value', ToggleValue> = {
	...onOffToggle,
	label: 'On',
}

// Atten and bias were textinputs before API 2.0; UpgradeScripts[0] converts saved values. The min/max are wide enough
// for a relative step across the whole device range, which the callbacks then clamp to.
export const attenOption: CompanionInputFieldNumber<'value'> = {
	id: 'value',
	type: 'number',
	label: 'Atten',
	default: -6,
	min: -20,
	max: 20,
	tooltip: 'Range: -20 to 0',
}

export const biasOption: CompanionInputFieldNumber<'value'> = {
	id: 'value',
	type: 'number',
	label: 'Bias',
	default: 0,
	min: -20,
	max: 20,
	tooltip: 'Range: -10 to 10',
}

export const nameOption: CompanionInputFieldTextInput<'value'> = {
	id: 'value',
	type: 'textinput',
	label: 'Name',
	default: '',
	useVariables: true,
}

export const relativeOption: CompanionInputFieldCheckbox<'relative'> = {
	id: 'relative',
	type: 'checkbox',
	label: 'Relative',
	default: false,
}
