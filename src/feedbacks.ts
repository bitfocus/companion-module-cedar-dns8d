import { combineRgb, type CompanionFeedbackDefinition, DropdownChoice } from '@companion-module/base'
import { channelOption } from './actions.js'
import type { CedarDNS8DInstance, DNS8Channel } from './main.js'
import { graphics } from 'companion-module-utils'

export enum FeedbackId {
	channelLearn = 'channelLearn',
	channelDSP = 'channelDSP',
	channelOn = 'channelOn',
	channelStatus = 'channelStatus',
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

const meterColours = {
	lightBlue: [{ size: 100, color: colours.dnsLightBlue, background: colours.black, backgroundOpacity: 0 }],
	darkBlue: [{ size: 100, color: colours.dnsDarkBlue, background: colours.black, backgroundOpacity: 0 }],
	grey: [{ size: 100, color: colours.dnsGrey, background: colours.black, backgroundOpacity: 0 }],
	darkGrey: [{ size: 100, color: colours.dnsDarkGrey, background: colours.black, backgroundOpacity: 0 }],
}

const meterDefault: graphics.OptionsBar = {
	width: 72,
	height: 72,
	barWidth: 6,
	barLength: 60,
	opacity: 255,
	reverse: true,
	type: 'vertical',
	colors: meterColours.lightBlue,
	offsetY: 6,
	offsetX: 60,
	value: 0,
}

const rectangleDefault: graphics.OptionsRect = {
	width: 72,
	height: 72,
	color: colours.dnsDarkBlue,
	rectWidth: 6,
	rectHeight: 6,
	strokeWidth: 1,
	fillColor: colours.dnsLightBlue,
	fillOpacity: 255,
	offsetX: 6,
	offsetY: 6,
}

const markerDefault: graphics.OptionsRect = {
	width: 72,
	height: 72,
	color: colours.dnsDarkBlue,
	rectWidth: 8,
	rectHeight: 3,
	strokeWidth: 1,
	fillColor: colours.dnsLightBlue,
	fillOpacity: 255,
	offsetX: 60,
	offsetY: 5,
}

function meterValue(value: number, type: 'atten' | 'power'): number {
	switch (type) {
		case 'atten':
			return Math.abs(value * 5)
		case 'power':
			return 100 - Math.abs(value) * 1.25
	}
}

function markerOffset(height: number, value: number, type: 'atten' | 'bias'): number {
	switch (type) {
		case 'atten':
			return 5 + Math.round((height - 16) * ((Math.abs(value) * 5) / 100))
		case 'bias':
			return 5 + Math.round((height - 16) * ((Math.abs(value - 10) * 5) / 100))
	}
}

function buildIcon(chan: DNS8Channel, width = 72, height = 72): Uint8Array {
	const elements: Uint8Array[] = []
	const defaults = {
		...meterDefault,
		width: width,
		height: height,
		barLength: height - 16,
	}
	const meterDark = chan.dsp ? meterColours.darkBlue : meterColours.darkGrey
	const meterLight = chan.dsp ? meterColours.lightBlue : meterColours.grey
	const meter1offsetX = width - 16
	const meter2offsetX = width - 8
	const atten1: graphics.OptionsBar = {
		...defaults,
		value: meterValue(chan.active1, 'atten'),
		colors: meterDark,
		offsetX: meter1offsetX,
	}
	const atten2: graphics.OptionsBar = {
		...defaults,
		value: meterValue(chan.active2, 'atten'),
		colors: meterLight,
		offsetX: meter1offsetX,
	}
	const power1: graphics.OptionsBar = {
		...defaults,
		value: meterValue(chan.power1, 'power'),
		colors: meterDark,
		offsetX: meter2offsetX,
		reverse: false,
	}
	const power2: graphics.OptionsBar = {
		...defaults,
		value: meterValue(chan.power2, 'power'),
		colors: meterLight,
		offsetX: meter2offsetX,
		reverse: false,
	}
	const learnRect: graphics.OptionsRect = {
		...rectangleDefault,
		width: width,
		height: height,
		color: chan.learn ? colours.dnsDarkBlue : colours.dnsDarkGrey,
		fillColor: chan.learn ? colours.dnsLightBlue : colours.dnsGrey,
		offsetX: meter1offsetX,
		offsetY: height - 8,
	}
	const dnsRect: graphics.OptionsRect = {
		...rectangleDefault,
		width: width,
		height: height,
		color: chan.on ? colours.dnsDarkBlue : colours.dnsDarkGrey,
		fillColor: chan.on ? colours.dnsLightBlue : colours.dnsGrey,
		offsetX: meter2offsetX,
		offsetY: height - 8,
	}
	const attenMarker: graphics.OptionsRect = {
		...markerDefault,
		width: width,
		height: height,
		offsetX: meter1offsetX - 1,
		offsetY: markerOffset(height, chan.atten, 'atten'),
	}
	const biasMarker: graphics.OptionsRect = {
		...markerDefault,
		width: width,
		height: height,
		offsetX: meter2offsetX - 1,
		offsetY: markerOffset(height, chan.bias, 'bias'),
		color: colours.dnsGrey,
		fillColor: colours.black,
	}
	elements.push(graphics.bar(atten1))
	elements.push(graphics.bar(atten2))
	elements.push(graphics.bar(power1))
	elements.push(graphics.bar(power2))
	elements.push(graphics.rect(learnRect))
	elements.push(graphics.rect(dnsRect))
	elements.push(graphics.rect(attenMarker))
	elements.push(graphics.rect(biasMarker))
	return graphics.stackImage(elements)
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
				const chan = self.getChannel(id)
				return chan.learn
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
				const chan = self.getChannel(id)
				return chan.dsp
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
				const chan = self.getChannel(id)
				return chan.on
			},
		},
		[FeedbackId.channelStatus]: {
			name: 'Channel Status',
			type: 'advanced',
			options: [chanList],
			callback: async (feedback, context) => {
				const id = Number(await context.parseVariablesInString(feedback.options['channel']?.toString() ?? ''))
				if (isNaN(id)) return {}
				const chan = self.getChannel(id)
				return { imageBuffer: buildIcon(chan, feedback.image?.width, feedback.image?.height) }
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
