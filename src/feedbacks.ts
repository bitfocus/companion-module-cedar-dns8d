import type { CompanionAdvancedFeedbackResult, CompanionFeedbackDefinitions } from '@companion-module/base'
import { colours } from './colours.js'
import { channelOption, meterOption, type MeterType } from './options.js'
import type CedarDNS8DInstance from './main.js'
import { buildIcon, buildDetailIcon, isChannel } from './utils.js'
import { CHANNELS, ParameterType } from './message.js'

/**
 * Feedback ids. The values are the ids saved against every button using the feedback, so they must never change —
 * they predate this enum and are camelCase for that reason.
 */
export enum FeedbackId {
	channelLearn = 'channelLearn',
	channelDSP = 'channelDSP',
	channelOn = 'channelOn',
	channelStatus = 'channelStatus',
	detailedMeters = 'detailedMeters',
	globalLearn = 'globalLearn',
	globalOn = 'globalOn',
	fallbackMode = 'fallbackMode',
}

type ChannelOptions = { channel: number }
type NoOptions = Record<string, never>

export type FeedbackSchema = {
	[FeedbackId.channelLearn]: { type: 'boolean'; options: ChannelOptions }
	[FeedbackId.channelDSP]: { type: 'boolean'; options: ChannelOptions }
	[FeedbackId.channelOn]: { type: 'boolean'; options: ChannelOptions }
	[FeedbackId.channelStatus]: { type: 'advanced'; options: ChannelOptions }
	[FeedbackId.detailedMeters]: { type: 'advanced'; options: { type: MeterType } }
	[FeedbackId.globalLearn]: { type: 'boolean'; options: NoOptions }
	[FeedbackId.globalOn]: { type: 'boolean'; options: NoOptions }
	[FeedbackId.fallbackMode]: { type: 'boolean'; options: NoOptions }
}

const styles = {
	dnsLightBlue: {
		bgcolor: colours.dnsLightBlue,
		color: colours.black,
	},
}

/**
 * API 2.x takes the image buffer base64 encoded. companion-module-utils draws 32 bit ARGB pixels, so say so rather
 * than leave Companion to assume a format.
 */
export function imageResult(buffer: Uint8Array): CompanionAdvancedFeedbackResult {
	return {
		imageBuffer: Buffer.from(buffer).toString('base64'),
		imageBufferEncoding: { pixelFormat: 'ARGB' },
	}
}

export function UpdateFeedbacks(self: CedarDNS8DInstance): void {
	const chanList = channelOption(CHANNELS.map((i) => self.getChannel(i).name))
	const feedbacks: CompanionFeedbackDefinitions<FeedbackSchema> = {
		[FeedbackId.channelLearn]: {
			name: 'Channel Learn',
			type: 'boolean',
			defaultStyle: styles.dnsLightBlue,
			options: [chanList],
			callback: (feedback) => {
				const id = feedback.options.channel
				return isChannel(id) && self.getChannel(id).learn
			},
		},
		[FeedbackId.channelDSP]: {
			name: 'Channel DSP',
			type: 'boolean',
			defaultStyle: styles.dnsLightBlue,
			options: [chanList],
			callback: (feedback) => {
				const id = feedback.options.channel
				return isChannel(id) && self.getChannel(id).dsp
			},
		},
		[FeedbackId.channelOn]: {
			name: 'Channel On',
			type: 'boolean',
			defaultStyle: styles.dnsLightBlue,
			options: [chanList],
			callback: (feedback) => {
				const id = feedback.options.channel
				return isChannel(id) && self.getChannel(id).on
			},
		},
		[FeedbackId.channelStatus]: {
			name: 'Channel Status',
			type: 'advanced',
			affectedProperties: ['imageBuffer'],
			options: [chanList],
			callback: (feedback) => {
				const id = feedback.options.channel
				if (!isChannel(id)) return {}
				return imageResult(buildIcon(self.getChannel(id), feedback.image?.width, feedback.image?.height))
			},
		},
		[FeedbackId.detailedMeters]: {
			name: 'Detailed Meters',
			type: 'advanced',
			affectedProperties: ['imageBuffer'],
			options: [meterOption],
			callback: (feedback) => {
				const type =
					feedback.options.type === ParameterType.AttenuatiuonBand
						? ParameterType.AttenuatiuonBand
						: ParameterType.BiasBand
				return imageResult(
					buildDetailIcon(self, self.dns8d.selectedGroupProps, type, feedback.image?.width, feedback.image?.height),
				)
			},
		},
		[FeedbackId.globalLearn]: {
			name: 'Global Learn',
			type: 'boolean',
			defaultStyle: styles.dnsLightBlue,
			options: [],
			callback: () => {
				return self.dns8d.globalLearn
			},
		},
		[FeedbackId.globalOn]: {
			name: 'Global On',
			type: 'boolean',
			defaultStyle: styles.dnsLightBlue,
			options: [],
			callback: () => {
				return self.dns8d.globalOn
			},
		},
		[FeedbackId.fallbackMode]: {
			name: 'Fallback Mode',
			type: 'boolean',
			defaultStyle: styles.dnsLightBlue,
			options: [],
			callback: () => {
				return self.dns8d.fallbackMode
			},
		},
	}
	self.setFeedbackDefinitions(feedbacks)
}
