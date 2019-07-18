import * as vscode from 'vscode';
import { UserCancellation } from '../commands';
import { WorkspaceState } from '../constants';
import { ExtensionContainer } from '../container';
import project from '../project';
import { quickPick, selectDevice, selectiOSCertificate, selectiOSProvisioningProfile, selectPlatform } from '../quickpicks/common';
import * as utils from '../utils';
export class TitaniumDebugConfigurationProvider implements vscode.DebugConfigurationProvider {

	public async resolveDebugConfiguration (folder: vscode.WorkspaceFolder | undefined, config: vscode.DebugConfiguration, token?: vscode.CancellationToken): Promise<vscode.DebugConfiguration> {
		if (!config.projectDir) {
			config.projectDir = '${workspaceFolder}';
		}

		if (!config.port) {
			config.port = 9000;
			config.debugPort = 9000;
		}

		if (!config.logLevel) {
			config.logLevel = ExtensionContainer.config.general.logLevel;

		}

		if (!config.platform) {
			try {
				config.platform = (await selectPlatform()).id;
			} catch (error) {
				let message = error.message;
				if (error instanceof UserCancellation) {
					message = 'Failed to start debug session as no platform was selected';
				}
				throw new Error(message);
			}
		}

		if (config.platform === 'android' && config.request === 'attach') {
			throw new Error('Attaching to a running Android app is currently not supported');
		}

		if (!config.target) {
			try {
				let lastDebugState;
				if (config.platform === 'android') {
					lastDebugState = ExtensionContainer.context.workspaceState.get<any>(WorkspaceState.LastAndroidDebug);
				} else if (config.platform === 'ios') {
					lastDebugState = ExtensionContainer.context.workspaceState.get<any>(WorkspaceState.LastiOSDebug);
				}
				const targets = utils.targetsForPlatform(config.platform)
					.filter(target => !/^dist/.test(target))
					.map(target => ({ label: utils.nameForTarget(target), id: target }));

				if (lastDebugState) {
					try {
						targets.push({
							label: `Last debug session (${lastDebugState.target} - ${lastDebugState.deviceName})`,
							id: 'last'
						});
					} catch (error) {
						// squelch error as it might be due to bad last state
					}
				}
				const targetInfo = await quickPick(targets);
				if (targetInfo.id === 'last') {
					config.target = lastDebugState.target;
					config.deviceId = lastDebugState.deviceId;
					config.deviceName = lastDebugState.deviceName;
					config.iOSCertificate = lastDebugState.iOSCertificate;
					config.iOSProvisioningProfile = lastDebugState.iOSProvisioningProfile;
				} else {
					config.target = targetInfo.id;
				}
			} catch (error) {
				let message = error.message;
				if (error instanceof UserCancellation) {
					message = 'Failed to start debug session as no target was selected';
				}
				throw new Error(message);
			}
		}

		if (!config.deviceId) {
			try {
				const deviceInfo = await selectDevice(config.platform, config.target);
				config.deviceId = deviceInfo.udid;
				config.deviceName = deviceInfo.label;
			} catch (error) {
				let message = error.message;
				if (error instanceof UserCancellation) {
					message = 'Failed to start debug session as no device was selected';
				}
				throw new Error(message);
			}
		}

		if (config.platform === 'ios' && config.target === 'device' && config.request !== 'attach') {
			if (!config.iOSCertificate) {
				try {
					const certificate = await selectiOSCertificate('run');
					const provisioning = await selectiOSProvisioningProfile(certificate, config.target, project.appId());

					config.iOSCertificate = certificate.label;
					config.iOSProvisioningProfile = provisioning.uuid;
				} catch (error) {
					let message = error.message;
					if (error instanceof UserCancellation) {
						message = 'Failed to start debug session as no code signing information was selected';
					}
					throw new Error(message);
				}
			}
		}

		if (config.platform === 'android') {
			ExtensionContainer.context.workspaceState.update(WorkspaceState.LastAndroidDebug, config);
		} else if (config.platform === 'ios') {
			ExtensionContainer.context.workspaceState.update(WorkspaceState.LastiOSDebug, config);
		}

		return config;
	}
}
