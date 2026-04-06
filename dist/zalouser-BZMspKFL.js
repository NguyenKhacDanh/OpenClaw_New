import "./tmp-openclaw-dir-Day5KPIY.js";
import "./auth-profiles-Bx_pc0K9.js";
import "./zod-schema.core-CKUw0Kgf.js";
import "./config-schema-CRyTg0IK.js";
import "./setup-helpers-BCTVwbQ6.js";
import "./status-helpers-CFGRcH-W.js";
import "./zod-schema.agent-runtime-DZwW9Yaz.js";
import "./setup-wizard-proxy-Dd2U0BD6.js";
import "./channel-reply-pipeline-CxDxu1Px.js";
import { t as createOptionalChannelSetupSurface } from "./channel-setup-CzuDuO6-.js";
//#region src/plugin-sdk/zalouser.ts
const zalouserSetup = createOptionalChannelSetupSurface({
	channel: "zalouser",
	label: "Zalo Personal",
	npmSpec: "@openclaw/zalouser",
	docsPath: "/channels/zalouser"
});
const zalouserSetupAdapter = zalouserSetup.setupAdapter;
const zalouserSetupWizard = zalouserSetup.setupWizard;
//#endregion
export { zalouserSetupWizard as n, zalouserSetupAdapter as t };
