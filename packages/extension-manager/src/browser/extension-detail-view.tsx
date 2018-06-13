/*
 * Copyright (C) 2017-2018 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import * as React from "react";
import { ReactWidget } from "@theia/core/lib/browser/widgets/react-widget";
import { DISABLED_CLASS } from "@theia/core/lib/browser/widgets/widget";
import { Extension, ResolvedExtension } from "../common/extension-manager";

export namespace ExtensionDetailView {
    export interface Props {
        resolvedExtension: ResolvedExtension
        id: string
        installHandler: (extension: Extension) => void
        updateHandler: (extension: Extension) => void
    }
    export interface State {

    }
}

export class ExtensionDetailView extends React.Component<ExtensionDetailView.Props, ExtensionDetailView.State> {

    protected creator = ReactWidget.ElementCreators;

    constructor(props: ExtensionDetailView.Props) {
        super(props);
    }

    render(): JSX.Element {
        const r = this.props.resolvedExtension;

        const name = this.creator.h2({ className: 'extensionName' }, r.name);
        const extversion = this.creator.div({ className: 'extensionVersion' }, r.version);
        const author = this.creator.div({ className: 'extensionAuthor' }, r.author);
        const titleInfo = this.creator.div({ className: 'extensionSubtitle' }, author, extversion);
        const titleContainer = this.creator.div({ className: 'extensionTitleContainer' },
            name, titleInfo);

        const description = this.creator.div({ className: 'extensionDescription' }, r.description);

        const buttonContainer = this.createButtonContainer();

        const headerContainer = this.creator.div({
            className: this.createExtensionClassName()
        }, titleContainer, description, buttonContainer);

        const documentation = this.creator.div({ className: 'extensionDocumentation', id: this.props.id + 'Doc' }, '');
        const docContainer = this.creator.div({ className: 'extensionDocContainer flexcontainer' }, documentation);

        return <React.Fragment>{[headerContainer, docContainer]}</React.Fragment>;
    }

    protected createExtensionClassName(): string {
        const classNames = ['extensionHeaderContainer'];
        if (this.props.resolvedExtension.dependent) {
            classNames.push(DISABLED_CLASS);
        }
        return classNames.join(' ');
    }

    protected createButtonContainer(): React.ReactNode {
        if (this.props.resolvedExtension.dependent) {
            return 'installed via ' + this.props.resolvedExtension.dependent;
        }
        const buttonRow = this.creator.div({ className: 'extensionButtonRow' },
            this.createButtons(this.props.resolvedExtension));
        return this.creator.div({ className: 'extensionButtonContainer' }, buttonRow);
    }

    protected createButtons(extension: Extension): JSX.Element[] {
        const buttonArr = [];
        let btnLabel = 'Install';
        if (extension.installed) {
            btnLabel = 'Uninstall';
        }

        const faEl = this.creator.i({ className: 'fa fa-spinner fa-pulse fa-fw' });
        const content = extension.busy ? faEl : btnLabel;

        buttonArr.push(this.creator.div({
            className: 'theia-button extensionButton' +
                (extension.busy ? ' working' : '') + ' ' +
                (extension.installed && !extension.busy ? ' installed' : '') + ' ' +
                (extension.outdated && !extension.busy ? ' outdated' : ''),
            onClick: (event: Event) => {
                this.props.installHandler(extension);
                event.stopPropagation();
            }
        }, content));

        if (extension.outdated) {
            buttonArr.push(this.creator.div({
                className: (extension.busy ? ' working' : '') + ' ' + 'theia-button extensionButton' + (extension.outdated && !extension.busy ? ' outdated' : ''),
                onClick: () => {
                    this.props.updateHandler(extension);
                }
            }, extension.busy ? faEl : 'Update'));
        }
        return buttonArr;
    }
}
