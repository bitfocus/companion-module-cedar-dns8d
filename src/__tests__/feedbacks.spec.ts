import { describe, expect, it } from 'vitest'
import type {
	CompanionAdvancedFeedbackResult,
	CompanionFeedbackAdvancedEvent,
	CompanionFeedbackCallbackContext,
} from '@companion-module/base'
import { FeedbackId, UpdateFeedbacks } from '../feedbacks.js'
import { ParameterType } from '../message.js'
import { buildIcon } from '../utils.js'
import { fakeInstance } from './fixtures.js'

type AnyAdvancedCallback = (
	feedback: CompanionFeedbackAdvancedEvent,
	context: CompanionFeedbackCallbackContext,
) => CompanionAdvancedFeedbackResult

function setup() {
	const fake = fakeInstance()
	UpdateFeedbacks(fake.self)
	const defs = fake.setFeedbackDefinitions.mock.calls[0][0]

	const runAdvanced = (feedbackId: FeedbackId, options: CompanionFeedbackAdvancedEvent['options']) => {
		const def = defs[feedbackId]
		if (!def || def.type !== 'advanced') throw new Error(`${feedbackId} is not an advanced feedback`)
		const callback = def.callback as AnyAdvancedCallback
		return callback(
			{
				type: 'advanced',
				id: `feedback-${feedbackId}`,
				controlId: 'bank-1',
				feedbackId,
				options,
				previousOptions: null,
				image: { width: 72, height: 72 },
			},
			{ type: 'feedback', signal: new AbortController().signal },
		)
	}
	return { ...fake, defs, runAdvanced }
}

describe('advanced feedbacks', () => {
	it('returns the channel icon base64 encoded, as API 2.x requires', () => {
		const { self, runAdvanced } = setup()
		self.getChannel(1).atten = -10
		const result = runAdvanced(FeedbackId.channelStatus, { channel: 1 })

		expect(typeof result.imageBuffer).toBe('string')
		expect(Buffer.from(result.imageBuffer ?? '', 'base64')).toEqual(Buffer.from(buildIcon(self.getChannel(1), 72, 72)))
	})

	it('declares ARGB, which is what companion-module-utils draws', () => {
		const { runAdvanced } = setup()
		const result = runAdvanced(FeedbackId.channelStatus, { channel: 1 })
		const pixels = Buffer.from(result.imageBuffer ?? '', 'base64')

		expect(result.imageBufferEncoding).toEqual({ pixelFormat: 'ARGB' })
		// Inside the learn indicator, filled opaque dnsGrey (91, 91, 91) while learn is off. Alpha comes first.
		const offset = (67 * 72 + 59) * 4
		expect([...pixels.subarray(offset, offset + 4)]).toEqual([255, 91, 91, 91])
	})

	it('draws nothing for a channel the device does not have', () => {
		const { runAdvanced } = setup()

		expect(runAdvanced(FeedbackId.channelStatus, { channel: 9 })).toEqual({})
	})

	it.each([ParameterType.AttenuatiuonBand, ParameterType.BiasBand])('detailed meters (%s) return an image', (type) => {
		const { runAdvanced } = setup()
		const result = runAdvanced(FeedbackId.detailedMeters, { type })

		expect(Buffer.from(result.imageBuffer ?? '', 'base64')).toHaveLength(72 * 72 * 4)
		expect(result.imageBufferEncoding).toEqual({ pixelFormat: 'ARGB' })
	})

	it.each([FeedbackId.channelStatus, FeedbackId.detailedMeters])('%s declares the property it affects', (id) => {
		const { defs } = setup()
		const def = defs[id]

		expect(def && def.type === 'advanced' ? def.affectedProperties : undefined).toEqual(['imageBuffer'])
	})
})
