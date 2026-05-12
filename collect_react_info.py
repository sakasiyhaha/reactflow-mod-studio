#!/usr/bin/env python3
"""
React 项目信息收集脚本（增强版）
- 自动生成结构化快照报告，供 AI 分析
- 支持命令行参数灵活调整扫描范围
- 智能跳过二进制文件，避免输出污染
- 支持 TypeScript 项目 (.ts / .tsx)
- 默认包含 custom-mods 目录（用户自定义 Mod）
"""

import os
import sys
import time
import argparse
from pathlib import Path
from datetime import datetime

# ==================== 全局配置 ====================
PROJECT_ROOT = Path(__file__).parent.resolve()
OUTPUT_FILE = PROJECT_ROOT / "react_project_snapshot.txt"

# 🔧 支持的文本文件扩展名
TEXT_EXTENSIONS = {
    ".jsx", ".js", ".tsx", ".ts",
    ".css", ".html", ".json", ".md", ".txt", ".xml", ".svg"
}

# 默认忽略的目录/文件模式
SKIP_PATTERNS = {
    "node_modules", ".git", ".vite", "dist", "build",
    "archive",
    "__pycache__", ".idea", ".vs",
}

# 即使在上面的忽略列表中，这些文件也强制读取
ALWAYS_INCLUDE = {
    "package.json", "package-lock.json",
    "vite.config.js", "vite.config.ts",
    "index.html",
    "debug.ts", "editorConfig.ts"
}

# 额外保证扫描的目录（防止意外遗漏）
# 添加 custom-mods 以包含用户自定义的 Mod 文件夹
EXTRA_SCAN_DIRS = ["config", "constants", "custom-mods"]

# 文件大小上限（KB），超过则仅显示文件路径，不读取内容
MAX_FILE_SIZE_KB = 500

# 是否在报告头部显示环境信息
SHOW_ENV_INFO = True

# ==================== 工具函数 ====================
def should_skip(name: str, extra_skips: set = None) -> bool:
    """检查文件/目录是否应该跳过"""
    if extra_skips and name in extra_skips:
        return True
    return name in SKIP_PATTERNS or (name.startswith('.') and name not in {'.gitignore', '.env'})

def should_read_content(file_path: Path) -> bool:
    """判断是否应读取文件内容"""
    if file_path.name in ALWAYS_INCLUDE:
        return True
    if file_path.suffix.lower() not in TEXT_EXTENSIONS:
        return False
    try:
        size_kb = file_path.stat().st_size / 1024
        if size_kb > MAX_FILE_SIZE_KB:
            print(f"⚠️  跳过过大文件: {file_path} ({size_kb:.1f} KB)")
            return False
    except OSError:
        return False
    return True

