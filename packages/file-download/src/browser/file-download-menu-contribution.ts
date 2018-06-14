/*
 * Copyright (C) 2018 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { injectable } from 'inversify';
import { MenuContribution, MenuModelRegistry } from '@theia/core/lib/common/menu';
import { NavigatorContextMenu } from '@theia/navigator/lib/browser/navigator-contribution';
import { FileDownloadCommands } from './file-download-command-contribution';

@injectable()
export class FileDownloadMenuContribution implements MenuContribution {

    registerMenus(registry: MenuModelRegistry) {
        registry.registerMenuAction(NavigatorContextMenu.MOVE, {
            commandId: FileDownloadCommands.DOWNLOAD.id,
            label: 'Download',
            order: 'z' // Should be the last item in the menu group.
        });
    }

}
