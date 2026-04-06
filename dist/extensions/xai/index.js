import { t as buildXaiProvider } from "../../provider-catalog-C5KiEmqE.js";
import { a as isModernXaiModel, o as resolveXaiForwardCompatModel, r as applyXaiModelCompat } from "../../api-Lymu8OXO.js";
import { t as normalizeXaiModelId } from "../../model-id-B813Bcf3.js";
import { r as createToolStreamWrapper } from "../../provider-stream-BL5JCQR1.js";
import { t as defineSingleProviderPluginEntry } from "../../provider-entry-zE0c1QWv.js";
import { n as applyXaiConfig, t as XAI_DEFAULT_MODEL_REF } from "../../onboard-M5ztKv5C.js";
import { n as createXaiToolCallArgumentDecodingWrapper, r as createXaiToolPayloadCompatibilityWrapper, t as createXaiFastModeWrapper } from "../../stream-CSdIN4yt.js";
import { n as createXaiWebSearchProvider } from "../../web-search-C6fp-w3e.js";
//#region extensions/xai/index.ts
const PROVIDER_ID = "xai";
var xai_default = defineSingleProviderPluginEntry({
	id: "xai",
	name: "xAI Plugin",
	description: "Bundled xAI plugin",
	provider: {
		label: "xAI",
		aliases: ["x-ai"],
		docsPath: "/providers/xai",
		auth: [{
			methodId: "api-key",
			label: "xAI API key",
			hint: "API key",
			optionKey: "xaiApiKey",
			flagName: "--xai-api-key",
			envVar: "XAI_API_KEY",
			promptMessage: "Enter xAI API key",
			defaultModel: XAI_DEFAULT_MODEL_REF,
			applyConfig: (cfg) => applyXaiConfig(cfg),
			wizard: { groupLabel: "xAI (Grok)" }
		}],
		catalog: { buildProvider: buildXaiProvider },
		prepareExtraParams: (ctx) => {
			if (ctx.extraParams?.tool_stream !== void 0) return ctx.extraParams;
			return {
				...ctx.extraParams,
				tool_stream: true
			};
		},
		wrapStreamFn: (ctx) => {
			let streamFn = createXaiToolPayloadCompatibilityWrapper(ctx.streamFn);
			if (typeof ctx.extraParams?.fastMode === "boolean") streamFn = createXaiFastModeWrapper(streamFn, ctx.extraParams.fastMode);
			streamFn = createXaiToolCallArgumentDecodingWrapper(streamFn);
			return createToolStreamWrapper(streamFn, ctx.extraParams?.tool_stream !== false);
		},
		normalizeResolvedModel: ({ model }) => applyXaiModelCompat(model),
		normalizeModelId: ({ modelId }) => normalizeXaiModelId(modelId),
		resolveDynamicModel: (ctx) => resolveXaiForwardCompatModel({
			providerId: PROVIDER_ID,
			ctx
		}),
		isModernModelRef: ({ modelId }) => isModernXaiModel(modelId)
	},
	register(api) {
		api.registerWebSearchProvider(createXaiWebSearchProvider());
	}
});
//#endregion
export { xai_default as default };
