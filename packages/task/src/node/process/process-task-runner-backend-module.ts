/*
 * Copyright (C) 2018 Red Hat, Inc. and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { interfaces, Container } from 'inversify';
import { ProcessTask, TaskFactory, TaskProcessOptions } from './process-task';
import { ProcessTaskRunner } from './process-task-runner';
import { ProcessTaskRunnerContribution } from './process-task-runner-contribution';
import { TaskRunnerContribution } from '../task-runner';

export function bindProcessTaskRunnerModule(bind: interfaces.Bind) {

    bind(ProcessTask).toSelf().inTransientScope();
    bind(TaskFactory).toFactory(ctx =>
        (options: TaskProcessOptions) => {
            const child = new Container({ defaultScope: 'Singleton' });
            child.parent = ctx.container;
            child.bind(TaskProcessOptions).toConstantValue(options);
            return child.get(ProcessTask);
        }
    );
    bind(ProcessTaskRunner).toSelf().inSingletonScope();
    bind(ProcessTaskRunnerContribution).toSelf().inSingletonScope();
    bind(TaskRunnerContribution).toService(ProcessTaskRunnerContribution);
}
