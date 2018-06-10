/*
 * Copyright (C) 2018 Red Hat, Inc. and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { injectable, inject } from 'inversify';
import { ProcessTaskResolver } from './process-task-resolver';
import { TaskContribution, TaskResolverRegistry } from '../task-contribution';

@injectable()
export class ProcessTaskContribution implements TaskContribution {

    @inject(ProcessTaskResolver)
    protected readonly processTaskResolver: ProcessTaskResolver;

    registerResolvers(resolvers: TaskResolverRegistry): void {
        resolvers.register('process', this.processTaskResolver);
        resolvers.register('shell', this.processTaskResolver);
    }
}
