import type {
	CompanionInputFieldDropdown,
	CompanionInputFieldTextInput,
	CompanionInputFieldCheckbox,
} from '@companion-module/base'

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
	useVariables: true,
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
