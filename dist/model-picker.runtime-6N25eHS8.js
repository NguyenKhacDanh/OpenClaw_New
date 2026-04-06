import { Es as resolvePluginProviders } from "./auth-profiles-CbvzvUuD.js";
import { i as runProviderModelSelectedHook, n as resolveProviderPluginChoice } from "./provider-wizard-0XnJ3JmZ.js";
import { n as resolveProviderModelPickerFlowContributions, r as resolveProviderModelPickerFlowEntries } from "./provider-flow-_c6hvx9S.js";
import { n as runProviderPluginAuthMethod } from "./provider-auth-choice-4o0-v6zm.js";
//#region src/commands/model-picker.runtime.ts
const modelPickerRuntime = {
	resolveProviderModelPickerContributions: resolveProviderModelPickerFlowContributions,
	resolveProviderModelPickerEntries: resolveProviderModelPickerFlowEntries,
	resolveProviderPluginChoice,
	runProviderModelSelectedHook,
	resolvePluginProviders,
	runProviderPluginAuthMethod
};
//#endregion
export { modelPickerRuntime };
