/*
 * Copyright (C) 2017 Ericsson and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { inject, injectable, postConstruct } from 'inversify';
import { LogLevel } from '../common/logger';
import { LoggerWatcher } from '../common/logger-watcher';
import { LogLevelCliContribution } from './logger-cli-contribution';
import { ILoggerServer, ILoggerClient } from '../common/logger-protocol';

@injectable()
export class ConsoleLoggerServer implements ILoggerServer {

    protected readonly loggers = new Map<string, number>();
    protected client: ILoggerClient | undefined = undefined;

    @inject(LoggerWatcher)
    protected watcher: LoggerWatcher;

    @inject(LogLevelCliContribution)
    protected cli: LogLevelCliContribution;

    @postConstruct()
    protected init() {
        for (const name of Object.keys(this.cli.logLevels)) {
            this.setLogLevel(name, this.cli.logLevels[name]);
        }
        this.cli.onLogConfigChanged(() => this.updateLogLevels());
    }

    async setLogLevel(name: string, newLogLevel: number): Promise<void> {
        this.loggers.set(name, newLogLevel);
        const event = {
            loggerName: name,
            newLogLevel
        };
        if (this.client !== undefined) {
            this.client.onLogLevelChanged(event);
        }
        this.watcher.fireLogLevelChanged(event);
    }

    async getLogLevel(name: string): Promise<number> {
        return this.loggers.get(name) || this.cli.defaultLogLevel;
    }

    // tslint:disable-next-line:no-any
    async log(name: string, logLevel: number, message: string, params: any[]): Promise<void> {
        const configuredLogLevel = await this.getLogLevel(name);
        if (logLevel >= configuredLogLevel) {
            const channel = logLevel === LogLevel.ERROR || logLevel === LogLevel.FATAL ? console.error : console.log;
            const severity = `${(LogLevel.strings.get(logLevel) || 'unknown').toUpperCase()}`;
            channel(`${name} ${severity}`, message, ...params);
        }
    }

    async child(name: string): Promise<void> {
        this.setLogLevel(name, LogLevel.INFO);
    }

    dispose(): void {
        this.loggers.clear();
    }

    setClient(client: ILoggerClient | undefined) {
        this.client = client;
    }

    protected updateLogLevels() {
        for (const loggerName of this.loggers.keys()) {
            const newLevel = this.cli.logLevelFor(loggerName);
            this.setLogLevel(loggerName, newLevel);
        }
    }

}
