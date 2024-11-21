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
	varList.push({ variableId: `selectedGroup_Active1`, name: `Selected Group Channel: Active Reduction (Max)` })
	varList.push({ variableId: `selectedGroup_Active2`, name: `Selected Group Channel: Active Reduction (Average)` })
	varList.push({ variableId: `selectedGroup_Power1`, name: `Selected Group Channel: Power (Signal)` })
	varList.push({ variableId: `selectedGroup_Power2`, name: `Selected Group Channel: Power (Noise)` })
	varList.push({ variableId: `selectedGroup_Name`, name: `Selected Group Channel: Name` })
	varList.push({ variableId: `selectedGroup_Number`, name: `Selected Group Channel: Number` })
	varList.push({ variableId: `selectedGroup_Bias`, name: `Selected Group Channel: Bias (dB)` })
	varList.push({ variableId: `selectedGroup_Attenuation`, name: `Selected Group Channel: Attenuation (dB)` })
	varList.push({ variableId: `selectedGroup_Learn`, name: `Selected Group Channel: Learn` })
	varList.push({ variableId: `selectedGroup_DSP`, name: `Selected Group Channel: DSP` })
	varList.push({ variableId: `selectedGroup_On`, name: `Selected Group Channel: On` })
	for (let i = 1; i <= 6; i++) {
		varList.push({ variableId: `band${i}_Active1`, name: `Band ${i}: Active Reduction (Max)` })
		varList.push({ variableId: `band${i}_Active2`, name: `Band ${i}: Active Reduction (Average)` })
		varList.push({ variableId: `band${i}_Power1`, name: `Band ${i}: Power (Signal)` })
		varList.push({ variableId: `band${i}_Power2`, name: `Band ${i}: Power (Noise)` })
		varList.push({ variableId: `band${i}_Bias`, name: `Band ${i}: Bias (dB)` })
		varList.push({ variableId: `band${i}_Attenuation`, name: `Band ${i}: Attenuation (dB)` })
	}
	self.setVariableDefinitions(varList)
}
