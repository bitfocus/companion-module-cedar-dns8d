import { graphics } from 'companion-module-utils'
import { colours } from './feedbacks.js'
import type { CedarDNS8DInstance, DNS8Channel } from './main.js'
import { ParameterType } from './message.js'

export function parseBooleanFromString(val: string, curVal: boolean): boolean {
	return val === '1' ? true : val === '0' ? false : curVal
}

export function parseStringFromBoolean(val: boolean): string {
	return val ? '1' : '0'
}

export function calcBooleanVal(actVal: string, curVal: boolean): string {
	return actVal === '2' ? (!curVal ? '1' : '0') : actVal
}

export function calcAttenBiasVal(actVal: number, curVal: number, rel: boolean, min: number, max: number): number {
	let value = actVal
	if (rel) {
		value += curVal
	}
	return value > max ? max : value < min ? min : value
}

function meterValue(value: number, type: 'atten' | 'power'): number {
	switch (type) {
		case 'atten':
			return Math.abs(value * 5)
		case 'power':
			return 100 - Math.abs(value) * 1.25
	}
}

function markerOffset(
	height: number,
	value: number,
	type: 'atten' | 'bias',
	offsetY = 6,
	barLengthOffset = 16,
): number {
	switch (type) {
		case 'atten':
			return offsetY - 1 + Math.round((height - barLengthOffset) * ((Math.abs(value) * 5) / 100))
		case 'bias':
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
	const meterType = type === ParameterType.BiasBand ? 'power' : 'atten'
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
				meterTypeBool ? 'bias' : 'atten',
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
