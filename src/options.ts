import type {
	CompanionInputFieldDropdown,
	CompanionInputFieldTextInput,
	CompanionInputFieldCheckbox,
} from '@companion-module/base'

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

export const onOption: CompanionInputFieldDropdown = {
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

export const attenOption: CompanionInputFieldTextInput = {
	id: 'value',
	type: 'textinput',
	label: 'Atten',
	default: '-6',
	useVariables: true,
	tooltip: 'Range: -20 to 0',
}

export const biasOption: CompanionInputFieldTextInput = {
	id: 'value',
	type: 'textinput',
	label: 'Bias',
	default: '0',
	useVariables: true,
	tooltip: 'Range: -10 to 10',
}

export const nameOption: CompanionInputFieldTextInput = {
	id: 'value',
	type: 'textinput',
	label: 'Name',
	default: '',
	useVariables: true,
}

export const relativeOption: CompanionInputFieldCheckbox = {
	id: 'relative',
	type: 'checkbox',
	label: 'Relative',
	default: false,
}
