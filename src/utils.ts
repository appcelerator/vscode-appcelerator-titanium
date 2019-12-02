import * as fs from 'fs-extra';
import * as walkSync from 'klaw-sync';
import * as path from 'path';
import * as semver from 'semver';
import * as _ from 'underscore';
import appc from './appc';

import { platform } from 'os';
import { workspace } from 'vscode';
import { AndroidPackageOptions, BuildAppOptions, BuildIosAppOptions, BuildModuleOptions, CleanAppOptions, CreateAppOptions, CreateModuleOptions, IosPackageOptions, PackageAppOptions, WindowsPackageOptions } from './types/cli';
import { IosCert, IosCertificateType, PlatformPretty } from './types/common';

/**
 * Returns available target platforms
 *
 * @returns {Array}
 */
export function platforms (): string[] {
	switch (platform()) {
		case 'darwin':
			return [ 'ios', 'android' ];
		case 'win32':
			return [ 'android', 'windows' ];
		case 'linux':
			return [ 'android' ];
		default:
			return [];
	}
}

/**
 * Returns correct name for given platform
 *
 * @param {String} platform - target platform.
 * @returns {String}
 */
export function nameForPlatform (targetPlatform: string) {
	targetPlatform =  normalisedPlatform(targetPlatform);
	switch (targetPlatform) {
		case 'android':
			return PlatformPretty.android;
		case 'ios':
			return PlatformPretty.ios;
		case 'windows':
			return PlatformPretty.windows;
	}
}

/**
 * Returns the pretty name for a target, used for displaying in the UI.
 * @param {String} target - target to get pretty name for.
 * @returns {String}
 */
export function nameForTarget (target: string) {
	target = target.toLowerCase();
	switch (target) {
		case 'device':
		case 'emulator':
		case 'simulator':
			return capitalizeFirstLetter(target);
		case 'dist-adhoc':
			return 'Ad-Hoc';
		case 'dist-appstore':
			return 'App Store';
		case 'dist-playstore':
			return 'Play Store';
		default:
			return target;
	}
}

/**
 * Returns the target name based off a pretty name in the UI.
 * @param {String} name - name to get target for.
 * @param {String} targetPlatform - platform to get target for.
 * @returns {String}
 */
export function targetForName (name: string, targetPlatform: string): string {
	name = name.toLowerCase();
	switch (name) {
		case 'Ad-Hoc':
			return 'dist-adhoc';
		case 'App Store':
			return 'dist-appstore';
		case 'Play Store':
			return 'dist-playstore';
		case 'device':
			return targetPlatform === 'windows' ? 'wp-device' : name;
		case 'emulator':
			return targetPlatform === 'windows' ? 'wp-emulator' : name;
		case 'simulator':
		default:
			return name;
	}
}

export function targetsForPlatform (platformName: string): string[] {
	platformName = normalisedPlatform(platformName);
	switch (platformName) {
		case 'android':
			return [ 'emulator', 'device', 'dist-playstore' ];
		case 'ios':
			return [ 'simulator', 'device', 'dist-adhoc', 'dist-appstore' ];
		case 'windows':
			return [ 'dist-phonestore', 'dist-winstore', 'wp-emulator', 'wp-device', 'ws-local' ];
		default:
			return [];
	}
}
/**
 * Returns normalised name for platform
 *
 * @param {String} targetPlatform - Target platform.
 * @returns {String}
 */
export function  normalisedPlatform (targetPlatform: string) {
	if (targetPlatform === 'iphone' || targetPlatform === 'ipad') {
		return 'ios';
	}
	return targetPlatform.toLowerCase();
}

/**
 * iOS provisioning profile matches App ID
 *
 * @param {String} profileAppId 	app ID of provisioing profile
 * @param {String} appId 			app ID
 * @returns {Boolean}
 */
export function iOSProvisioningProfileMatchesAppId (profileAppId: string, appId: string) {

	// allow wildcard
	if (String(profileAppId) === '*') {
		return true;
	}

	// allow explicit match
	if (String(profileAppId) === appId) {
		return true;
	}

	// limited wildcard
	if (profileAppId.indexOf('*') === profileAppId.length - 1) {
		const profileAppIdPrefix = profileAppId.substr(0, profileAppId.length - 1);
		if (appId.indexOf(profileAppIdPrefix) === 0) {
			return true;
		}
	}

	return false;
}

/**
 * Returns string with capitalized first letter
 *
 * @param {String} s - string.
 * @returns {String}
 */
