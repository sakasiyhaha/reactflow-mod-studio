// config/editorConfig.ts
import GenericNode from '../src/components/GenericNode';
import { getAllTemplates } from '../src/registry/nodeTemplateRegistry';
import { getEdgeTypeMap } from '../src/registry/edgeTemplateRegistry';
import type { NodeTypes, EdgeTypes } from '@xyflow/react';

/**
 * 动态获取当前所有节点类型到组件的映射
 * 每次调用时都会根据最新的模板列表生成映射，支持运行时动态注册自定义节点
 */
export function getNodeTypeMap(): NodeTypes {
    return Object.fromEntries(
        getAllTemplates().map((template) => [template.type, GenericNode])
    );
}

/**
 * 动态获取当前所有边类型到组件的映射
 * 支持运行时通过 edgeTemplateRegistry 注册自定义边组件
 * 注意：使用类型断言 because of slight incompatibility with EdgeTypes
 */
export function getEdgeTypeMapDynamic(): EdgeTypes {
    return getEdgeTypeMap() as EdgeTypes;
}