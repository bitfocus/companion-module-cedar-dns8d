import { CedarDNS8DInstance } from './main.js'

export function BuildMessage(
	channel: number,
	parameter: 'learn' | 'on' | 'bias' | 'atten' | 'name',
	value: string | number,
	self: CedarDNS8DInstance,
): void {
	if (channel < 0 || channel > 8) return
	if (channel === 0 && !(parameter === 'learn' || parameter === 'on')) return
	if (parameter === 'bias' && (isNaN(Number(value)) || Number(value) > 10 || Number(value) < -10)) return
	if (parameter === 'atten' && (isNaN(Number(value)) || Number(value) > 0 || Number(value) < -20)) return
	if ((parameter === 'learn' || parameter === 'on') && !(value === '1' || value === '0')) return
	const safeValue = value.toString().substring(0, 17)
	let message = '<dns8>'
	for (let i = 1; i <= 8; i++) {
		if (i === channel) {
			message += `<chan idx="${i - 1}">`
			message += parameter === 'name' ? `<name>${safeValue}</name>` : `<name/>`
			message += parameter === 'bias' ? `<bias dB="${safeValue}"/>` : `<bias/>`
			message += parameter === 'atten' ? `<atten dB="${safeValue}"/>` : `<atten/>`
			if (parameter === 'learn') {
				message += `<dns learn="${safeValue}"/>`
			} else if (parameter === 'on') {
				message += `<dns on="${safeValue}"/>`
			} else {
				message += `<dns/>`
			}
			message += `</chan>`
		} else {
			message += `<chan idx="${i - 1}"><name/><bias/><atten/><dns/></chan>`
		}
	}
	message +=
		'<group idx="0"><name/><bias/><atten/><band idx="0"><bias/><atten/></band><band idx="1"><bias/><atten/></band><band idx="2"><bias/><atten/></band><band idx="3"><bias/><atten/></band><band idx="4"><bias/><atten/></band><band idx="5"><bias/><atten/></band></group>'
	if (channel === 0) {
		if (parameter === 'learn') {
			message += `<global learn="${safeValue}"/>`
		} else if (parameter === 'on') {
			message += `<global on="${safeValue}"/>`
		} else {
			message += `<global/>`
		}
	} else {
		message += `<global/>`
	}
	message += '</dns8>'
	//console.log(message)
	self.sendMessage(message).catch(() => {})
}
