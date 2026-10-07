import { describe, expect, it } from 'vitest'
import type {
	CompanionMigrationAction,
	CompanionMigrationFeedback,
	CompanionStaticUpgradeProps,
	CompanionUpgradeContext,
} from '@companion-module/base'
import { UpgradeScripts, numericActionOptionsApi2, numericFeedbackOptionsApi2 } from '../upgrades.js'
import { ActionId, UpdateActions } from '../actions.js'
import { FeedbackId, UpdateFeedbacks } from '../feedbacks.js'
import type { ModuleConfig } from '../config.js'
import { fakeInstance } from './fixtures.js'

/**
 * Upgrade scripts are order-sensitive: a stored upgrade index records how far a configuration has been migrated,
 * so scripts may only ever be appended. Pin the index rather than taking the last entry, so appending a script
 * can't silently retarget this suite.
 */
const API2_NUMERIC_SCRIPT_INDEX = 0
const EXPECTED_SCRIPT_COUNT = 1

// Options reach upgrade scripts already wrapped as ExpressionOrValue — Companion does that before running them
const v = (value: unknown) => ({ isExpression: false, value })

function action(actionId: string, options: Record<string, unknown>): CompanionMigrationAction {
	return {
		id: `action-${actionId}`,
		controlId: 'bank-1',
		actionId,
		options: options as CompanionMigrationAction['options'],
	}
}

function feedback(feedbackId: string, options: Record<string, unknown>): CompanionMigrationFeedback {
	return {
		id: `feedback-${feedbackId}`,
		controlId: 'bank-1',
		feedbackId,
		options: options as CompanionMigrationFeedback['options'],
	}
}

function run(actions: CompanionMigrationAction[], feedbacks: CompanionMigrationFeedback[] = []) {
	return UpgradeScripts[API2_NUMERIC_SCRIPT_INDEX]({} as CompanionUpgradeContext<ModuleConfig>, {
		config: null,
		secrets: null,
		actions,
		feedbacks,
	} satisfies CompanionStaticUpgradeProps<ModuleConfig, undefined>)
}

describe('API 2.0 numeric option upgrade script', () => {
	it('sits at the index this suite targets', () => {
		// Appending a script is fine — bump EXPECTED_SCRIPT_COUNT. Never insert, reorder or remove one.
		expect(UpgradeScripts).toHaveLength(EXPECTED_SCRIPT_COUNT)
	})

	it('converts a custom channel string from the old dropdown to a number', () => {
		const existing = action(ActionId.channelOn, { channel: v('3'), value: v('2') })
		const result = run([existing])

		expect(result.updatedActions).toEqual([existing])
		expect(existing.options.channel).toEqual({ isExpression: false, value: 3 })
	})

	it('converts atten and bias text, keeping sign and decimals', () => {
		const atten = action(ActionId.channelAtten, { channel: v(1), value: v('-6'), relative: v(false) })
		const bias = action(ActionId.bandBias, { band: v('2'), value: v('1.5'), relative: v(true) })
		run([atten, bias])

		expect(atten.options.value).toEqual({ isExpression: false, value: -6 })
		expect(bias.options.value).toEqual({ isExpression: false, value: 1.5 })
		expect(bias.options.band).toEqual({ isExpression: false, value: 2 })
	})

	it('turns a variable into an expression', () => {
		const existing = action(ActionId.groupSelect, { channel: v('$(internal:custom_ch)') })
		run([existing])

		expect(existing.options.channel).toEqual({ isExpression: true, value: '$(internal:custom_ch)' })
	})

	it('wraps mixed text and variables in parseVariables', () => {
		const existing = action(ActionId.channelBias, { channel: v(1), value: v('-$(internal:b)'), relative: v(true) })
		run([existing])

		expect(existing.options.value).toEqual({ isExpression: true, value: 'parseVariables("-$(internal:b)")' })
	})

	it('leaves a channel name alone, even one that looks like a number', () => {
		const existing = action(ActionId.channelName, { channel: v(1), value: v('12') })
		const result = run([existing])

		expect(existing.options.value).toEqual(v('12'))
		expect(result.updatedActions).toEqual([])
	})

	it('does not report actions it had nothing to convert', () => {
		const toggle = action(ActionId.globalOn, { value: v('2') })
		const alreadyNumber = action(ActionId.channelLearn, { channel: v(4), value: v('1') })
		const alreadyExpression = action(ActionId.groupSelect, { channel: { isExpression: true, value: '1 + 1' } })
		const missingOption = action(ActionId.channelOn, {})
		const result = run([toggle, alreadyNumber, alreadyExpression, missingOption])

		expect(result.updatedActions).toEqual([])
		expect(alreadyExpression.options.channel).toEqual({ isExpression: true, value: '1 + 1' })
	})

	it('converts feedback channels, and skips feedbacks without one', () => {
		const channelFeedback = feedback(FeedbackId.channelStatus, { channel: v('8') })
		const globalFeedback = feedback(FeedbackId.globalOn, {})
		const result = run([], [channelFeedback, globalFeedback])

		expect(result.updatedFeedbacks).toEqual([channelFeedback])
		expect(channelFeedback.options.channel).toEqual({ isExpression: false, value: 8 })
		expect(result.updatedConfig).toBeNull()
	})
})

type DefinitionLike = { options: { id: string; type: string; choices?: { id: unknown }[] }[] } | false | undefined

describe('upgrade maps match the current definitions', () => {
	const { self, setActionDefinitions, setFeedbackDefinitions } = fakeInstance()
	UpdateActions(self)
	UpdateFeedbacks(self)
	const actionDefs: Record<string, DefinitionLike> = setActionDefinitions.mock.calls[0][0]
	const feedbackDefs: Record<string, DefinitionLike> = setFeedbackDefinitions.mock.calls[0][0]

	// The script stores numbers, so each converted option must still hold a number: a number field, or a dropdown
	// whose choice ids are numbers
	const numericOptionIds = (def: DefinitionLike) =>
		def
			? def.options
					.filter(
						(o) =>
							o.type === 'number' ||
							(o.type === 'dropdown' && o.choices !== undefined && o.choices.every((c) => typeof c.id === 'number')),
					)
					.map((o) => o.id)
			: []

	it('defines every action and feedback id in the enums', () => {
		expect(Object.keys(actionDefs).sort()).toEqual(Object.values(ActionId).sort())
		expect(Object.keys(feedbackDefs).sort()).toEqual(Object.values(FeedbackId).sort())
	})

	it.each(Object.entries(numericActionOptionsApi2))('action %s: converted options hold numbers', (id, keys) => {
		expect(numericOptionIds(actionDefs[id])).toEqual(expect.arrayContaining(keys))
	})

	it.each(Object.entries(numericFeedbackOptionsApi2))('feedback %s: converted options hold numbers', (id, keys) => {
		expect(numericOptionIds(feedbackDefs[id])).toEqual(expect.arrayContaining(keys))
	})
})
