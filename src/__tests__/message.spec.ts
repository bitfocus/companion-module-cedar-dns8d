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
