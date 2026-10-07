import { describe, expect, it } from 'vitest'
import { ButtonGraphicsDecorationType } from '@companion-module/base'
import { UpdatePresets } from '../presets.js'
import { CompositeElementId, UpdateCompositeElements } from '../composites.js'
import { UpdateVariableDefinitions } from '../variables.js'
import { ActionId } from '../actions.js'
import { CHANNELS, ParameterType } from '../message.js'
import { fakeInstance } from './fixtures.js'

function build() {
	const fake = fakeInstance()
	UpdatePresets(fake.self)
	UpdateCompositeElements(fake.self)
	UpdateVariableDefinitions(fake.self)
	const [structure, presets] = fake.setPresetDefinitions.mock.calls[0]
	return {
		structure,
		presets,
		composites: fake.setCompositeElementDefinitions.mock.calls[0][0],
		variables: fake.setVariableDefinitions.mock.calls[0][0],
	}
}

function layered(id: string) {
	const preset = build().presets[id]
	if (preset?.type !== 'layered') throw new Error(`${id} is not a layered preset`)
	return preset
}

function compositeIn(id: string) {
	const element = layered(id).elements.find((e) => e.type === 'composite')
	if (element?.type !== 'composite') throw new Error(`${id} places no composite`)
	return element
}

const variable = (id: string) => ({ isExpression: true, value: `$(generic-module:${id})` })

describe('channel presets', () => {
	it.each(CHANNELS)('channel %i feeds the Channel Status composite from its own variables', (i) => {
		expect(compositeIn(i.toString())).toMatchObject({
			elementId: CompositeElementId.ChannelStatus,
			x: 0,
			y: 0,
			width: 100,
			height: 100,
			options: {
				active1: variable(`channel${i}_Active1`),
				active2: variable(`channel${i}_Active2`),
				power1: variable(`channel${i}_Power1`),
				power2: variable(`channel${i}_Power2`),
				atten: variable(`channel${i}_Attenuation`),
				bias: variable(`channel${i}_Bias`),
				learn: variable(`channel${i}_Learn`),
				on: variable(`channel${i}_On`),
				dsp: variable(`channel${i}_DSP`),
			},
		})
	})

	it('keeps the text of the simple preset it replaces', () => {
		const text = layered('3').elements.find((e) => e.type === 'text')

		expect(text).toMatchObject({
			text: {
				isExpression: true,
				value: `\`\\n$\{substr($(generic-module:channel3_Name),0,9)}\nAtten:\n$\{toFixed($(generic-module:channel3_Attenuation),1)} dB\nBias:\n$\{toFixed($(generic-module:channel3_Bias),1)} dB\``,
			},
			halign: 'left',
			valign: 'top',
			// Size 10 with the top bar hidden, as Companion converts it
			fontsize: 16.7,
		})
		expect(layered('3').canvas).toEqual({ decoration: ButtonGraphicsDecorationType.Border })
	})

	it('toggles DNS on when pressed', () => {
		expect(layered('5').steps).toEqual([
			{
				down: [{ actionId: ActionId.channelOn, options: { channel: 5, value: '2' }, delay: 0, headline: 'Toggle DNS' }],
				up: [],
			},
		])
	})
})

describe('detail presets', () => {
	it.each([
		{
			id: 'attenDetail',
			type: ParameterType.AttenuatiuonBand,
			meter1: 'Active1',
			meter2: 'Active2',
			marker: 'Attenuation',
		},
		{ id: 'biasDetail', type: ParameterType.BiasBand, meter1: 'Power1', meter2: 'Power2', marker: 'Bias' },
	])('$id feeds the Detailed Meters composite its bands', ({ id, type, meter1, meter2, marker }) => {
		const composite = compositeIn(id)

		expect(composite).toMatchObject({
			elementId: CompositeElementId.DetailedMeters,
			options: { type, dsp: variable('selectedGroup_DSP') },
		})
		expect(composite.options).toMatchObject({
			band1_meter1: variable(`band1_${meter1}`),
			band4_meter2: variable(`band4_${meter2}`),
			band6_marker: variable(`band6_${marker}`),
		})
	})
})

describe('all presets', () => {
	it('keep their sections', () => {
		expect(build().structure).toEqual([
			{ id: 'channelStatus', name: 'Channel Status', definitions: ['1', '2', '3', '4', '5', '6', '7', '8'] },
			{ id: 'detailView', name: 'Detail View', definitions: ['attenDetail', 'biasDetail'] },
		])
	})

	it('only reference variables the module defines', () => {
		const { presets, variables } = build()
		const referenced = [...JSON.stringify(presets).matchAll(/\$\(generic-module:(\w+)\)/g)].map((match) => match[1])

		expect(referenced.length).toBeGreaterThan(0)
		expect(referenced.filter((id) => !(id in variables))).toEqual([])
	})

	it('give every composite they place a value for every option it defines', () => {
		const { presets, composites } = build()
		for (const preset of Object.values(presets)) {
			if (preset?.type !== 'layered') throw new Error('expected only layered presets')
			for (const element of preset.elements) {
				if (element.type !== 'composite') continue
				const definition = composites[element.elementId]
				if (!definition) throw new Error(`${element.elementId} is not a defined composite`)

				expect(Object.keys(element.options).sort()).toEqual(definition.options.map((option) => option.id).sort())
			}
		}
	})
})
