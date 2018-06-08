/*
 * Copyright (C) 2017 Ericsson and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { JsonRpcServer } from '@theia/core/lib/common/messaging/proxy-factory';

export const taskPath = '/services/task';

export const TaskServer = Symbol('TaskServer');
export const TaskClient = Symbol('TaskClient');

export type ProcessType = 'shell' | 'process';

export interface TaskConfiguration {
    readonly type: string;
    /** A label that uniquely identifies a task configuration */
    readonly label: string;

    /**
     * Additional task type specific properties.
     */
    readonly [key: string]: any;
}

export interface CommandProperties {
    readonly command: string;
    readonly args?: string[];
    readonly options?: object;
}

/** Configuration of a Task that may be run as a process or a command inside a shell. */
export interface ProcessTaskConfiguration extends TaskConfiguration, CommandProperties {
    readonly type: ProcessType;

    /**
     * windows version of processOptions. Used in preference on Windows, if
     * defined
     */
    readonly windows?: CommandProperties;
    /**
     * The 'current working directory' the task will run in. Can be a uri-as-string
     * or plain string path. If the cwd is meant to be somewhere under the workspace,
     * one can use the variable `${workspaceFolder}`, which will be replaced by its path,
     * at runtime. If not specified, defaults to the workspace root.
     * ex:  cwd: '${workspaceFolder}/foo'
     */
    readonly cwd?: string;
}

export interface TaskInfo {
    /** internal unique task id */
    readonly taskId: number,
    /** terminal id. Defined if task is run as a terminal process */
    readonly terminalId?: number,
    /** context that was passed as part of task creation, if any */
    readonly ctx?: string,
    /** task config used for launching a task */
    readonly config: TaskConfiguration
}

export interface TaskServer extends JsonRpcServer<TaskClient> {
    /** Run a task. Optionally pass a context.  */
    run(task: TaskConfiguration, ctx?: string): Promise<TaskInfo>;
    /** Kill a task, by id. */
    kill(taskId: number): Promise<void>;
    /**
     * Returns a list of currently running tasks. If a context is provided,
     * only the tasks started in that context will be provided. Using an
     * undefined context matches all tasks, no matter the creation context.
     */
    getTasks(ctx?: string): Promise<TaskInfo[]>

    /** removes the client that has disconnected */
    disconnectClient(client: TaskClient): void;
}

/** Event sent when a task has concluded its execution */
export interface TaskExitedEvent {
    readonly taskId: number;
    readonly ctx?: string;
    readonly code: number;
    readonly signal?: string;
}

export interface TaskClient {
    onTaskExit(event: TaskExitedEvent): void;
    onTaskCreated(event: TaskInfo): void;
}
