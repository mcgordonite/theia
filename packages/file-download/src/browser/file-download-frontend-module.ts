/*
 * Copyright (C) 2018 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { ContainerModule } from 'inversify';
import { MenuContribution } from '@theia/core/lib/common/menu';
import { CommandContribution } from '@theia/core/lib/common/command';
import { FileDownloadService } from './file-download-service';
import { FileDownloadMenuContribution } from './file-download-menu-contribution';
import { FileDownloadCommandContribution } from './file-download-command-contribution';

export default new ContainerModule(bind => {
    bind(FileDownloadService).toSelf().inSingletonScope();
    bind(CommandContribution).to(FileDownloadCommandContribution).inSingletonScope();
    bind(MenuContribution).to(FileDownloadMenuContribution).inSingletonScope();
});
