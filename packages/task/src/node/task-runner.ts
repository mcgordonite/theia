/*
 * Copyright (C) 2018 Red Hat, Inc. and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { injectable, inject, postConstruct } from 'inversify';
import { Disposable } from '@theia/core/lib/common/disposable';
import { ProcessTaskRunner } from './process/process-task-runner';
import { Task } from './task';
import { TaskConfiguration } from '../common/task-protocol';

export const TaskRunnerContribution = Symbol('TaskRunnerContribution');
/**
 * The Task Runner Contribution should be implemented to register a custom Task Runner.
 */
export interface TaskRunnerContribution {
    registerRunner(runners: TaskRunnerRegistry): void;
}

export const TaskRunner = Symbol('TaskRunner');
/** A Task Runner knows how to run and kill a task of particular type. */
export interface TaskRunner {
    /**
     * Runs a task based on the given task configuration.
     * @param taskConfig task configuration to run a task from
     * @param ctx
     */
    run(taskConfig: TaskConfiguration, ctx?: string): Promise<Task>;
}

@injectable()
export class TaskRunnerRegistry {

    protected runners: Map<string, TaskRunner>;
    /** A Task Runner that will be used for executing a Task without an associated Runner. */
    protected defaultRunner: TaskRunner;

    @inject(ProcessTaskRunner)
    protected readonly processTaskRunner: ProcessTaskRunner;

    @postConstruct()
    protected init(): void {
        this.runners = new Map();
        this.defaultRunner = this.processTaskRunner;
    }

    /** Registers a Task Runner for a particular Task Type. */
    registerRunner(type: string, runner: TaskRunner): Disposable {
        this.runners.set(type, runner);
        return {
            dispose: () => this.runners.delete(type)
        };
    }

    /** Returns a Task Runner registered for the specified Task Type or default Task Runner if none. */
    getRunner(type: string): TaskRunner | undefined {
        const runner = this.runners.get(type);
        return runner ? runner : this.defaultRunner;
    }
}
