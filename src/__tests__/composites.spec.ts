import { describe, expect, it } from 'vitest'
import type { SomeButtonGraphicsElement } from '@companion-module/base'
import { CompositeElementId, UpdateCompositeElements } from '../composites.js'
import { colours } from '../colours.js'
import { ParameterType } from '../message.js'
import { MarkerTypes, MeterTypes, markerOffset, meterValue } from '../utils.js'
import { fakeInstance } from './fixtures.js'

/**
 * The advanced feedbacks' drawing code in utils.ts is the reference throughout: meterValue for how full a bar is,
 * markerOffset for where a marker sits, and the pixel layout of buildIcon / buildDetailIcon at 72px.
 */
const ICON = 72

type Options = Record<string, unknown>
type Bounds = { x: number; y: number; width: number; height: number }

/**
 * Evaluates an element property as Companion would. The expressions used here (option references, ternaries,
 * comparisons, abs / min / max) are also valid JavaScript, so this substitutes the options and lets JS run them.
 */
function evaluate(property: unknown, options: Options): unknown {
	if (typeof property !== 'object' || property === null || !('isExpression' in property)) return property
	const { isExpression, value } = property as { isExpression: boolean; value: unknown }
	if (!isExpression) return value
	const source = String(value).replace(/\$\(options:(\w+)\)/g, (_, key: string) => JSON.stringify(options[key]))
	// eslint-disable-next-line @typescript-eslint/no-implied-eval
	return new Function('abs', 'min', 'max', `return (${source})`)(Math.abs, Math.min, Math.max) as unknown
}

const num = (property: unknown, options: Options = {}): number => Number(evaluate(property, options))

/** An element's bounds in px, given its parent's px bounds */
function toPx(element: SomeButtonGraphicsElement, parent: Bounds, options: Options = {}): Bounds {
	const e = element as unknown as Record<keyof Bounds, unknown>
	return {
		x: parent.x + (num(e.x, options) / 100) * parent.width,
		y: parent.y + (num(e.y, options) / 100) * parent.height,
		width: (num(e.width, options) / 100) * parent.width,
		height: (num(e.height, options) / 100) * parent.height,
	}
}

const BUTTON: Bounds = { x: 0, y: 0, width: ICON, height: ICON }

function definitions() {
	const { self, setCompositeElementDefinitions } = fakeInstance()
	UpdateCompositeElements(self)
	return setCompositeElementDefinitions.mock.calls[0][0]
}

function definition(id: CompositeElementId) {
	const def = definitions()[id]
	if (!def) throw new Error(`${id} is not defined`)
	return def
}

/** A meter column group, with helpers to read its bars and marker at given option values */
function column(element: SomeButtonGraphicsElement | undefined) {
	if (element?.type !== 'group') throw new Error('not a meter column group')
	const group = toPx(element, BUTTON)
	const [meter1, meter2, marker] = element.children
	const gauge = (bar: SomeButtonGraphicsElement) => bar as unknown as Record<string, unknown>
	return {
		bar: toPx(meter1, group),
		/** How full a bar draws, 0 to 100: the gauge maps value through min..max and clamps */
		fill: (bar: 'meter1' | 'meter2', options: Options) => {
			const g = gauge(bar === 'meter1' ? meter1 : meter2)
			const fraction = (num(g.value, options) - num(g.min)) / (num(g.max) - num(g.min))
			return Math.max(0, Math.min(100, fraction * 100))
		},
		fillsFromTop: (options: Options) => evaluate(gauge(meter1).reverse, options),
		colours: (options: Options) =>
			[meter1, meter2].map((bar) => num((gauge(bar).stops as { color: unknown }[])[0].color, options)),
		marker: (options: Options) => toPx(marker, group, options),
		markerColours: (options: Options) => {
			const box = marker as unknown as Record<string, unknown>
			return { fill: num(box.color, options), border: num(box.borderColor, options) }
		},
	}
}

const clampPercent = (v: number) => Math.max(0, Math.min(100, v))

