import "./links-BAVGKG23.js";
import "./zod-schema.core-CKUw0Kgf.js";
import "./config-schema-CRyTg0IK.js";
import "./channel-reply-pipeline-CxDxu1Px.js";
import { t as createOptionalChannelSetupSurface } from "./channel-setup-CzuDuO6-.js";
//#region src/plugin-sdk/twitch.ts
const twitchSetup = createOptionalChannelSetupSurface({
	channel: "twitch",
	label: "Twitch",
	npmSpec: "@openclaw/twitch"
});
const twitchSetupAdapter = twitchSetup.setupAdapter;
const twitchSetupWizard = twitchSetup.setupWizard;
//#endregion
export { twitchSetupWizard as n, twitchSetupAdapter as t };
