import { i as defineChannelPluginEntry } from "../../core-D9rS5gM5.js";
import { b as setMSTeamsRuntime } from "../../graph-users-D5dp7JD_.js";
import { t as msteamsPlugin } from "../../channel-r3y1hV0s.js";
//#region extensions/msteams/index.ts
var msteams_default = defineChannelPluginEntry({
	id: "msteams",
	name: "Microsoft Teams",
	description: "Microsoft Teams channel plugin (Bot Framework)",
	plugin: msteamsPlugin,
	setRuntime: setMSTeamsRuntime
});
//#endregion
export { msteams_default as default, msteamsPlugin, setMSTeamsRuntime };
