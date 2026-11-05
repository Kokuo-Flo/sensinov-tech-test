#!/usr/bin/env bash
# Stop hook — quality gate. Refuses to let an agent finish while `npm run <script>` is not green.
# Usage (agent frontmatter): require-green.sh validate | check
#
# Cost control:
# - runs once, when the agent stops (never per edit);
# - skipped when the working tree is identical to the last green run (fingerprint of HEAD + diff + untracked files);
#   a green `check` also covers `validate` (superset);
# - second stop attempt (stop_hook_active=true) is let through so the agent reports `regressed.` instead of looping.
set -uo pipefail

script="${1:?npm script name required}"
input="$(cat)"

if [ "$(printf '%s' "$input" | jq -r '.stop_hook_active // false')" = "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel)}" || exit 0

stamp_dir="node_modules/.cache/quality-gate"
fingerprint="$(
  {
    git rev-parse HEAD 2>/dev/null
    git diff HEAD --binary 2>/dev/null
    git ls-files --others --exclude-standard -z | xargs -0 -r sha256sum
  } | sha256sum | cut -d' ' -f1
)"

for green in "$script" check; do
  if [ "$(cat "$stamp_dir/$green.ok" 2>/dev/null)" = "$fingerprint" ]; then
    exit 0
  fi
done

if output="$(npm run --silent "$script" 2>&1)"; then
  mkdir -p "$stamp_dir"
  printf '%s' "$fingerprint" > "$stamp_dir/$script.ok"
  exit 0
fi

{
  echo "Quality gate failed: \`npm run $script\` is not green (errors or warnings). Fix every issue before finishing — never suppress a rule or relax a config."
  echo "--- last 60 lines ---"
  printf '%s\n' "$output" | tail -60
} >&2
exit 2
