import { XF as chunkText, aL as resolveWhatsAppOutboundTarget } from "../../auth-profiles-Bx_pc0K9.js";
import { a as shouldLogVerbose } from "../../globals-DcVoseYv.js";
import { r as resolveOutboundSendDep } from "../../outbound-runtime--HFn5s1Z.js";
import { a as createEmptyChannelResult, i as createAttachedChannelResultAdapter } from "../../channel-send-result-DEp-Z70H.js";
import { b as sendTextMediaPayload, p as resolveSendableOutboundReplyParts } from "../../reply-payload-DjEdxZBw.js";
import "../../runtime-env-Cl5OP7LB.js";
import { n as setWhatsAppRuntime, t as whatsappPlugin } from "../../channel-C25ZVavr.js";
import { n as sendPollWhatsApp } from "../../send-DeE1xU9i.js";
import { a as updateLastRouteInBackground, i as trackBackgroundTask, t as deliverWebReply } from "../../deliver-reply-BorIXUYp.js";
//#region extensions/whatsapp/src/outbound-adapter.ts
function trimLeadingWhitespace(text) {
	return text?.trimStart() ?? "";
}
const whatsappOutbound = {
	deliveryMode: "gateway",
	chunker: chunkText,
	chunkerMode: "text",
	textChunkLimit: 4e3,
	pollMaxOptions: 12,
	resolveTarget: ({ to, allowFrom, mode }) => resolveWhatsAppOutboundTarget({
		to,
		allowFrom,
		mode
	}),
	sendPayload: async (ctx) => {
		const text = trimLeadingWhitespace(ctx.payload.text);
		const hasMedia = resolveSendableOutboundReplyParts(ctx.payload).hasMedia;
		if (!text && !hasMedia) return createEmptyChannelResult("whatsapp");
		return await sendTextMediaPayload({
			channel: "whatsapp",
			ctx: {
				...ctx,
				payload: {
					...ctx.payload,
					text
				}
			},
			adapter: whatsappOutbound
		});
	},
	...createAttachedChannelResultAdapter({
		channel: "whatsapp",
		sendText: async ({ cfg, to, text, accountId, deps, gifPlayback }) => {
			const normalizedText = trimLeadingWhitespace(text);
			if (!normalizedText) return createEmptyChannelResult("whatsapp");
			return await (resolveOutboundSendDep(deps, "whatsapp") ?? (await import("../../send-Bc5O97gG.js")).sendMessageWhatsApp)(to, normalizedText, {
				verbose: false,
				cfg,
				accountId: accountId ?? void 0,
				gifPlayback
			});
		},
		sendMedia: async ({ cfg, to, text, mediaUrl, mediaLocalRoots, accountId, deps, gifPlayback }) => {
			const normalizedText = trimLeadingWhitespace(text);
			return await (resolveOutboundSendDep(deps, "whatsapp") ?? (await import("../../send-Bc5O97gG.js")).sendMessageWhatsApp)(to, normalizedText, {
				verbose: false,
				cfg,
				mediaUrl,
				mediaLocalRoots,
				accountId: accountId ?? void 0,
				gifPlayback
			});
		},
		sendPoll: async ({ cfg, to, poll, accountId }) => await sendPollWhatsApp(to, poll, {
			verbose: shouldLogVerbose(),
			accountId: accountId ?? void 0,
			cfg
		})
	})
};
//#endregion
export { deliverWebReply, setWhatsAppRuntime, trackBackgroundTask, updateLastRouteInBackground, whatsappOutbound, whatsappPlugin };
