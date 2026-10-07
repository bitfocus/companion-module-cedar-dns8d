import { describe, expect, it } from 'vitest'
import { SetVarValues } from '../updateVariableValues.js'
import { UpdateVariableDefinitions } from '../variables.js'
import { fakeInstance } from './fixtures.js'

/**
 * Synthetic, not a device capture: the smallest message with every element SetVarValues dereferences, laid out as the
 * parser expects. Enough to exercise which variables get written, not evidence of what the device sends. Swap in a
 * real capture when there is one.
 */
const MINIMAL_MESSAGE =
	'<dns8d><global on="1" learn="0" fallbackmode="0" swVersion="2" dspVersion="5"/>' +
	'<chan idx="0"><name>Dialog</name><bias dB="2"/><atten dB="-12"/><dns learn="0" on="1" dsp="1"/></chan>' +
	'<chan idx="1"><name>Boom</name><bias dB="0"/><atten dB="-6"/><dns learn="1" on="0" dsp="0"/></chan>' +
	'<group idx="0"><name>Dialog</name><band idx="0"><bias dB="1"/><atten dB="-3"/></band>' +
	'<band idx="1"><bias dB="0"/><atten dB="-4"/></band></group></dns8d>'

describe('variables', () => {
	it('defines exactly the variables SetVarValues writes', () => {
		const { self, setVariableDefinitions, setVariableValues } = fakeInstance()
		UpdateVariableDefinitions(self)
		SetVarValues(MINIMAL_MESSAGE, self)

		const defined = Object.keys(setVariableDefinitions.mock.calls[0][0]).sort()
		const written = Object.keys(setVariableValues.mock.calls[0][0]).sort()
		expect(written).toEqual(defined)
		// 5 global, 10 for each of 8 channels, 11 for the selected group, 6 for each of 6 bands
		expect(defined).toHaveLength(5 + 10 * 8 + 11 + 6 * 6)
	})

	it('writes parsed values and rechecks every feedback', () => {
		const { self, setVariableValues, checkAllFeedbacks } = fakeInstance()
		SetVarValues(MINIMAL_MESSAGE, self)

		expect(setVariableValues.mock.calls[0][0]).toMatchObject({
			global_On: true,
			global_swVersion: 2,
			channel1_Name: 'Dialog',
			channel1_Attenuation: -12,
			channel2_Learn: true,
			band1_Bias: 1,
			band2_Attenuation: -4,
		})
		expect(checkAllFeedbacks).toHaveBeenCalledOnce()
	})

	// The parser used to convert element text that looked numeric, so these came back as 7, 1000 and 26
	it.each(['007', '1e3', '0x1A'])('keeps a channel named %s as written', (name) => {
		const { self, setVariableValues } = fakeInstance()
		SetVarValues(MINIMAL_MESSAGE.replace('<name>Dialog</name>', `<name>${name}</name>`), self)

		expect(setVariableValues.mock.calls[0][0]).toMatchObject({ channel1_Name: name })
	})

	// selectedGroup_Active2 used to read the first value, duplicating Active1
	it('reads the selected group active reduction as max then average, like channels and bands', () => {
		const { self, setVariableValues } = fakeInstance()
		SetVarValues(MINIMAL_MESSAGE.replace('<group idx="0">', '<group idx="0"><activ>-6 -2</activ>'), self)

		expect(setVariableValues.mock.calls[0][0]).toMatchObject({
			selectedGroup_Active1: -6,
			selectedGroup_Active2: -2,
		})
	})

	// selectedGroup_Power1 and Power2 were never parsed, so stayed at their initial -100
	it('reads the selected group power as signal then noise, like channels and bands', () => {
		const { self, setVariableValues } = fakeInstance()
		SetVarValues(MINIMAL_MESSAGE.replace('<group idx="0">', '<group idx="0"><power>-30 -70</power>'), self)

		expect(setVariableValues.mock.calls[0][0]).toMatchObject({
			selectedGroup_Power1: -30,
			selectedGroup_Power2: -70,
		})
	})
})
