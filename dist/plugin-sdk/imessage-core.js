import { Di as parseChatTargetPrefixesOrThrow, Ei as parseChatAllowTargetPrefixes, Mi as matchIMessageAcpConversation, Ni as normalizeIMessageAcpConversationId, Oi as resolveServicePrefixedAllowTarget, Pi as resolveIMessageConversationIdFromTarget, Si as normalizeIMessageHandle, ji as resolveServicePrefixedTarget } from "../auth-profiles-Bx_pc0K9.js";
import { g as DEFAULT_ACCOUNT_ID } from "../session-key-B-JhgBEk.js";
import { i as IMessageConfigSchema } from "../zod-schema.providers-core-BdjnVISd.js";
import { t as getChatChannelMeta } from "../chat-meta-C7pBClla.js";
import { r as buildChannelConfigSchema } from "../config-schema-CRyTg0IK.js";
import { n as deleteAccountFromConfigSection, r as setAccountEnabledInConfigSection } from "../config-helpers-DxNRjJ2L.js";
import { m as formatTrimmedAllowFromEntries, v as resolveIMessageConfigAllowFrom, y as resolveIMessageConfigDefaultTo } from "../channel-config-helpers-BKuR4Cr5.js";
export { DEFAULT_ACCOUNT_ID, IMessageConfigSchema, buildChannelConfigSchema, deleteAccountFromConfigSection, formatTrimmedAllowFromEntries, getChatChannelMeta, matchIMessageAcpConversation, normalizeIMessageAcpConversationId, normalizeIMessageHandle, parseChatAllowTargetPrefixes, parseChatTargetPrefixesOrThrow, resolveIMessageConfigAllowFrom, resolveIMessageConfigDefaultTo, resolveIMessageConversationIdFromTarget, resolveServicePrefixedAllowTarget, resolveServicePrefixedTarget, setAccountEnabledInConfigSection };
