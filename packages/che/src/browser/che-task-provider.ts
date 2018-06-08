/*
 * Copyright (C) 2018 Red Hat, Inc. and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { injectable, inject } from 'inversify';
import { TaskProvider } from '@theia/task/lib/browser';
import { TaskConfiguration } from '@theia/task/lib/common';
import { Workspace } from './che-workspace-client';
import { CheTaskConfiguration } from '../common/task-protocol';

/** Reads the commands from the current Che workspace and provides it as Task Configurations. */
@injectable()
export class CheTaskProvider implements TaskProvider {

    @inject(Workspace)
    protected readonly cheWsClient: Workspace;

    async provideTasks(): Promise<TaskConfiguration[]> {
        const tasks: TaskConfiguration[] = [];

        const commands = await this.cheWsClient.getCommands();
        for (const command of commands) {
            const providedTask: CheTaskConfiguration = {
                type: 'che',
                label: `${command.name}`,
                target: {
                    workspaceId: await this.cheWsClient.getWorkspaceId(),
                    machineName: 'e'
                },
                command: command.commandLine
            };
            tasks.push(providedTask);
        }
        return tasks;
    }
}
