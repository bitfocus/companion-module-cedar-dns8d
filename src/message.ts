/** The device's channels, and the bands of its detail view, numbered from 1 as the user sees them */
export const CHANNELS = [1, 2, 3, 4, 5, 6, 7, 8] as const
export type ChannelNumber = (typeof CHANNELS)[number]
export const BANDS = [1, 2, 3, 4, 5, 6] as const
export type BandNumber = (typeof BANDS)[number]

export enum ParameterType {
	Attenuatiuon = 'atten',
	AttenuatiuonBand = 'attenBand',
	Bias = 'bias',
	BiasBand = 'biasBand',
	Learn = 'learn',
	Name = 'name',
	None = 'none',
	On = 'on',
}

/** Escapes text for an XML element or a double-quoted attribute */
export function escapeXml(text: string): string {
	return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function BuildMessage(
	channel: number,
	parameter: ParameterType,
	value: string | number,
	group: number = 1,
	band: number = 1,
): string {
	// Truncate before escaping, so the limit counts the characters themselves and can't cut an entity in half
	const safeValue = escapeXml(value.toString().substring(0, 17))
	let message = '<dns8>'
	for (let i = 1; i <= 8; i++) {
		message += `<chan idx="${i - 1}">`
		message += parameter === ParameterType.Name && i === channel ? `<name>${safeValue}</name>` : `<name/>`
		message += parameter === ParameterType.Bias && i === channel ? `<bias dB="${safeValue}"/>` : `<bias/>`
		message += parameter === ParameterType.Attenuatiuon && i === channel ? `<atten dB="${safeValue}"/>` : `<atten/>`
		message += `<dns`
		message += parameter === ParameterType.Learn && i === channel ? ` learn="${safeValue}"` : ''
		message += parameter === ParameterType.On && i === channel ? ` on="${safeValue}"` : ''
		message += `/>`
		message += `</chan>`
	}
	message += `<group idx="${group - 1}"><name/><bias/><atten/>`
	for (let i = 1; i <= 6; i++) {
		message += `<band idx="${i - 1}">`
		message += parameter === ParameterType.BiasBand && i === band ? `<bias dB="${safeValue}"/>` : `<bias/>`
		message += parameter == ParameterType.AttenuatiuonBand && i === band ? `<atten dB="${safeValue}"/>` : `<atten/>`
		message += `</band>`
	}
	message += `</group>`
	message += `<global`
	message += parameter === ParameterType.Learn && 0 === channel ? ` learn="${safeValue}"` : ''
	message += parameter === ParameterType.On && 0 === channel ? ` on="${safeValue}"` : ''
	message += `/>`
	message += '</dns8>'
	return message
}
