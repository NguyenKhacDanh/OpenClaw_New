import { i as defineChannelPluginEntry } from "../../core-B0vcREeb.js";
import { n as setGoogleChatRuntime } from "../../runtime-CW28gXH6.js";
import { t as googlechatPlugin } from "../../channel-Zp1w_Rji.js";
//#region extensions/googlechat/index.ts
var googlechat_default = defineChannelPluginEntry({
	id: "googlechat",
	name: "Google Chat",
	description: "OpenClaw Google Chat channel plugin",
	plugin: googlechatPlugin,
	setRuntime: setGoogleChatRuntime
});
//#endregion
export { googlechat_default as default, googlechatPlugin, setGoogleChatRuntime };