export function  capitalizeFirstLetter (s: string) {
	return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Alloy app directory
 *
 * @returns {String}
 */
export function getAlloyRootPath () {
	return path.join(workspace.rootPath!, 'app');
}

/**
 * Returns true if current project is an Alloy project
 *
 * @returns {Boolean}
 */
export function isAlloyProject () {
	return directoryExists(getAlloyRootPath());
}

/**
 * i18n project directory
 *
 * @returns {String}
 */
export function getI18nPath () {
	if (isAlloyProject()) {
		return path.join(getAlloyRootPath(), 'i18n');
	}
}

/**
 * Returns true if file exists at given path
 *
 * @param {String} path		file path
 * @returns {Boolean}
 */
export function fileExists (filePath: string) {
	try {
		const stat = fs.statSync(filePath);
		return stat.isFile();
	} catch (err) {
		return !(err && err.code === 'ENOENT');
	}
}

/**
 * Returns true if directory exists at given path
 *
 * @param {String} path 	directory path
 * @returns {Boolean}
 */
export function directoryExists (directoryPath: string) {
	try {
		const stat = fs.statSync(directoryPath);
		return stat.isDirectory();
	} catch (err) {
		return !(err && err.code === 'ENOENT');
	}
}

/**
 * Convert to unix path
 *
 * @param {String} p 	path
 * @returns {String}
 */
export function toUnixPath (p: string) { // https://github.com/anodynos/upath
	const double = /\/\//;
	p = p.replace(/\\/g, '/');
	while (p.match(double)) {
		p = p.replace(double, '/');
	}
	return p;
}

/**
 * Returns recursive keys from given object
 *
 * @param {Object} obj 	object to get keys of
 * @returns {Array}
 */
export function getAllKeys (obj: object): string[] {
	if (!_.isObject(obj)) {
		return [];
	}
	const result = [];
	for (const [ key, value ] of Object.entries(obj)) {
		result.push(key);
		for (const val of getAllKeys(value)) {
			result.push(key + '.' + val);
		}
	}
	return result;
}

/**
 * Search a directory recursively for all JS files, filtering out directories
 * from the results.
 * @param {String} directory - Directory to search for files in.
 * @returns {Array<Object>} Array of objects of the structure { path, stats}, where path is the full path,
 * and stats is an fs.stats object.
 */
export function filterJSFiles (directory: string) {
	return walkSync(directory, {
		nodir: true,
		filter: (item: walkSync.Item) => item.stats.isDirectory() || path.extname(item.path) === '.js'
	});
}

export function buildArguments (options: BuildAppOptions | BuildModuleOptions) {

	const args = [
		'run',
		'--platform', options.platform,
		'--log-level', options.logLevel,
		'--project-dir', normalizeDriveLetter(options.projectDir)
	];

	if (options.buildOnly) {
		args.push('--build-only');
	}

	if (isAppBuild(options)) {
		args.push('--target', options.target!);

		if (options.target !== 'ws-local') {
			args.push('--device-id', options.deviceId!);
		}

		if (options.target === 'device' && options.platform === 'ios') {
			args.push(
				'--developer-name', (options as BuildIosAppOptions).iOSCertificate!,
				'--pp-uuid', (options as BuildIosAppOptions).iOSProvisioningProfile!
			);
		}

		if (options.liveview) {
			args.push('--liveview');
		}

		if (options.debugPort && options.platform === 'android') {
			args.push(
				'--debug-host',
				`/localhost:${options.debugPort}`
			);
		}

		if (options.skipJsMinify) {
			args.push('--skip-js-minify');
		}

		if (options.sourceMaps) {
			args.push('--source-maps');
		}

		if (options.deployType) {
			args.push(
				'--deploy-type',
				options.deployType
			);
		}
	}

	return args.map(arg => quoteArgument(arg));
}

export function packageArguments (options: PackageAppOptions) {
	const args = [
		'run',
		'--platform', options.platform,
		'--target', options.target,
		'--log-level', options.logLevel,
		'--project-dir', normalizeDriveLetter(options.projectDir)
	];

	if (options.target !== 'dist-appstore') {
		args.push('--output-dir', options.outputDirectory);
	}

	if (options.platform === 'android') {
		args.push(
			'--keystore', (options as AndroidPackageOptions).keystoreInfo.location,
			'--alias', (options as AndroidPackageOptions).keystoreInfo.alias,
			'--store-password', (options as AndroidPackageOptions).keystoreInfo.password
		);
		if ((options as AndroidPackageOptions).keystoreInfo.privateKeyPassword) {
			args.push('--key-password', (options as AndroidPackageOptions).keystoreInfo.privateKeyPassword!);
		}
	} else if (options.platform === 'ios') {
		args.push(
			'--distribution-name', (options as IosPackageOptions).iOSCertificate!,
			'--pp-uuid', (options as IosPackageOptions).iOSProvisioningProfile!
		);
	} else if (options.platform === 'windows') {
		if ((options as WindowsPackageOptions).windowsCertInfo.location) {
			args.push('--win-cert', (options as WindowsPackageOptions).windowsCertInfo.location!);
		} else {
			args.push('--win-cert');
		}
		args.push('--pfx-password', (options as WindowsPackageOptions).windowsCertInfo.password);
		args.push('--win-publisher-id', (options as WindowsPackageOptions).windowsPublisherID!);
	}
	return args.map(arg => quoteArgument(arg));
}

export function createAppArguments (options: CreateAppOptions) {
	const args = [
		'new',
		'--type', 'titanium',
		'--name', options.name,
		'--id', options.id,
		'--project-dir', normalizeDriveLetter(path.join(options.workspaceDir, options.name)),
		'--platforms', options.platforms.join(','),
		'--no-prompt',
		'--log-level', options.logLevel
	];

	if (options.force) {
		args.push('--force');
	}
	if (!options.enableServices) {
		args.push('--no-services');
	} else {
		args.push('--no-enable-services');
	}
	return args.map(arg => quoteArgument(arg));
}

export function createModuleArguments (options: CreateModuleOptions) {
	const args = [
		'new',
		'--type', 'timodule',
		'--name', options.name,
		'--id', options.id,
		'--project-dir', normalizeDriveLetter(path.join(options.workspaceDir, options.name)),
		'--platforms', options.platforms.join(','),
		'--no-prompt',
		'--log-level', options.logLevel
	];

	if (options.force) {
		args.push('--force');
	}
	return args.map(arg => quoteArgument(arg));
}

export function cleanAppArguments (options: CleanAppOptions) {
	const args = [
		'ti',
		'clean',
		'--project-dir', normalizeDriveLetter(options.projectDir),
		'--log-level', options.logLevel
	];

	return args.map(arg => quoteArgument(arg));
}

function quoteArgument (arg: string) {
	return `"${arg}"`;
}

export function validateAppId (appId: string) {
	// TODO: Document this, add Java keyword detection, return what's wrong rather than true/false?
	if (!/^([a-zA-Z_]{1}[a-zA-Z0-9]*(\.[a-zA-Z0-9]+)+)$/.test(appId)) {
		return false;
	}
	return true;
}

function isAppBuild (options: BuildAppOptions | BuildModuleOptions): options is BuildAppOptions {
	return (options as BuildAppOptions).projectType === 'app';
}

/**
 * Matches
 *
 * @param {String} text text to test
 * @param {String} test text to match against
 *
 * @returns {Boolean}
 */
export function matches (text: string, test: string) {
	return new RegExp(test, 'i').test(text);
}

function normalizeDriveLetter (filePath: string): string {
	if (process.platform !== 'win32') {
		return filePath;
	}
	const { root } = path.parse(filePath);
	return `${root.substr(0, 1).toUpperCase()}${filePath.slice(1)}`;
}

export function isValidPlatform (targetPlatform: string) {
	return fs.pathExistsSync(path.join(workspace.rootPath!, targetPlatform));
}

/**
 * Determine the correct certificate name value to provide to the SDK build process.
 * Prior to SDK 8.2.0 only the "name" property was allowed, but for 8.2.0 and above
 * we should prefer the fullname as it differentiates between the iPhone certs and
 * the generic Apple certs.
 *
 * @param {String} certificateName - Certificate fullname.
 * @param {String} sdkVersion - Projects SDK version in the tiapp.xml.
 * @param {String} certificateType - Type of certificate type to look up, developer or distribution.
 *
 * @returns {String}
 */
export function getCorrectCertificateName (certificateName: string, sdkVersion: string, certificateType: IosCertificateType) {
	const certificate = appc.iOSCertificates(certificateType).find((cert: IosCert) => cert.fullname === certificateName);

	if (semver.gte(semver.coerce(sdkVersion)!, '8.2.0')) {
		return certificate!.fullname;
	} else {
		return certificate!.name;
	}
}
