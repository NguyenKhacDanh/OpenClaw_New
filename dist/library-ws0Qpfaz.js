import { n as assertWebChannel, p as normalizeE164, w as toWhatsappJid } from "./utils-ChfYK_zu.js";
import { Po as createDefaultDeps, f as loadConfig, gc as resolveSessionKey, hc as deriveSessionKey, lN as loadSessionStore, pN as saveSessionStore } from "./auth-profiles-CbvzvUuD.js";
import { l as resolveStorePath } from "./paths-DMlxK0ei.js";
import { r as applyTemplate } from "./inbound-context-Cm4_-Y_H.js";
import { i as handlePortError, n as describePortOwner, r as ensurePortAvailable, t as PortInUseError } from "./ports-CrHMbdrx.js";
import { t as waitForever } from "./wait-b4b7oaHj.js";
//#region src/library.ts
let replyRuntimePromise = null;
let promptRuntimePromise = null;
let binariesRuntimePromise = null;
let execRuntimePromise = null;
let whatsappRuntimePromise = null;
function loadReplyRuntime() {
	replyRuntimePromise ??= import("./reply.runtime-BTyNn7Me.js");
	return replyRuntimePromise;
}
function loadPromptRuntime() {
	promptRuntimePromise ??= import("./prompt-BRsYq3lt.js");
	return promptRuntimePromise;
}
function loadBinariesRuntime() {
	binariesRuntimePromise ??= import("./binaries-BzciKJAw.js");
	return binariesRuntimePromise;
}
function loadExecRuntime() {
	execRuntimePromise ??= import("./exec-CCU9w7MU.js");
	return execRuntimePromise;
}
function loadWhatsAppRuntime() {
	whatsappRuntimePromise ??= import("./runtime-whatsapp-boundary-Buc7uYfx.js");
	return whatsappRuntimePromise;
}
const getReplyFromConfig = async (...args) => (await loadReplyRuntime()).getReplyFromConfig(...args);
const promptYesNo = async (...args) => (await loadPromptRuntime()).promptYesNo(...args);
const ensureBinary = async (...args) => (await loadBinariesRuntime()).ensureBinary(...args);
const runExec = async (...args) => (await loadExecRuntime()).runExec(...args);
const runCommandWithTimeout = async (...args) => (await loadExecRuntime()).runCommandWithTimeout(...args);
const monitorWebChannel = async (...args) => (await loadWhatsAppRuntime()).monitorWebChannel(...args);
//#endregion
export { PortInUseError, applyTemplate, assertWebChannel, createDefaultDeps, deriveSessionKey, describePortOwner, ensureBinary, ensurePortAvailable, getReplyFromConfig, handlePortError, loadConfig, loadSessionStore, monitorWebChannel, normalizeE164, promptYesNo, resolveSessionKey, resolveStorePath, runCommandWithTimeout, runExec, saveSessionStore, toWhatsappJid, waitForever };
