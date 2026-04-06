import "./links-BAVGKG23.js";
import "./zod-schema.providers-core-BdjnVISd.js";
import "./registry-CYKflEtU.js";
import "./config-schema-CRyTg0IK.js";
import "./setup-helpers-BCTVwbQ6.js";
import { r as resolveChannelGroupRequireMention } from "./channel-policy-CZapjgwh.js";
import "./dm-policy-shared-D9Rt9w-c.js";
import "./status-helpers-CFGRcH-W.js";
import "./common-BXGyoBih.js";
import "./text-chunking-KNP90Bp8.js";
import "./fetch-guard-DTvAxjiU.js";
import "./web-media-BgsN6JmW.js";
import "./webhook-ingress-DvZckzoJ.js";
import "./setup-wizard-proxy-Dd2U0BD6.js";
import "./channel-reply-pipeline-CxDxu1Px.js";
import { t as createOptionalChannelSetupSurface } from "./channel-setup-CzuDuO6-.js";
//#region src/plugin-sdk/googlechat.ts
function resolveGoogleChatGroupRequireMention(params) {
	return resolveChannelGroupRequireMention({
		cfg: params.cfg,
		channel: "googlechat",
		groupId: params.groupId,
		accountId: params.accountId
	});
}
const googlechatSetup = createOptionalChannelSetupSurface({
	channel: "googlechat",
	label: "Google Chat",
	npmSpec: "@openclaw/googlechat",
	docsPath: "/channels/googlechat"
});
const googlechatSetupAdapter = googlechatSetup.setupAdapter;
const googlechatSetupWizard = googlechatSetup.setupWizard;
//#endregion
export { googlechatSetupWizard as n, resolveGoogleChatGroupRequireMention as r, googlechatSetupAdapter as t };
