// src/components/Sidebar.tsx
import React, { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import CollapseButton from './CollapseButton';
import { getSidebarComponents, updateComponentOrder, loadOrderFromLocalStorage } from '../registry/sidebarRegistry';
import { useDragSensors } from '../utils/dragConfig';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

// 可拖拽的组件包装器（仅用于非节点库组件）
const SortableItem: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
};

// 不可拖拽的普通包装器（用于节点库）
const StaticItem: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <div style={{ cursor: 'default' }}>{children}</div>;
};

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const [components, setComponents] = useState(getSidebarComponents());

  useEffect(() => {
    loadOrderFromLocalStorage();
    setComponents(getSidebarComponents());
  }, []);

  const sensors = useSensors(...useDragSensors());

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = components.findIndex(c => c.id === active.id);
      const newIndex = components.findIndex(c => c.id === over?.id);
      if (components[oldIndex].id === 'node-library' || components[newIndex].id === 'node-library') {
        return;
      }
      const newOrder = arrayMove(components, oldIndex, newIndex);
      newOrder.forEach((comp, idx) => {
        if (comp.id !== 'node-library') {
          updateComponentOrder(comp.id, idx);
        }
      });
      setComponents(newOrder);
    }
  };

  if (collapsed) {
    return (
      <div className="sidebar collapsed glass-effect">
        <CollapseButton side="left" collapsed={collapsed} onClick={onToggle} />
        <div className="sidebar-collapsed-content">
          📦
        </div>
      </div>
    );
  }

  const nodeLibraryComp = components.find(c => c.id === 'node-library');
  const otherComps = components.filter(c => c.id !== 'node-library');

  return (
    <div className="sidebar glass-effect">
      <CollapseButton side="left" collapsed={collapsed} onClick={onToggle} />
      <div className="sidebar-scroll-area">
        {nodeLibraryComp && (
          <StaticItem>
            <nodeLibraryComp.component />
          </StaticItem>
        )}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={otherComps.map(c => c.id)} strategy={verticalListSortingStrategy}>
            {otherComps.map(comp => (
              <SortableItem key={comp.id} id={comp.id}>
                <comp.component />
              </SortableItem>
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
};

export default Sidebar;