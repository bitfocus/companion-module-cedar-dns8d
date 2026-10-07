import { combineRgb } from '@companion-module/base'

// Its own module so utils.ts can draw with these without importing feedbacks.ts, which imports utils.ts
export const colours = {
	white: combineRgb(255, 255, 255),
	black: combineRgb(0, 0, 0),
	dnsLightBlue: combineRgb(0, 222, 222),
	dnsDarkBlue: combineRgb(0, 111, 111),
	dnsGrey: combineRgb(91, 91, 91),
	dnsDarkGrey: combineRgb(64, 64, 64),
}
