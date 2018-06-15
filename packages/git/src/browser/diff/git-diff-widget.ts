/*
 * Copyright (C) 2018 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { inject, injectable, postConstruct } from "inversify";
import URI from "@theia/core/lib/common/uri";
import { StatefulWidget, DiffUris } from "@theia/core/lib/browser";
import { EditorManager, EditorOpenerOptions, EditorWidget, DiffNavigatorProvider, DiffNavigator } from "@theia/editor/lib/browser";
import { GitFileChange, GitFileStatus, Git, WorkingDirectoryStatus } from '../../common';
import { GitWatcher } from "../../common";
import { GIT_RESOURCE_SCHEME } from '../git-resource';
import { GitNavigableListWidget } from "../git-navigable-list-widget";
import { GitFileChangeNode } from "../git-widget";
import { ReactWidget } from "@theia/core/lib/browser/widgets/react-widget";
import { GitDiffView } from "@theia/git/lib/browser/diff/git-diff-view";

// tslint:disable:no-null-keyword

export const GIT_DIFF = "git-diff";
@injectable()
export class GitDiffWidget extends GitNavigableListWidget<GitFileChangeNode> implements StatefulWidget {

    protected fileChangeNodes: GitFileChangeNode[];
    protected options: Git.Options.Diff;
    protected viewComponent: GitDiffView;

    protected gitStatus: WorkingDirectoryStatus | undefined;

    @inject(Git) protected readonly git: Git;
    @inject(DiffNavigatorProvider) protected readonly diffNavigatorProvider: DiffNavigatorProvider;
    @inject(EditorManager) protected readonly editorManager: EditorManager;
    @inject(GitWatcher) protected readonly gitWatcher: GitWatcher;

    constructor() {
        super();
        this.id = GIT_DIFF;

        this.title.label = "Diff";

        this.addClass('theia-git');
    }

    @postConstruct()
    protected init() {
        super.init();
        this.toDispose.push(this.gitWatcher.onGitEvent(async gitEvent => {
            if (this.options) {
                this.setContent(this.options);
            }
        }));
    }

    protected widgetData(): ReactWidget.WidgetData<GitDiffView.Props> {
        return {
            component: GitDiffView,
            props: {
                getStatusCaption: this.getStatusCaption,
                navigateLeft: this.navigateLeft,
                navigateRight: this.navigateRight,
                relativePath: this.relativePath,
                revealChange: this.revealChange,
                selectNode: this.selectNode,
                fileChangeNodes: this.fileChangeNodes,
                fromRevision: this.fromRevision,
                options: this.options,
                toRevision: this.toRevision
            }
        };
    }

    protected get toRevision() {
        return this.options.range && this.options.range.toRevision;
    }

    protected get fromRevision() {
        return this.options.range && this.options.range.fromRevision;
    }

    async setContent(options: Git.Options.Diff) {
        this.options = options;
        const repository = this.repositoryProvider.selectedRepository;
        if (repository) {
            const fileChanges: GitFileChange[] = await this.git.diff(repository, {
                range: options.range,
                uri: options.uri
            });
            const fileChangeNodes: GitFileChangeNode[] = [];
            for (const fileChange of fileChanges) {
                const fileChangeUri = new URI(fileChange.uri);
                const [icon, label, description] = await Promise.all([
                    this.labelProvider.getIcon(fileChangeUri),
                    this.labelProvider.getName(fileChangeUri),
                    this.relativePath(fileChangeUri.parent)
                ]);

                const caption = this.computeCaption(fileChange);
                fileChangeNodes.push({
                    ...fileChange, icon, label, description, caption
                });
            }
            this.fileChangeNodes = fileChangeNodes;
            this.gitNodes = this.fileChangeNodes;
            this.update();
        }
    }

    storeState(): object {
        const { fileChangeNodes, options } = this;
        return {
            fileChangeNodes,
            options
        };
    }

    // tslint:disable-next-line:no-any
    restoreState(oldState: any): void {
        this.fileChangeNodes = oldState['fileChangeNodes'];
        this.options = oldState['options'];
        this.update();
    }

    protected navigateRight(): void {
        const selected = this.getSelected();
        if (selected && GitFileChangeNode.is(selected)) {
            const uri = this.getUriToOpen(selected);
            this.editorManager.getByUri(uri).then(widget => {
                if (widget) {
                    const diffNavigator: DiffNavigator = this.diffNavigatorProvider(widget.editor);
                    if (diffNavigator.canNavigate() && diffNavigator.hasNext()) {
                        diffNavigator.next();
                    } else {
                        this.selectNextNode();
                        this.openSelected();
                    }
                } else {
                    this.revealChange(selected);
                }
            });
        } else if (this.gitNodes.length > 0) {
            this.selectNode(this.gitNodes[0]);
            this.openSelected();
        }
    }

    protected navigateLeft(): void {
        const selected = this.getSelected();
        if (GitFileChangeNode.is(selected)) {
            const uri = this.getUriToOpen(selected);
            this.editorManager.getByUri(uri).then(widget => {
                if (widget) {
                    const diffNavigator: DiffNavigator = this.diffNavigatorProvider(widget.editor);
                    if (diffNavigator.canNavigate() && diffNavigator.hasPrevious()) {
                        diffNavigator.previous();
                    } else {
                        this.selectPreviousNode();
                        this.openSelected();
                    }
                } else {
                    this.revealChange(selected);
                }
            });
        }
    }

    protected selectNextNode() {
        const idx = this.indexOfSelected;
        if (idx >= 0 && idx < this.gitNodes.length - 1) {
            this.selectNode(this.gitNodes[idx + 1]);
        } else if (this.gitNodes.length > 0 && (idx === -1 || idx === this.gitNodes.length - 1)) {
            this.selectNode(this.gitNodes[0]);
        }
    }

    protected selectPreviousNode() {
        const idx = this.indexOfSelected;
        if (idx > 0) {
            this.selectNode(this.gitNodes[idx - 1]);
        } else if (idx === 0) {
            this.selectNode(this.gitNodes[this.gitNodes.length - 1]);
        }
    }

    protected handleListEnter(): void {
        this.openSelected();
    }

    protected openSelected(): void {
        const selected = this.getSelected();
        if (selected) {
            this.revealChange(selected);
        }
    }

    protected getUriToOpen(change: GitFileChange): URI {
        const uri: URI = new URI(change.uri);

        let fromURI = uri;
        if (change.oldUri) { // set on renamed and copied
            fromURI = new URI(change.oldUri);
        }
        if (this.fromRevision !== undefined) {
            if (typeof this.fromRevision !== 'number') {
                fromURI = fromURI.withScheme(GIT_RESOURCE_SCHEME).withQuery(this.fromRevision);
            } else {
                fromURI = fromURI.withScheme(GIT_RESOURCE_SCHEME).withQuery(this.toRevision + "~" + this.fromRevision);
            }
        } else {
            // default is to compare with previous revision
            fromURI = fromURI.withScheme(GIT_RESOURCE_SCHEME).withQuery(this.toRevision + "~1");
        }

        let toURI = uri;
        if (this.toRevision) {
            toURI = toURI.withScheme(GIT_RESOURCE_SCHEME).withQuery(this.toRevision);
        }

        let uriToOpen = uri;
        if (change.status === GitFileStatus.Deleted) {
            uriToOpen = fromURI;
        } else if (change.status === GitFileStatus.New) {
            uriToOpen = toURI;
        } else {
            uriToOpen = DiffUris.encode(fromURI, toURI, uri.displayName);
        }
        return uriToOpen;
    }

    async openChanges(uri: URI, options?: EditorOpenerOptions): Promise<EditorWidget | undefined> {
        const stringUri = uri.toString();
        const change = this.fileChangeNodes.find(n => n.uri.toString() === stringUri);
        return change && this.openChange(change, options);
    }

    protected openChange(change: GitFileChange, options?: EditorOpenerOptions): Promise<EditorWidget | undefined> {
        const uriToOpen = this.getUriToOpen(change);
        return this.editorManager.open(uriToOpen, options);
    }

    protected async revealChange(change: GitFileChange): Promise<void> {
        await this.openChange(change, { mode: 'reveal' });
    }

}
