#!/usr/bin/env python3
"""Validate public project metadata and common accidental disclosure patterns.

Uses Python's standard library and Git. Does not inspect Git history, ignored
untracked files, binary contents, licenses, or runtime behavior.
"""

import ipaddress
import json
import re
import subprocess
import sys
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parents[1]
REQUIRED_FIELDS = {
    "schemaVersion", "slug", "title", "description", "status",
    "technologies", "codeLicense", "demo", "tags",
}
SLUG = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
SENSITIVE_SUFFIXES = {".pem", ".key", ".p12", ".pfx"}
PRIVATE_ROOTS = {"private", "research", "notes", "tmp"}
PATTERNS = {
    "local machine path": re.compile(r"(?:/Users/|/home/)[A-Za-z0-9_.-]+/|[A-Za-z]:\\Users\\"),
    "local file or conversation link": re.compile(r"(?:file|thread)://|codex:/{2}threads/"),
    "private key": re.compile(r"-----BEGIN (?:[A-Z0-9]+ )?PRIVATE KEY-----"),
    "GitHub token": re.compile(r"\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b"),
    "OpenAI token": re.compile(r"\bsk-(?:proj|svcacct)-[A-Za-z0-9_-]{20,}\b"),
    "AWS access key": re.compile(r"\b(?:AKIA|ASIA)[A-Z0-9]{16}\b"),
}


def public_files():
    result = subprocess.run(
        ["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
        cwd=ROOT, check=True, stdout=subprocess.PIPE,
    )
    return sorted(set(Path(p.decode("utf-8")) for p in result.stdout.split(b"\0") if p))


def check_metadata(directory, errors):
    label = directory.relative_to(ROOT).as_posix()
    for filename in ("README.md", "INTEGRATE.md", "project.json", "ATTRIBUTION.md"):
        path = directory / filename
        if not path.is_file() or path.is_symlink():
            errors.append(f"{label}: missing regular file {filename}")
    manifest = directory / "project.json"
    if not manifest.is_file() or manifest.is_symlink():
        return
    try:
        data = json.loads(manifest.read_text(encoding="utf-8"))
    except (ValueError, OSError) as exc:
        errors.append(f"{label}: invalid project.json ({type(exc).__name__})")
        return
    if not isinstance(data, dict):
        errors.append(f"{label}: project.json must be an object")
        return
    if set(data) != REQUIRED_FIELDS:
        errors.append(f"{label}: project.json fields must match the documented schema")
    if type(data.get("schemaVersion")) is not int or data.get("schemaVersion") != 1:
        errors.append(f"{label}: schemaVersion must be 1")
    if not SLUG.fullmatch(directory.name) or data.get("slug") != directory.name:
        errors.append(f"{label}: slug must match a lowercase hyphenated directory name")
    for key in ("title", "description"):
        if not isinstance(data.get(key), str) or not data[key].strip():
            errors.append(f"{label}: {key} must be a nonempty string")
    if data.get("status") not in ("in-progress", "ready", "archived"):
        errors.append(f"{label}: invalid status")
    technologies = data.get("technologies")
    if not isinstance(technologies, list) or any(
        not isinstance(item, str) or not item.strip() for item in technologies
    ):
        errors.append(f"{label}: technologies must be an array of nonempty strings")
    tags = data.get("tags")
    if not isinstance(tags, list) or any(
        not isinstance(tag, str) or not tag.strip() or tag != tag.lower() or len(tag) > 24
        for tag in tags
    ):
        errors.append(f"{label}: tags must be lowercase labels of 1 to 24 characters")
    elif len(tags) != len(set(tags)):
        errors.append(f"{label}: tags must be unique")
    if data.get("codeLicense") != "MIT":
        errors.append(f"{label}: original codeLicense must be MIT")
    demo = data.get("demo")
    if demo is not None:
        valid_demo = False
        if isinstance(demo, str):
            try:
                url = urlparse(demo)
                hostname = url.hostname or ""
                valid_demo = (
                    url.scheme == "https" and bool(hostname) and bool(url.netloc)
                    and not url.username and not url.password
                    and not any(character.isspace() for character in demo)
                    and hostname != "localhost"
                    and not hostname.endswith((".localhost", ".local"))
                )
                _ = url.port  # Reject malformed port numbers.
                try:
                    valid_demo = valid_demo and ipaddress.ip_address(hostname).is_global
                except ValueError:
                    valid_demo = valid_demo and "." in hostname
            except ValueError:
                pass
        if not valid_demo:
            errors.append(f"{label}: demo must be a public HTTPS URL or null")
    if data.get("status") == "ready":
        for filename, marker in (
            ("README.md", "Replace this template"),
            ("ATTRIBUTION.md", "Inventory not completed"),
            ("INTEGRATE.md", "Replace this template"),
        ):
            path = directory / filename
            if path.is_file() and not path.is_symlink():
                try:
                    if marker in path.read_text(encoding="utf-8"):
                        errors.append(f"{label}: complete {filename} before marking ready")
                except UnicodeDecodeError:
                    errors.append(f"{label}: {filename} must be UTF-8 text")


def main():
    errors = []
    binary_files = []
    try:
        files = public_files()
    except (subprocess.CalledProcessError, OSError, UnicodeDecodeError):
        print("ERROR: run this check in a Git checkout with UTF-8 file names.", file=sys.stderr)
        return 1
    for relative in files:
        path = ROOT / relative
        label = relative.as_posix()
        if not path.exists() and not path.is_symlink():
            continue  # A tracked file removed in the working tree is not published content.
        if path.is_symlink() or not path.is_file():
            errors.append(f"{label}: symlinks, submodules, and special files require explicit review")
            continue
        if relative.parts[0] in PRIVATE_ROOTS:
            errors.append(f"{label}: private working directory included in publication files")
        if path.suffix.lower() in SENSITIVE_SUFFIXES or (
            (path.name == ".env" or path.name.startswith(".env."))
            and path.name not in (".env.example", ".env.template")
        ):
            errors.append(f"{label}: credential or environment file included")
        raw = path.read_bytes()
        try:
            content = raw.decode("utf-8")
            if b"\0" in raw:
                raise UnicodeDecodeError("utf-8", raw, 0, 1, "binary data")
        except UnicodeDecodeError:
            binary_files.append(label)
            continue
        for description, pattern in PATTERNS.items():
            if pattern.search(content):
                errors.append(f"{label}: possible {description}; review and remove private data")
    projects_root = ROOT / "projects"
    project_dirs = sorted({
        ROOT / "projects" / item.parts[1]
        for item in files if len(item.parts) > 2 and item.parts[0] == "projects"
    })
    if not projects_root.is_dir():
        errors.append("projects/: missing project directory")
    for directory in project_dirs:
        if directory.is_dir() and not directory.is_symlink():
            check_metadata(directory, errors)
    for filename in binary_files:
        print(f"REVIEW: binary contents not scanned: {filename}")
    for message in errors:
        print(f"ERROR: {message}", file=sys.stderr)
    if errors:
        print(f"Failed with {len(errors)} issue(s).", file=sys.stderr)
        return 1
    print(f"Passed: {len(files)} publication files; {len(project_dirs)} project(s); "
          f"{len(binary_files)} binary file(s) need manual review.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
