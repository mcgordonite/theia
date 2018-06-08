/*
 * Copyright (C) 2017 Ericsson and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { injectable } from 'inversify';
import { ILogger, Emitter, Event } from '@theia/core/lib/common/';
import { TaskManager } from './task-manager';
import { TaskInfo, TaskExitedEvent, TaskConfiguration } from '../common/task-protocol';

export interface TaskOptions {
    label: string,
    config: TaskConfiguration
    context?: string
}

@injectable()
export abstract class Task {

    protected taskId: number;
    readonly exitEmitter: Emitter<TaskExitedEvent>;

    constructor(
        protected readonly taskManager: TaskManager,
        protected readonly logger: ILogger,
        protected readonly options: TaskOptions
    ) {
        this.taskId = this.taskManager.register(this, this.options.context);
        this.exitEmitter = new Emitter<TaskExitedEvent>();
    }

    /** terminates the task */
    abstract kill(): Promise<void>;

    get onExit(): Event<TaskExitedEvent> {
        return this.exitEmitter.event;
    }

    protected fireProcessExited(event: TaskExitedEvent): void {
        this.exitEmitter.fire(event);
    }

    /** Returns runtime information about task */
    abstract getRuntimeInfo(): TaskInfo;

    get id() {
        return this.taskId;
    }

    get context() {
        return this.options.context;
    }

    get label() {
        return this.options.label;
    }
}
