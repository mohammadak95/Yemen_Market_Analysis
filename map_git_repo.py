#!/usr/bin/env python3

import os
import sys
import argparse
import subprocess
from pathlib import Path
from typing import List, Tuple, Dict

try:
    import pathspec
except ImportError:
    sys.exit("The 'pathspec' library is not installed. Please install it using 'pip install pathspec'")

try:
    from colorama import Fore, Style, init
    init(autoreset=True)
    COLORAMA_AVAILABLE = True
except ImportError:
    COLORAMA_AVAILABLE = False
    sys.stderr.write("The 'colorama' library is not installed. Please install it using 'pip install colorama'\n")
    sys.exit(1)
try:
    from tabulate import tabulate
    TABULATE_AVAILABLE = True
except ImportError:
    TABULATE_AVAILABLE = False

def load_gitignore(root_path: Path) -> pathspec.PathSpec:
    """
    Load all .gitignore files in the repository and compile the patterns.
    """
    gitignore_patterns = []
    for gitignore_file in root_path.rglob('.gitignore'):
        with gitignore_file.open('r') as f:
            gitignore_patterns.extend(f.readlines())

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

def get_git_info(file_path: Path) -> Tuple[str, str]:
    """
    Retrieve the last commit message and date for a given file.
    """
    try:
        # Get the last commit hash that modified the file
        commit_hash = subprocess.check_output(
            ['git', 'log', '-n', '1', '--pretty=format:%H', '--', str(file_path)],
            stderr=subprocess.DEVNULL
        ).decode('utf-8').strip()

        if not commit_hash:
            return ("No commits", "N/A")

        # Get the commit date
        commit_date = subprocess.check_output(
            ['git', 'show', '-s', '--format=%ci', commit_hash],
            stderr=subprocess.DEVNULL
        ).decode('utf-8').strip()

        # Get the commit message
        commit_message = subprocess.check_output(
            ['git', 'show', '-s', '--format=%s', commit_hash],
            stderr=subprocess.DEVNULL
        ).decode('utf-8').strip()

        return (commit_message, commit_date)
    except subprocess.CalledProcessError:
        return ("Untracked or no commits", "N/A")

def get_git_status(file_path: Path) -> str:
    """
    Retrieve the Git status of a given file.
    """
    try:
        status = subprocess.check_output(
            ['git', 'status', '--porcelain', str(file_path)],
            stderr=subprocess.DEVNULL
        ).decode('utf-8').strip()

        if not status:
            return "Unmodified"
        else:
            # Interpret Git status codes
            status_code = status[:2]
            status_dict = {
                '??': 'Untracked',
                'M ': 'Modified',
                'MM': 'Modified',
                'A ': 'Added',
                'AM': 'Added and Modified',
                'D ': 'Deleted',
                'R ': 'Renamed',
                'C ': 'Copied',
                'U ': 'Updated but Unmerged'
            }
            return status_dict.get(status_code, status_code)
    except subprocess.CalledProcessError:
        return "Unknown"

def print_tree(
    current_path: Path,
    spec: pathspec.PathSpec,
    git_info: bool,
    repo_root: Path,
    prefix: str = "",
    is_last: bool = True
):
    """
    Recursively print the directory tree.
    """
    print(f"Processing directory: {current_path}")  # Debug print
    items = sorted(item for item in current_path.iterdir() if not is_ignored(item, spec, repo_root))
    print(f"Items in directory: {items}")  # Debug print

    for index, item in enumerate(items):
        is_last_item = index == len(items) - 1
        connector = "└── " if is_last_item else "├── "
        print(prefix + connector + item.name, end='')

        if git_info and item.is_file():
            commit_msg, commit_date = get_git_info(item)
            status = get_git_status(item)
            if COLORAMA_AVAILABLE:
                if status == "Modified":
                    color = Fore.YELLOW
                elif status == "Untracked":
                    color = Fore.RED
                elif status == "Unmodified":
                    color = Fore.GREEN
                else:
                    color = Fore.WHITE
                print(f" [{color}Status: {status}{Style.RESET_ALL}] [Last Commit: {commit_msg} on {commit_date}]")
            else:
                print(f" [Status: {status}] [Last Commit: {commit_msg} on {commit_date}]")
        else:
            print()

        if item.is_dir():
            extension = "    " if is_last_item else "│   "
            print_tree(item, spec, git_info, repo_root, prefix + extension, is_last_item)

def generate_tree_lines(
    root_path: Path,
    spec: pathspec.PathSpec,
    git_info: bool
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

            if git_info and item.is_file():
                commit_msg, commit_date = get_git_info(item)
                status = get_git_status(item)
                line += f" [Status: {status}] [Last Commit: {commit_msg} on {commit_date}]"

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
        '--git-info',
        action='store_true',
        help='Include Git commit information and status for each file.'
    )
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
        tree_lines = generate_tree_lines(repo_root, spec, args.git_info)
        save_tree_to_file(tree_lines, args.output)
    else:
        print("Printing repository tree to terminal...")  # Debug print
        print_tree(repo_root, spec, args.git_info, repo_root)

if __name__ == "__main__":
    main()
