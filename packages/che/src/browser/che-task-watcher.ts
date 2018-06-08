/*
 * Copyright (C) 2018 Red Hat, Inc. and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { injectable, inject } from 'inversify';
import { TaskInfo, TaskWatcher } from '@theia/task/lib/common';
import { FrontendApplicationContribution, WidgetManager, ApplicationShell } from '@theia/core/lib/browser';
import { TerminalWidgetFactoryOptions } from '@theia/terminal/lib/browser/terminal-widget';
import { CHE_TERMINAL_WIDGET_FACTORY_ID, CheTerminalWidget } from './che-terminal-widget';
import { CheTaskInfo } from '../common/task-protocol';

@injectable()
export class CheTaskWatcher implements FrontendApplicationContribution {

    @inject(TaskWatcher)
    protected readonly taskWatcher: TaskWatcher;

    @inject(ApplicationShell)
    protected readonly shell: ApplicationShell;

    @inject(WidgetManager)
    protected readonly widgetManager: WidgetManager;

    onStart(): void {
        this.taskWatcher.onTaskCreated((event: TaskInfo) => {
            // if (this.isEventForThisClient(event.ctx)) {
            console.log('che task created - catched');
            if (event.config.type === 'che') {
                this.attach((event as CheTaskInfo).execId, event.taskId);
            }
            // }
        });
    }

    async attach(terminalId: number, taskId: number): Promise<void> {
        const widget = <CheTerminalWidget>await this.widgetManager.getOrCreateWidget(
            CHE_TERMINAL_WIDGET_FACTORY_ID,
            <TerminalWidgetFactoryOptions>{
                created: new Date().toString(),
                id: 'task-' + taskId,
                caption: `Task #${taskId}`,
                label: `Task #${taskId}`,
                destroyTermOnClose: true
            });
        this.shell.addWidget(widget, { area: 'bottom' });
        this.shell.activateWidget(widget.id);
        widget.start(terminalId);
    }
}
