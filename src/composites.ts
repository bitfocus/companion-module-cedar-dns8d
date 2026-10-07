import type {
	ButtonGraphicsGroupElement,
	CompanionGraphicsCompositeElementDefinitions,
	CompanionInputFieldCheckbox,
	CompanionInputFieldNumber,
	SomeButtonGraphicsElement,
} from '@companion-module/base'
import type CedarDNS8DInstance from './main.js'
import { colours } from './colours.js'
import { BANDS, ParameterType, type BandNumber } from './message.js'
import { meterOption, type MeterType } from './options.js'

/**
 * Composite graphics elements for layered buttons, drawing what the Channel Status and Detailed Meters advanced
 * feedbacks draw as image buffers (buildIcon and buildDetailIcon in utils.ts).
 */
export enum CompositeElementId {
	ChannelStatus = 'channel_status',
	DetailedMeters = 'detailed_meters',
}

export type ChannelStatusOptions = {
	active1: number
	active2: number
	power1: number
	power2: number
	atten: number
	bias: number
	learn: boolean
	on: boolean
	dsp: boolean
}

export type BandMeterKey = `band${BandNumber}_${'meter1' | 'meter2' | 'marker'}`
export type DetailedMetersOptions = { type: MeterType; dsp: boolean } & { [K in BandMeterKey]: number }

export type CompositeElementSchema = {
	[CompositeElementId.ChannelStatus]: { options: ChannelStatusOptions }
	[CompositeElementId.DetailedMeters]: { options: DetailedMetersOptions }
}

/**
 * The advanced feedbacks draw a 72px square, and the layout below is kept in those pixels so it can be checked
 * against utils.ts. Element bounds are percentages of their parent, so this converts.
 */
export const ICON_SIZE = 72
const pct = (px: number, of = ICON_SIZE): number => (px / of) * 100

export const BAR_WIDTH = 6
export const MARKER_WIDTH = 8
export const MARKER_HEIGHT = 3
const STROKE_WIDTH = 1

/** buildIcon: an attenuation and a power column, bars from y 6 for height - 16 px */
export const CHANNEL_METERS = { top: 6, length: ICON_SIZE - 16, attenX: ICON_SIZE - 16, powerX: ICON_SIZE - 8 }
/** buildIcon: the learn and DNS on squares, below the columns */
export const INDICATORS = { size: 6, y: ICON_SIZE - 8, learnX: ICON_SIZE - 16, onX: ICON_SIZE - 8 }
/** buildDetailIcon: one column per band, from x 8 every 10 px, bars from y 16 for height - 20 px */
export const DETAIL_METERS = { top: 16, length: ICON_SIZE - 20, firstX: 8, spacing: 10 }

const expr = (value: string) => ({ isExpression: true, value }) as const

interface ColumnExpressions {
	/** Evaluates true for an attenuation column, false for a power column */
	isAtten: string
	/** Drawn dark: max reduction, or signal power */
	meter1: string
	/** Drawn light, over meter 1: average reduction, or noise power */
	meter2: string
	/** Attenuation setting, or bias setting */
	marker: string
	dsp: string
}

/**
 * One meter column, as utils.ts draws it. The two bars are BAR_WIDTH wide, filling 5% per dB of reduction down from
 * the top (attenuation), or up from the bottom losing 1.25% per dB below 0 (power), as meterValue does. The marker is
 * MARKER_WIDTH wide, a px either side of the bars, with its top a px above the point it marks: attenuation 0 to -20 dB
 * or bias +10 to -10 dB, top to bottom, as markerOffset does.
 */
function meterColumn(
	name: string,
	barX: number,
	top: number,
	length: number,
	e: ColumnExpressions,
): ButtonGraphicsGroupElement {
	// The group spans the marker's whole travel: from a px above the bars to the marker's bottom at full scale
	const groupHeight = length + MARKER_HEIGHT
	const inX = (px: number) => pct(px, MARKER_WIDTH)
	const inY = (px: number) => pct(px, groupHeight)

	const bar = (barName: string, value: string, colour: string): SomeButtonGraphicsElement => ({
		type: 'gauge',
		name: barName,
		x: inX((MARKER_WIDTH - BAR_WIDTH) / 2),
		y: inY(1),
		width: inX(BAR_WIDTH),
		height: inY(length),
		orientation: 'vertical',
		min: 0,
		max: 100,
		value: expr(`${e.isAtten} ? abs(${value}) * 5 : 100 - abs(${value}) * 1.25`),
		reverse: expr(e.isAtten),
		fillEnabled: true,
		multiColour: false,
		roundedEnds: false,
		// The image buffer leaves the unlit part of a bar transparent; Companion's default track shows at 70%
		trackStyle: 'transparent',
		trackAmount: 0,
		stops: [{ value: 0, color: expr(colour), gradient: false }],
	})

	const fraction = `min(max(${e.isAtten} ? abs(${e.marker}) / 20 : abs(${e.marker} - 10) / 20, 0), 1)`
	return {
		type: 'group',
		name,
		x: pct(barX - (MARKER_WIDTH - BAR_WIDTH) / 2),
		y: pct(top - 1),
		width: pct(MARKER_WIDTH),
		height: pct(groupHeight),
		children: [
			bar('Meter 1', e.meter1, `${e.dsp} ? ${colours.dnsDarkBlue} : ${colours.dnsDarkGrey}`),
			bar('Meter 2', e.meter2, `${e.dsp} ? ${colours.dnsLightBlue} : ${colours.dnsGrey}`),
			{
				type: 'box',
				name: 'Marker',
				x: 0,
				y: expr(`${fraction} * ${inY(length)}`),
				width: 100,
				height: inY(MARKER_HEIGHT),
				color: expr(`${e.isAtten} ? ${colours.dnsLightBlue} : ${colours.black}`),
				// Border widths are relative to the larger side of the parent, here the group's height
				borderWidth: inY(STROKE_WIDTH),
				borderColor: expr(`${e.isAtten} ? ${colours.dnsDarkBlue} : ${colours.dnsGrey}`),
				borderPosition: 'inside',
			},
		],
	}
}

