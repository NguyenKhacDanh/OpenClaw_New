import "./auth-profiles-CbvzvUuD.js";
import "./zod-schema.core-CKUw0Kgf.js";
import "./config-schema-CRyTg0IK.js";
import "./status-helpers-CFGRcH-W.js";
import "./ssrf-DyWPQUCV.js";
import "./webhook-ingress-DvZckzoJ.js";
import "./channel-reply-pipeline-CxDxu1Px.js";
import "./http-body-D8CM_23T.js";
import { t as createOptionalChannelSetupSurface } from "./channel-setup-CzuDuO6-.js";
//#region src/plugin-sdk/nostr.ts
const nostrSetup = createOptionalChannelSetupSurface({
	channel: "nostr",
	label: "Nostr",
	npmSpec: "@openclaw/nostr",
	docsPath: "/channels/nostr"
});
const nostrSetupAdapter = nostrSetup.setupAdapter;
const nostrSetupWizard = nostrSetup.setupWizard;
//#endregion
export { nostrSetupWizard as n, nostrSetupAdapter as t };