describe('Channel Status composite', () => {
	const def = definition(CompositeElementId.ChannelStatus)
	const [attenElement, powerElement, learnElement, onElement] = def.elements
	const atten = column(attenElement)
	const power = column(powerElement)

	it('lays the columns out where buildIcon draws its bars', () => {
		// meter1offsetX = width - 16 and width - 8, from offsetY 6 for height - 16
		expect(atten.bar.x).toBeCloseTo(56)
		expect(power.bar.x).toBeCloseTo(64)
		for (const { bar } of [atten, power]) {
			expect(bar.width).toBeCloseTo(6)
			expect(bar.y).toBeCloseTo(6)
			expect(bar.height).toBeCloseTo(56)
		}
	})

	it.each([0, -3, -10.5, -20, -25])('fills the attenuation bars as meterValue does at %d dB', (db) => {
		const options = { active1: db, active2: db / 2 }
		expect(atten.fill('meter1', options)).toBeCloseTo(clampPercent(meterValue(db, MeterTypes.Atten)))
		expect(atten.fill('meter2', options)).toBeCloseTo(clampPercent(meterValue(db / 2, MeterTypes.Atten)))
		expect(atten.fillsFromTop(options)).toBe(true)
	})

	it.each([0, -12, -40, -80, -100])('fills the power bars as meterValue does at %d dB', (db) => {
		const options = { power1: db, power2: db - 10 }
		expect(power.fill('meter1', options)).toBeCloseTo(clampPercent(meterValue(db, MeterTypes.Power)))
		expect(power.fill('meter2', options)).toBeCloseTo(clampPercent(meterValue(db - 10, MeterTypes.Power)))
		expect(power.fillsFromTop(options)).toBe(false)
	})

	// markerOffset rounds to whole pixels; the composite is continuous, so allow half a pixel
	it.each([0, -6, -12.5, -20])('places the attenuation marker as markerOffset does at %d dB', (db) => {
		const marker = atten.marker({ atten: db })
		expect(Math.abs(marker.y - markerOffset(ICON, db, MarkerTypes.Atten))).toBeLessThanOrEqual(0.5)
		expect(marker).toMatchObject({ x: expect.closeTo(55), width: expect.closeTo(8), height: expect.closeTo(3) })
	})

	it.each([-10, -3, 0, 4.5, 10])('places the bias marker as markerOffset does at %d dB', (db) => {
		const marker = power.marker({ bias: db })
		expect(Math.abs(marker.y - markerOffset(ICON, db, MarkerTypes.Bias))).toBeLessThanOrEqual(0.5)
		expect(marker.x).toBeCloseTo(63)
	})

	it('colours the bars blue while DSP is on, grey while off', () => {
		expect(atten.colours({ dsp: true })).toEqual([colours.dnsDarkBlue, colours.dnsLightBlue])
		expect(power.colours({ dsp: false })).toEqual([colours.dnsDarkGrey, colours.dnsGrey])
	})

	it('draws the attenuation marker blue and the bias marker black on grey', () => {
		expect(atten.markerColours({})).toEqual({ fill: colours.dnsLightBlue, border: colours.dnsDarkBlue })
		expect(power.markerColours({})).toEqual({ fill: colours.black, border: colours.dnsGrey })
	})

	it.each([
		{ name: 'learn', element: learnElement, x: 56 },
		{ name: 'on', element: onElement, x: 64 },
	])('draws the $name square under its column, lit while set', ({ name, element, x }) => {
		const box = element as unknown as Record<string, unknown>
		expect(toPx(element, BUTTON)).toMatchObject({
			x: expect.closeTo(x),
			y: expect.closeTo(64),
			width: expect.closeTo(6),
			height: expect.closeTo(6),
		})
		expect(num(box.color, { [name]: true })).toBe(colours.dnsLightBlue)
		expect(num(box.color, { [name]: false })).toBe(colours.dnsGrey)
	})
})

describe('Detailed Meters composite', () => {
	const def = definition(CompositeElementId.DetailedMeters)
	const columns = def.elements.map(column)
	const atten = { type: ParameterType.AttenuatiuonBand }
	const bias = { type: ParameterType.BiasBand }

	it('lays out six columns where buildDetailIcon draws its bands', () => {
		expect(columns).toHaveLength(6)
		columns.forEach(({ bar }, index) => {
			expect(bar.x).toBeCloseTo(8 + index * 10)
			expect(bar.width).toBeCloseTo(6)
			expect(bar.y).toBeCloseTo(16)
			expect(bar.height).toBeCloseTo(52)
		})
	})

	it('shows attenuation from the top, or power from the bottom, following the type option', () => {
		const band3 = columns[2]
		expect(band3.fillsFromTop(atten)).toBe(true)
		expect(band3.fill('meter1', { ...atten, band3_meter1: -8 })).toBeCloseTo(meterValue(-8, MeterTypes.Atten))
		expect(band3.fillsFromTop(bias)).toBe(false)
		expect(band3.fill('meter2', { ...bias, band3_meter2: -40 })).toBeCloseTo(meterValue(-40, MeterTypes.Power))
	})

	it.each([
		{ type: atten, db: -14, markerType: MarkerTypes.Atten },
		{ type: bias, db: 6, markerType: MarkerTypes.Bias },
	])('places a $markerType marker as markerOffset does', ({ type, db, markerType }) => {
		const marker = columns[5].marker({ ...type, band6_marker: db })
		expect(Math.abs(marker.y - markerOffset(ICON, db, markerType, 16, 20))).toBeLessThanOrEqual(0.5)
		expect(marker.x).toBeCloseTo(8 + 5 * 10 - 1)
	})
})

describe('meter bars', () => {
	// Companion draws a gauge's unlit track at 70% by default; the image buffers leave it transparent
	it.each(Object.values(CompositeElementId))('%s: leave the unlit part of every bar transparent', (id) => {
		const gauges = JSON.stringify(definition(id).elements).match(/"type":"gauge"/g) ?? []
		const transparent = JSON.stringify(definition(id).elements).match(/"trackStyle":"transparent","trackAmount":0/g)

		expect(gauges.length).toBeGreaterThan(0)
		expect(transparent).toHaveLength(gauges.length)
	})
})

describe('composite options', () => {
	it.each(Object.values(CompositeElementId))('%s: every option its elements read is defined', (id) => {
		const def = definition(id)
		const defined = def.options.map((option) => option.id)
		const read = [...JSON.stringify(def.elements).matchAll(/\$\(options:(\w+)\)/g)].map((match) => match[1])

		expect(new Set(read)).toEqual(new Set(defined))
	})
})
