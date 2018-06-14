/*
 * Copyright (C) 2017 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { injectable, inject } from 'inversify';
import { Message } from '@phosphor/messaging';
import { DisposableCollection, Disposable } from '@theia/core';
import { OpenerService } from '@theia/core/lib/browser';
import { Extension, ExtensionManager } from '../common';
import { ReactWidget } from '@theia/core/lib/browser/widgets/react-widget';
import { ExtensionView } from './extension-view';

@injectable()
export class ExtensionWidget extends ReactWidget {

    static SEARCH_DELAY = 200;

    protected extensions: Extension[] = [];
    protected readonly toDisposeOnFetch = new DisposableCollection();
    protected readonly toDisposeOnSearch = new DisposableCollection();
    protected ready = false;

    protected viewComponent: ExtensionView;

    protected searchHandler = () => {
        this.toDisposeOnSearch.dispose();
        const delay = setTimeout(() => this.fetchExtensions(), ExtensionWidget.SEARCH_DELAY);
        this.toDisposeOnSearch.push(Disposable.create(() => clearTimeout(delay)));
        this.toDispose.push(this.toDisposeOnSearch);
    }

    protected buttonHandler = (extension: Extension) => {
        if (!extension.busy) {
            if (extension.installed) {
                if (extension.outdated) {
                    extension.update();
                } else {
                    extension.uninstall();
                }
            } else {
                extension.install();
            }
            this.update();
        }
    }

    protected widgetData(): ReactWidget.WidgetData<ExtensionView.Props> {
        return {
            props: {
                ready: this.isReady,
                searchHandler: this.searchHandler,
                openerService: this.openerService,
                buttonHandler: this.buttonHandler
            },
            component: ExtensionView
        };
    }

    constructor(
        @inject(ExtensionManager) protected readonly extensionManager: ExtensionManager,
        @inject(OpenerService) protected readonly openerService: OpenerService
    ) {
        super();
        this.id = 'extensions';
        this.title.label = 'Extensions';
        this.addClass('theia-extensions');

        this.update();
        this.fetchExtensions();
        this.toDispose.push(extensionManager.onDidChange(() => this.update()));
    }

    protected isReady(): boolean {
        return this.ready;
    }

    protected onActivateRequest(msg: Message) {
        super.onActivateRequest(msg);
        this.fetchExtensions();
        const searchField = this.findSearchField();
        if (searchField) {
            searchField.focus();
        } else {
            this.node.focus();
        }
    }

    protected fetchExtensions(): void {
        const searchField = this.findSearchField();
        const query = searchField ? searchField.value.trim() : '';
        this.extensionManager.list({ query }).then(extensions => {
            this.toDisposeOnFetch.dispose();
            this.toDisposeOnFetch.pushAll(extensions);
            if (this.isDisposed) {
                this.toDisposeOnFetch.dispose();
                return;
            }
            this.toDispose.push(this.toDisposeOnFetch);
            this.extensions = query ? extensions : extensions.filter(e => !e.dependent);
            this.ready = true;
            if (this.viewComponent) {
                this.viewComponent.setExtensions(extensions);
            }
        });
    }

    protected findSearchField(): HTMLInputElement | null {
        return document.getElementById('extensionSearchField') as HTMLInputElement;
    }
}
