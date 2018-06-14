/*
 * Copyright (C) 2018 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { injectable } from 'inversify';
const zipDir = require('zip-dir');

@injectable()
export class DirectoryZipper {

    async zip(inputPath: string, outputPath: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            zipDir(inputPath, { saveTo: outputPath }, (error: Error, buffer: Buffer) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve();
            });
        });
    }

}
