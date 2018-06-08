/*
 * Copyright (C) 2018 Red Hat, Inc. and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { injectable, inject, named } from 'inversify';
import { ContributionProvider } from '@theia/core';
import { BackendApplicationContribution } from '@theia/core/lib/node';
import { ProcessTaskRunner } from './process/process-task-runner';
import { TaskRunnerContribution, TaskRunnerRegistry } from './task-runner';

@injectable()
export class TaskBackendContribution implements BackendApplicationContribution, TaskRunnerContribution {

    @inject(ProcessTaskRunner)
    protected readonly processRunner: ProcessTaskRunner;

    @inject(ContributionProvider) @named(TaskRunnerContribution)
    protected readonly contributionProvider: ContributionProvider<TaskRunnerContribution>;

    @inject(TaskRunnerRegistry)
    protected readonly taskRunnerRegistry: TaskRunnerRegistry;

    onStart(): void {
        this.contributionProvider.getContributions().forEach(contrib =>
            contrib.registerRunner(this.taskRunnerRegistry)
        );
    }

    registerRunner(runners: TaskRunnerRegistry): void {
        runners.registerRunner('raw', this.processRunner);
    }
}
