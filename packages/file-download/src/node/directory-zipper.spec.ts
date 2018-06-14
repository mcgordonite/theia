/*
 * Copyright (C) 2018 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as temp from 'temp';
import { expect } from 'chai';
import { DirectoryZipper } from './directory-zipper';

// tslint:disable:no-unused-expression

const track = temp.track();

describe('directory-zipper', () => {

    after(() => {
        track.cleanupSync();
    });

    it('should zip up a directory', async function () {
        this.timeout(20_000);
        const fromPath = track.mkdirSync('from');
        fs.writeFileSync(path.join(fromPath, 'A.txt'), 'A');
        fs.writeFileSync(path.join(fromPath, 'B.txt'), 'B');
        expect(fs.readFileSync(path.join(fromPath, 'A.txt'), { encoding: 'utf8' })).to.be.equal('A');
        expect(fs.readFileSync(path.join(fromPath, 'B.txt'), { encoding: 'utf8' })).to.be.equal('B');
        const toPath = track.mkdirSync('to');
        const zipper = new DirectoryZipper();
        await zipper.zip(fromPath, path.join(toPath, 'output.zip'));
        expect(fs.existsSync(path.join(toPath, 'output.zip'))).to.be.true;
    });

});
