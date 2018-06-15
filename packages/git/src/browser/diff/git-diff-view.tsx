/*
 * Copyright (C) 2018 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import * as React from "react";
import { GitFileChangeNode } from "../git-widget";
import { ReactWidget } from "@theia/core/lib/browser/widgets/react-widget";
import { GitFileStatus, Git } from "../../common";
import { SELECTED_CLASS } from "@theia/core/lib/browser";
import URI from "@theia/core/lib/common/uri";

export namespace GitDiffView {
    export interface Props {
        selectNode: (g: GitFileChangeNode) => void
        revealChange: (g: GitFileChangeNode) => void
        getStatusCaption: (g: GitFileStatus, b: boolean) => string
        navigateLeft: () => void
        navigateRight: () => void
        relativePath: (uri: URI | string) => string
        fileChangeNodes: GitFileChangeNode[];
        toRevision: string | undefined;
        fromRevision: number | string | undefined;
        options: Git.Options.Diff;
    }
    export interface State {
        fileChangeNodes: GitFileChangeNode[];
        toRevision: string | undefined;
        fromRevision: number | string | undefined;
        options: Git.Options.Diff;
    }
}

export class GitDiffView extends React.Component<GitDiffView.Props, GitDiffView.State> {

    protected creator = ReactWidget.ElementCreators;
    protected scrollContainer: string;

    constructor(props: GitDiffView.Props) {
        super(props);
        this.scrollContainer = "git-diff-list-container";
        this.state = {
            fileChangeNodes: props.fileChangeNodes,
            toRevision: props.toRevision,
            fromRevision: props.fromRevision,
            options: props.options
        };
    }

    render(): React.ReactNode {
        const commitishBar = this.renderDiffListHeader();
        const fileChangeList = this.renderFileChangeList();
        return this.creator.div({ className: "git-diff-container" }, commitishBar, fileChangeList);
    }

    setComponentState(state: GitDiffView.State) {
        this.setState({
            fileChangeNodes: state.fileChangeNodes || this.state.fileChangeNodes,
            fromRevision: state.fromRevision || this.state.fromRevision,
            options: state.options || this.state.options,
            toRevision: state.toRevision || this.state.toRevision
        });
    }

    protected renderDiffListHeader(): React.ReactNode {
        return this.doRenderDiffListHeader(
            this.renderPathHeader(),
            this.renderRevisionHeader(),
            this.renderToolbar()
        );
    }
    protected doRenderDiffListHeader(...children: React.ReactNode[]): React.ReactNode {
        return this.creator.div({ className: "diff-header" }, ...children);
    }
    protected renderHeaderRow({ name, value, classNames }: { name: React.ReactNode, value: React.ReactNode, classNames?: string[] }): React.ReactNode {
        if (value === null) {
            return null;
        }
        const className = ['header-row', ...(classNames || [])].join(' ');
        return this.creator.div({ className },
            this.creator.div({ className: 'theia-header' }, name),
            this.creator.div({ className: 'header-value' }, value));
    }

    protected renderPathHeader(): React.ReactNode {
        return this.renderHeaderRow({
            name: 'path',
            value: this.renderPath()
        });
    }
    protected renderPath(): React.ReactNode {
        if (this.state.options.uri) {
            const path = this.props.relativePath(this.state.options.uri);
            if (path.length > 0) {
                return '/' + path;
            }
        }
        return null;
    }

    protected renderRevisionHeader(): React.ReactNode {
        return this.renderHeaderRow({
            name: 'revision: ',
            value: this.renderRevision()
        });
    }
    protected renderRevision(): React.ReactNode {
        if (!this.state.fromRevision) {
            return null;
        }
        if (typeof this.state.fromRevision === 'string') {
            return this.state.fromRevision;
        }
        return (this.state.toRevision || 'HEAD') + '~' + this.state.fromRevision;
    }

    protected renderToolbar(): React.ReactNode {
        return this.doRenderToolbar(
            this.renderNavigationLeft(),
            this.renderNavigationRight()
        );
    }
    protected doRenderToolbar(...children: React.ReactNode[]) {
        return this.renderHeaderRow({
            classNames: ['space-between'],
            name: 'Files changed',
            value: this.creator.div({ className: 'lrBtns' }, ...children)
        });
    }

    protected renderNavigationLeft(): React.ReactNode {
        return this.creator.span({
            className: "fa fa-arrow-left",
            title: "Previous Change",
            onclick: () => this.props.navigateLeft()
        });
    }
    protected renderNavigationRight(): React.ReactNode {
        return this.creator.span({
            className: "fa fa-arrow-right",
            title: "Next Change",
            onclick: () => this.props.navigateRight()
        });
    }

    protected renderFileChangeList(): React.ReactNode {
        const files: React.ReactNode[] = [];
        for (const fileChange of this.state.fileChangeNodes) {
            const fileChangeElement: React.ReactNode = this.renderGitItem(fileChange);
            files.push(fileChangeElement);
        }
        return this.creator.div({ className: "listContainer", id: this.scrollContainer }, ...files);
    }

    protected renderGitItem(change: GitFileChangeNode): React.ReactNode {
        const iconSpan = this.creator.span({ className: change.icon + ' file-icon' });
        const nameSpan = this.creator.span({ className: 'name' }, change.label + ' ');
        const pathSpan = this.creator.span({ className: 'path' }, change.description);
        const elements = [];
        elements.push(this.creator.div({
            title: change.caption,
            className: 'noWrapInfo',
            onclick: () => {
                this.props.selectNode(change);
            },
            ondblclick: () => {
                this.props.revealChange(change);
            }
        }, iconSpan, nameSpan, pathSpan));
        if (change.extraIconClassName) {
            elements.push(this.creator.div({
                title: change.caption,
                className: change.extraIconClassName
            }));
        }
        elements.push(this.creator.div({
            title: change.caption,
            className: 'status staged ' + GitFileStatus[change.status].toLowerCase()
        }, this.props.getStatusCaption(change.status, true).charAt(0)));
        return this.creator.div({ className: `gitItem noselect${change.selected ? ' ' + SELECTED_CLASS : ''}` }, ...elements);
    }

}
