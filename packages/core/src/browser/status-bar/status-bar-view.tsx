/*
 * Copyright (C) 2017-2018 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import * as React from "react";
import { LabelParser, LabelIcon } from "../label-parser";
import { FrontendApplicationStateService } from "../frontend-application-state";
import { CommandService } from "../../common/command";

export interface StatusBarEntry {
    /**
     * For icons we use fontawesome. Get more information and the class names
     * here: http://fontawesome.io/icons/
     * To set a text with icon use the following pattern in text string:
     * $(fontawesomeClasssName)
     * To use animated icons use the following pattern:
     * $(fontawesomeClassName~typeOfAnimation)
     * Type of animation can be either spin or pulse.
     * Look here for more information to animated icons:
     * http://fontawesome.io/examples/#animated
     */
    text: string;
    alignment: StatusBarAlignment;
    color?: string;
    className?: string;
    tooltip?: string;
    command?: string;
    // tslint:disable-next-line:no-any
    arguments?: any[];
    priority?: number;
    onclick?: (e: MouseEvent) => void;
}

export enum StatusBarAlignment {
    LEFT, RIGHT
}

export interface StatusBarEntryAttributes {
    className?: string;
    title?: string;
    style?: object;
    onClick?: (e: MouseEvent) => void;
    onMouseOver?: () => void;
    onMouseOut?: () => void;
}

export namespace StatusBarView {
    export interface Props {
        commands: CommandService;
        entryService: LabelParser;
        applicationStateService: FrontendApplicationStateService;
    }
    export interface State {
        entries: Map<string, StatusBarEntry>
    }
}

export class StatusBarView extends React.Component<StatusBarView.Props, StatusBarView.State> {

    protected commands: CommandService;
    protected entryService: LabelParser;
    protected applicationStateService: FrontendApplicationStateService;

    constructor(props: StatusBarView.Props) {
        super(props);

        this.commands = props.commands;
        this.applicationStateService = props.applicationStateService;
        this.entryService = props.entryService;

        this.state = {
            entries: new Map()
        };
    }

    setEntry(id: string, entry: StatusBarEntry) {
        this.setState(((state, props) => {
            const entries = state.entries;
            entries.set(id, entry);
            return {
                entries
            };
        }));
    }

    removeEntry(id: string) {
        this.setState(((state, props) => {
            const entries = state.entries;
            entries.delete(id);
            return {
                entries
            };
        }));
    }

    render(): JSX.Element {
        const leftEntries: JSX.Element[] = [];
        const rightEntries: JSX.Element[] = [];
        const elements = Array.from(this.state.entries.values()).sort((left, right) => {
            const lp = left.priority || 0;
            const rp = right.priority || 0;
            return rp - lp;
        });
        elements.forEach(entry => {
            if (entry.alignment === StatusBarAlignment.LEFT) {
                leftEntries.push(this.renderElement(entry));
            } else {
                rightEntries.push(this.renderElement(entry));
            }
        });

        return <React.Fragment>
            <div className="area left"><React.Fragment>{leftEntries}</React.Fragment></div>
            <div className="area right"><React.Fragment>{rightEntries}</React.Fragment></div>
        </React.Fragment>;
    }

    protected onclick(entry: StatusBarEntry): () => void {
        return () => {
            if (entry.command) {
                const args = entry.arguments || [];
                this.commands.executeCommand(entry.command, ...args);
            }
        };
    }

    protected createAttributes(entry: StatusBarEntry): StatusBarEntryAttributes {
        const attrs: StatusBarEntryAttributes = {};

        if (entry.command) {
            attrs.onClick = this.onclick(entry);
            attrs.className = 'element hasCommand';
        } else if (entry.onclick) {
            attrs.onClick = e => {
                if (entry.onclick) {
                    entry.onclick(e);
                }
            };
            attrs.className = 'element hasCommand';
        } else {
            attrs.className = 'element';
        }

        if (entry.tooltip) {
            attrs.title = entry.tooltip;
        }

        if (entry.color) {
            attrs.style = {
                color: entry.color
            };
        }

        if (entry.className) {
            attrs.className += ' ' + entry.className;
        }

        return attrs;
    }

    protected renderElement(entry: StatusBarEntry): JSX.Element {
        const childStrings = this.entryService.parse(entry.text);
        const children: JSX.Element[] = [];

        childStrings.forEach((val, idx) => {
            const key = entry.alignment + "-" + idx;
            if (!(typeof val === 'string') && LabelIcon.is(val)) {
                const classStr = `fa fa-${val.name} ${val.animation ? 'fa-' + val.animation : ''}`;
                children.push(<span className={classStr} key={key}></span>);
            } else {
                children.push(<span key={key}>{val}</span>);
            }
        });
        const elementInnerDiv = <div>{children}</div>;

        return React.createElement("div", this.createAttributes(entry), elementInnerDiv);
    }

}
