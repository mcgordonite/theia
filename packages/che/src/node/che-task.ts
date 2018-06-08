/*
 * Copyright (C) 2018 Red Hat, Inc. and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { injectable, inject, named } from 'inversify';
import { ILogger } from '@theia/core/lib/common/logger';
import { Task, TaskOptions } from '@theia/task/lib/node/task';
import { TaskManager } from '@theia/task/lib/node/task-manager';
import { CheTaskInfo } from '../common/task-protocol';

export const TaskCheOptions = Symbol("TaskCheOptions");
export interface TaskCheOptions extends TaskOptions {
    execId: number
}

export const TaskFactory = Symbol("TaskFactory");
export type TaskFactory = (options: TaskCheOptions) => CheTask;

@injectable()
export class CheTask extends Task {

    constructor(
        @inject(TaskManager) protected readonly taskManager: TaskManager,
        @inject(ILogger) @named('task') protected readonly logger: ILogger,
        @inject(TaskCheOptions) protected readonly options: TaskCheOptions
    ) {
        super(taskManager, logger, options);
        this.logger.info(`Created new Che task, id: ${this.id}, exec id: ${this.options.execId}, context: ${this.context}`);
    }

    kill(): Promise<void> {
        throw new Error("Method not implemented.");
    }

    getRuntimeInfo(): CheTaskInfo {
        return {
            taskId: this.id,
            ctx: this.options.context,
            execId: this.options.execId,
            config: this.options.config
        };
    }
}