def safe_read(file_path: Path) -> str:
    """安全读取文件内容，出错时返回错误信息"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
    except UnicodeDecodeError:
        return "[二进制文件，未显示内容]"
    except Exception as e:
        return f"[读取失败: {e}]"

def get_lang(suffix: str) -> str:
    mapping = {
        '.jsx': 'javascript',
        '.js': 'javascript',
        '.tsx': 'typescript',
        '.ts': 'typescript',
        '.css': 'css',
        '.json': 'json',
        '.html': 'html',
        '.md': 'markdown',
        '.xml': 'xml',
        '.svg': 'svg',
    }
    return mapping.get(suffix.lower(), '')

# ==================== 目录树生成 ====================
def generate_tree(root: Path, prefix="", is_last=False, root_label=None) -> list:
    lines = []
    if not root.is_dir():
        return lines

    if root_label:
        lines.append(prefix + root_label + "/")
        prefix = prefix + "    " if is_last else prefix + "│   "

    children = sorted(
        [p for p in root.iterdir() if not should_skip(p.name)],
        key=lambda x: (x.is_dir(), x.name.lower())
    )
    for i, child in enumerate(children):
        is_last_child = (i == len(children) - 1)
        connector = "└── " if is_last_child else "├── "
        lines.append(prefix + connector + child.name)

        if child.is_dir():
            extension = "    " if is_last_child else "│   "
            lines.extend(generate_tree(child, prefix + extension, is_last_child))
    return lines

def build_directory_tree(extra_dirs: list) -> list:
    tree_lines = ["(已自动排除 node_modules, .git 等目录)\n"]

    src_dir = PROJECT_ROOT / "src"
    if src_dir.exists():
        tree_lines.extend(generate_tree(src_dir, root_label="src"))
    else:
        tree_lines.append("  [警告] src 目录不存在")

    for extra in extra_dirs:
        extra_path = PROJECT_ROOT / extra
        if extra_path.exists() and extra_path.is_dir():
            tree_lines.append(f"\n### {extra}/\n")
            tree_lines.extend(generate_tree(extra_path, root_label=extra))

    return tree_lines

# ==================== 各部分收集函数 ====================
def collect_configs() -> str:
    """收集配置文件内容（同时支持 .js 和 .ts）"""
    config_files = [
        PROJECT_ROOT / "package.json",
        PROJECT_ROOT / "vite.config.js",
        PROJECT_ROOT / "vite.config.ts",
    ]
    config_dir = PROJECT_ROOT / "config"
    if config_dir.exists():
        for f in list(config_dir.glob("*.js")) + list(config_dir.glob("*.ts")):
            config_files.append(f)

    # 去重
    config_files = list(dict.fromkeys(config_files))

    content = []
    for cfg in config_files:
        if cfg.exists():
            rel = cfg.relative_to(PROJECT_ROOT)
            lang = get_lang(cfg.suffix)
            content.append(f"\n### {rel}\n```{lang}\n{safe_read(cfg)}\n```")
    return "".join(content)

def collect_entry_html() -> str:
    index_path = PROJECT_ROOT / "index.html"
    if index_path.exists():
        return f"\n### index.html\n```html\n{safe_read(index_path)}\n```"
    return "index.html 未找到"

def collect_source_files(extra_dirs: list) -> str:
    parts = []
    src_dir = PROJECT_ROOT / "src"
    if src_dir.exists():
        for file_path in sorted(src_dir.rglob("*")):
            if file_path.is_file() and not any(should_skip(p.name) for p in file_path.parents):
                if should_read_content(file_path):
                    rel = file_path.relative_to(PROJECT_ROOT)
                    lang = get_lang(file_path.suffix)
                    parts.append(f"\n### {rel}\n```{lang}\n{safe_read(file_path)}\n```")

    for extra in extra_dirs:
        extra_path = PROJECT_ROOT / extra
        if not extra_path.exists():
            continue
        for file_path in sorted(extra_path.rglob("*")):
            if file_path.is_file() and not any(should_skip(p.name) for p in file_path.parents):
                if should_read_content(file_path):
                    rel = file_path.relative_to(PROJECT_ROOT)
                    lang = get_lang(file_path.suffix)
                    parts.append(f"\n### {rel}\n```{lang}\n{safe_read(file_path)}\n```")
    return "".join(parts)

def collect_other_files() -> str:
    others = [
        PROJECT_ROOT / ".gitignore",
        PROJECT_ROOT / "README.md",
    ]
    parts = []
    for f in others:
        if f.exists():
            rel = f.relative_to(PROJECT_ROOT)
            parts.append(f"\n### {rel}\n```\n{safe_read(f)}\n```")
    return "".join(parts)

# ==================== 主报告生成 ====================
def generate_report(extra_skips: set, extra_dirs: list) -> str:
    if extra_skips:
        SKIP_PATTERNS.update(extra_skips)

    all_extra_dirs = sorted(set(EXTRA_SCAN_DIRS + extra_dirs))

    lines = []
    lines.append("=" * 80)
    lines.append("REACT FLOW 节点编辑器 - 项目快照报告")
    lines.append(f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append(f"项目路径: {PROJECT_ROOT}")
    if SHOW_ENV_INFO:
        lines.append(f"Python: {sys.version.split()[0]} | OS: {sys.platform}")
    lines.append("=" * 80)

    lines.append("\n\n## 1. 项目目录结构\n")
    lines.extend(build_directory_tree(all_extra_dirs))

    lines.append("\n\n## 2. 配置文件\n")
    lines.append(collect_configs())

    lines.append("\n\n## 3. 入口 HTML\n")
    lines.append(collect_entry_html())

    lines.append("\n\n## 4. 源代码文件\n")
    lines.append(collect_source_files(all_extra_dirs))

    lines.append("\n\n## 5. 其他文件\n")
    lines.append(collect_other_files())

    lines.append("\n\n" + "=" * 80)
    lines.append("报告结束")
    return "\n".join(lines)

# ==================== 命令行接口 ====================
def parse_args():
    parser = argparse.ArgumentParser(description="生成 React 项目快照报告")
    parser.add_argument('--skip', nargs='*', default=[],
                        help='额外忽略的目录/文件名称（空格分隔）')
    parser.add_argument('--extra', nargs='*', default=[],
                        help='额外扫描的目录名称（空格分隔）')
    parser.add_argument('--output', type=Path, default=OUTPUT_FILE,
                        help='输出文件路径（默认: react_project_snapshot.txt）')
    return parser.parse_args()

# ==================== 主入口 ====================
if __name__ == "__main__":
    args = parse_args()
    extra_skips = set(args.skip)
    extra_dirs = args.extra

    print("🔍 开始收集项目信息...")
    start_time = time.time()

    try:
        report = generate_report(extra_skips, extra_dirs)
    except Exception as e:
        print(f"❌ 报告生成失败: {e}")
        sys.exit(1)

    output_path = args.output
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(report)

    elapsed = time.time() - start_time
    print(f"✅ 报告已生成: {output_path}")
    print(f"   文件大小: {len(report)} 字符 | 耗时: {elapsed:.2f} 秒")