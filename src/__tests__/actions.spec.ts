import { describe, expect, it } from 'vitest'
import { ActionId, UpdateActions } from '../actions.js'
import { AddToActionRecording } from '../actionRecorder.js'
import { ParameterType } from '../message.js'
import { fakeInstance, learnAction, runAction } from './fixtures.js'

function setup() {
	const fake = fakeInstance()
	UpdateActions(fake.self)
	return { ...fake, defs: fake.setActionDefinitions.mock.calls[0][0] }
}

describe('action callbacks', () => {
	it('forwards the context signal, so a queued message the user no longer wants is dropped', async () => {
		const { defs, buildMessage } = setup()
		const signal = new AbortController().signal
		await runAction(defs, ActionId.channelOn, { channel: 3, value: '1' }, signal)

		expect(buildMessage).toHaveBeenCalledWith(3, ParameterType.On, '1', { signal })
	})

	it('toggles from the current state', async () => {
		const { self, defs, buildMessage } = setup()
		self.getChannel(2).learn = true
		await runAction(defs, ActionId.channelLearn, { channel: 2, value: '2' })

		expect(buildMessage).toHaveBeenCalledWith(2, ParameterType.Learn, '0', expect.anything())
	})

	it('clamps a relative step to the device range', async () => {
		const { self, defs, buildMessage } = setup()
		self.getChannel(1).atten = -15
		await runAction(defs, ActionId.channelAtten, { channel: 1, value: -10, relative: true })
		self.getChannel(1).bias = 8
		await runAction(defs, ActionId.channelBias, { channel: 1, value: 5, relative: true })

		expect(buildMessage).toHaveBeenNthCalledWith(1, 1, ParameterType.Attenuatiuon, -20, expect.anything())
		expect(buildMessage).toHaveBeenNthCalledWith(2, 1, ParameterType.Bias, 10, expect.anything())
	})

	it('sends a band level to the selected group', async () => {
		const { defs, buildMessage } = setup()
		const signal = new AbortController().signal
		await runAction(defs, ActionId.bandBias, { band: 6, value: -4, relative: false }, signal)

		expect(buildMessage).toHaveBeenCalledWith(0, ParameterType.BiasBand, -4, { band: 6, signal })
	})

	// Detail Attenuation used to accept bands 7 and 8, which the detail view doesn't have
	it.each([ActionId.bandAtten, ActionId.bandBias])('%s rejects band 7', async (actionId) => {
		const { defs, buildMessage } = setup()

		await expect(runAction(defs, actionId, { band: 7, value: -3, relative: false })).rejects.toThrow(
			'Invalid channel: 7',
		)
		expect(buildMessage).not.toHaveBeenCalled()
	})

	it('rejects a channel the device does not have', async () => {
		const { defs, buildMessage } = setup()

		await expect(runAction(defs, ActionId.channelOn, { channel: 9, value: '1' })).rejects.toThrow('Invalid channel: 9')
		expect(buildMessage).not.toHaveBeenCalled()
	})
})

describe('action learn', () => {
	it('returns only the learned values, as a number for a number field', async () => {
		const { self, defs } = setup()
		self.getChannel(2).atten = -7.5

		expect(await learnAction(defs, ActionId.channelAtten, { channel: 2, value: 0, relative: true })).toEqual({
			value: -7.5,
			relative: false,
		})
	})

	it('returns a toggle as its dropdown id', async () => {
		const { self, defs } = setup()
		self.getChannel(4).on = true

		expect(await learnAction(defs, ActionId.channelOn, { channel: 4, value: '2' })).toEqual({ value: '1' })
	})

	it('learns nothing for a channel the device does not have', async () => {
		const { defs } = setup()

		expect(await learnAction(defs, ActionId.channelName, { channel: 0, value: '' })).toBeUndefined()
	})
})

describe('action recording', () => {
	it('records atten and bias as numbers, matching their number fields', () => {
		const { self, recordAction } = setup()
		self.isRecordingActions = true
		AddToActionRecording(ActionId.channelAtten, -4.5, 3, self)

		expect(recordAction).toHaveBeenCalledWith(
			{ actionId: ActionId.channelAtten, options: { value: -4.5, channel: 3, relative: false } },
			'channelAtten 3',
		)
	})

	it('records a boolean as its dropdown id', () => {
		const { self, recordAction } = setup()
		self.isRecordingActions = true
		AddToActionRecording(ActionId.globalOn, true, 0, self)

		expect(recordAction).toHaveBeenCalledWith({ actionId: ActionId.globalOn, options: { value: '1' } }, 'globalOn 0')
	})
})

describe('channel dropdown', () => {
	// Labelled with the name alone, two channels with the same name could not be told apart
	it('labels each channel with its number and name', () => {
		const { self, setActionDefinitions } = fakeInstance()
		self.getChannel(1).name = 'Boom'
		self.getChannel(2).name = 'Boom'
		UpdateActions(self)
		const definition = setActionDefinitions.mock.calls[0][0][ActionId.channelOn]
		if (!definition) throw new Error('channelOn is not defined')
		const channel = definition.options.find((option) => option.id === 'channel')

		expect(channel).toMatchObject({
			choices: expect.arrayContaining([
				{ id: 1, label: '1: Boom' },
				{ id: 2, label: '2: Boom' },
				{ id: 8, label: '8: Ch 8' },
			]),
		})
	})
})
