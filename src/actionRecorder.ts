import { CompanionOptionValues } from '@companion-module/base'
import { ActionId } from './actions.js'
import type { CedarDNS8DInstance } from './main.js'
import { parseStringFromBoolean } from './utils.js'

export function AddToActionRecording(
	action: ActionId,
	value: string | number | boolean,
	channel: number = 0,
	self: CedarDNS8DInstance,
): void {
	if (self.isRecordingActions) {
		const actOptions: CompanionOptionValues = {
			value: typeof value === 'boolean' ? parseStringFromBoolean(value) : value.toString(),
		}
		switch (action) {
			case ActionId.channelAtten:
			case ActionId.channelBias:
				actOptions.relative = false
				actOptions.channel = channel
				break
			case ActionId.channelLearn:
			case ActionId.channelName:
			case ActionId.channelOn:
				actOptions.channel = channel
		}
		self.recordAction(
			{
				actionId: action,
				options: actOptions,
			},
			`${action} ${channel}`,
		)
	}
}
