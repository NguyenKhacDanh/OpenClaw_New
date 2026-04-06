import { g as isProxyReasoningUnsupported, p as createKilocodeWrapper } from "../../provider-stream-BL5JCQR1.js";
import { s as KILOCODE_DEFAULT_MODEL_REF } from "../../provider-models-BGU1-wwh.js";
import { n as buildKilocodeProviderWithDiscovery } from "../../provider-catalog-CBFTnBso.js";
import { t as defineSingleProviderPluginEntry } from "../../provider-entry-zE0c1QWv.js";
import { t as applyKilocodeConfig } from "../../onboard-_UmOieTY.js";
var kilocode_default = defineSingleProviderPluginEntry({
	id: "kilocode",
	name: "Kilo Gateway Provider",
	description: "Bundled Kilo Gateway provider plugin",
	provider: {
		label: "Kilo Gateway",
		docsPath: "/providers/kilocode",
		auth: [{
			methodId: "api-key",
			label: "Kilo Gateway API key",
			hint: "API key (OpenRouter-compatible)",
			optionKey: "kilocodeApiKey",
			flagName: "--kilocode-api-key",
			envVar: "KILOCODE_API_KEY",
			promptMessage: "Enter Kilo Gateway API key",
			defaultModel: KILOCODE_DEFAULT_MODEL_REF,
			applyConfig: (cfg) => applyKilocodeConfig(cfg)
		}],
		catalog: { buildProvider: buildKilocodeProviderWithDiscovery },
		capabilities: {
			geminiThoughtSignatureSanitization: true,
			geminiThoughtSignatureModelHints: ["gemini"]
		},
		wrapStreamFn: (ctx) => {
			const thinkingLevel = ctx.modelId === "kilo/auto" || isProxyReasoningUnsupported(ctx.modelId) ? void 0 : ctx.thinkingLevel;
			return createKilocodeWrapper(ctx.streamFn, thinkingLevel);
		},
		isCacheTtlEligible: (ctx) => ctx.modelId.startsWith("anthropic/")
	}
});
//#endregion
export { kilocode_default as default };
