import { dL as resolveWhatsAppGroupIntroHint, mL as resolveWhatsAppGroupToolPolicy, pL as resolveWhatsAppGroupRequireMention } from "../../auth-profiles-CbvzvUuD.js";
import { a as defineSetupPluginEntry } from "../../core-B0vcREeb.js";
import { t as whatsappSetupAdapter } from "../../setup-core-DFcuCAYW.js";
import { i as whatsappSetupWizardProxy, n as createWhatsAppPluginBase } from "../../shared-7wmo6L3m.js";
import { d as webAuthExists } from "../../auth-store-C0IXZdwT.js";
//#region extensions/whatsapp/src/channel.setup.ts
const whatsappSetupPlugin = { ...createWhatsAppPluginBase({
	groups: {
		resolveRequireMention: resolveWhatsAppGroupRequireMention,
		resolveToolPolicy: resolveWhatsAppGroupToolPolicy,
		resolveGroupIntroHint: resolveWhatsAppGroupIntroHint
	},
	setupWizard: whatsappSetupWizardProxy,
	setup: whatsappSetupAdapter,
	isConfigured: async (account) => await webAuthExists(account.authDir)
}) };
//#endregion
//#region extensions/whatsapp/setup-entry.ts
var setup_entry_default = defineSetupPluginEntry(whatsappSetupPlugin);
//#endregion
export { setup_entry_default as default, whatsappSetupPlugin };
