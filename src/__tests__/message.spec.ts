import { describe, expect, it } from 'vitest'
import { XMLParser, XMLValidator } from 'fast-xml-parser'
import { BuildMessage, ParameterType } from '../message.js'

const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: false })
const nameSent = (message: string, channel: number): unknown => parser.parse(message).dns8.chan[channel - 1].name

describe('BuildMessage', () => {
	// Names went into the message unescaped, so these made invalid XML
	it.each(['Bass & Drums', 'Mic <2>', 'Say "hi"'])('sends the name %s as valid XML, read back unchanged', (name) => {
		const message = BuildMessage(2, ParameterType.Name, name)

		expect(XMLValidator.validate(message)).toBe(true)
		expect(nameSent(message, 2)).toBe(name)
	})

	it('limits a name to 17 characters before escaping, so an entity is never cut', () => {
		const message = BuildMessage(1, ParameterType.Name, '&'.repeat(20))

		expect(XMLValidator.validate(message)).toBe(true)
		expect(nameSent(message, 1)).toBe('&'.repeat(17))
	})
})

/**
 * The exact bytes sent, pinned because no device is available to catch a change. Every message lists the whole
 * device, and only the one field being set carries a value, so this poll, which sets nothing, is the base for the rest.
 */
const POLL =
	'<dns8>' +
	'<chan idx="0"><name/><bias/><atten/><dns/></chan>' +
	'<chan idx="1"><name/><bias/><atten/><dns/></chan>' +
	'<chan idx="2"><name/><bias/><atten/><dns/></chan>' +
	'<chan idx="3"><name/><bias/><atten/><dns/></chan>' +
	'<chan idx="4"><name/><bias/><atten/><dns/></chan>' +
	'<chan idx="5"><name/><bias/><atten/><dns/></chan>' +
	'<chan idx="6"><name/><bias/><atten/><dns/></chan>' +
	'<chan idx="7"><name/><bias/><atten/><dns/></chan>' +
	'<group idx="0"><name/><bias/><atten/>' +
	'<band idx="0"><bias/><atten/></band>' +
	'<band idx="1"><bias/><atten/></band>' +
	'<band idx="2"><bias/><atten/></band>' +
	'<band idx="3"><bias/><atten/></band>' +
	'<band idx="4"><bias/><atten/></band>' +
	'<band idx="5"><bias/><atten/></band>' +
	'</group>' +
	'<global/>' +
	'</dns8>'

/** The poll with fragments changed. Each must appear exactly once, so a typo can't leave the poll to pass as is */
function pollWith(...changes: [from: string, to: string][]): string {
	let message = POLL
	for (const [from, to] of changes) {
		expect(message.split(from), `"${from}" should appear once`).toHaveLength(2)
		message = message.replace(from, to)
	}
	return message
}

describe('BuildMessage wire format', () => {
	it('polls with every field empty', () => {
		expect(BuildMessage(0, ParameterType.None, 0)).toBe(POLL)
	})

	it('selects a group by its zero-based index', () => {
		expect(BuildMessage(0, ParameterType.None, 0, 5)).toBe(pollWith(['<group idx="0">', '<group idx="4">']))
	})

	it.each([
		{
			parameter: ParameterType.Name,
			channel: 3,
			value: 'Boom',
			from: '<chan idx="2"><name/>',
			to: '<chan idx="2"><name>Boom</name>',
		},
		{
			parameter: ParameterType.Bias,
			channel: 3,
			value: -4,
			from: '<chan idx="2"><name/><bias/>',
			to: '<chan idx="2"><name/><bias dB="-4"/>',
		},
		{
			parameter: ParameterType.Attenuatiuon,
			channel: 8,
			value: -12.5,
			from: '<chan idx="7"><name/><bias/><atten/>',
			to: '<chan idx="7"><name/><bias/><atten dB="-12.5"/>',
		},
		{
			parameter: ParameterType.Learn,
			channel: 1,
			value: '1',
			from: '<chan idx="0"><name/><bias/><atten/><dns/>',
			to: '<chan idx="0"><name/><bias/><atten/><dns learn="1"/>',
		},
		{
			parameter: ParameterType.On,
			channel: 1,
			value: '0',
			from: '<chan idx="0"><name/><bias/><atten/><dns/>',
			to: '<chan idx="0"><name/><bias/><atten/><dns on="0"/>',
		},
		{ parameter: ParameterType.Learn, channel: 0, value: '1', from: '<global/>', to: '<global learn="1"/>' },
		{ parameter: ParameterType.On, channel: 0, value: '0', from: '<global/>', to: '<global on="0"/>' },
	])('sets $parameter on channel $channel and nothing else', ({ parameter, channel, value, from, to }) => {
		expect(BuildMessage(channel, parameter, value)).toBe(pollWith([from, to]))
	})

	it.each([
		{
			parameter: ParameterType.AttenuatiuonBand,
			band: 6,
			value: -3,
			from: '<band idx="5"><bias/><atten/>',
			to: '<band idx="5"><bias/><atten dB="-3"/>',
		},
		{
			parameter: ParameterType.BiasBand,
			band: 1,
			value: 2,
			from: '<band idx="0"><bias/>',
			to: '<band idx="0"><bias dB="2"/>',
		},
	])('sets $parameter on band $band of the given group, and nothing else', ({ parameter, band, value, from, to }) => {
		expect(BuildMessage(0, parameter, value, 2, band)).toBe(
			pollWith(['<group idx="0">', '<group idx="1">'], [from, to]),
		)
	})

	// An empty element that is opened and closed, not self-closing as the fields being left alone are
	it('sends an empty name as an open and closed element', () => {
		expect(BuildMessage(3, ParameterType.Name, '')).toBe(
			pollWith(['<chan idx="2"><name/>', '<chan idx="2"><name></name>']),
		)
	})

	it('escapes &, <, > and " but leaves \' as written', () => {
		expect(BuildMessage(1, ParameterType.Name, `<A&B> "it's"`)).toBe(
			pollWith(['<chan idx="0"><name/>', `<chan idx="0"><name>&lt;A&amp;B&gt; &quot;it's&quot;</name>`]),
		)
	})

	it('sets nothing for a channel the device does not have', () => {
		expect(BuildMessage(9, ParameterType.Bias, -4)).toBe(POLL)
	})
})
