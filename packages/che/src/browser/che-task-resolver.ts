/*
 * Copyright (C) 2018 Red Hat, Inc. and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { injectable, inject } from 'inversify';
import { TaskResolver } from '@theia/task/lib/browser';
import { VariableResolverService } from '@theia/variable-resolver/lib/browser';
import { TaskConfiguration } from '@theia/task/lib/common';
import { Workspace } from './che-workspace-client';
import { CheTaskConfiguration, Target } from '../common/task-protocol';

/**
 * Prepares a Che Task for execution:
 * - resolve the variables in a command line;
 * - add the current Che workspace's ID if none;
 * - allows to choose a target machine if none.
 */
@injectable()
export class CheTaskResolver implements TaskResolver {

    @inject(VariableResolverService)
    protected readonly variableResolverService: VariableResolverService;

    @inject(Workspace)
    protected readonly cheWorkspaceClient: Workspace;

    async resolveTask(taskConfig: TaskConfiguration): Promise<TaskConfiguration> {
        if (taskConfig.type !== 'che') {
            throw new Error(`Unsupported task configuration type: ${taskConfig.type}`);
        }
        const cheTaskConfig = taskConfig as CheTaskConfiguration;
        const resultTarget: Target = {};

        if (!cheTaskConfig.target) {
            resultTarget.workspaceId = await this.cheWorkspaceClient.getWorkspaceId();
            resultTarget.machineName = await this.pickMachine();
        } else {
            const target = cheTaskConfig.target;
            resultTarget.workspaceId = target.workspaceId ? target.workspaceId : await this.cheWorkspaceClient.getWorkspaceId();
            resultTarget.machineName = target.machineName ? target.machineName : await this.pickMachine();
        }

        const resultTask: CheTaskConfiguration = {
            type: cheTaskConfig.type,
            label: cheTaskConfig.label,
            command: await this.variableResolverService.resolve(cheTaskConfig.command),
            target: resultTarget
        };
        return resultTask;
    }

    protected async pickMachine(): Promise<string> {
        // this.wsClient.getListMachines();
        return 'theia';
    }
}
