import { combineRgb, type CompanionFeedbackDefinition, DropdownChoice } from '@companion-module/base'
import type { CedarDNS8DInstance } from './main.js'

const styles = {
	red: {
		bgcolor: combineRgb(255, 0, 0),
		color: combineRgb(0, 0, 0),
	},
	green: {
		bgcolor: combineRgb(0, 204, 0),
		color: combineRgb(0, 0, 0),
	},
	white: {
		bgcolor: combineRgb(255, 255, 255),
		color: combineRgb(0, 0, 0),
	},
	dnsLightBlue: {
		bgcolor: combineRgb(0, 222, 222),
		color: combineRgb(0, 0, 0),
	},
	dnsDarkBlue: {
		bgcolor: combineRgb(0, 111, 111),
		color: combineRgb(0, 0, 0),
	},
}
export enum FeedbackId {
	channelLearn = 'channelLearn',
	channelDSP = 'channelDSP',
	channelOn = 'channelOn',
}

export function UpdateFeedbacks(self: CedarDNS8DInstance): void {
	const channels: DropdownChoice[] = []
	for (let i = 1; i <= 8; i++) {
		const chan = self.getChannel(i)
		channels[i - 1] = { id: i, label: chan.name }
	}
	const feedbacks: { [id in FeedbackId]: CompanionFeedbackDefinition | undefined } = {
		[FeedbackId.channelLearn]: {
			name: 'Channel Learn',
			type: 'boolean',
			defaultStyle: styles.dnsLightBlue,
			options: [
				{
					id: 'channel',
					type: 'dropdown',
					label: 'Channel',
					choices: channels,
					default: 1,
					allowCustom: true,
				},
			],
			callback: async (feedback, context) => {
				const id = Number(await context.parseVariablesInString(feedback.options['channel']?.toString() ?? '0'))
				if (isNaN(id)) return false
				const chan = self.getChannel(id)
				return chan.learn
			},
		},
		[FeedbackId.channelDSP]: {
			name: 'Channel DSP',
			type: 'boolean',
			defaultStyle: styles.dnsLightBlue,
			options: [
				{
					id: 'channel',
					type: 'dropdown',
					label: 'Channel',
					choices: channels,
					default: 1,
					allowCustom: true,
				},
			],
			callback: async (feedback, context) => {
				const id = Number(await context.parseVariablesInString(feedback.options['channel']?.toString() ?? '0'))
				if (isNaN(id)) return false
				const chan = self.getChannel(id)
				return chan.dsp
			},
		},
		[FeedbackId.channelOn]: {
			name: 'Channel On',
			type: 'boolean',
			defaultStyle: styles.dnsLightBlue,
			options: [
				{
					id: 'channel',
					type: 'dropdown',
					label: 'Channel',
					choices: channels,
					default: 1,
					allowCustom: true,
				},
			],
			callback: async (feedback, context) => {
				const id = Number(await context.parseVariablesInString(feedback.options['channel']?.toString() ?? ''))
				if (isNaN(id)) return false
				const chan = self.getChannel(id)
				return chan.on
			},
		},
	}
	self.setFeedbackDefinitions(feedbacks)
}
