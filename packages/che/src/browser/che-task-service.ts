/*
 * Copyright (C) 2018 Red Hat, Inc. and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { injectable, inject } from 'inversify';
import { TaskService } from '@theia/task/lib/browser';
import { CHE_TASK_TYPE } from '../common/task-protocol';

@injectable()
export class CheTaskService {

    @inject(TaskService)
    protected readonly taskService: TaskService;

    run(label: string): void {
        this.taskService.run(CHE_TASK_TYPE, label);
    }
}
