/*
 * Copyright (C) 2018 Red Hat, Inc. and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { injectable, inject } from 'inversify';
import { TaskConfiguration } from '@theia/task/lib/common';
import { Task, TaskRunner, TaskManager } from '@theia/task/lib/node';
import { TaskFactory } from './che-task';
import { ExecCreateClient, ExecAttachClientFactory } from './machine-exec-client';

/**
 * Sends a task for execution to machine-exec server.
 */
@injectable()
export class CheTaskRunner implements TaskRunner {

    @inject(ExecCreateClient)
    protected readonly execCreateClient: ExecCreateClient;

    @inject(ExecAttachClientFactory)
    protected readonly execAttachClientFactory: ExecAttachClientFactory;

    @inject(TaskManager)
    protected readonly taskManager: TaskManager;

    @inject(TaskFactory)
    protected readonly taskFactory: TaskFactory;

    /**
     * Runs a task from the given task configuration which must have a target property specified.
     */
    async run(taskConfig: TaskConfiguration, ctx?: string): Promise<Task> {
        // validates the given task configuration has a target specified
        if (!taskConfig.target || !taskConfig.target.workspaceId || !taskConfig.target.machineName) {
            throw new Error(`Che task config must have 'target' property specified`);
        }

        const machineExec = {
            identifier: {
                machineName: taskConfig.target.machineName,
                workspaceId: taskConfig.target.workspaceId
            },
            cmd: ['sh', '-c', taskConfig.command],
            tty: true
        };

        let execId = 0;
        try {
            execId = await this.execCreateClient.create(machineExec);
            const execAttachClient = this.execAttachClientFactory.create(execId);
            execAttachClient.attach();
            console.log('Executed Che command: ' + execId);

            return this.taskFactory({
                label: taskConfig.label,
                context: ctx,
                execId: execId,
                config: taskConfig
            });
        } catch (err) {
            throw new Error(`Failed to execute Che command: ${err}`);
        }
    }
}
