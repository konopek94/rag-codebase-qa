#!/usr/bin/env bash
# PostToolUse hook (Edit|Write|MultiEdit). When the edited file is backend/src/**/*.ts, run its
# Vitest file (itself if it is a test, else a sibling <name>.test.ts) and the backend typecheck.
# Exit 2 sends the failure output on stderr back to the agent; anything else exits 0 silently.
#
# The typecheck covers the whole project, so an edit that breaks another file is caught too.

input=$(cat)
if command -v jq >/dev/null 2>&1; then
  file=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty')
else
  file=$(printf '%s' "$input" | node -e '
    let s = "";
    process.stdin.on("data", (d) => (s += d)).on("end", () => {
      try { process.stdout.write(JSON.parse(s).tool_input?.file_path ?? ""); } catch {}
    });')
fi

root="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
backend="$root/backend"
[[ "$file" == /* ]] || file="$root/$file"

case "$file" in
  "$backend"/src/*.ts) ;;
  *) exit 0 ;;
esac
[[ -f "$file" ]] || exit 0

if [[ ! -x "$backend/node_modules/.bin/tsc" ]]; then
  echo "backend-check: backend/node_modules missing, run 'cd backend && npm install'" >&2
  exit 0
fi

cd "$backend" || exit 0
rel="${file#"$backend"/}"
if [[ "$rel" == *.test.ts ]]; then test_file="$rel"; else test_file="${rel%.ts}.test.ts"; fi

failed=0
report=""

if [[ -f "$test_file" ]]; then
  if ! out=$(./node_modules/.bin/vitest run "$test_file" 2>&1); then
    failed=1
    report+="vitest run $test_file failed:"$'\n'"$out"$'\n\n'
  fi
fi

if ! tsc_errors=$(./node_modules/.bin/tsc --noEmit --pretty false -p . 2>&1); then
  failed=1
  report+="tsc --noEmit errors:"$'\n'"$tsc_errors"$'\n'
fi

if [[ $failed -eq 1 ]]; then
  printf 'backend-check failed for %s\n\n%s' "$rel" "$report" >&2
  exit 2
fi
exit 0
