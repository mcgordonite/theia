/*
 * Copyright (C) 2018 Red Hat, Inc. and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { injectable, postConstruct } from 'inversify';
import { Disposable } from '@theia/core/lib/common/disposable';
import { TaskConfiguration } from '../common/task-protocol';

export const TaskContribution = Symbol('TaskContribution');
/**
 * The Task Contribution should be implemented to register the custom Resolvers, Providers.
 */
export interface TaskContribution {
    registerResolvers(resolvers: TaskResolverRegistry): void;
    registerProviders(providers: TaskProviderRegistry): void;
}
export interface TaskResolver {
    resolveTask(taskConfig: TaskConfiguration): Promise<TaskConfiguration>;
}
export interface TaskProvider {
    provideTasks(): Promise<TaskConfiguration[]>;
}

@injectable()
export class TaskResolverRegistry {

    protected resolvers: Map<string, TaskResolver>;

    @postConstruct()
    protected init(): void {
        this.resolvers = new Map();
    }

    register(type: string, resolver: TaskResolver): Disposable {
        this.resolvers.set(type, resolver);
        return {
            dispose: () => this.resolvers.delete(type)
        };
    }

    getResolver(type: string): TaskResolver | undefined {
        return this.resolvers.get(type);
    }
}

@injectable()
export class TaskProviderRegistry {
    protected providers: Map<string, TaskProvider>;

    @postConstruct()
    protected init(): void {
        this.providers = new Map();
    }

    register(type: string, resolver: TaskProvider): Disposable {
        this.providers.set(type, resolver);
        return {
            dispose: () => this.providers.delete(type)
        };
    }

    getProvider(type: string): TaskProvider | undefined {
        return this.providers.get(type);
    }

    getProviders(): TaskProvider[] {
        return [...this.providers.values()];
    }
}
