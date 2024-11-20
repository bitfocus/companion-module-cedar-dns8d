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

export function BuildMessage(
	channel: number,
	parameter: ParameterType,
	value: string | number,
	group: number = 1,
	band: number = 1,
): string {
	const safeValue = value.toString().substring(0, 17)
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
		message += ParameterType.BiasBand && band === i ? `<bias dB="${safeValue}"/>` : `<bias/>`
		message += ParameterType.AttenuatiuonBand && band === i ? `<atten dB="${safeValue}"/>` : `<atten/>`
		message += `</band>`
	}
	message += `<global`
	message += parameter === ParameterType.Learn && 0 === channel ? ` learn="${safeValue}"` : ''
	message += parameter === ParameterType.On && 0 === channel ? ` on="${safeValue}"` : ''
	message += `/>`
	message += '</dns8>'
	return message
}
