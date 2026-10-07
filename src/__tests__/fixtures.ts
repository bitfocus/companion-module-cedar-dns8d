import { vi } from 'vitest'
import type {
	CompanionActionCallbackContext,
	CompanionActionDefinitions,
	CompanionActionEvent,
	CompanionActionLearnContext,
	CompanionFeedbackDefinitions,
	CompanionGraphicsCompositeElementDefinitions,
	CompanionPresetDefinitions,
	CompanionPresetSection,
	CompanionVariableDefinitions,
	CompanionVariableValues,
} from '@companion-module/base'
import CedarDNS8DInstance, { type dns8d, type ModuleTypes } from '../main.js'
import type { ActionId, ActionSchema } from '../actions.js'
import type { FeedbackSchema } from '../feedbacks.js'
import type { CompositeElementSchema } from '../composites.js'
import type { VariablesSchema } from '../variables.js'

function createMocks() {
	return {
		buildMessage: vi.fn<CedarDNS8DInstance['buildMessage']>(async () => {}),
		recordAction: vi.fn<CedarDNS8DInstance['recordAction']>(),
		setActionDefinitions: vi.fn<(defs: CompanionActionDefinitions<ActionSchema>) => void>(),
		setFeedbackDefinitions: vi.fn<(defs: CompanionFeedbackDefinitions<FeedbackSchema>) => void>(),
		setVariableDefinitions: vi.fn<(defs: CompanionVariableDefinitions<VariablesSchema>) => void>(),
		setVariableValues: vi.fn<(values: CompanionVariableValues) => void>(),
		checkAllFeedbacks: vi.fn<() => void>(),
		addToActionRecording: vi.fn<CedarDNS8DInstance['addToActionRecording']>(),
		updateActions: vi.fn<() => void>(),
		updateFeedbacks: vi.fn<() => void>(),
		log: vi.fn<CedarDNS8DInstance['log']>(),
		setCompositeElementDefinitions:
			vi.fn<(defs: CompanionGraphicsCompositeElementDefinitions<CompositeElementSchema>) => void>(),
		setPresetDefinitions:
			vi.fn<
				(structure: CompanionPresetSection<ModuleTypes>[], presets: CompanionPresetDefinitions<ModuleTypes>) => void
			>(),
	}
}

export type FakeInstance = { self: CedarDNS8DInstance } & ReturnType<typeof createMocks>

/**
 * A plain object standing in for the instance. The state and its getChannel / getBand lookups are the real ones, as
 * the definitions read through them; everything that would reach Companion or the device is a mock.
 */
export function fakeInstance(): FakeInstance {
	const state: dns8d = {
		globalOn: false,
		globalLearn: false,
		fallbackMode: false,
		swVersion: 0,
		dspVersion: 0,
		channels: [],
		selectedGroup: 1,
		selectedGroupProps: {
			active1: 0,
			active2: 0,
			power1: -100,
			power2: -100,
			name: '',
			bias: 0,
			atten: 0,
			learn: false,
			on: false,
			dsp: false,
		},
		groupDetailView: [],
	}
	const mocks = createMocks()
	const self = { dns8d: state, isRecordingActions: false, ...mocks } as unknown as CedarDNS8DInstance
	self.getChannel = CedarDNS8DInstance.prototype.getChannel.bind(self)
	self.getBand = CedarDNS8DInstance.prototype.getBand.bind(self)
	return { self, ...mocks }
}

type AnyActionCallback = (action: CompanionActionEvent, context: CompanionActionCallbackContext) => Promise<void>
type AnyActionLearn = (action: CompanionActionEvent, context: CompanionActionLearnContext) => unknown

function actionEvent(actionId: ActionId, options: CompanionActionEvent['options']): CompanionActionEvent {
	return { id: `action-${actionId}`, controlId: 'bank-1', actionId, surfaceId: undefined, options }
}

/** Runs one action's callback, as Companion would with the option values already resolved */
export async function runAction(
	defs: CompanionActionDefinitions<ActionSchema>,
	actionId: ActionId,
	options: CompanionActionEvent['options'],
	signal = new AbortController().signal,
): Promise<void> {
	const def = defs[actionId]
	if (!def) throw new Error(`${actionId} is not defined`)
	const callback = def.callback as AnyActionCallback
	await callback(actionEvent(actionId, options), { type: 'action', signal } as CompanionActionCallbackContext)
}

export async function learnAction(
	defs: CompanionActionDefinitions<ActionSchema>,
	actionId: ActionId,
	options: CompanionActionEvent['options'],
): Promise<unknown> {
	const learn = defs[actionId] ? (defs[actionId].learn as AnyActionLearn | undefined) : undefined
	if (!learn) throw new Error(`${actionId} has no learn`)
	return await learn(actionEvent(actionId, options), {
		type: 'action',
		signal: new AbortController().signal,
	})
}
