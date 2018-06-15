/*
 * Copyright (C) 2017 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { inject, injectable } from "inversify";
import { ILogger } from '@theia/core/lib/common/logger';
import { BaseLanguageServerContribution, IConnection } from "@theia/languages/lib/node";
import { PYTHON_LANGUAGE_ID, PYTHON_LANGUAGE_NAME } from '../common';

/**
 * IF you have python on your machine, `pyls` can be installed with the following command:
 * `pip install `
 */
@injectable()
export class PythonContribution extends BaseLanguageServerContribution {

    @inject(ILogger)
    protected readonly logger: ILogger;

    readonly id = PYTHON_LANGUAGE_ID;
    readonly name = PYTHON_LANGUAGE_NAME;

    start(clientConnection: IConnection): void {
        const command = 'pyls';
        const args: string[] = [
        ];
        const serverConnection = this.createProcessStreamConnection(command, args);
        this.forward(clientConnection, serverConnection);
    }

    protected onDidFailSpawnProcess(error: Error): void {
        super.onDidFailSpawnProcess(error);
        this.logger.error("Error starting python language server.");
        this.logger.error("Please make sure it is installed on your system.");
        this.logger.error("Use the following command: 'pip install python-language-server'");
    }

}
