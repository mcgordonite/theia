/*
 * Copyright (C) 2018 Red Hat, Inc. and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { TaskConfiguration, TaskInfo } from '../task-protocol';

export type ProcessType = 'shell' | 'process';

export interface CommandProperties {
    readonly command: string;
    readonly args?: string[];
    readonly options?: object;
}

/** Configuration of a Task that may be run as a process or a command inside a shell. */
export interface ProcessTaskConfiguration extends TaskConfiguration, CommandProperties {
    readonly type: ProcessType;

    /**
     * Windows version of CommandProperties. Used in preference on Windows, if defined.
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

export interface ProcessTaskInfo extends TaskInfo {
    /** terminal id. Defined if task is run as a terminal process */
    readonly terminalId?: number,
}
