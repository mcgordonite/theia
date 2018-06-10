/*
 * Copyright (C) 2017 Ericsson and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { ContainerModule } from 'inversify';
import { FrontendApplicationContribution } from '@theia/core/lib/browser';
import { CommandContribution, MenuContribution, bindContributionProvider } from '@theia/core/lib/common';
import { WebSocketConnectionProvider } from '@theia/core/lib/browser/messaging';
import { QuickOpenTask } from './quick-open-task';
import { TaskContribution, TaskProviderRegistry, TaskResolverRegistry } from './task-contribution';
import { TaskService } from './task-service';
import { TaskConfigurations } from './task-configurations';
import { TaskFrontendContribution } from './task-frontend-contribution';
import { createCommonBindings } from '../common/task-common-module';
import { TaskServer, taskPath } from '../common/task-protocol';
import { TaskWatcher } from '../common/task-watcher';
import { bindProcessTaskModule } from './process/process-task-frontend-module';

export default new ContainerModule(bind => {
    bind(TaskFrontendContribution).toSelf().inSingletonScope();
    bind(TaskService).toSelf().inSingletonScope();

    for (const identifier of [FrontendApplicationContribution, CommandContribution, MenuContribution]) {
        bind(identifier).toService(TaskFrontendContribution);
    }

    bind(QuickOpenTask).toSelf().inSingletonScope();
    bind(TaskConfigurations).toSelf().inSingletonScope();

    bind(TaskServer).toDynamicValue(ctx => {
        const connection = ctx.container.get(WebSocketConnectionProvider);
        const taskWatcher = ctx.container.get(TaskWatcher);
        return connection.createProxy<TaskServer>(taskPath, taskWatcher.getTaskClient());
    }).inSingletonScope();

    createCommonBindings(bind);

    bind(TaskProviderRegistry).toSelf().inSingletonScope();
    bind(TaskResolverRegistry).toSelf().inSingletonScope();
    bindContributionProvider(bind, TaskContribution);

    bindProcessTaskModule(bind);
});
