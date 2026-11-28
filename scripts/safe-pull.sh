#!/usr/bin/env bash
# `git pull --ff-only` that does not stop on files the app writes by itself.
#
# Some commands rewrite files that are also kept in the repo: `npm run track-record:import`
# (docs/validation/recorded-verdicts.json), `npm run docs:methods` and `npm run docs:track-record`
# (docs/METHODS.md, docs/TRACK_RECORD.md), `npm run docs:glossary`, `npm run docs:licences`, and
# the feed and council recorders (tests/fixtures/). A local copy of any of them makes `git pull`
# stop. Before pulling, this copies those files to data/local/backups/before-pull-<time>/ and puts
# them back to the version in the repo, so the pull goes through. Nothing is deleted: each one is
# in the backup folder, and the commands that made them can run again on the new code.
#
# Any other file you changed is left exactly as it is and named; if it blocks the pull, the pull
# stops and says so, and the code already here is used.
#
# Use: source scripts/safe-pull.sh; safe_pull   (returns 0 when up to date or updated, 1 if not)
#      bash scripts/safe-pull.sh                 (the same, on its own)

# Files and folders the app writes by itself (paths from the repo root).
SAFE_PULL_GENERATED=(
  docs/METHODS.md
  docs/TRACK_RECORD.md
  docs/GLOSSARY.md
  docs/DATA_LICENCES.md
  docs/validation/recorded-verdicts.json
  tests/fixtures
)

# Prints the generated files with local changes (changed, deleted or new), one per line.
safe_pull_generated_changes() {
  {
    git diff --name-only HEAD -- "${SAFE_PULL_GENERATED[@]}" 2>/dev/null
    git ls-files --others --exclude-standard -- "${SAFE_PULL_GENERATED[@]}" 2>/dev/null
  } | sort -u
}

# Prints other files you changed (tracked files only; new files of yours do not block a pull
# unless the update adds a file with the same name, and then git names it).
safe_pull_other_changes() {
  local gen
  gen="$(printf '%s\n' "${SAFE_PULL_GENERATED[@]}")"
  git diff --name-only HEAD 2>/dev/null | while IFS= read -r f; do
    local skip=0
    while IFS= read -r g; do
      case "$f" in "$g" | "$g"/*) skip=1 ;; esac
    done <<<"$gen"
    [ "$skip" = 0 ] && echo "$f"
  done
}

safe_pull() {
  local root stamp backup moved=0 f
  root="$(git rev-parse --show-toplevel 2>/dev/null)" || { echo "Not a git folder; skipping git pull."; return 1; }
  cd "$root" || return 1

  # A release pinned for the term (npm run class:setup; src/utils/classRelease.ts): keep this code
  # through the last day of the term, so a class sees the same app all term.
  local pin="${DATA_DIR:-$root/data}/local/class-release.json"
  if [ -f "$pin" ] && node -e 'const p=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));const t=new Date().toISOString().slice(0,10);process.exit(/^\d{4}-\d{2}-\d{2}$/.test(p.until||"")&&t<=p.until?0:1)' "$pin" 2>/dev/null; then
    echo "Pinned for the term (until $(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).until)' "$pin")): keeping this code; no git pull. npm run class:setup -- --unpin ends the pin early."
    return 0
  fi

  local changed
  changed="$(safe_pull_generated_changes)"
  if [ -n "$changed" ]; then
    stamp="$(date +%Y%m%d-%H%M%S)"
    backup="data/local/backups/before-pull-${stamp}"
    mkdir -p "$backup"
    while IFS= read -r f; do
      [ -z "$f" ] && continue
      if [ -e "$f" ]; then
        mkdir -p "$backup/$(dirname "$f")"
        cp -p "$f" "$backup/$f"
      fi
      if git ls-files --error-unmatch -- "$f" >/dev/null 2>&1; then
        git checkout -q HEAD -- "$f"
      else
        rm -f -- "$f"
      fi
      moved=$((moved + 1))
    done <<<"$changed"
    echo "Put ${moved} file(s) the app wrote back to the repo version, so the update can go through."
    echo "Your copies are in ${backup}/ (run the command that made them again on the new code if you need them)."
  fi

  local other
  other="$(safe_pull_other_changes)"
  if [ -n "$other" ]; then
    echo "Files you changed (left as they are):"
    printf '%s\n' "$other" | sed 's/^/  /'
  fi

  if git pull --ff-only; then
    return 0
  fi
  echo
  echo "git pull stopped (see the reason above and 'git status')."
  [ -n "$other" ] && echo "If it names one of your files above: keep a copy, then 'git checkout -- <file>' and run this again."
  return 1
}

# Run on its own: bash scripts/safe-pull.sh
if [ "${BASH_SOURCE[0]}" = "$0" ]; then
  safe_pull
fi
