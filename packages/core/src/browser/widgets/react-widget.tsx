/*
 * Copyright (C) 2018 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import * as ReactDOM from "react-dom";
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
    }

    protected onUpdateRequest(msg: Message): void {
        super.onUpdateRequest(msg);
        if (this.viewElement) {
            ReactDOM.render(this.viewElement, this.node);
        } else {
            throw "viewElement is not set";
        }
    }

    @postConstruct()
    protected init() {
        this.update();
    }
}
