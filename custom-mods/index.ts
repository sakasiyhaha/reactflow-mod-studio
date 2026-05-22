// custom-mods/index.ts
import type { EditorMod } from '../src/bus/types';
import { exampleAutoSaveMod } from './example-auto-save-mod';
import { autoLoadMod } from './auto-load-mod';
import { exampleAddTemplateMod } from './example-add-template-mod';
import { exampleReplaceTemplateMod } from './example-replace-template-mod';
import { testOverrideHistoryMod } from './test-override-history';  
import { testBrokenMod } from './test-broken-mod';  
import { testGuideLinesMod } from './test-guide-lines';
export const customMods: EditorMod[] = [
    //customEdgeMod,
    //testOverrideHistoryMod,  //
    //testBrokenMod,
    exampleAutoSaveMod,
    autoLoadMod,
    exampleAddTemplateMod,
    // 如果需要覆盖，取消下一行的注释即可
    //exampleReplaceTemplateMod,
    //testGuideLinesMod,
];