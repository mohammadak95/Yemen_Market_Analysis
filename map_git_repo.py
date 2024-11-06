#!/usr/bin/env python3
import os
import sys
import argparse
from pathlib import Path
from typing import List

try:
    import pathspec
except ImportError:
    sys.stderr.write("The 'pathspec' library is not installed. Please install it using 'pip install pathspec'\n")
    sys.exit(1)

try:
    from colorama import init
    init(autoreset=True)
except ImportError:
    sys.stderr.write("The 'colorama' library is not installed. Please install it using 'pip install colorama'\n")

def load_gitignore(root_path: Path) -> pathspec.PathSpec:
    """
    Load all .gitignore files in the repository and compile the patterns.
    """
    gitignore_patterns = []
    for gitignore_file in root_path.rglob('.gitignore'):
        with gitignore_file.open('r') as f:
            gitignore_patterns.extend(f.readlines())
    gitignore_patterns.append('project/')  # Exclude the project folder
    spec = pathspec.PathSpec.from_lines('gitwildmatch', gitignore_patterns)
    return spec

def is_ignored(path: Path, spec: pathspec.PathSpec, repo_root: Path) -> bool:
    """
    Determine if a given path is ignored based on the compiled PathSpec.
    """
    try:
        relative_path = path.relative_to(repo_root)
    except ValueError:
        # path is not relative to repo_root
        return False
    return spec.match_file(str(relative_path))

def generate_tree_lines(
    root_path: Path,
    spec: pathspec.PathSpec
) -> List[str]:
    """
    Generate a list of strings representing the directory tree.
    """
    lines = []
    def recurse(current_path: Path, current_prefix: str):
        items = sorted(item for item in current_path.iterdir() if not is_ignored(item, spec, root_path))
        for index, item in enumerate(items):
            is_last_item = index == len(items) - 1
            connector = "└── " if is_last_item else "├── "
            line = current_prefix + connector + item.name
            lines.append(line)
            if item.is_dir():
                extension = "    " if is_last_item else "│   "
                recurse(item, current_prefix + extension)
    recurse(root_path, "")
    return lines

def save_tree_to_file(lines: List[str], output_file: str):
    """
    Save the generated tree lines to a specified file.
    """
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            for line in lines:
                f.write(line + '\n')
        print(f"Repository tree saved to {output_file}")
    except Exception as e:
        sys.stderr.write(f"Error writing to file {output_file}: {e}\n")

def main():
    parser = argparse.ArgumentParser(description="Map and visualize your Git repository's structure excluding .gitignore items.")
    parser.add_argument(
        '--output',
        type=str,
        default=None,
        help='Output file to save the tree structure. If not provided, prints to console.'
    )
    args = parser.parse_args()

    repo_root = Path(os.getcwd())

    if not (repo_root / ".git").exists():
        sys.stderr.write("Error: This script must be run from the root of a Git repository.\n")
        sys.exit(1)

    # Load and compile .gitignore patterns
    spec = load_gitignore(repo_root)

    if args.output:
        print(f"Generating repository tree and saving to '{args.output}'...")
        tree_lines = generate_tree_lines(repo_root, spec)
        save_tree_to_file(tree_lines, args.output)
    else:
        tree_lines = generate_tree_lines(repo_root, spec)
        for line in tree_lines:
            print(line)

if __name__ == "__main__":
    main()
