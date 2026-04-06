import { Es as resolvePluginProviders } from "./auth-profiles-Bx_pc0K9.js";
//#region src/plugins/provider-discovery.runtime.ts
function resolvePluginDiscoveryProvidersRuntime(params) {
	return resolvePluginProviders({
		...params,
		bundledProviderAllowlistCompat: true
	});
}
//#endregion
export { resolvePluginDiscoveryProvidersRuntime };
