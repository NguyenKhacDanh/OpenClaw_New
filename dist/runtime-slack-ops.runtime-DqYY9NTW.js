import { Ga as sendMessageSlack, Qi as monitorSlackProvider, _t as handleSlackAction, ia as resolveSlackChannelAllowlist, la as probeSlack, ra as resolveSlackUserAllowlist } from "./auth-profiles-Bx_pc0K9.js";
import { n as listSlackDirectoryPeersLive, t as listSlackDirectoryGroupsLive } from "./runtime-api-CHILjlAM.js";
import "./slack-tlYyvzZk.js";
//#region src/plugins/runtime/runtime-slack-ops.runtime.ts
const runtimeSlackOps = {
	listDirectoryGroupsLive: listSlackDirectoryGroupsLive,
	listDirectoryPeersLive: listSlackDirectoryPeersLive,
	probeSlack,
	resolveChannelAllowlist: resolveSlackChannelAllowlist,
	resolveUserAllowlist: resolveSlackUserAllowlist,
	sendMessageSlack,
	monitorSlackProvider,
	handleSlackAction
};
//#endregion
export { runtimeSlackOps };
