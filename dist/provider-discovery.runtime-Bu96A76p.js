import { Es as resolvePluginProviders } from "./auth-profiles-CbvzvUuD.js";
//#region src/plugins/provider-discovery.runtime.ts
function resolvePluginDiscoveryProvidersRuntime(params) {
	return resolvePluginProviders({
		...params,
		bundledProviderAllowlistCompat: true
	});
}
//#endregion
export { resolvePluginDiscoveryProvidersRuntime };
