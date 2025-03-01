import type {
	CompanionInputFieldDropdown,
	CompanionInputFieldTextInput,
	CompanionInputFieldCheckbox,
} from '@companion-module/base'
import { ParameterType } from './message.js'

const onOffToggle: CompanionInputFieldDropdown = {
	id: 'value',
	type: 'dropdown',
	label: '',
	choices: [
		{ id: '1', label: 'On' },
		{ id: '0', label: 'Off' },
		{ id: '2', label: 'Toggle' },
	],
	default: '2',
}

const textOptionWithVariables: CompanionInputFieldTextInput = {
	id: 'value',
	type: 'textinput',
	label: '',
	default: '',
	useVariables: { local: true },
}

export const bandOption: CompanionInputFieldDropdown = {
	id: 'band',
	type: 'dropdown',
	label: 'Band',
	default: 1,
	allowCustom: true,
	tooltip: 'Variable should return band number',
	choices: [
		{ id: 1, label: 'Band 1' },
		{ id: 2, label: 'Band 2' },
		{ id: 3, label: 'Band 3' },
		{ id: 4, label: 'Band 4' },
		{ id: 5, label: 'Band 5' },
		{ id: 6, label: 'Band 6' },
	],
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

export const meterOption: CompanionInputFieldDropdown = {
	id: 'type',
	type: 'dropdown',
	label: 'Type',
	default: ParameterType.AttenuatiuonBand,
	allowCustom: false,
	choices: [
		{ id: ParameterType.AttenuatiuonBand, label: 'Attenuation' },
		{ id: ParameterType.BiasBand, label: 'Bias' },
	],
}

export const learnOption: CompanionInputFieldDropdown = {
	...onOffToggle,
	label: 'Learn',
}

export const onOption: CompanionInputFieldDropdown = {
	...onOffToggle,
	label: 'On',
}

export const attenOption: CompanionInputFieldTextInput = {
	...textOptionWithVariables,
	label: 'Atten',
	default: '-6',
	tooltip: 'Range: -20 to 0',
}

export const biasOption: CompanionInputFieldTextInput = {
	...textOptionWithVariables,
	label: 'Bias',
	default: '0',
	tooltip: 'Range: -10 to 10',
}

export const nameOption: CompanionInputFieldTextInput = {
	...textOptionWithVariables,
	label: 'Name',
}

export const relativeOption: CompanionInputFieldCheckbox = {
	id: 'relative',
	type: 'checkbox',
	label: 'Relative',
	default: false,
}
