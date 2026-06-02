// config/numbers.ts
// 全局数字配置，消除魔法数字

export const TIMEOUTS = {
    /** 文件导入超时时间（毫秒） */
    FILE_IMPORT_TIMEOUT: 60000,
    /** 取消检测延迟（毫秒）——用于区分用户点击取消与选择文件后的焦点恢复 */
    CANCEL_DETECTION_DELAY: 50,
} as const;

export const LAYOUT = {
    /** 默认节点宽度（像素） */
    DEFAULT_NODE_WIDTH: 160,
    /** 默认节点高度（像素） */
    DEFAULT_NODE_HEIGHT: 60,
    /** 对齐分布时节点之间的最小间距（像素） */
    MIN_ALIGN_GAP: 20,
    /** 自动布局默认水平间距（像素） */
    AUTO_LAYOUT_HORIZONTAL_SPACING: 250,
    /** 自动布局默认垂直间距（像素） */
    AUTO_LAYOUT_VERTICAL_SPACING: 150,
    /** 自动布局默认起始 X 坐标 */
    AUTO_LAYOUT_START_X: 100,
    /** 自动布局默认起始 Y 坐标 */
    AUTO_LAYOUT_START_Y: 300,
} as const;

export const HISTORY = {
    /** 默认最大历史记录数 */
    DEFAULT_MAX_HISTORY: 50,
    /** 历史记录上限 */
    MAX_HISTORY_LIMIT: 200,
} as const;

export const NODE = {
    /** 节点标题最大宽度（用于省略号） */
    TITLE_MAX_WIDTH: 180,
    /** 节点内端口垂直排列间距（像素） */
    PORT_VERTICAL_SPACING: 28,
    /** 节点内端口水平排列额外占位宽度 */
    PORT_HORIZONTAL_EXTRA_WIDTH: 80,
    /** 默认端口偏移距离（CSS变量值，实际通过主题变量控制） */
    DEFAULT_HANDLE_OFFSET: 7,
} as const;

export const ANIMATION = {
    /** 默认过渡动画时长（毫秒） */
    TRANSITION_DURATION_FAST: 150,
    /** 默认过渡动画时长（慢） */
    TRANSITION_DURATION_SLOW: 250,
} as const;

export const UI = {
    /** 侧边栏默认宽度（像素） */
    SIDEBAR_WIDTH: 240,
    /** 属性面板默认宽度（像素） */
    PROPS_PANEL_WIDTH: 260,
    /** 面板折叠后宽度（像素） */
    PANEL_COLLAPSED_WIDTH: 44,
} as const;

export const BATCH_CONNECT = {
    /** 批量连线脉冲动画时长（毫秒） */
    PULSE_ANIMATION_DURATION: 1200,
} as const;

export const TOOLTIP = {
    /** 工具提示显示延迟（毫秒） */
    TOOLTIP_DELAY: 300,
    /** 工具提示显示延迟（顶部栏专用） */
    TOPBAR_TOOLTIP_DELAY: 500,
} as const;

export const WORKFLOW_IO = {
    /** 文件导入超时时间（毫秒） */
    IMPORT_TIMEOUT: TIMEOUTS.FILE_IMPORT_TIMEOUT,
    /** 取消检测延迟（毫秒） */
    CANCEL_DETECTION_DELAY: TIMEOUTS.CANCEL_DETECTION_DELAY,
} as const;