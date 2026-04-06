import { o as resolveCompatibilityHostVersion, s as resolveRuntimeServiceVersion } from "./version-DUAVxUwB.js";
import { g as resolvePackageExtensionEntries, h as loadPluginManifest, l as detectBundleManifestFormat, m as getPackageManifestMetadata, r as isPathInside, t as checkMinHostVersion, u as loadBundleManifest } from "./min-host-version-C1y1D3Eu.js";
import { d as writeFileFromPathWithinRoot } from "./fs-safe-CC735e0M.js";
import { a as resolveArchiveKind, i as readJsonFile, r as fileExists } from "./archive-CgzjEb4L.js";
import { i as validateRegistryNpmSpec } from "./npm-registry-spec-Dxzjt30v.js";
import { r as resolveArchiveSourcePath } from "./install-source-utils-DYTEMKk8.js";
import { i as withExtractedArchiveRoot, r as resolveExistingInstallPath, t as installPackageDir } from "./install-package-dir-UCAvxjFq.js";
import { a as finalizeNpmSpecArchiveInstall, i as resolveTimedInstallModeOptions, n as resolveCanonicalInstallTarget, o as installFromNpmSpecArchiveWithInstaller, r as resolveInstallModeOptions, t as ensureInstallTargetAvailable } from "./install-target-Ds6THk2E.js";
//#region src/plugins/install-security-scan.ts
async function loadInstallSecurityScanRuntime() {
	return await import("./install-security-scan.runtime-605Tnkf-.js");
}
async function scanBundleInstallSource(params) {
	const { scanBundleInstallSourceRuntime } = await loadInstallSecurityScanRuntime();
	await scanBundleInstallSourceRuntime(params);
}
async function scanPackageInstallSource(params) {
	const { scanPackageInstallSourceRuntime } = await loadInstallSecurityScanRuntime();
	await scanPackageInstallSourceRuntime(params);
}
//#endregion
export { checkMinHostVersion, detectBundleManifestFormat, ensureInstallTargetAvailable, fileExists, finalizeNpmSpecArchiveInstall, getPackageManifestMetadata, installFromNpmSpecArchiveWithInstaller, installPackageDir, isPathInside, loadBundleManifest, loadPluginManifest, readJsonFile, resolveArchiveKind, resolveArchiveSourcePath, resolveCanonicalInstallTarget, resolveCompatibilityHostVersion, resolveExistingInstallPath, resolveInstallModeOptions, resolvePackageExtensionEntries, resolveRuntimeServiceVersion, resolveTimedInstallModeOptions, scanBundleInstallSource, scanPackageInstallSource, validateRegistryNpmSpec, withExtractedArchiveRoot, writeFileFromPathWithinRoot };
