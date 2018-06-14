/*
 * Copyright (C) 2017-2018 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import * as React from "react";
import { ReactWidget } from "@theia/core/lib/browser/widgets/react-widget";
import { GitRepositoryProvider } from "./git-repository-provider";
import { MenuPath, CommandService, MessageService } from "@theia/core";
import { Git, Repository, WorkingDirectoryStatus, GitFileStatus, CommitWithChanges, GitFileChange } from "../common";
import { GitCommitMessageValidator } from "./git-commit-message-validator";
import URI from "@theia/core/lib/common/uri";
import { LabelProvider, ContextMenuRenderer, DiffUris } from "@theia/core/lib/browser";
import { GitFileChangeNode } from "./git-widget";
import { GIT_RESOURCE_SCHEME } from './git-resource';
import { WorkspaceCommands } from "@theia/workspace/lib/browser";
import { EditorOpenerOptions, EditorWidget, EditorManager } from "@theia/editor/lib/browser";

export class GitView extends React.Component<GitView.Props, GitView.State> {

    private static MESSAGE_BOX_MIN_HEIGHT = 25;

    protected creator = ReactWidget.ElementCreators;
    protected scrollContainer: string;

    constructor(props: GitView.Props) {
        super(props);

        this.scrollContainer = 'changesOuterContainer';

        this.state = {
            message: "",
            commitMessageValidationResult: undefined,
            stagedChanges: [],
            unstagedChanges: [],
            mergeChanges: [],
            lastCommit: undefined,
            messageBoxHeight: GitView.MESSAGE_BOX_MIN_HEIGHT
        };
    }

    getComponentState(): object {
        const commitTextArea = document.getElementById(GitView.Styles.COMMIT_MESSAGE) as HTMLTextAreaElement;
        const messageBoxHeight = commitTextArea ? commitTextArea.offsetHeight : GitView.MESSAGE_BOX_MIN_HEIGHT;
        return {
            message: this.state.message,
            commitMessageValidationResult: this.state.commitMessageValidationResult,
            messageBoxHeight
        };
    }

    setComponentState(oldState: GitView.State) {
        this.setState({
            message: oldState.message,
            commitMessageValidationResult: oldState.commitMessageValidationResult,
            messageBoxHeight: oldState.messageBoxHeight || GitView.MESSAGE_BOX_MIN_HEIGHT
        });
    }

    async updateView(status: WorkingDirectoryStatus | undefined) {
        const stagedChanges = [];
        const unstagedChanges = [];
        const mergeChanges = [];
        if (status) {
            for (const change of status.changes) {
                const uri = new URI(change.uri);
                const repository = this.props.repositoryProvider.selectedRepository;
                const [icon, label, description] = await Promise.all([
                    this.props.labelProvider.getIcon(uri),
                    this.props.labelProvider.getName(uri),
                    repository ? Repository.relativePath(repository, uri.parent).toString() : this.props.labelProvider.getLongName(uri.parent)
                ]);
                if (GitFileStatus[GitFileStatus.Conflicted.valueOf()] !== GitFileStatus[change.status]) {
                    if (change.staged) {
                        stagedChanges.push({
                            icon, label, description,
                            ...change
                        });
                    } else {
                        unstagedChanges.push({
                            icon, label, description,
                            ...change
                        });
                    }
                } else {
                    if (!change.staged) {
                        mergeChanges.push({
                            icon, label, description,
                            ...change
                        });
                    }
                }
            }
        }
        const sort = (l: GitFileChangeNode, r: GitFileChangeNode) => l.label.localeCompare(r.label);
        this.setState({
            stagedChanges: stagedChanges.sort(sort),
            unstagedChanges: unstagedChanges.sort(sort),
            mergeChanges: mergeChanges.sort(sort)
        });
    }

    protected async undo(): Promise<void> {
        const { selectedRepository } = this.props.repositoryProvider;
        if (selectedRepository) {
            const message = (await this.props.git.exec(selectedRepository, ['log', '-n', '1', '--format=%B'])).stdout.trim();
            const commitTextArea = document.getElementById(GitView.Styles.COMMIT_MESSAGE) as HTMLTextAreaElement;
            await this.props.git.exec(selectedRepository, ['reset', 'HEAD~', '--soft']);
            if (commitTextArea) {
                this.setState({ message });
                commitTextArea.value = message;
                this.resize(commitTextArea);
                commitTextArea.focus();
            }
        }
    }

    async commit(repository?: Repository, options?: 'amend' | 'sign-off', message: string = this.state.message) {
        if (repository) {
            let result: GitCommitMessageValidator.Result | undefined = undefined;
            if (message.trim().length === 0) {
                result = {
                    status: 'error',
                    message: 'Please provide a commit message'
                };
            }
            if (this.state.commitMessageValidationResult === undefined && !(await this.props.git.status(repository)).changes.some(c => c.staged === true)) {
                result = {
                    status: 'error',
                    message: 'No changes added to commit'
                };
            }
            this.setState({ commitMessageValidationResult: result });
            if (this.state.commitMessageValidationResult === undefined) {
                try {
                    // We can make sure, repository exists, otherwise we would not have this button.
                    const signOff = options === 'sign-off';
                    const amend = options === 'amend';
                    await this.props.git.commit(repository, message, { signOff, amend });
                    const status = await this.props.git.status(repository);
                    this.resetCommitMessages();
                    this.updateView(status);
                } catch (error) {
                    this.logError(error);
                }
            } else {
                const messageInput = document.getElementById(GitView.Styles.COMMIT_MESSAGE) as HTMLInputElement;
                if (messageInput) {
                    messageInput.focus();
                }
            }
        }
    }

    render(): JSX.Element {
        const repository = this.props.repositoryProvider.selectedRepository;

        const messageInput = this.renderCommitMessage();
        const commandBar = this.renderCommandBar(repository);
        const headerContainer = this.creator.div({ className: 'headerContainer' }, messageInput, commandBar);

        const mergeChanges = this.renderMergeChanges(repository) || '';
        const stagedChanges = this.renderStagedChanges(repository) || '';
        const unstagedChanges = this.renderUnstagedChanges(repository) || '';
        const changesContainer = this.creator.div({ className: "changesOuterContainer", id: this.scrollContainer }, mergeChanges, stagedChanges, unstagedChanges);

        const lastCommit = this.state.lastCommit ? this.creator.div(this.creator.div({ className: GitView.Styles.LAST_COMMIT_CONTAINER }, this.renderLastCommit())) : '';

        return <React.Fragment>{headerContainer}{changesContainer}{lastCommit}</React.Fragment>;
    }

    protected renderCommitMessage(): JSX.Element {
        const onInput = this.onCommitMessageChange.bind(this);
        const placeholder = 'Commit message';
        const validationStatus = this.state.commitMessageValidationResult ? this.state.commitMessageValidationResult.status : 'idle';
        const validationMessage = this.state.commitMessageValidationResult ? this.state.commitMessageValidationResult.message : '';
        const autoFocus = 'true';
        const id = GitView.Styles.COMMIT_MESSAGE;
        const commitMessageArea = this.creator.textarea({
            className: `${GitView.Styles.COMMIT_MESSAGE} theia-git-commit-message-${validationStatus}`,
            style: { height: `${this.state.messageBoxHeight}px` },
            autoFocus,
            onInput,
            placeholder,
            id
        }, this.state.message);
        const validationMessageArea = this.creator.div({
            className: `${GitView.Styles.VALIDATION_MESSAGE} ${GitView.Styles.NO_SELECT}
            theia-git-validation-message-${validationStatus} theia-git-commit-message-${validationStatus}`,
            style: {
                display: !!this.state.commitMessageValidationResult ? 'block' : 'none'
            },
            readOnly: 'true'
        }, validationMessage);
        return this.creator.div({ className: GitView.Styles.COMMIT_MESSAGE_CONTAINER }, commitMessageArea, validationMessageArea);
    }

    protected onCommitMessageChange(e: Event): void {
        const { target } = e;
        if (target instanceof HTMLTextAreaElement) {
            const { value } = target;
            this.setState({ message: value });
            this.resize(target);
            this.validateCommitMessage(value).then(result => {
                if (!GitCommitMessageValidator.Result.equal(this.state.commitMessageValidationResult, result)) {
                    this.setState({ commitMessageValidationResult: result });
                }
            });
        }
    }

    protected async validateCommitMessage(input: string | undefined): Promise<GitCommitMessageValidator.Result | undefined> {
        return this.props.commitMessageValidator.validate(input);
    }

    protected refreshHandler = async (e: Event) => {
        await this.props.repositoryProvider.refresh();
    }

    protected moreHandler = (event: Event) => {
        const el = (event.target as HTMLElement).parentElement;
        if (el) {
            this.props.contextMenuRenderer.render(GitView.ContextMenu.PATH, {
                x: el.getBoundingClientRect().left,
                y: el.getBoundingClientRect().top + el.offsetHeight
            });
        }
    }

    protected renderCommandBar(repository: Repository | undefined): JSX.Element {
        const refresh = this.creator.a({
            className: 'toolbar-button',
            title: 'Refresh',
            onClick: this.refreshHandler
        }, this.creator.i({ className: 'fa fa-refresh' }));
        const more = repository ? this.creator.a({
            className: 'toolbar-button',
            title: 'More...',
            onClick: this.moreHandler
        }, this.creator.i({ className: 'fa fa-ellipsis-h' })) : '';
        const signOffBy = repository ? this.creator.a({
            className: 'toolbar-button',
            title: 'Add Signed-off-by',
            onClick: async () => {
                const { selectedRepository } = this.props.repositoryProvider;
                if (selectedRepository) {
                    const [username, email] = await this.getUserConfig(selectedRepository);
                    const signOff = `\n\nSigned-off-by: ${username} <${email}>`;
                    const commitTextArea = document.getElementById(GitView.Styles.COMMIT_MESSAGE) as HTMLTextAreaElement;
                    if (commitTextArea) {
                        const content = commitTextArea.value;
                        if (content.endsWith(signOff)) {
                            commitTextArea.value = content.substr(0, content.length - signOff.length);
                        } else {
                            commitTextArea.value = `${content}${signOff}`;
                        }
                        this.resize(commitTextArea);
                        this.setState({ message: commitTextArea.value });
                        commitTextArea.focus();
                    }
                }
            }
        }, this.creator.i({ className: 'fa fa-pencil-square-o ' })) : '';
        const commandsContainer = this.creator.div({ className: 'buttons' }, refresh, signOffBy, more);
        const commitButton = this.creator.button({
            className: 'theia-button',
            title: 'Commit all the staged changes',
            onClick: () => this.commit.bind(this)(repository)
        }, 'Commit');
        const commitContainer = this.creator.div({ className: 'buttons' }, commitButton);
        const placeholder = this.creator.div({ className: 'placeholder' });
        return this.creator.div({ id: 'commandBar', className: 'flexcontainer' }, commandsContainer, placeholder, commitContainer);
    }

    protected renderMergeChanges(repository: Repository | undefined): JSX.Element | undefined {
        const mergeChangeDivs: React.ReactNode[] = [];
        if (this.state.mergeChanges.length > 0) {
            this.state.mergeChanges.forEach(change => {
                mergeChangeDivs.push(this.renderGitItem(repository, change));
            });
            return this.creator.div({
                id: 'mergeChanges',
                className: 'changesContainer'
            }, this.creator.div({ className: 'theia-header' }, 'Merge Changes'), mergeChangeDivs);
        } else {
            return undefined;
        }
    }

    protected renderStagedChanges(repository: Repository | undefined): JSX.Element | undefined {
        const stagedChangeDivs: React.ReactNode[] = [];
        if (this.state.stagedChanges.length > 0) {
            this.state.stagedChanges.forEach(change => {
                stagedChangeDivs.push(this.renderGitItem(repository, change));
            });
            return this.creator.div({
                id: 'stagedChanges',
                className: 'changesContainer'
            }, this.creator.div({ className: 'theia-header' }, 'Staged Changes'), stagedChangeDivs);
        } else {
            return undefined;
        }
    }

    protected renderUnstagedChanges(repository: Repository | undefined): JSX.Element | undefined {
        const unstagedChangeDivs: React.ReactNode[] = [];
        if (this.state.unstagedChanges.length > 0) {
            this.state.unstagedChanges.forEach(change => {
                unstagedChangeDivs.push(this.renderGitItem(repository, change));
            });
            return this.creator.div({
                id: 'unstagedChanges',
                className: 'changesContainer'
            }, this.creator.div({ className: 'theia-header' }, 'Changed'), unstagedChangeDivs);
        }

        return undefined;
    }

    protected resize(textArea: HTMLTextAreaElement): void {
        // tslint:disable-next-line:no-null-keyword
        const fontSize = Number.parseInt(window.getComputedStyle(textArea, undefined).getPropertyValue('font-size').split('px')[0] || '0', 10);
        const { value } = textArea;
        if (Number.isInteger(fontSize) && fontSize > 0) {
            const requiredHeight = fontSize * value.split(/\r?\n/).length;
            if (requiredHeight < textArea.scrollHeight) {
                textArea.style.height = `${requiredHeight}px`;
            }
        }
        if (textArea.clientHeight < textArea.scrollHeight) {
            textArea.style.height = `${textArea.scrollHeight}px`;
            if (textArea.clientHeight < textArea.scrollHeight) {
                textArea.style.height = `${(textArea.scrollHeight * 2 - textArea.clientHeight)}px`;
            }
        }
    }

    protected renderLastCommit(): React.ReactNode {
        if (!this.state.lastCommit) {
            return '';
        }
        const { commit, avatar } = this.state.lastCommit;
        const gravatar = this.creator.div({ className: GitView.Styles.LAST_COMMIT_MESSAGE_AVATAR }, this.creator.img({ src: avatar }));
        const summary = this.creator.div({ className: GitView.Styles.LAST_COMMIT_MESSAGE_SUMMARY }, commit.summary);
        const time = this.creator.div({ className: GitView.Styles.LAST_COMMIT_MESSAGE_TIME }, `${commit.authorDateRelative} by ${commit.author.name}`);
        const details = this.creator.div({ className: GitView.Styles.LAST_COMMIT_DETAILS }, summary, time);
        // Yes, a container. Otherwise the button would stretch vertically. And having a bigger `Undo` button than a `Commit` would be odd.
        const buttonContainer = this.creator.div({ className: GitView.Styles.FLEX_CENTER }, this.creator.button({
            className: `theia-button`,
            title: 'Undo last commit',
            onClick: () => this.undo.bind(this)()
        }, 'Undo'));
        return <React.Fragment>{gravatar}{details}{buttonContainer}</React.Fragment>;
    }

    protected async getUserConfig(repository: Repository): Promise<[string, string]> {
        const [username, email] = (await Promise.all([
            this.props.git.exec(repository, ['config', 'user.name']),
            this.props.git.exec(repository, ['config', 'user.email'])
        ])).map(result => result.stdout.trim());
        return [username, email];
    }

    protected renderGitItemButtons(repository: Repository, change: GitFileChange): JSX.Element {
        const buttons: JSX.Element[] = [];
        if (change.staged) {
            buttons.push(this.creator.a({
                className: 'toolbar-button',
                title: 'Unstage Changes',
                onClick: async (event: Event) => {
                    try {
                        await this.props.git.unstage(repository, change.uri);
                    } catch (error) {
                        this.logError(error);
                    }
                }
            }, this.creator.i({ className: 'fa fa-minus' })));
        } else {
            buttons.push(this.creator.a({
                className: 'toolbar-button',
                title: 'Discard Changes',
                onClick: async (event: Event) => {
                    const options: Git.Options.Checkout.WorkingTreeFile = { paths: change.uri };
                    if (change.status === GitFileStatus.New) {
                        this.props.commandService.executeCommand(WorkspaceCommands.FILE_DELETE.id, new URI(change.uri));
                    } else {
                        try {
                            await this.props.git.checkout(repository, options);
                        } catch (error) {
                            this.logError(error);
                        }
                    }
                }
            }, this.creator.i({ className: 'fa fa-undo' })));
            buttons.push(this.creator.a({
                className: 'toolbar-button',
                title: 'Stage Changes',
                onClick: async (event: Event) => {
                    try {
                        await this.props.git.add(repository, change.uri);
                    } catch (error) {
                        this.logError(error);
                    }
                }
            }, this.creator.i({ className: 'fa fa-plus' })));
        }
        return this.creator.div({ className: 'buttons' }, buttons);
    }

    protected renderGitItem(repository: Repository | undefined, change: GitFileChangeNode): React.ReactNode {
        if (!repository) {
            return '';
        }
        const iconSpan = this.creator.span({ className: change.icon + ' file-icon' });
        const nameSpan = this.creator.span({ className: 'name' }, change.label + ' ');
        const pathSpan = this.creator.span({ className: 'path' }, change.description);
        const nameAndPathDiv = this.creator.div({
            className: 'noWrapInfo',
            onClick: () => this.openChange(change)
        }, iconSpan, nameSpan, pathSpan);
        const buttonsDiv = this.renderGitItemButtons(repository, change);
        const staged = change.staged ? 'staged ' : '';
        const statusDiv = this.creator.div({
            title: this.getStatusCaption(change.status, change.staged),
            className: 'status ' + staged + GitFileStatus[change.status].toLowerCase()
        }, this.getAbbreviatedStatusCaption(change.status, change.staged));
        const itemButtonsAndStatusDiv = this.creator.div({ className: 'itemButtonsContainer' }, buttonsDiv, statusDiv);
        return this.creator.div({ className: 'gitItem noselect' }, nameAndPathDiv, itemButtonsAndStatusDiv);
    }

    protected renderChangesHeader(title: string): JSX.Element {
        const stagedChangesHeaderDiv = this.creator.div({ className: 'header' }, title);
        return stagedChangesHeaderDiv;
    }

    // tslint:disable-next-line:no-any
    protected logError(error: any): void {
        const message = error instanceof Error ? error.message : error;
        this.props.messageService.error(message);
    }

    protected getStatusCaption(status: GitFileStatus, staged?: boolean): string {
        return GitFileStatus.toString(status, staged);
    }

    protected getAbbreviatedStatusCaption(status: GitFileStatus, staged?: boolean): string {
        return GitFileStatus.toAbbreviation(status, staged);
    }

    findChange(uri: URI): GitFileChange | undefined {
        const stringUri = uri.toString();
        const merge = this.state.mergeChanges.find(c => c.uri.toString() === stringUri);
        if (merge) {
            return merge;
        }
        const unstaged = this.state.unstagedChanges.find(c => c.uri.toString() === stringUri);
        if (unstaged) {
            return unstaged;
        }
        return this.state.stagedChanges.find(c => c.uri.toString() === stringUri);
    }
    async openChange(change: GitFileChange, options?: EditorOpenerOptions): Promise<EditorWidget | undefined> {
        const changeUri = this.createChangeUri(change);
        return this.props.editorManager.open(changeUri, options);
    }
    protected createChangeUri(change: GitFileChange): URI {
        const changeUri: URI = new URI(change.uri);
        if (change.status !== GitFileStatus.New) {
            if (change.staged) {
                return DiffUris.encode(
                    changeUri.withScheme(GIT_RESOURCE_SCHEME).withQuery('HEAD'),
                    changeUri.withScheme(GIT_RESOURCE_SCHEME),
                    changeUri.displayName + ' (Index)');
            }
            if (this.state.stagedChanges.find(c => c.uri === change.uri)) {
                return DiffUris.encode(
                    changeUri.withScheme(GIT_RESOURCE_SCHEME),
                    changeUri,
                    changeUri.displayName + ' (Working tree)');
            }
            if (this.state.mergeChanges.find(c => c.uri === change.uri)) {
                return changeUri;
            }
            return DiffUris.encode(
                changeUri.withScheme(GIT_RESOURCE_SCHEME).withQuery('HEAD'),
                changeUri,
                changeUri.displayName + ' (Working tree)');
        }
        if (change.staged) {
            return changeUri.withScheme(GIT_RESOURCE_SCHEME);
        }
        if (this.state.stagedChanges.find(c => c.uri === change.uri)) {
            return DiffUris.encode(
                changeUri.withScheme(GIT_RESOURCE_SCHEME),
                changeUri,
                changeUri.displayName + ' (Working tree)');
        }
        return changeUri;
    }

    protected resetCommitMessages(): void {
        this.setState({ message: '' });
        const messageInput = document.getElementById(GitView.Styles.COMMIT_MESSAGE) as HTMLTextAreaElement;
        messageInput.value = '';
        this.resize(messageInput);
    }
}

export namespace GitView {
    export interface Props {
        repositoryProvider: GitRepositoryProvider
        git: Git
        labelProvider: LabelProvider
        commitMessageValidator: GitCommitMessageValidator
        contextMenuRenderer: ContextMenuRenderer
        commandService: CommandService
        messageService: MessageService
        editorManager: EditorManager
    }
    export interface State {
        message: string
        commitMessageValidationResult: GitCommitMessageValidator.Result | undefined
        stagedChanges: GitFileChangeNode[]
        unstagedChanges: GitFileChangeNode[]
        mergeChanges: GitFileChangeNode[]
        lastCommit: { commit: CommitWithChanges, avatar: string } | undefined;
        messageBoxHeight: number
    }

    export namespace ContextMenu {
        export const PATH: MenuPath = ['git-widget-context-menu'];
        export const OTHER_GROUP: MenuPath = [...PATH, '1_other'];
        export const COMMIT_GROUP: MenuPath = [...PATH, '2_commit'];
    }

    export namespace Styles {
        export const MAIN_CONTAINER = 'theia-git-main-container';
        export const COMMIT_MESSAGE_CONTAINER = 'theia-git-commit-message-container';
        export const COMMIT_MESSAGE = 'theia-git-commit-message';
        export const VALIDATION_MESSAGE = 'theia-git-commit-validation-message';
        export const LAST_COMMIT_CONTAINER = 'theia-git-last-commit-container';
        export const LAST_COMMIT_DETAILS = 'theia-git-last-commit-details';
        export const LAST_COMMIT_MESSAGE_AVATAR = 'theia-git-last-commit-message-avatar';
        export const LAST_COMMIT_MESSAGE_SUMMARY = 'theia-git-last-commit-message-summary';
        export const LAST_COMMIT_MESSAGE_TIME = 'theia-git-last-commit-message-time';

        export const FLEX_CENTER = 'flex-container-center';
        export const NO_SELECT = 'no-select';
    }
}
