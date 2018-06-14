/*
 * Copyright (C) 2018 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { inject, injectable } from 'inversify';
import URI from '@theia/core/lib/common/uri';
import { ILogger } from '@theia/core/lib/common/logger';
import { Endpoint } from '@theia/core/lib/browser/endpoint';
import { FileSystem } from '@theia/filesystem/lib/common/filesystem';
import { FileDownloadData } from '../common/file-download-data';

@injectable()
export class FileDownloadService {

    protected anchor: HTMLAnchorElement | undefined;

    @inject(ILogger)
    protected readonly logger: ILogger;

    @inject(FileSystem)
    protected readonly fileSystem: FileSystem;

    async download(uris: URI[]): Promise<void> {
        if (uris.length === 0) {
            return;
        }
        try {
            const title = await this.title(uris);
            const response = await fetch(this.request(uris));
            const { status, statusText } = response;
            if (status === 200) {
                this.forceDownload(response, title);
            } else {
                throw new Error(`Received unexpected status code: ${status}. [${statusText}]`);
            }
        } catch (e) {
            this.logger.error(`Error occurred when downloading: ${uris.map(u => u.toString(true))}.`, e);
        }
    }

    protected async forceDownload(response: Response, title: string): Promise<void> {
        let url: string | undefined;
        try {
            const blob = await response.blob();
            url = URL.createObjectURL(blob);
            if (this.anchor === undefined) {
                this.anchor = document.createElement('a');
                this.anchor.style.display = 'none';
            }
            this.anchor.href = url;
            this.anchor.download = title;
            this.anchor.click();
        } finally {
            if (url) {
                URL.revokeObjectURL(url);
            }
        }
    }

    protected async title(uris: URI[]): Promise<string> {
        // tslint:disable-next-line:whitespace
        const [uri,] = uris;
        if (uris.length === 1) {
            const stat = await this.fileSystem.getFileStat(uri.toString());
            if (stat === undefined) {
                throw new Error(`Unexpected error occurred when downloading file. Files does not exist. URI: ${uri.toString(true)}.`);
            }
            const title = uri.path.base;
            return stat.isDirectory ? `${title}.zip` : title;
        }
        return `${uri.parent.path.name}.zip`;
    }

    protected request(uris: URI[]): Request {
        const url = this.url(uris);
        const init = this.requestInit(uris);
        return new Request(url, init);
    }

    protected requestInit(uris: URI[]): RequestInit {
        if (uris.length === 1) {
            return {
                body: undefined,
                method: 'GET'
            };
        }
        return {
            method: 'PUT',
            body: JSON.stringify(this.body(uris)),
            headers: new Headers({ 'Content-Type': 'application/json' }),
        };
    }

    protected body(uris: URI[]): FileDownloadData {
        return {
            uris: uris.map(u => u.toString(true))
        };
    }

    protected url(uris: URI[]): string {
        const endpoint = this.endpoint();
        if (uris.length === 1) {
            // tslint:disable-next-line:whitespace
            const [uri,] = uris;
            return `${endpoint}/?uri=${uri.toString()}`;
        }
        return endpoint;

    }

    protected endpoint(): string {
        const url = new Endpoint({ path: 'file-download' }).getRestUrl().toString();
        return url.endsWith('/') ? url.slice(0, -1) : url;
    }

}
