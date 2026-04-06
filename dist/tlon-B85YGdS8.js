import "./links-BAVGKG23.js";
import "./config-schema-CRyTg0IK.js";
import "./setup-helpers-BCTVwbQ6.js";
import "./status-helpers-CFGRcH-W.js";
import "./ssrf-DyWPQUCV.js";
import "./fetch-guard-DTvAxjiU.js";
import "./channel-reply-pipeline-CxDxu1Px.js";
import { t as createOptionalChannelSetupSurface } from "./channel-setup-CzuDuO6-.js";
import "./runtime-CZxxuIZ2.js";
//#region src/plugin-sdk/tlon.ts
const tlonSetup = createOptionalChannelSetupSurface({
	channel: "tlon",
	label: "Tlon",
	npmSpec: "@openclaw/tlon",
	docsPath: "/channels/tlon"
});
const tlonSetupAdapter = tlonSetup.setupAdapter;
const tlonSetupWizard = tlonSetup.setupWizard;
//#endregion
export { tlonSetupWizard as n, tlonSetupAdapter as t };
