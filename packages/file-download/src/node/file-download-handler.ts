/*
 * Copyright (C) 2018 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import * as os from 'os';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as rimraf from 'rimraf';
import { v4 } from 'uuid';
import { lookup } from 'mime-types';
import { Request, Response } from 'express';
import { inject, injectable } from 'inversify';
import { OK, BAD_REQUEST, METHOD_NOT_ALLOWED, NOT_FOUND, INTERNAL_SERVER_ERROR } from 'http-status-codes';
import URI from '@theia/core/lib/common/uri';
import { isEmpty } from '@theia/core/lib/common/objects';
import { ILogger } from '@theia/core/lib/common/logger';
import { FileUri } from '@theia/core/lib/node/file-uri';
import { FileSystem } from '@theia/filesystem/lib/common/filesystem';
import { DirectoryZipper } from './directory-zipper';
import { FileDownloadData } from '../common/file-download-data';

@injectable()
export abstract class FileDownloadHandler {

    @inject(ILogger)
    protected readonly logger: ILogger;

    @inject(FileSystem)
    protected readonly fileSystem: FileSystem;

    @inject(DirectoryZipper)
    protected readonly zipper: DirectoryZipper;

    public abstract handle(request: Request, response: Response): Promise<void>;

    protected async download(filePath: string, request: Request, response: Response): Promise<void> {
        const name = path.basename(filePath);
        const mimeType = lookup(filePath);
        if (mimeType) {
            response.contentType(mimeType);
        } else {
            this.logger.debug(`Cannot determine the content-type for file: ${filePath}. Skipping the 'Content-type' header from the HTTP response.`);
        }
        response.setHeader('Content-Disposition', `attachment; filename=${name}`);
        try {
            await fs.access(filePath, fs.constants.W_OK);
            fs.readFile(filePath, (error, data) => {
                if (error) {
                    this.handleError(response, error, INTERNAL_SERVER_ERROR);
                    return;
                }
                response.status(OK).send(data).end();
            });
        } catch (e) {
            this.handleError(response, e, INTERNAL_SERVER_ERROR);
        }
    }

    protected async zip(inputPath: string): Promise<string> {
        const outputPath = path.join(os.tmpdir(), v4());
        await this.zipper.zip(inputPath, outputPath);
        return outputPath;
    }

    protected async deleteRecursively(pathToDelete: string): Promise<void> {
        rimraf(pathToDelete, error => {
            if (error) {
                this.logger.warn(`An error occurred while deleting the temporary data from the disk. Cannot clean up: ${pathToDelete}.`, error);
            }
        });
    }

    protected async createTempDir(): Promise<string> {
        const outputPath = path.join(os.tmpdir(), v4());
        await fs.mkdir(outputPath);
        return outputPath;
    }

    protected async handleError(response: Response, reason: string | Error, status: number = INTERNAL_SERVER_ERROR): Promise<void> {
        this.logger.error(reason);
        response.status(status).send(reason).end();
    }

}

export namespace FileDownloadHandler {
    export const SINGLE: symbol = Symbol('single');
    export const MULTI: symbol = Symbol('multi');
}

@injectable()
export class SingleFileDownloadHandler extends FileDownloadHandler {

    async handle(request: Request, response: Response): Promise<void> {
        const { method, body, query } = request;
        if (method !== 'GET') {
            this.handleError(response, `Unexpected HTTP method. Expected GET got '${method}' instead.`, METHOD_NOT_ALLOWED);
            return;
        }
        if (body !== undefined && !isEmpty(body)) {
            this.handleError(response, `The request body must either undefined or empty when downloading a single file. The body was: ${JSON.stringify(body)}.`, BAD_REQUEST);
            return;
        }
        if (query === undefined || query.uri === undefined || typeof query.uri !== 'string') {
            this.handleError(response, `Cannot access the 'uri' query from the request. The query was: ${JSON.stringify(query)}.`, BAD_REQUEST);
            return;
        }
        const uri = new URI(query.uri).toString(true);
        const stat = await this.fileSystem.getFileStat(uri);
        if (stat === undefined) {
            this.handleError(response, `The file does not exist. URI: ${uri}.`, NOT_FOUND);
            return;
        }
        try {
            const filePath = FileUri.fsPath(uri);
            if (!stat.isDirectory) {
                await this.download(filePath, request, response);
            } else {
                const outputPath = await this.zip(filePath);
                await this.download(outputPath, request, response);
                // Do not wait for the clean up.
                this.deleteRecursively(outputPath);
            }
        } catch (e) {
            this.handleError(response, e, INTERNAL_SERVER_ERROR);
        }
    }

}

@injectable()
export class MultiFileDownloadHandler extends FileDownloadHandler {

    async handle(request: Request, response: Response): Promise<void> {
        const { method, body } = request;
        if (method !== 'PUT') {
            this.handleError(response, `Unexpected HTTP method. Expected PUT got '${method}' instead.`, METHOD_NOT_ALLOWED);
            return;
        }
        if (body === undefined) {
            this.handleError(response, `The request body must be defined when downloading multiple files.`, BAD_REQUEST);
            return;
        }
        if (!FileDownloadData.is(body)) {
            this.handleError(response, `Unexpected body format. Cannot extract the URIs from the request body. Body was: ${JSON.stringify(body)}.`, BAD_REQUEST);
            return;
        }
        if (body.uris.length === 0) {
            this.handleError(response, `Insufficient body format. No URIs were defined by the request body. Body was: ${JSON.stringify(body)}.`, BAD_REQUEST);
            return;
        }
        const [firstUri, ...restUris] = body.uris.map(uri => new URI(uri));
        const firstStat = await this.fileSystem.getFileStat(firstUri.toString());
        if (firstStat === undefined) {
            this.handleError(response, `The file does not exist. URI: ${firstUri.toString(true)}.`, NOT_FOUND);
            return;
        }
        const expectedParent = firstUri.parent.toString();
        for (const uri of restUris) {
            if (uri.parent.toString() !== expectedParent) {
                this.handleError(response, `Incorrect body format. Each URI must have the same parent. Body was: ${JSON.stringify(body)}.`, BAD_REQUEST);
                return;
            }
            const stat = await this.fileSystem.getFileStat(uri.toString());
            if (stat === undefined) {
                this.handleError(response, `The file does not exist. URI: ${uri.toString(true)}.`, NOT_FOUND);
                return;
            }
        }
        try {
            const filePath = await this.prepareDownload(body.uris.map(FileUri.fsPath));
            const outputPath = await this.zip(filePath);
            await this.download(outputPath, request, response);
            // Do not wait for the clean up.
            this.deleteRecursively(outputPath);
        } catch (e) {
            this.handleError(response, e, INTERNAL_SERVER_ERROR);
        }
    }

    protected async prepareDownload(paths: string[]): Promise<string> {
        const outputPath = await this.createTempDir();
        await Promise.all(paths.map(p => fs.copy(p, path.join(outputPath, path.basename(p)))));
        return outputPath;
    }

}
