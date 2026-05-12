import type { EditorMod } from '../src/bus/types';

let unsubscribe: (() => void) | undefined;

export const autoLoadMod: EditorMod = {
    id: 'auto-load',
    init(bus) {
        const raw = localStorage.getItem('auto-saved-workflow');
        if (raw) {
            try {
                const { nodes, edges } = JSON.parse(raw);
                bus.dispatch({ type: 'WORKFLOW_LOADED', nodes, edges });
            } catch (e) {}
        }
    },
};