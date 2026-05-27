// src/components/BottomBar.tsx
// 底部栏组件 —— 动态渲染注册的左/中/右区域状态项
// 支持动态文本更新（通过 UPDATE_STATUS 事件）

import React, { useState, useEffect } from 'react';
import { useEditorBusContext } from '../bus/EditorBusContext';
import {
  getBottomBarLeftItems,
  getBottomBarCenterItems,
  getBottomBarRightItems,
  type BottomBarItem,
} from '../registry/bottomBarRegistry';

// 默认状态项渲染组件（简单的文本标签）
const DefaultStatusItem: React.FC<{ item: BottomBarItem; text: string }> = ({ item, text }) => (
  <span className="bottom-bar-item">{text}</span>
);

// 渲染一组状态项
const RenderItems: React.FC<{ items: BottomBarItem[]; textMap: Map<string, string> }> = ({ items, textMap }) => {
  return (
    <>
      {items.map((item, idx) => {
        const displayText = textMap.get(item.id) ?? item.text ?? '';
        if (item.component) {
          const CustomComp = item.component;
          return <CustomComp key={item.id} text={displayText} />;
        }
        return <DefaultStatusItem key={item.id} item={item} text={displayText} />;
      })}
    </>
  );
};

const BottomBar: React.FC = () => {
  const bus = useEditorBusContext();
  const [textMap, setTextMap] = useState<Map<string, string>>(new Map());

  // 仅在挂载时初始化静态文本（避免依赖 items 数组）
  useEffect(() => {
    const initialMap = new Map<string, string>();
    const allItems = [...getBottomBarLeftItems(), ...getBottomBarCenterItems(), ...getBottomBarRightItems()];
    allItems.forEach(item => {
      if (item.text) initialMap.set(item.id, item.text);
    });
    setTextMap(initialMap);
  }, []);

  // 订阅 UPDATE_STATUS 事件（只依赖 bus，不依赖 items）
  useEffect(() => {
    const unsub = bus.subscribe(({ event }) => {
      if (event.type === 'UPDATE_STATUS') {
        const { id, text } = event.payload;
        setTextMap(prev => {
          // 实时获取最新的 items 列表
          const allItems = [...getBottomBarLeftItems(), ...getBottomBarCenterItems(), ...getBottomBarRightItems()];
          const item = allItems.find(i => i.id === id);
          if (item && item.updatable !== false) {
            const newMap = new Map(prev);
            newMap.set(id, text);
            return newMap;
          }
          return prev;
        });
      }
    });
    return unsub;
  }, [bus]);

  // 每次渲染时获取最新的 items
  const leftItems = getBottomBarLeftItems();
  const centerItems = getBottomBarCenterItems();
  const rightItems = getBottomBarRightItems();

  return (
    <footer className="bottom-bar glass-effect">
      <div className="bottom-bar-left">
        <RenderItems items={leftItems} textMap={textMap} />
      </div>
      <div className="bottom-bar-center">
        <RenderItems items={centerItems} textMap={textMap} />
      </div>
      <div className="bottom-bar-right">
        <RenderItems items={rightItems} textMap={textMap} />
      </div>
    </footer>
  );
};

export default BottomBar;