import { t as definePluginEntry } from "../../plugin-entry-CM37bofc.js";
import { t as buildMicrosoftSpeechProvider } from "../../speech-provider-B1IPOadM.js";
//#region extensions/microsoft/index.ts
var microsoft_default = definePluginEntry({
	id: "microsoft",
	name: "Microsoft Speech",
	description: "Bundled Microsoft speech provider",
	register(api) {
		api.registerSpeechProvider(buildMicrosoftSpeechProvider());
	}
});
//#endregion
export { microsoft_default as default };
