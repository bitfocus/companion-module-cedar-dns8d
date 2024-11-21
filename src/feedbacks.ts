import { combineRgb, type CompanionFeedbackDefinition, DropdownChoice } from '@companion-module/base'
import { channelOption, meterOption } from './options.js'
import type { CedarDNS8DInstance } from './main.js'
import { buildIcon, buildDetailIcon } from './utils.js'
import { ParameterType } from './message.js'

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

export const colours = {
	white: combineRgb(255, 255, 255),
	black: combineRgb(0, 0, 0),
	dnsLightBlue: combineRgb(0, 222, 222),
	dnsDarkBlue: combineRgb(0, 111, 111),
	dnsGrey: combineRgb(91, 91, 91),
	dnsDarkGrey: combineRgb(64, 64, 64),
}

const styles = {
	dnsLightBlue: {
		bgcolor: colours.dnsLightBlue,
		color: colours.black,
	},
}

export function UpdateFeedbacks(self: CedarDNS8DInstance): void {
	const channels: DropdownChoice[] = []
	for (let i = 1; i <= 8; i++) {
		const chan = self.getChannel(i)
		channels.push({ id: i, label: chan.name })
	}
	const chanList = { ...channelOption, choices: channels }
	const feedbacks: { [id in FeedbackId]: CompanionFeedbackDefinition | undefined } = {
		[FeedbackId.channelLearn]: {
			name: 'Channel Learn',
			type: 'boolean',
			defaultStyle: styles.dnsLightBlue,
			options: [chanList],
			callback: async (feedback, context) => {
				const id = Number(await context.parseVariablesInString(feedback.options['channel']?.toString() ?? '0'))
				if (isNaN(id)) return false
				return self.getChannel(id).learn
			},
		},
		[FeedbackId.channelDSP]: {
			name: 'Channel DSP',
			type: 'boolean',
			defaultStyle: styles.dnsLightBlue,
			options: [chanList],
			callback: async (feedback, context) => {
				const id = Number(await context.parseVariablesInString(feedback.options['channel']?.toString() ?? '0'))
				if (isNaN(id)) return false
				return self.getChannel(id).dsp
			},
		},
		[FeedbackId.channelOn]: {
			name: 'Channel On',
			type: 'boolean',
			defaultStyle: styles.dnsLightBlue,
			options: [chanList],
			callback: async (feedback, context) => {
				const id = Number(await context.parseVariablesInString(feedback.options['channel']?.toString() ?? ''))
				if (isNaN(id)) return false
				return self.getChannel(id).on
			},
		},
		[FeedbackId.channelStatus]: {
			name: 'Channel Status',
			type: 'advanced',
			options: [chanList],
			callback: async (feedback, context) => {
				const id = Number(await context.parseVariablesInString(feedback.options['channel']?.toString() ?? ''))
				if (isNaN(id)) return {}
				return { imageBuffer: buildIcon(self.getChannel(id), feedback.image?.width, feedback.image?.height) }
			},
		},
		[FeedbackId.detailedMeters]: {
			name: 'Detailed Meters',
			type: 'advanced',
			options: [meterOption],
			callback: (feedback) => {
				const type =
					(feedback.options['type']?.toString() ?? '') === ParameterType.AttenuatiuonBand.toString()
						? ParameterType.AttenuatiuonBand
						: ParameterType.BiasBand
				return {
					imageBuffer: buildDetailIcon(
						self,
						self.dns8d.selectedGroupProps,
						type,
						feedback.image?.width,
						feedback.image?.height,
					),
				}
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
