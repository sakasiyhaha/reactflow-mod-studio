import type { EditorMod } from '../src/bus/types';
import { loggerNodeMod } from './logger-node-mod';
import { exportSvgMod } from './export-svg-mod';
import { timestampHookMod } from './timestamp-hook-mod';
import { confirmDeleteMod } from './confirm-delete-mod';
import { imageNodeMod } from './image-node-mod'; // 可选
import { designUiMod } from './design-ui-mod';
export const customMods: EditorMod[] = [
    loggerNodeMod,
    exportSvgMod,
    timestampHookMod,
    confirmDeleteMod,
    imageNodeMod,
    //designUiMod,
];