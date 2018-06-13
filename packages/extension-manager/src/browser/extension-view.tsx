/*
 * Copyright (C) 2017-2018 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import * as React from "react";
import { open, DISABLED_CLASS, OpenerService } from '@theia/core/lib/browser';
import { Extension } from '../common';
import { ExtensionUri } from './extension-uri';
import { ReactWidget } from "@theia/core/lib/browser/widgets/react-widget";

export namespace ExtensionView {
    export interface Props {
        ready: () => boolean
        searchHandler: () => void
        openerService: OpenerService
        buttonHandler: (extension: Extension) => void
    }
    export interface State {
        extensions: Extension[]
    }
}

export class ExtensionView extends React.Component<ExtensionView.Props, ExtensionView.State> {

    protected creator = ReactWidget.ElementCreators;

    constructor(props: ExtensionView.Props) {
        super(props);

        this.state = {
            extensions: []
        };
    }

    setExtensions(extensions: Extension[]) {
        this.setState({
            extensions
        });
    }

    render(): JSX.Element {
        if (this.props.ready()) {
            return <React.Fragment>{[this.renderSearchField(), this.renderExtensionList()]}</React.Fragment>;
        } else {
            const spinner = this.creator.div({ className: 'fa fa-spinner fa-pulse fa-3x fa-fw' }, '');
            return this.creator.div({ className: 'spinnerContainer' }, spinner);
        }
    }

    protected renderSearchField(): JSX.Element {
        const searchField = this.creator.input({
            id: 'extensionSearchField',
            type: 'text',
            placeholder: 'Search theia extensions',
            onKeyUp: this.props.searchHandler
        });

        const innerContainer = this.creator.div({
            id: 'extensionSearchFieldContainer',
            className: 'flexcontainer'
        }, [searchField]);

        const container = this.creator.div({
            id: 'extensionSearchContainer',
            className: 'flexcontainer'
        }, [innerContainer]);

        return container;
    }

    protected renderExtensionList(): JSX.Element {
        const theList: JSX.Element[] = [];
        this.state.extensions.forEach(extension => {
            const container = this.renderExtension(extension);
            theList.push(container);
        });

        return this.creator.div({
            id: 'extensionListContainer'
        }, theList);
    }

    protected renderExtension(extension: Extension): JSX.Element {
        const name = this.creator.div({
            className: 'extensionName noWrapInfo'
        }, extension.name);

        const version = this.creator.div({
            className: 'extensionVersion'
        }, extension.version);

        const author = this.creator.div({
            className: 'extensionAuthor noWrapInfo flexcontainer'
        }, extension.author);

        const description = this.creator.div({
            className: 'extensionDescription noWrapInfo'
        }, extension.description);

        const extensionButtonContainer = !extension.dependent ? this.creator.div({
            className: 'extensionButtonContainer flexcontainer'
        }, this.createButton(extension)) : 'installed via ' + extension.dependent;

        const leftColumn = this.renderColumn(
            'extensionInformationContainer',
            this.renderRow(name, version),
            this.renderRow(description),
            this.renderRow(author, extensionButtonContainer));

        return this.creator.div({
            className: this.createExtensionClassName(extension),
            onClick: () => open(this.props.openerService, ExtensionUri.toUri(extension.name))
        }, leftColumn);
    }

    protected createExtensionClassName(extension: Extension): string {
        const classNames = ['extensionHeaderContainer'];
        if (extension.dependent) {
            classNames.push(DISABLED_CLASS);
        }
        return classNames.join(' ');
    }

    protected renderRow(...children: React.ReactNode[]): JSX.Element {
        return this.creator.div({
            className: 'row flexcontainer'
        }, children);
    }

    protected renderColumn(additionalClass?: string, ...children: JSX.Element[]): JSX.Element {
        return this.creator.div({
            className: 'column flexcontainer ' + additionalClass
        }, children);
    }

    protected createButton(extension: Extension): JSX.Element {
        let btnLabel = 'Install';
        if (extension.installed) {
            if (extension.outdated) {
                btnLabel = 'Update';
            } else {
                btnLabel = 'Uninstall';
            }
        }

        const content = extension.busy ? this.creator.i({ className: 'fa fa-spinner fa-pulse fa-fw' }) : btnLabel;

        const btn = this.creator.div({
            className: 'theia-button extensionButton' +
                (extension.busy ? ' working' : '') + ' ' +
                (extension.installed && !extension.busy ? ' installed' : '') + ' ' +
                (extension.outdated && !extension.busy ? ' outdated' : ''),
            onClick: (event: Event) => {
                this.props.buttonHandler(extension);
                event.stopPropagation();
            }
        }, content);

        return btn;
    }

}
