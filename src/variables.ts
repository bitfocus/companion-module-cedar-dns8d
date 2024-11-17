import type { CedarDNS8DInstance } from './main.js'

export function UpdateVariableDefinitions(self: CedarDNS8DInstance): void {
	const varList = [
		{ variableId: 'global_On', name: 'Global: On' },
		{ variableId: 'global_Learn', name: 'Global: Learn' },
		{ variableId: 'global_FallbackMode', name: 'Global: Fallback Mode' },
		{ variableId: 'global_swVersion', name: 'Global: Software Version' },
		{ variableId: 'global_dspVersion', name: 'Global: DSP Version' },
	]
	for (let i = 1; i <= 8; i++) {
		varList.push({ variableId: `channel${i}_Active1`, name: `Channel ${i}: Active Reduction (Max)` })
		varList.push({ variableId: `channel${i}_Active2`, name: `Channel ${i}: Active Reduction (Average)` })
		varList.push({ variableId: `channel${i}_Power1`, name: `Channel ${i}: Power (Signal)` })
		varList.push({ variableId: `channel${i}_Power2`, name: `Channel ${i}: Power (Noise)` })
		varList.push({ variableId: `channel${i}_Name`, name: `Channel ${i}: Name` })
		varList.push({ variableId: `channel${i}_Bias`, name: `Channel ${i}: Bias (dB)` })
		varList.push({ variableId: `channel${i}_Attenuation`, name: `Channel ${i}: Attenuation (dB)` })
		varList.push({ variableId: `channel${i}_Learn`, name: `Channel ${i}: Learn` })
		varList.push({ variableId: `channel${i}_DSP`, name: `Channel ${i}: DSP` })
		varList.push({ variableId: `channel${i}_On`, name: `Channel ${i}: On` })
	}
	self.setVariableDefinitions(varList)
}
