// src/history/HistoryStore.ts
import type { EditorState } from '../bus/types';

export interface IHistoryStore {
  canUndo(): boolean;
  canRedo(): boolean;
  recordState(state: EditorState): void;
  undo(currentState: EditorState): EditorState | null;
  redo(currentState: EditorState): EditorState | null;
  clear(): void;
  getPastCount(): number;
  getFutureCount(): number;
}

// 默认实现（基于数组栈，最大历史记录数可配置）
export class DefaultHistoryStore implements IHistoryStore {
  private past: EditorState[] = [];
  private future: EditorState[] = [];
  private maxHistory: number;

  constructor(maxHistory: number = 50) {
    this.maxHistory = maxHistory;
  }

  canUndo(): boolean {
    return this.past.length > 0;
  }

  canRedo(): boolean {
    return this.future.length > 0;
  }

  getPastCount(): number {
    return this.past.length;
  }

  getFutureCount(): number {
    return this.future.length;
  }

  recordState(state: EditorState): void {
    const snapshot = this.takeSnapshot(state);
    this.past.push(snapshot);
    if (this.past.length > this.maxHistory) this.past.shift();
    this.future = [];
  }

  undo(currentState: EditorState): EditorState | null {
    if (!this.canUndo()) return null;
    this.future.push(this.takeSnapshot(currentState));
    const prevState = this.past.pop()!;
    return prevState;
  }

  redo(currentState: EditorState): EditorState | null {
    if (!this.canRedo()) return null;
    this.past.push(this.takeSnapshot(currentState));
    const nextState = this.future.pop()!;
    return nextState;
  }

  clear(): void {
    this.past = [];
    this.future = [];
  }

  private takeSnapshot(state: EditorState): EditorState {
    return {
      nodes: structuredClone(state.nodes),
      edges: structuredClone(state.edges),
      selection: [...state.selection],
      mode: state.mode,
    };
  }
}