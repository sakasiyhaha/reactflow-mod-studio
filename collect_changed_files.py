#!/usr/bin/env python3
"""
变更文件收集脚本 - 基于 Git 差异，生成仅包含改动文件的快照报告
用于 AI 分析时只关注本次修改，避免输入整个项目。

用法:
    python collect_changed_files.py                    # 生成 changed_files_report.txt
    python collect_changed_files.py --since HEAD~1     # 对比 HEAD~1 到 HEAD
    python collect_changed_files.py --compare HEAD~2 HEAD  # 比较两个提交
    python collect_changed_files.py --format list      # 仅列出文件名（打印到控制台）
    python collect_changed_files.py --output mydiff.txt   # 自定义输出文件
"""

import os
import sys
import subprocess
import argparse
from pathlib import Path
from datetime import datetime

PROJECT_ROOT = Path(__file__).parent.resolve()

# 需要读取内容的文本扩展名（排除 .svg 等大文件）
TEXT_EXTENSIONS = {
    ".js", ".jsx", ".ts", ".tsx", ".d.ts", ".d.tsx",
    ".css", ".scss", ".less",
    ".html", ".json", ".md", ".txt", ".xml",
    ".yaml", ".yml", ".py",
}

# 忽略的目录/文件（与快照脚本保持一致，并增加脚本自身和报告文件）
SKIP_NAMES = {
    "node_modules", ".git", "dist", "build", "archive",
    "__pycache__", ".idea", ".vscode",
    "collect_changed_files.py",
    "changed_files_report.txt",
    "react_project_snapshot.txt",
}

def should_skip(path_str: str) -> bool:
    """检查路径是否应被忽略（目录或文件名匹配）"""
    path = Path(path_str)
    # 检查路径中的每一部分（目录名、文件名）
    for part in path.parts:
        if part in SKIP_NAMES:
            return True
    return False

def get_git_diff(target1="HEAD", target2=None, staged=False):
    """
    获取 Git 差异文件列表及状态
    返回: [(状态, 文件路径), ...]
    状态: A(新增), M(修改), D(删除), R(重命名)
    """
    if staged:
        cmd = ["git", "diff", "--cached", "--name-status"]
    else:
        if target2:
            cmd = ["git", "diff", "--name-status", target1, target2]
        else:
            cmd = ["git", "diff", "--name-status", target1]
    try:
        output = subprocess.check_output(cmd, cwd=PROJECT_ROOT, text=True).strip()
        if not output:
            return []
        lines = output.splitlines()
        changes = []
        for line in lines:
            if not line:
                continue
            parts = line.split("\t")
            status = parts[0]
            path = parts[1]
            if should_skip(path):
                continue
            changes.append((status, path))
        return changes
    except subprocess.CalledProcessError as e:
        print(f"❌ Git 命令失败: {e}", file=sys.stderr)
        return []

def get_untracked_files():
    """获取未跟踪的文件列表（仅列出，不包含内容）"""
    try:
        output = subprocess.check_output(["git", "ls-files", "--others", "--exclude-standard"], cwd=PROJECT_ROOT, text=True).strip()
        if not output:
            return []
        files = []
        for f in output.splitlines():
            if should_skip(f):
                continue
            files.append(f)
        return files
    except subprocess.CalledProcessError:
        return []

def should_include_content(file_path):
    """判断文件是否应输出内容（文本文件、非过大）"""
    path = Path(file_path)
    if path.suffix.lower() not in TEXT_EXTENSIONS:
        return False
    try:
        size_kb = path.stat().st_size / 1024
        if size_kb > 300:  # 300KB 限制，同快照脚本
            return False
    except OSError:
        return False
    return True

