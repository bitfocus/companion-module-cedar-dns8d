import type CedarDNS8DInstance from './main.js'
import type { ModuleTypes } from './main.js'
import {
	ButtonGraphicsDecorationType,
	type CompanionLayeredButtonPresetDefinition,
	type CompanionPresetDefinitions,
	type CompanionPresetSection,
	type ButtonGraphicsBoxElement,
	type ButtonGraphicsTextElement,
} from '@companion-module/base'
import { ActionId } from './actions.js'
import { colours } from './colours.js'
import { CompositeElementId, type BandMeterKey } from './composites.js'
import { BANDS, CHANNELS, ParameterType, type ChannelNumber } from './message.js'
import type { MeterType } from './options.js'
import type { VariablesSchema } from './variables.js'

/**
 * A reference to one of this module's variables. Companion swaps the label for the connection's own when it loads
 * the presets, so the placeholder label never reaches a button.
 */
export function moduleVariable(id: keyof VariablesSchema): string {
	return `$(generic-module:${id})`
}

const fromVariable = (id: keyof VariablesSchema) => ({ isExpression: true, value: moduleVariable(id) }) as const

/** Text size 10 on the simple presets these replace, scaled as Companion converts a size with the top bar hidden */
const TEXT_SIZE = 16.7

const FULL_BUTTON = { x: 0, y: 0, width: 100, height: 100 } as const

const background: ButtonGraphicsBoxElement = { type: 'box', name: 'Background', ...FULL_BUTTON, color: colours.black }

function text(value: string, halign: 'left' | 'center'): ButtonGraphicsTextElement {
	return {
		type: 'text',
		name: 'Text',
		...FULL_BUTTON,
		text: { isExpression: true, value },
		fontsize: TEXT_SIZE,
		fontsizeAllowShrink: false,
		color: colours.dnsLightBlue,
		halign,
		valign: 'top',
	}
}

/** The channel's name, attenuation and bias down the left, its meters on the right. A press toggles DNS on. */
function channelPreset(i: ChannelNumber): CompanionLayeredButtonPresetDefinition<ModuleTypes> {
	const name = moduleVariable(`channel${i}_Name`)
	const atten = moduleVariable(`channel${i}_Attenuation`)
	const bias = moduleVariable(`channel${i}_Bias`)
	return {
		type: 'layered',
		name: `Channel ${i} Status`,
		canvas: { decoration: ButtonGraphicsDecorationType.Border },
		elements: [
			background,
			{
				type: 'composite',
				name: 'Channel Status',
				elementId: CompositeElementId.ChannelStatus,
				...FULL_BUTTON,
				options: {
					active1: fromVariable(`channel${i}_Active1`),
					active2: fromVariable(`channel${i}_Active2`),
					power1: fromVariable(`channel${i}_Power1`),
					power2: fromVariable(`channel${i}_Power2`),
					atten: fromVariable(`channel${i}_Attenuation`),
					bias: fromVariable(`channel${i}_Bias`),
					learn: fromVariable(`channel${i}_Learn`),
					on: fromVariable(`channel${i}_On`),
					dsp: fromVariable(`channel${i}_DSP`),
				},
			},
			text(
				`\`\\n$\{substr(${name},0,9)}\nAtten:\n$\{toFixed(${atten},1)} dB\nBias:\n$\{toFixed(${bias},1)} dB\``,
				'left',
			),
		],
		feedbacks: [],
		steps: [
			{
				down: [
					{
						actionId: ActionId.channelOn,
						options: {
							channel: i,
							value: '2',
						},
						delay: 0,
						headline: `Toggle DNS`,
					},
				],
				up: [],
			},
		],
	}
}

/** The selected group channel's bands, for attenuation or bias, under its name */
function detailPreset(type: MeterType): CompanionLayeredButtonPresetDefinition<ModuleTypes> {
	const isAtten = type === ParameterType.AttenuatiuonBand
	const options: Partial<Record<BandMeterKey, ReturnType<typeof fromVariable>>> = {}
	for (const band of BANDS) {
		options[`band${band}_meter1`] = fromVariable(isAtten ? `band${band}_Active1` : `band${band}_Power1`)
		options[`band${band}_meter2`] = fromVariable(isAtten ? `band${band}_Active2` : `band${band}_Power2`)
		options[`band${band}_marker`] = fromVariable(isAtten ? `band${band}_Attenuation` : `band${band}_Bias`)
	}
	return {
		type: 'layered',
		name: `${isAtten ? 'Attenuation' : 'Bias'} - Detail View`,
		canvas: { decoration: ButtonGraphicsDecorationType.Border },
		elements: [
			background,
			{
				type: 'composite',
				name: 'Detailed Meters',
				elementId: CompositeElementId.DetailedMeters,
				...FULL_BUTTON,
				// The loop above fills every band key, which the compiler can't follow through the template literal keys
				options: {
					type,
					dsp: fromVariable('selectedGroup_DSP'),
					...(options as Record<BandMeterKey, ReturnType<typeof fromVariable>>),
				},
			},
			text(`\`$\{substr(${moduleVariable('selectedGroup_Name')},0,6)}: ${isAtten ? 'Atten' : 'Bias'}\``, 'center'),
		],
		feedbacks: [],
		steps: [
			{
				down: [],
				up: [],
			},
		],
	}
}

export function UpdatePresets(self: CedarDNS8DInstance): void {
	const presets: CompanionPresetDefinitions<ModuleTypes> = {}
	for (const i of CHANNELS) {
		presets[i.toString()] = channelPreset(i)
	}
	presets['attenDetail'] = detailPreset(ParameterType.AttenuatiuonBand)
	presets['biasDetail'] = detailPreset(ParameterType.BiasBand)
	// The section and its order replace each preset's old `category` field
	const structure: CompanionPresetSection<ModuleTypes>[] = [
		{ id: 'channelStatus', name: 'Channel Status', definitions: CHANNELS.map((i) => i.toString()) },
		{ id: 'detailView', name: 'Detail View', definitions: ['attenDetail', 'biasDetail'] },
	]
	self.setPresetDefinitions(structure, presets)
}
