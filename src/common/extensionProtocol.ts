import { IAttachRequestArgs, ILaunchRequestArgs } from 'vscode-chrome-debug-core';
import { LogLevel, Platform } from '../types/common';
import { AppBuildTaskTitaniumBuildBase } from '../tasks/buildTaskProvider';

export interface Request {
	id: string;
	code: string;
	args?: Record<string, unknown>;
}

export interface Response {
	id: string;
	result: {
		isError: boolean;
		message?: string;
		buildInfo?: AppBuildTaskTitaniumBuildBase;
	};
}

export interface FeedbackOptions {
	[ key: string ]: unknown;
	type: 'info' | 'error';
	message: string;
}

export interface TitaniumLaunchRequestArgs extends ILaunchRequestArgs {
	[ key: string ]: unknown;
	request: string;
	projectDir: string;
	platform: Platform;
	deviceId?: string;
	port: number;
	target: string;
	cwd: string;
	appName: string;
	logLevel: LogLevel;
	preLaunchTask: string;
}

export interface TitaniumAttachRequestArgs extends IAttachRequestArgs {
	request: string;
	projectDir: string;
	platform: Platform;
	deviceId?: string;
	port: number;
	target: string;
	cwd: string;
	appName: string;
	logLevel: LogLevel;
}

export const MESSAGE_STRING = 'titanium-debug-message';
