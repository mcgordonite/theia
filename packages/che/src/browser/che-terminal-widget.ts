/*
 * Copyright (C) 2018 Red Hat, Inc. and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { injectable, inject } from 'inversify';
import { TerminalWidget, TerminalWidgetFactoryOptions } from '@theia/terminal/lib/browser/terminal-widget';
import { Workspace } from './che-workspace-client';

export const CHE_TERMINAL_WIDGET_FACTORY_ID = 'che_terminal';

export const CheTerminalWidgetOptions = Symbol("CheTerminalWidgetOptions");
export interface CheTerminalWidgetOptions {
    id: string,
    caption: string,
    label: string
    destroyTermOnClose: boolean
}

export interface CheTerminalWidgetFactoryOptions extends TerminalWidgetFactoryOptions {
}

@injectable()
export class CheTerminalWidget extends TerminalWidget {

    @inject(Workspace)
    protected readonly cheWorkspaceClient: Workspace;

    protected async attachTerminal(id: number): Promise<number | undefined> {
        return id;
    }

    protected async connectTerminalProcess(): Promise<void> {
        const termServer = await this.cheWorkspaceClient.findTerminalServer();
        if (!termServer) {
            return;
        }
        const ws = new WebSocket(`${termServer.url}/attach/${this.terminalId}`);
        ws.onmessage = ({ data }) => {
            this.term.write(data);
        };
    }
}
