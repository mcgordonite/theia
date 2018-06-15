/*
 * Copyright (C) 2017 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { injectable, inject, postConstruct } from 'inversify';
import { MessageService, ResourceProvider, CommandService } from '@theia/core';
import { ContextMenuRenderer, LabelProvider, StatefulWidget } from '@theia/core/lib/browser';
import { EditorManager, EditorOpenerOptions, EditorWidget } from '@theia/editor/lib/browser';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import { Git, GitFileChange, Repository, WorkingDirectoryStatus, CommitWithChanges } from '../common';
import { GitWatcher, GitStatusChangeEvent } from '../common/git-watcher';

import { GitRepositoryProvider } from './git-repository-provider';
import { GitCommitMessageValidator } from './git-commit-message-validator';
import { GitAvatarService } from './history/git-avatar-service';
import { ReactWidget } from '@theia/core/lib/browser/widgets/react-widget';
import { GitView } from './git-view';
import URI from '@theia/core/lib/common/uri';

export interface GitFileChangeNode extends GitFileChange {
    readonly icon: string;
    readonly label: string;
    readonly description: string;
    readonly caption?: string;
    readonly extraIconClassName?: string;
    readonly commitSha?: string;
    selected?: boolean;
}
export namespace GitFileChangeNode {
    export function is(node: Object | undefined): node is GitFileChangeNode {
        return !!node && 'uri' in node && 'status' in node && 'description' in node && 'label' in node && 'icon' in node;
    }
}

@injectable()
export class GitWidget extends ReactWidget implements StatefulWidget {

    protected status: WorkingDirectoryStatus | undefined;

    protected lastCommit: { commit: CommitWithChanges, avatar: string } | undefined;
    protected lastHead: string | undefined;

    protected viewComponent: GitView;

    @inject(EditorManager)
    protected readonly editorManager: EditorManager;

    constructor(
        @inject(Git) protected readonly git: Git,
        @inject(GitWatcher) protected readonly gitWatcher: GitWatcher,
        @inject(ContextMenuRenderer) protected readonly contextMenuRenderer: ContextMenuRenderer,
        @inject(ResourceProvider) protected readonly resourceProvider: ResourceProvider,
        @inject(MessageService) protected readonly messageService: MessageService,
        @inject(CommandService) protected readonly commandService: CommandService,
        @inject(GitRepositoryProvider) protected readonly repositoryProvider: GitRepositoryProvider,
        @inject(LabelProvider) protected readonly labelProvider: LabelProvider,
        @inject(WorkspaceService) protected readonly workspaceService: WorkspaceService,
        @inject(GitAvatarService) protected readonly avatarService: GitAvatarService,
        @inject(GitCommitMessageValidator) protected readonly commitMessageValidator: GitCommitMessageValidator) {

        super();
        this.id = 'theia-gitContainer';
        this.title.label = 'Git';
        this.addClass('theia-git');
    }

    @postConstruct()
    protected init() {
        super.init();
        this.toDispose.push(this.repositoryProvider.onDidChangeRepository(repository =>
            this.initialize(repository)
        ));
        this.initialize(this.repositoryProvider.selectedRepository);
    }

    protected widgetData(): ReactWidget.WidgetData<GitView.Props> {
        return {
            component: GitView,
            props: {
                commandService: this.commandService,
                commitMessageValidator: this.commitMessageValidator,
                contextMenuRenderer: this.contextMenuRenderer,
                editorManager: this.editorManager,
                git: this.git,
                labelProvider: this.labelProvider,
                messageService: this.messageService,
                repositoryProvider: this.repositoryProvider
            }
        };
    }

    async initialize(repository: Repository | undefined): Promise<void> {
        if (repository) {
            this.toDispose.dispose();
            this.toDispose.push(await this.gitWatcher.watchGitChanges(repository));
            this.toDispose.push(this.gitWatcher.onGitEvent(async gitEvent => {
                if (GitStatusChangeEvent.is(gitEvent)) {
                    if (gitEvent.status.currentHead !== this.lastHead) {
                        this.lastHead = gitEvent.status.currentHead;
                        this.lastCommit = await this.getLastCommit();
                    }
                    this.status = gitEvent.status;
                    if (this.viewComponent) {
                        this.viewComponent.updateView(gitEvent.status);
                    }
                }
            }));
            this.update();
        }
    }

    protected async getLastCommit(): Promise<{ commit: CommitWithChanges, avatar: string } | undefined> {
        const { selectedRepository } = this.repositoryProvider;
        if (selectedRepository) {
            const commits = await this.git.log(selectedRepository, { maxCount: 1, shortSha: true });
            if (commits.length > 0) {
                const commit = commits[0];
                const avatar = await this.avatarService.getAvatar(commit.author.email);
                return { commit, avatar };
            }
        }
        return undefined;
    }

    findChange(uri: URI): GitFileChange | undefined {
        return this.viewComponent.findChange(uri);
    }

    async openChange(change: GitFileChange, options?: EditorOpenerOptions): Promise<EditorWidget | undefined> {
        return this.viewComponent.openChange(change, options);
    }

    async commit(repository?: Repository, options?: 'amend' | 'sign-off', message?: string) {
        await this.viewComponent.commit(repository, options, message);
    }

    storeState(): object {
        return this.viewComponent.getComponentState();
    }

    restoreState(oldState: any): void {
        this.viewComponent.setComponentState(oldState);
    }
}
