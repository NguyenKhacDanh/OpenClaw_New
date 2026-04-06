import "./utils-ChfYK_zu.js";
import "./links-BAVGKG23.js";
import "./auth-profiles-CbvzvUuD.js";
import "./zod-schema.providers-core-BdjnVISd.js";
import "./config-schema-CRyTg0IK.js";
import "./dm-policy-shared-D9Rt9w-c.js";
import "./file-lock-BHv4mg47.js";
import "./json-store-DTRpunEN.js";
import "./status-helpers-CFGRcH-W.js";
import "./mime-Di3j5FMh.js";
import "./system-events-Bwik0M7d.js";
import "./text-chunking-KNP90Bp8.js";
import "./ssrf-DyWPQUCV.js";
import "./fetch-guard-DTvAxjiU.js";
import "./web-media-BgsN6JmW.js";
import "./setup-wizard-proxy-Dd2U0BD6.js";
import "./channel-reply-pipeline-CxDxu1Px.js";
import "./http-body-D8CM_23T.js";
import "./reply-history-DgDnhohn.js";
import { t as createOptionalChannelSetupSurface } from "./channel-setup-CzuDuO6-.js";
import "./ssrf-policy-DaW3uwq6.js";
//#region src/plugin-sdk/msteams.ts
const msteamsSetup = createOptionalChannelSetupSurface({
	channel: "msteams",
	label: "Microsoft Teams",
	npmSpec: "@openclaw/msteams",
	docsPath: "/channels/msteams"
});
const msteamsSetupWizard = msteamsSetup.setupWizard;
const msteamsSetupAdapter = msteamsSetup.setupAdapter;
//#endregion
export { msteamsSetupWizard as n, msteamsSetupAdapter as t };
