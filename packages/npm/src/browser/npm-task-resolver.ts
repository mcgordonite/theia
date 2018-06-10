/*
 * Copyright (C) 2018 Red Hat, Inc. and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { injectable, inject } from 'inversify';
import { TaskResolver } from '@theia/task/lib/browser';
import { TaskConfiguration } from '@theia/task/lib/common';
import { CommandProperties } from '@theia/task/lib/common/process/task-protocol';
import { VariableResolverService } from '@theia/variable-resolver/lib/browser';
import { NpmTaskConfiguration, NPM_TASK_TYPE } from './task-protocol';

@injectable()
export class NpmTaskResolver implements TaskResolver {

    @inject(VariableResolverService)
    protected readonly variableResolverService: VariableResolverService;

    /**
     * Adds the missing properties to the given Task Configuration which are
     * necessary for the `ProcessTaskRunner` to execute a Task as a shell process.
     */
    async resolveTask(taskConfig: TaskConfiguration): Promise<TaskConfiguration> {
        if (taskConfig.type !== NPM_TASK_TYPE) {
            throw new Error(`Unsupported task configuration type: ${taskConfig.type}`);
        }
        const npmTaskConfig = taskConfig as NpmTaskConfiguration;
        // a task will be executed by the ProcessTaskRunner, so it should contain CommandProperties
        const result: NpmTaskConfiguration & CommandProperties = {
            type: npmTaskConfig.type,
            label: npmTaskConfig.label,
            script: npmTaskConfig.script,
            command: 'npm',
            args: ['run', npmTaskConfig.script],
            cwd: await this.variableResolverService.resolve(npmTaskConfig.cwd ? npmTaskConfig.cwd : '${workspaceFolder}')
        };
        return result;
    }
}
