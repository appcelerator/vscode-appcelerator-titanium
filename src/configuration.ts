import { ConfigurationChangeEvent, ConfigurationTarget, ExtensionContext, Uri, workspace } from 'vscode';
import { ExtensionName } from './constants';
import { ExtensionContainer } from './container';

export class Configuration {
	public static configure (context: ExtensionContext): void {
		context.subscriptions.push(
			workspace.onDidChangeConfiguration(configuration.onConfigurationChanged, configuration) // eslint-disable-line @typescript-eslint/no-use-before-define
		);
	}

	public get<T> (section?: string, resource?: Uri, defaultValue?: T): T {
		return defaultValue === undefined
			? workspace
				.getConfiguration(section === undefined ? undefined : ExtensionName, resource)
				.get<T>(section === undefined ? ExtensionName : section)!
			: workspace
				.getConfiguration(section === undefined ? undefined : ExtensionName, resource)
				.get<T>(section === undefined ? ExtensionName : section, defaultValue)!;
	}

	public update (section: string, value: unknown, target: ConfigurationTarget, resource?: Uri): Thenable<void> {
		return workspace
			.getConfiguration(ExtensionName, target === ConfigurationTarget.Global ? undefined : resource)
			.update(section, value, target);
	}

	private onConfigurationChanged (configEvent: ConfigurationChangeEvent): void {
		ExtensionContainer.resetConfig(configEvent);
	}
}

export const configuration = new Configuration();
export * from './types/config';
