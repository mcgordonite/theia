/*
 * Copyright (C) 2017 Ericsson and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { injectable, inject, named } from 'inversify';
import { ILogger, } from '@theia/core/lib/common/';
import { Process } from "@theia/process/lib/node";
import { Task, TaskOptions } from '../task';
import { TaskManager } from '../task-manager';
import { ProcessType, ProcessTaskInfo } from '../../common/process/task-protocol';

export const TaskProcessOptions = Symbol("TaskProcessOptions");
export interface TaskProcessOptions extends TaskOptions {
    command: string,
    process: Process,
    processType: ProcessType
}

export const TaskFactory = Symbol("TaskFactory");
export type TaskFactory = (options: TaskProcessOptions) => ProcessTask;

/** Represents a Task launched as a process by `ProcessTaskRunner`. */
@injectable()
export class ProcessTask extends Task {

    constructor(
        @inject(TaskManager) protected readonly taskManager: TaskManager,
        @inject(ILogger) @named('task') protected readonly logger: ILogger,
        @inject(TaskProcessOptions) protected readonly options: TaskProcessOptions
    ) {
        super(taskManager, logger, options);

        const toDispose =
            this.process.onExit(event => {
                toDispose.dispose();
                this.fireTaskExited({
                    taskId: this.taskId,
                    ctx: this.options.context,
                    code: event.code,
                    signal: event.signal
                });
            });

        this.logger.info(`Created new task, id: ${this.id}, process id: ${this.options.process.id}, OS PID: ${this.process.pid}, context: ${this.context}`);
    }

    kill(): Promise<void> {
        return new Promise<void>(resolve => {
            if (this.process.killed) {
                resolve();
            } else {
                const toDispose = this.process.onExit(event => {
                    toDispose.dispose();
                    resolve();
                });
                this.process.kill();
            }
        });
    }

    getRuntimeInfo(): ProcessTaskInfo {
        return {
            taskId: this.id,
            ctx: this.context,
            config: this.options.config,
            terminalId: (this.processType === 'shell') ? this.process.id : undefined
        };
    }
    get process() {
        return this.options.process;
    }

    get processType() {
        return this.options.processType;
    }
}
