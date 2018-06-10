/*
 * Copyright (C) 2018 Red Hat, Inc. and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { interfaces } from 'inversify';
import { ProcessTaskContribution } from './process-task-contribution';
import { ProcessTaskResolver } from './process-task-resolver';
import { TaskContribution } from '../task-contribution';

export function bindProcessTaskModule(bind: interfaces.Bind) {

    bind(ProcessTaskResolver).toSelf().inSingletonScope();
    bind(ProcessTaskContribution).toSelf().inSingletonScope();
    bind(TaskContribution).toService(ProcessTaskContribution);
}
