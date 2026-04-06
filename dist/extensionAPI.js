import { Oh as runEmbeddedPiAgent, cO as resolveAgentTimeoutMs, lN as loadSessionStore, pN as saveSessionStore } from "./auth-profiles-Bx_pc0K9.js";
import { n as DEFAULT_MODEL, r as DEFAULT_PROVIDER } from "./defaults-Dpv7c6Om.js";
import { a as resolveAgentDir, p as resolveAgentWorkspaceDir } from "./agent-scope-Cb7ofJgr.js";
import { d as ensureAgentWorkspace } from "./workspace-CKFBC4zU.js";
import { S as resolveThinkingDefault } from "./model-selection-CcR6SGXw.js";
import { n as resolveAgentIdentity } from "./identity-CYcjYQwp.js";
import { l as resolveStorePath, r as resolveSessionFilePath } from "./paths-DMlxK0ei.js";
//#region src/extensionAPI.ts
if (process.env.VITEST !== "true" && process.env.OPENCLAW_SUPPRESS_EXTENSION_API_WARNING !== "1") process.emitWarning("openclaw/extension-api is deprecated. Migrate to api.runtime.agent.* or focused openclaw/plugin-sdk/<subpath> imports. See https://docs.openclaw.ai/plugins/sdk-migration", {
	code: "OPENCLAW_EXTENSION_API_DEPRECATED",
	detail: "This compatibility bridge is temporary. Bundled plugins should use the injected plugin runtime instead of importing host-side agent helpers directly. Migration guide: https://docs.openclaw.ai/plugins/sdk-migration"
});
//#endregion
export { DEFAULT_MODEL, DEFAULT_PROVIDER, ensureAgentWorkspace, loadSessionStore, resolveAgentDir, resolveAgentIdentity, resolveAgentTimeoutMs, resolveAgentWorkspaceDir, resolveSessionFilePath, resolveStorePath, resolveThinkingDefault, runEmbeddedPiAgent, saveSessionStore };