def read_file_safe(file_path):
    """安全读取文件内容"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        return f"[读取失败: {e}]"

def generate_report(changes, untracked, output_format="full"):
    """生成变更报告"""
    lines = []
    lines.append("=" * 80)
    lines.append("项目变更文件快照报告")
    lines.append(f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append(f"项目路径: {PROJECT_ROOT}")
    lines.append("=" * 80)

    if output_format == "list":
        lines.append("\n## 变更文件列表\n")
        for status, path in changes:
            lines.append(f"{status}\t{path}")
        for path in untracked:
            lines.append(f"?\t{path}")
        return "\n".join(lines)

    # full 模式：输出详细内容
    lines.append("\n## 变更文件详情\n")
    for status, path in changes:
        full_path = PROJECT_ROOT / path
        lines.append(f"\n### [{status}] {path}")
        if status == 'D':
            lines.append("```\n[文件已删除，内容不可恢复]\n```")
            continue
        if not full_path.exists():
            lines.append("```\n[文件不存在，可能已被重命名或删除]\n```")
            continue
        if should_include_content(full_path):
            lang = get_lang(full_path.suffix)
            lines.append(f"```{lang}")
            lines.append(read_file_safe(full_path))
            lines.append("```")
        else:
            lines.append("```\n[二进制文件或过大文件，内容未显示]\n```")

    if untracked:
        lines.append("\n## 未跟踪的文件\n")
        for path in untracked:
            full_path = PROJECT_ROOT / path
            lines.append(f"\n### ? {path}")
            if should_include_content(full_path):
                lang = get_lang(full_path.suffix)
                lines.append(f"```{lang}")
                lines.append(read_file_safe(full_path))
                lines.append("```")
            else:
                lines.append("```\n[内容未显示]\n```")

    lines.append("\n" + "=" * 80)
    lines.append("报告结束")
    return "\n".join(lines)

def get_lang(suffix):
    """简单映射语言标识"""
    mapping = {
        '.js': 'javascript', '.jsx': 'javascript',
        '.ts': 'typescript', '.tsx': 'typescript', '.d.ts': 'typescript',
        '.css': 'css', '.scss': 'scss', '.less': 'less',
        '.html': 'html', '.json': 'json', '.md': 'markdown',
        '.txt': 'text', '.py': 'python', '.sh': 'bash',
        '.yaml': 'yaml', '.yml': 'yaml',
    }
    return mapping.get(suffix.lower(), '')

def parse_args():
    parser = argparse.ArgumentParser(description="收集 Git 变更文件并生成报告")
    group = parser.add_mutually_exclusive_group()
    group.add_argument('--since', type=str, help='比较范围：例如 HEAD~1，表示从该提交到 HEAD')
    group.add_argument('--compare', nargs=2, metavar=('COMMIT1', 'COMMIT2'), help='比较两个提交')
    parser.add_argument('--staged', action='store_true', help='显示已暂存但未提交的变更')
    parser.add_argument('--format', choices=['list', 'full'], default='full', help='输出格式')
    parser.add_argument('--output', type=Path, help='输出文件路径，不指定则根据格式自动选择')
    args = parser.parse_args()
    return args

def main():
    args = parse_args()
    if args.staged:
        changes = get_git_diff(staged=True)
        untracked = []
    elif args.since:
        changes = get_git_diff(args.since, "HEAD")
        untracked = get_untracked_files()
    elif args.compare:
        changes = get_git_diff(args.compare[0], args.compare[1])
        untracked = []
    else:
        changes = get_git_diff("HEAD")
        untracked = get_untracked_files()

    if not changes and not untracked:
        print("✅ 没有检测到任何变更文件。")
        return

    report = generate_report(changes, untracked, output_format=args.format)

    # 决定输出位置
    if args.output:
        output_path = args.output
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(report)
        print(f"✅ 变更报告已保存到: {output_path}")
    elif args.format == 'list':
        # list 模式默认打印到控制台
        print(report)
    else:
        # 默认输出到文件
        default_output = PROJECT_ROOT / "changed_files_report.txt"
        with open(default_output, 'w', encoding='utf-8') as f:
            f.write(report)
        print(f"✅ 变更报告已保存到默认文件: {default_output}")

if __name__ == "__main__":
    main()