import { dL as resolveWhatsAppGroupIntroHint, mL as resolveWhatsAppGroupToolPolicy, pL as resolveWhatsAppGroupRequireMention } from "../../auth-profiles-Bx_pc0K9.js";
import { a as defineSetupPluginEntry } from "../../core-D9rS5gM5.js";
import { t as whatsappSetupAdapter } from "../../setup-core-DFcuCAYW.js";
import { i as whatsappSetupWizardProxy, n as createWhatsAppPluginBase } from "../../shared-CdukGtsZ.js";
import { d as webAuthExists } from "../../auth-store-U3gXL9vv.js";
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
