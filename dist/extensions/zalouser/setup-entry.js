import { a as defineSetupPluginEntry } from "../../core-B0vcREeb.js";
import { n as zalouserSetupAdapter, t as zalouserSetupWizard } from "../../setup-surface-DSuu2f4m.js";
import { t as createZalouserPluginBase } from "../../shared-Bzo2_KPg.js";
//#region extensions/zalouser/src/channel.setup.ts
const zalouserSetupPlugin = { ...createZalouserPluginBase({
	setupWizard: zalouserSetupWizard,
	setup: zalouserSetupAdapter
}) };
//#endregion
//#region extensions/zalouser/setup-entry.ts
var setup_entry_default = defineSetupPluginEntry(zalouserSetupPlugin);
//#endregion
export { setup_entry_default as default, zalouserSetupPlugin };
