import "./utils-ChfYK_zu.js";
import "./links-BAVGKG23.js";
import "./setup-helpers-BCTVwbQ6.js";
import "./setup-binary-xH-2ZbWo.js";
import "./signal-cli-install-TwTjb5i8.js";
import "./setup-wizard-proxy-Dd2U0BD6.js";
//#region src/wizard/prompts.ts
var WizardCancelledError = class extends Error {
	constructor(message = "wizard cancelled") {
		super(message);
		this.name = "WizardCancelledError";
	}
};
//#endregion
//#region src/plugin-sdk/resolution-notes.ts
/** Format a short note that separates successfully resolved targets from unresolved passthrough values. */
function formatResolvedUnresolvedNote(params) {
	if (params.resolved.length === 0 && params.unresolved.length === 0) return;
	return [params.resolved.length > 0 ? `Resolved: ${params.resolved.join(", ")}` : void 0, params.unresolved.length > 0 ? `Unresolved (kept as typed): ${params.unresolved.join(", ")}` : void 0].filter(Boolean).join("\n");
}
//#endregion
export { WizardCancelledError as n, formatResolvedUnresolvedNote as t };
