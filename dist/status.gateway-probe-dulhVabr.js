import { r as resolveGatewayProbeAuthSafeWithSecretInputs } from "./probe-auth-Cc4rsSyy.js";
import { t as pickGatewaySelfPresence } from "./gateway-presence-DB1oe0h2.js";
//#region src/commands/status.gateway-probe.ts
async function resolveGatewayProbeAuthResolution(cfg) {
	return resolveGatewayProbeAuthSafeWithSecretInputs({
		cfg,
		mode: cfg.gateway?.mode === "remote" ? "remote" : "local",
		env: process.env
	});
}
async function resolveGatewayProbeAuth(cfg) {
	return (await resolveGatewayProbeAuthResolution(cfg)).auth;
}
//#endregion
export { pickGatewaySelfPresence, resolveGatewayProbeAuth, resolveGatewayProbeAuthResolution };
