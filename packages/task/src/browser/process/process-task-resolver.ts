/*
 * Copyright (C) 2018 Red Hat, Inc. and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { injectable, inject } from 'inversify';
import { VariableResolverService } from '@theia/variable-resolver/lib/browser';
import { TaskResolver } from '../task-contribution';
import { TaskConfiguration } from '../../common/task-protocol';
import { ProcessTaskConfiguration } from '../../common/process/task-protocol';

@injectable()
export class ProcessTaskResolver implements TaskResolver {

    @inject(VariableResolverService)
    protected readonly variableResolverService: VariableResolverService;

    /**
     * Perform some adjustments to the task launch configuration, before sending
     * it to the backend to be executed. We can make sure that parameters that
     * are optional to the user but required by the server will be defined, with
     * sane default values. Also, resolve all known variables, e.g. `${workspaceFolder}`.
     */
    async resolveTask(taskConfig: TaskConfiguration): Promise<TaskConfiguration> {
        if (taskConfig.type !== 'process' && taskConfig.type !== 'shell') {
            throw new Error('Unsupported task configuration type.');
        }
        const processTaskConfig = taskConfig as ProcessTaskConfiguration;
        const result: ProcessTaskConfiguration = {
            type: processTaskConfig.type,
            label: processTaskConfig.label,
            command: await this.variableResolverService.resolve(processTaskConfig.command),
            args: processTaskConfig.args ? await this.variableResolverService.resolveArray(processTaskConfig.args) : undefined,
            options: processTaskConfig.options,
            windows: processTaskConfig.windows ? {
                command: await this.variableResolverService.resolve(processTaskConfig.windows.command),
                args: processTaskConfig.args ? await this.variableResolverService.resolveArray(processTaskConfig.args) : undefined,
                options: processTaskConfig.windows.options
            } : undefined,
            cwd: await this.variableResolverService.resolve(processTaskConfig.cwd ? processTaskConfig.cwd : '${workspaceFolder}')
        };
        return result;
    }
}