function indicator(name: string, x: number, state: string): SomeButtonGraphicsElement {
	return {
		type: 'box',
		name,
		x: pct(x),
		y: pct(INDICATORS.y),
		width: pct(INDICATORS.size),
		height: pct(INDICATORS.size),
		color: expr(`${state} ? ${colours.dnsLightBlue} : ${colours.dnsGrey}`),
		borderWidth: pct(STROKE_WIDTH),
		borderColor: expr(`${state} ? ${colours.dnsDarkBlue} : ${colours.dnsDarkGrey}`),
		borderPosition: 'inside',
	}
}

const levelField = <K extends string>(id: K, label: string, defaultValue = 0): CompanionInputFieldNumber<K> => ({
	type: 'number',
	id,
	label,
	default: defaultValue,
	min: -200,
	max: 200,
})

const stateField = <K extends string>(id: K, label: string): CompanionInputFieldCheckbox<K> => ({
	type: 'checkbox',
	id,
	label,
	default: false,
})

const channelOption = (id: keyof ChannelStatusOptions) => `$(options:${id})`
const detailOption = (id: keyof DetailedMetersOptions) => `$(options:${id})`

export function UpdateCompositeElements(self: CedarDNS8DInstance): void {
	const compositeElements: CompanionGraphicsCompositeElementDefinitions<CompositeElementSchema> = {
		[CompositeElementId.ChannelStatus]: {
			type: 'composite',
			name: 'Channel Status',
			description:
				'Attenuation and power meters for one channel, with its attenuation and bias markers and learn and DNS on indicators. Feed it the channel variables. Drawn for the whole button.',
			options: [
				levelField('active1', 'Active Reduction (Max)'),
				levelField('active2', 'Active Reduction (Average)'),
				levelField('power1', 'Power (Signal)', -100),
				levelField('power2', 'Power (Noise)', -100),
				levelField('atten', 'Attenuation (dB)'),
				levelField('bias', 'Bias (dB)'),
				stateField('learn', 'Learn'),
				stateField('on', 'On'),
				stateField('dsp', 'DSP'),
			],
			elements: [
				meterColumn('Attenuation', CHANNEL_METERS.attenX, CHANNEL_METERS.top, CHANNEL_METERS.length, {
					isAtten: 'true',
					meter1: channelOption('active1'),
					meter2: channelOption('active2'),
					marker: channelOption('atten'),
					dsp: channelOption('dsp'),
				}),
				meterColumn('Power', CHANNEL_METERS.powerX, CHANNEL_METERS.top, CHANNEL_METERS.length, {
					isAtten: 'false',
					meter1: channelOption('power1'),
					meter2: channelOption('power2'),
					marker: channelOption('bias'),
					dsp: channelOption('dsp'),
				}),
				indicator('Learn', INDICATORS.learnX, channelOption('learn')),
				indicator('On', INDICATORS.onX, channelOption('on')),
			],
		},
		[CompositeElementId.DetailedMeters]: {
			type: 'composite',
			name: 'Detailed Meters',
			description:
				"The selected group channel's six bands: attenuation meters with attenuation markers, or power meters with bias markers. Feed it the band variables. Drawn for the whole button.",
			options: [
				meterOption,
				stateField('dsp', 'DSP'),
				...BANDS.flatMap((band) => [
					levelField(`band${band}_meter1`, `Band ${band}: Meter 1 (max reduction, or signal power)`),
					levelField(`band${band}_meter2`, `Band ${band}: Meter 2 (average reduction, or noise power)`),
					levelField(`band${band}_marker`, `Band ${band}: Marker (attenuation, or bias)`),
				]),
			],
			elements: BANDS.map((band, index) =>
				meterColumn(
					`Band ${band}`,
					DETAIL_METERS.firstX + index * DETAIL_METERS.spacing,
					DETAIL_METERS.top,
					DETAIL_METERS.length,
					{
						isAtten: `${detailOption('type')} == '${ParameterType.AttenuatiuonBand}'`,
						meter1: detailOption(`band${band}_meter1`),
						meter2: detailOption(`band${band}_meter2`),
						marker: detailOption(`band${band}_marker`),
						dsp: detailOption('dsp'),
					},
				),
			),
		},
	}
	self.setCompositeElementDefinitions(compositeElements)
}
