#!/bin/bash
set -euo pipefail
ARK_SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$ARK_SCRIPT_DIR/../vendor/dream-skin/macos/scripts/common-macos.sh"
action="$1"; port="$2"; ark_state="$3"
[[ "$port" =~ ^[0-9]+$ ]] && [ "$port" -ge 1024 ] && [ "$port" -le 65535 ] || exit 2
STATE_ROOT="$ark_state"; START_ERROR_LOG="$ark_state/start-error.log"; APP_LOG="$ark_state/app.log"; APP_ERROR_LOG="$ark_state/app-error.log"
CODEX_APP_JOB_LABEL="com.arktheme.codex.app"
discover_codex_app
if [ "$action" = "verify" ]; then verify_macos_app_signature quick; else verify_macos_app_signature; fi
case "$action" in
 discover) printf '{"discovered":true}\n';;
 verify) verified_cdp_endpoint "$port" || exit 3; printf '{"verified":true}\n';;
 launch)
  codex_is_running && { printf 'Close Codex normally before enhanced launch.\n' >&2; exit 4; }
  port_is_available "$port" || exit 5
  ensure_state_root
  launch_codex_with_cdp "$port"
  printf '%s\n' "$port" > "$ark_state/codex-launch.port"
  printf '{"launched":true}\n';;
 restore)
  [ "$(cat "$ark_state/codex-launch.port")" = "$port" ] || exit 6
  verified_cdp_endpoint "$port" || exit 7
  quit_codex_for_restart
  port_is_available "$port" || exit 8
  launch_codex_normally
  rm "$ark_state/codex-launch.port"
  printf '{"restored":true,"portClosed":true}\n';;
 *) exit 2;;
esac
