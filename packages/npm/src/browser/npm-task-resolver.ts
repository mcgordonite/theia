/*
 * Copyright (C) 2018 Red Hat, Inc. and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { injectable, inject } from 'inversify';
import { TaskResolver } from '@theia/task/lib/browser';
import { TaskConfiguration, ProcessTaskConfiguration } from '@theia/task/lib/common';
import { VariableResolverService } from '@theia/variable-resolver/lib/browser';
import { NpmTaskConfiguration } from './task-protocol';

@injectable()
export class NpmTaskResolver implements TaskResolver {

    @inject(VariableResolverService)
    protected readonly variableResolverService: VariableResolverService;

    /**
     * Converts the given task configuration, which must be NpmTaskConfiguration,
     * to the ProcessTaskConfiguration to be able to run it as a shell process.
     */
    async resolveTask(taskConfig: TaskConfiguration): Promise<TaskConfiguration> {
        if (taskConfig.type !== 'npm') {
            throw new Error(`Unsupported task configuration type: ${taskConfig.type}`);
        }
        const npmTaskConfig = taskConfig as NpmTaskConfiguration;
        const result: ProcessTaskConfiguration = {
            type: 'shell',
            label: npmTaskConfig.label,
            command: 'npm',
            args: ['run', npmTaskConfig.script],
            cwd: await this.variableResolverService.resolve(npmTaskConfig.cwd ? npmTaskConfig.cwd : '${workspaceFolder}')
        };
        return result;
    }
}
