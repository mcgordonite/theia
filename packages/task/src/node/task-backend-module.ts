/*
 * Copyright (C) 2017 Ericsson and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { ContainerModule } from 'inversify';
import { bindContributionProvider } from '@theia/core';
import { ConnectionHandler, JsonRpcConnectionHandler } from '@theia/core/lib/common/messaging';
import { BackendApplicationContribution } from '@theia/core/lib/node';
import { bindProcessTaskRunnerModule } from './process/process-task-runner-backend-module';
import { TaskBackendApplicationContribution } from './task-backend-application-contribution';
import { TaskManager } from './task-manager';
import { TaskRunnerContribution, TaskRunnerRegistry } from './task-runner';
import { TaskServerImpl } from './task-server';
import { createCommonBindings } from '../common/task-common-module';
import { TaskClient, TaskServer, taskPath } from '../common/task-protocol';

export default new ContainerModule(bind => {

    bind(TaskManager).toSelf().inSingletonScope();
    bind(BackendApplicationContribution).toDynamicValue(ctx => ctx.container.get(TaskManager)).inSingletonScope();
    bind(TaskServer).to(TaskServerImpl).inSingletonScope();
    bind(ConnectionHandler).toDynamicValue(ctx =>
        new JsonRpcConnectionHandler<TaskClient>(taskPath, client => {
            const taskServer = ctx.container.get<TaskServer>(TaskServer);
            taskServer.setClient(client);
            // when connection closes, cleanup that client of task-server
            client.onDidCloseConnection(() => {
                taskServer.disconnectClient(client);
            });
            return taskServer;
        })
    ).inSingletonScope();

    createCommonBindings(bind);

    bind(TaskRunnerRegistry).toSelf().inSingletonScope();
    bindContributionProvider(bind, TaskRunnerContribution);
    bind(TaskBackendApplicationContribution).toSelf().inSingletonScope();
    bind(BackendApplicationContribution).toService(TaskBackendApplicationContribution);

    bindProcessTaskRunnerModule(bind);
});
