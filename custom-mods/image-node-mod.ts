// custom-mods/image-node-mod.ts
import type { EditorMod, EditorBus } from '../src/bus/types';
import { registerNodeTemplates } from '../src/registry/nodeTemplateRegistry';
import { ResourceStore } from '../src/store/ResourceStore';
import type { NodeTemplate } from '../src/nodeTemplates';

const imageNodeTemplate: NodeTemplate = {
    type: 'imageNode',
    title: '图片节点',
    category: '媒体',
    icon: '🖼️',
    color: '#10B981',
    inputs: [],
    outputs: [{ id: 'out', label: '图片 URL', type: 'string', position: 'right' }],
    defaultData: {
        label: '图片',
        _resources: [],
        imageUrl: ''
    },
    properties: {
        label: { type: 'string', default: '图片' },
        imageUrl: { type: 'string', default: '' }
    }
};

const SAMPLE_IMAGE_URL = 'https://picsum.photos/200/150';

export const imageNodeMod: EditorMod = {
    id: 'image-node',
    init(bus: EditorBus) {
        const unregisterTemplate = registerNodeTemplates([imageNodeTemplate]);

        // 监听节点添加，自动加载示例图片并注册资源
        const unsub = bus.subscribe(({ event }) => {
            if (event.type === 'NODE_ADDED' && event.node.type === 'imageNode') {
                fetch(SAMPLE_IMAGE_URL)
                    .then(res => res.blob())
                    .then(blob => {
                        const resourceId = ResourceStore.register(blob);
                        bus.dispatch({
                            type: 'NODE_DATA_CHANGED',
                            nodeId: event.node.id,
                            data: {
                                _resources: [resourceId],
                                imageUrl: URL.createObjectURL(blob)
                            },
                            propagate: false
                        });
                        console.log(`[image-node] 为节点 ${event.node.id} 加载图片资源 ${resourceId}`);
                    })
                    .catch(err => console.error('[image-node] 图片加载失败', err));
            }
        });

        return () => {
            unsub();
            unregisterTemplate();
        };
    }
};