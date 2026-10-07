import { graphics } from 'companion-module-utils'
import { colours } from './colours.js'
import type CedarDNS8DInstance from './main.js'
import type { DNS8Channel } from './main.js'
import { BANDS, CHANNELS, ParameterType, type BandNumber, type ChannelNumber } from './message.js'
import type { ToggleValue } from './options.js'

export enum MeterTypes {
	Atten = 'atten',
	Power = 'power',
}

export enum MarkerTypes {
	Atten = 'atten',
	Bias = 'bias',
}

export function parseBooleanFromString(val: string, curVal: boolean): boolean {
	return val === '1' ? true : val === '0' ? false : curVal
}

export function parseStringFromBoolean(val: boolean): '0' | '1' {
	return val ? '1' : '0'
}

export function calcBooleanVal(actVal: ToggleValue, curVal: boolean): '0' | '1' {
	return actVal === '2' ? (!curVal ? '1' : '0') : actVal
}

// Option values are restored from saved buttons, so a channel or band the device doesn't have can still arrive
export function isChannel(id: number): id is ChannelNumber {
	return (CHANNELS as readonly number[]).includes(id)
}

export function isBand(id: number): id is BandNumber {
	return (BANDS as readonly number[]).includes(id)
}

export function calcAttenBiasVal(actVal: number, curVal: number, rel: boolean, min: number, max: number): number {
	let value = actVal
	if (rel) {
		value += curVal
	}
	return value > max ? max : value < min ? min : value
}

export function meterValue(value: number, type: MeterTypes): number {
	switch (type) {
		case MeterTypes.Atten:
			return Math.abs(value * 5)
		case MeterTypes.Power:
			return 100 - Math.abs(value) * 1.25
	}
}

export function markerOffset(
	height: number,
	value: number,
	type: MarkerTypes,
	offsetY = 6,
	barLengthOffset = 16,
): number {
	switch (type) {
		case MarkerTypes.Atten:
			return offsetY - 1 + Math.round((height - barLengthOffset) * ((Math.abs(value) * 5) / 100))
		case MarkerTypes.Bias:
			return offsetY - 1 + Math.round((height - barLengthOffset) * ((Math.abs(value - 10) * 5) / 100))
	}
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

export function buildIcon(chan: DNS8Channel, width = 72, height = 72): Uint8Array {
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
		value: meterValue(chan.active1, MeterTypes.Atten),
		colors: meterDark,
		offsetX: meter1offsetX,
	}
	const atten2: graphics.OptionsBar = {
		...defaults,
		value: meterValue(chan.active2, MeterTypes.Atten),
		colors: meterLight,
		offsetX: meter1offsetX,
	}
	const power1: graphics.OptionsBar = {
		...defaults,
		value: meterValue(chan.power1, MeterTypes.Power),
		colors: meterDark,
		offsetX: meter2offsetX,
		reverse: false,
	}
	const power2: graphics.OptionsBar = {
		...defaults,
		value: meterValue(chan.power2, MeterTypes.Power),
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
		offsetY: markerOffset(height, chan.atten, MarkerTypes.Atten),
	}
	const biasMarker: graphics.OptionsRect = {
		...markerDefault,
		width: width,
		height: height,
		offsetX: meter2offsetX - 1,
		offsetY: markerOffset(height, chan.bias, MarkerTypes.Bias),
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

export function buildDetailIcon(
	self: CedarDNS8DInstance,
	group: DNS8Channel,
	type: ParameterType,
	width = 72,
	height = 72,
): Uint8Array {
	const elements: Uint8Array[] = []
	const offsetY = 16
	const barLengthOffset = 20
	const defaults = {
		...meterDefault,
		width: width,
		height: height,
		offsetY: offsetY,
		barLength: height - barLengthOffset,
	}
	const meterType = type === ParameterType.BiasBand ? MeterTypes.Power : MeterTypes.Atten
	const meterTypeBool = type === ParameterType.BiasBand
	const meterDark = group.dsp ? meterColours.darkBlue : meterColours.darkGrey
	const meterLight = group.dsp ? meterColours.lightBlue : meterColours.grey
	const meter1offsetX = 8
	for (let i = 0; i <= 5; i++) {
		const band = self.getBand(i + 1)
		const meter1: graphics.OptionsBar = {
			...defaults,
			value: meterValue(meterTypeBool ? band.power1 : band.active1, meterType),
			colors: meterDark,
			offsetX: meter1offsetX + i * 10,
			reverse: type === ParameterType.AttenuatiuonBand,
		}
		const meter2: graphics.OptionsBar = {
			...defaults,
			value: meterValue(meterTypeBool ? band.power2 : band.active2, meterType),
			colors: meterLight,
			offsetX: meter1offsetX + i * 10,
			reverse: type === ParameterType.AttenuatiuonBand,
		}
		const marker: graphics.OptionsRect = {
			...markerDefault,
			width: width,
			height: height,
			offsetX: meter1offsetX + i * 10 - 1,
			offsetY: markerOffset(
				height,
				meterTypeBool ? band.bias : band.atten,
				meterTypeBool ? MarkerTypes.Bias : MarkerTypes.Atten,
				offsetY,
				barLengthOffset,
			),
			color: meterTypeBool ? colours.dnsGrey : colours.dnsDarkBlue,
			fillColor: meterTypeBool ? colours.black : colours.dnsLightBlue,
		}
		elements.push(graphics.bar(meter1))
		elements.push(graphics.bar(meter2))
		elements.push(graphics.rect(marker))
	}
	return graphics.stackImage(elements)
}
