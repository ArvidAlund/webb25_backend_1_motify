#!/usr/bin/env python3
"""
Generate text files containing all source code from frontend and backend.
Output: frontend_code.txt and backend_code.txt (in tools/)
Each file lists code broken up by file path for use in course material prompting.
"""

import os
from pathlib import Path

# Project root (parent of tools/)
PROJECT_ROOT = Path(__file__).resolve().parent.parent
OUTPUT_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = PROJECT_ROOT / "frontend"
BACKEND_DIR = PROJECT_ROOT / "backend"

# File extensions to include per project
FRONTEND_EXTENSIONS = {".jsx", ".js", ".css", ".html", ".json"}
BACKEND_EXTENSIONS = {".js"}

# Paths/patterns to skip
SKIP_DIRS = {"node_modules", ".git", "__pycache__", "dist", "build"}
SKIP_FILES = {"package-lock.json"}


def collect_files(base_dir: Path, extensions: set[str]) -> list[Path]:
    """Collect source files from directory, sorted by path."""
    files = []
    for root, dirs, filenames in os.walk(base_dir):
        # Skip excluded directories
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for name in filenames:
            if name in SKIP_FILES:
                continue
            path = Path(root) / name
            if path.suffix in extensions:
                files.append(path)
    return sorted(files)


def format_section(rel_path: str, content: str) -> str:
    """Format a file section with clear separator."""
    sep = "=" * 72
    return f"\n{sep}\n{rel_path}\n{sep}\n\n{content.rstrip()}\n"


def dump_code(base_dir: Path, extensions: set[str]) -> str:
    """Dump all code from a directory into a single string."""
    lines = []
    files = collect_files(base_dir, extensions)
    for path in files:
        try:
            content = path.read_text(encoding="utf-8", errors="replace")
        except Exception as e:
            content = f"# Error reading file: {e}\n"
        rel_path = str(path.relative_to(base_dir))
        lines.append(format_section(rel_path, content))
    return "".join(lines).lstrip()


def main():
    os.chdir(PROJECT_ROOT)

    # Frontend
    frontend_code = dump_code(FRONTEND_DIR, FRONTEND_EXTENSIONS)
    (OUTPUT_DIR / "frontend_code.txt").write_text(frontend_code, encoding="utf-8")
    print(f"Wrote tools/frontend_code.txt ({len(frontend_code)} chars)")

    # Backend: .js + .env.example
    backend_files = collect_files(BACKEND_DIR, BACKEND_EXTENSIONS)
    env_example = BACKEND_DIR / ".env.example"
    if env_example.exists():
        backend_files.append(env_example)
        backend_files.sort(key=str)
    backend_content = []
    for path in backend_files:
        try:
            content = path.read_text(encoding="utf-8", errors="replace")
        except Exception as e:
            content = f"# Error reading file: {e}\n"
        rel_path = str(path.relative_to(BACKEND_DIR))
        backend_content.append(format_section(rel_path, content))
    backend_code = "".join(backend_content).lstrip()
    (OUTPUT_DIR / "backend_code.txt").write_text(backend_code, encoding="utf-8")
    print(f"Wrote tools/backend_code.txt ({len(backend_code)} chars)")


if __name__ == "__main__":
    main()
