/*
 * Copyright (C) 2018 Red Hat, Inc. and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { injectable, inject } from 'inversify';
import { ProcessTaskRunner } from './process-task-runner';
import { TaskRunnerContribution, TaskRunnerRegistry } from '../task-runner';

@injectable()
export class ProcessTaskRunnerContribution implements TaskRunnerContribution {

    @inject(ProcessTaskRunner)
    protected readonly processTaskRunner: ProcessTaskRunner;

    registerRunner(runners: TaskRunnerRegistry): void {
        runners.registerRunner('process', this.processTaskRunner);
        runners.registerRunner('shell', this.processTaskRunner);
    }
}
