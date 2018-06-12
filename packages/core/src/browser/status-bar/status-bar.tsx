/*
 * Copyright (C) 2017-2018 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { CommandService } from '../../common';
import { LabelParser } from '../label-parser';
import { injectable, inject } from 'inversify';
import { FrontendApplicationStateService } from '../frontend-application-state';
import { ReactWidget } from '../widgets/react-widget';
import * as React from "react";
import { StatusBarView, StatusBarEntry } from '../status-bar/status-bar-view';

export const STATUSBAR_WIDGET_FACTORY_ID = 'statusBar';

export const StatusBar = Symbol('StatusBar');
export interface StatusBar {
    setBackgroundColor(color?: string): Promise<void>;
    setElement(id: string, entry: StatusBarEntry): Promise<void>;
    removeElement(id: string): Promise<void>;
}

@injectable()
export class StatusBarImpl extends ReactWidget implements StatusBar {

    protected backgroundColor: string | undefined;

    constructor(
        @inject(CommandService) protected readonly commands: CommandService,
        @inject(LabelParser) protected readonly entryService: LabelParser,
        @inject(FrontendApplicationStateService) protected readonly applicationStateService: FrontendApplicationStateService
    ) {
        super();
        this.id = 'theia-statusBar';
        this.viewElement = <StatusBarView
            // TODO if we want access to the API of the component we need set the viewComponent. Is there a better way like this?
            ref={comp => {
                this.viewComponent = comp;
            }}
            commands={commands}
            entryService={entryService}
            applicationStateService={applicationStateService} />;
    }

    async setElement(id: string, entry: StatusBarEntry): Promise<void> {
        await this.ready;
        if (this.viewComponent) {
            this.viewComponent.setEntry(id, entry);
        }
    }

    async removeElement(id: string): Promise<void> {
        await this.ready;
        if (this.viewComponent) {
            this.viewComponent.removeEntry(id);
        }
    }

    async setBackgroundColor(color?: string): Promise<void> {
        await this.ready;
        this.internalSetBackgroundColor(color);
    }

    protected get ready(): Promise<void> {
        return this.applicationStateService.reachedAnyState('initialized_layout', 'ready');
    }

    protected internalSetBackgroundColor(color?: string): void {
        this.backgroundColor = color;
        // tslint:disable-next-line:no-null-keyword
        this.node.style.backgroundColor = this.backgroundColor ? this.backgroundColor : null;
    }

}
