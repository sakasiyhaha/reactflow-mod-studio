// custom-mods/index.ts
import type { EditorMod } from '../src/bus/types';
import { exampleAutoSaveMod } from './example-auto-save-mod';
import { autoLoadMod } from './auto-load-mod';
import { exampleAddTemplateMod } from './example-add-template-mod';
import { exampleReplaceTemplateMod } from './example-replace-template-mod';

export const customMods: EditorMod[] = [
    exampleAutoSaveMod,
    autoLoadMod,
    exampleAddTemplateMod,      // 添加新模板
    // 如果需要覆盖，取消下一行的注释即可
    //exampleReplaceTemplateMod,
];