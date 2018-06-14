/*
 * Copyright (C) 2017 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { Extension, ResolvedExtension } from '../common/extension-manager';
import { Message } from '@phosphor/messaging/lib';
import { ReactWidget } from '@theia/core/lib/browser/widgets/react-widget';
import { ExtensionDetailView } from './extension-detail-view';

export class ExtensionDetailWidget extends ReactWidget {

    constructor(
        protected readonly resolvedExtension: ResolvedExtension
    ) {
        super();
        this.addClass('theia-extension-detail');
        this.node.tabIndex = 0;
        this.toDispose.push(resolvedExtension);
        this.toDispose.push(resolvedExtension.onDidChange(change => {
            if (change.name === this.resolvedExtension.name) {
                this.update();
            }
        }));
        this.update();
    }

    protected widgetData(): ReactWidget.WidgetData<ExtensionDetailView.Props> {
        return {
            props: {
                resolvedExtension: this.resolvedExtension,
                id: this.id,
                installHandler: (extension: Extension) => {
                    if (!extension.busy) {
                        if (extension.installed) {
                            extension.uninstall();
                        } else {
                            extension.install();
                        }
                    }
                },
                updateHandler: (extension: Extension) => {
                    if (!extension.busy) {
                        extension.update();
                    }
                }
            },
            component: ExtensionDetailView
        };
    }

    onActivateRequest(msg: Message): void {
        super.onActivateRequest(msg);
        this.node.focus();
        this.update();
    }

    protected onUpdateRequest(msg: Message): void {
        super.onUpdateRequest(msg);

        const el = document.getElementById(this.id + 'Doc');
        if (el !== null) {
            el.innerHTML = this.resolvedExtension.documentation;
        }
    }

}
