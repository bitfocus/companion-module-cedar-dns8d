import { describe, expect, it } from 'vitest'
import CedarDNS8DInstance from '../main.js'
import { fakeInstance } from './fixtures.js'

// Synthetic, as in variables.spec.ts: one well-formed message, and one missing the <global> element the parser reads
const GOOD_MESSAGE =
	'<dns8d><global on="1"/><chan idx="0"><name>Dialog</name></chan><group idx="0"><band idx="0"/></group></dns8d>'
const MISSING_GLOBAL = '<dns8d><chan idx="0"/></dns8d>'

function setup() {
	const fake = fakeInstance()
	// The handler the socket's message listener calls, run against the fake
	const setVarValues = CedarDNS8DInstance.prototype.setVarValues.bind(fake.self)
	return { ...fake, setVarValues }
}

describe('device message handling', () => {
	// A throw here would escape the socket's message listener and end the connection's process
	it('logs a message it cannot read instead of throwing', () => {
		const { setVarValues, log, setVariableValues } = setup()

		expect(() => setVarValues(MISSING_GLOBAL)).not.toThrow()
		expect(log).toHaveBeenCalledWith('warn', expect.stringContaining('Could not read message from device'))
		expect(setVariableValues).not.toHaveBeenCalled()
	})

	it('logs once for a run of unreadable messages, and again after a good one', () => {
		const { setVarValues, log, setVariableValues } = setup()
		setVarValues(MISSING_GLOBAL)
		setVarValues(MISSING_GLOBAL)
		expect(log).toHaveBeenCalledTimes(1)

		setVarValues(GOOD_MESSAGE)
		expect(setVariableValues).toHaveBeenCalledOnce()

		setVarValues(MISSING_GLOBAL)
		expect(log).toHaveBeenCalledTimes(2)
	})
})
