import type { CedarDNS8DInstance } from './main.js'
import type { CompanionPresetDefinitions } from '@companion-module/base'
import { ActionId } from './actions.js'
import { colours, FeedbackId } from './feedbacks.js'
export function UpdatePresets(self: CedarDNS8DInstance): void {
	const presets: CompanionPresetDefinitions = {}
	for (let i = 1; i <= 8; i++) {
		presets[i.toString()] = {
			type: 'button',
			category: 'Channel Status',
			name: `Channel ${i} Status`,
			style: {
				size: 10,
				alignment: 'left:top',
				pngalignment: 'center:center',
				color: colours.dnsLightBlue,
				bgcolor: colours.black,
				show_topbar: false,
				textExpression: true,
				text: `\`\\n$\{substr($(generic-module:channel${i}_Name),0,9)}\nAtten:\n$\{toFixed($(generic-module:channel${i}_Attenuation),1)} dB\nBias:\n$\{toFixed($(generic-module:channel${i}_Bias),1)} dB\``,
			},
			steps: [
				{
					down: [
						{
							actionId: ActionId.channelOn,
							options: {
								channel: i,
								value: '2',
							},
							delay: 0,
							headline: `Toggle DNS`,
						},
					],
					up: [],
				},
			],
			feedbacks: [
				{
					feedbackId: FeedbackId.channelStatus,
					options: {
						channel: i,
					},
				},
			],
		}
	}
	self.setPresetDefinitions(presets)
}
