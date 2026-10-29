#!/usr/bin/env python3
"""Check local publication data without printing rejected addresses or secrets."""
import argparse
import os
from pathlib import Path
import re
import subprocess
import sys


def git(*args, check=True):
    return subprocess.run(['git', *args], capture_output=True, check=check).stdout


def noreply(value):
    return bool(re.fullmatch(r'[^@\s<>]+@users\.noreply\.github\.com', value.strip(), re.I))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--staged', action='store_true')
    parser.add_argument('--history', action='store_true')
    args = parser.parse_args()
    root = Path(git('rev-parse', '--show-toplevel').decode().strip())
    os.chdir(root)
    failures = []
    # Resolve the effective identities, including environment overrides.
    for kind in ['GIT_AUTHOR_IDENT', 'GIT_COMMITTER_IDENT']:
        ident = git('var', kind).decode()
        match = re.search(r'<([^<>]+)>', ident)
        if not match or not noreply(match.group(1)):
            failures.append(kind + ': use a GitHub noreply email (value hidden)')
    private = set()
    for key in ['user.email', 'author.email', 'committer.email']:
        for line in git('config', '--global', '--get-all', key, check=False).decode().splitlines():
            if '@' in line and not noreply(line):
                private.add(line.strip().casefold())
    for key in ['GIT_AUTHOR_EMAIL', 'GIT_COMMITTER_EMAIL']:
        value = os.environ.get(key, '')
        if '@' in value and not noreply(value):
            private.add(value.casefold())
    if args.staged:
        paths = git('diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z').split(b'\0')
    else:
        paths = git('ls-files', '-z').split(b'\0')
    forbidden_dirs = {'node_modules', '.venv', '__pycache__', 'vendor', 'tokenizer-cache', 'state'}
    secrets = re.compile(r'(?:gh[opusr]_[A-Za-z0-9]{25,}|github_pat_[A-Za-z0-9_]{40,}|sk-[A-Za-z0-9_-]{32,})')
    loopback = re.compile(r'http://127\.0\.0\.1:\d+/\?key=[A-Za-z0-9_-]+')
    checked = 0
    for raw in filter(None, paths):
        name = os.fsdecode(raw)
        path = Path(name)
        if forbidden_dirs.intersection(path.parts) or path.name.startswith('.env') or path.suffix.lower() in {'.pem', '.key', '.p12', '.pfx'}:
            failures.append(name + ': private or generated file type')
            continue
        data = git('show', ':' + name) if args.staged else (root / path).read_bytes()
        text = data.decode('utf-8', errors='replace')
        reasons = []
        if any(value in text.casefold() for value in private):
            reasons.append('private email from local configuration')
        home = str(Path.home())
        if home != '/' and home in text:
            reasons.append('personal home path')
        if secrets.search(text):
            reasons.append('credential pattern')
        if loopback.search(text):
            reasons.append('live loopback preview link')
        if reasons:
            failures.append(name + ': ' + ', '.join(reasons) + ' (values hidden)')
        checked += 1
    if args.history:
        for line in git('log', '--all', '--format=%ae%x00%ce', check=False).decode().splitlines():
            if any(not noreply(email) for email in line.split('\0')):
                failures.append('Commit history contains a non-noreply identity (value hidden)')
                break
    if failures:
        print('Privacy check failed:', file=sys.stderr)
        for message in failures:
            print('- ' + message, file=sys.stderr)
        return 1
    print('Privacy check passed: %d files; GitHub noreply identities; no rejected private values.' % checked)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
