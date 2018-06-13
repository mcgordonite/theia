/*
 * Copyright (C) 2018 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import * as ReactDOM from "react-dom";
import * as React from "react";
import { injectable, postConstruct } from "inversify";
import { DisposableCollection, Disposable } from "../../common";
import { BaseWidget, Message } from "./widget";
import { ReactElement } from "react";

@injectable()
export abstract class ReactWidget extends BaseWidget {

    protected readonly onRender = new DisposableCollection();
    protected viewComponent: any;
    protected viewElement: ReactElement<object>;

    constructor() {
        super();
        this.toDispose.push(Disposable.create(() => {
            ReactDOM.unmountComponentAtNode(this.node);
        }));
        this.setComponent = this.setComponent.bind(this);
    }

    protected setComponent(comp: any) {
        this.viewComponent = comp || undefined;
    }

    protected onUpdateRequest(msg: Message): void {
        super.onUpdateRequest(msg);

        ReactDOM.render(this.getElement(), this.node);
    }

    protected getElement(): React.ReactElement<{}> {
        const data = this.widgetData();
        const props = Object.assign({ ref: this.setComponent }, data.props);
        return React.createElement(data.component, props);
    }

    protected abstract widgetData(): ReactWidget.WidgetData<{}>;

    @postConstruct()
    protected init() {
        this.update();
    }
}

export namespace ReactWidget {
    export interface WidgetData<P> {
        props: P
        component: React.ComponentClass
    }

    export namespace ElementCreators {
        export function div(attrs: object, ...content: React.ReactNode[]): JSX.Element {
            return React.createElement("div", attrs, content);
        }

        export function input(attrs: object, content?: React.ReactNode): JSX.Element {
            return React.createElement("input", attrs, content);
        }

        export function i(attrs: object, content?: React.ReactNode): JSX.Element {
            return React.createElement("input", attrs, content);
        }

        export function h2(attrs: object, content?: React.ReactNode): JSX.Element {
            return React.createElement("h2", attrs, content);
        }
    }
}
