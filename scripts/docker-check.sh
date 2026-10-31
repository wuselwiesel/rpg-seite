#!/usr/bin/env bash
# Baut das Docker-Image wie auf dem Hetzner-Server (Coolify), startet es mit HOSTNAME=0.0.0.0 und prüft ein paar Antworten:
# Weiterleitungen müssen auf die Adresse hinter dem Proxy zeigen (nicht auf 0.0.0.0:3000), Sicherheits-Header und /api/version.
# Vorher einmal: brew install colima docker && colima start
set -euo pipefail
cd "$(dirname "$0")/.."

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker fehlt. Einmalig: brew install colima docker && colima start" >&2
  exit 2
fi
if ! docker info >/dev/null 2>&1; then
  echo "Docker läuft nicht. Mit Colima: colima start" >&2
  exit 2
fi

IMAGE=wortwinkel-check
NAME=wortwinkel-check
PORT=${DOCKER_CHECK_PORT:-3100}
ENV_FILE=.env.local
[ -f "$ENV_FILE" ] || { echo "$ENV_FILE fehlt (wird für die öffentlichen NEXT_PUBLIC_-Werte gebraucht)." >&2; exit 2; }
val() { grep -E "^$1=" "$ENV_FILE" | head -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//'; }

echo "== Image bauen =="
docker build -t "$IMAGE" \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="$(val NEXT_PUBLIC_SUPABASE_URL)" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="$(val NEXT_PUBLIC_SUPABASE_ANON_KEY)" \
  --build-arg NEXT_PUBLIC_VAPID_PUBLIC_KEY="$(val NEXT_PUBLIC_VAPID_PUBLIC_KEY)" \
  --build-arg SOURCE_COMMIT="$(git rev-parse HEAD)" .

docker rm -f "$NAME" >/dev/null 2>&1 || true
cleanup() { docker rm -f "$NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT

echo "== Starten (Port $PORT) =="
docker run -d --name "$NAME" -p "$PORT:3000" --env-file "$ENV_FILE" "$IMAGE" >/dev/null
for _ in $(seq 1 40); do
  curl -s -o /dev/null "http://127.0.0.1:$PORT/api/version" && break
  sleep 1
done

fail=0
check() { if [ "$2" = "ok" ]; then echo "OK    $1"; else echo "FAIL  $1  ($3)"; fail=1; fi; }
PROXY=(-H "X-Forwarded-Host: app.example.test" -H "X-Forwarded-Proto: https")

loc=$(curl -s -o /dev/null -w "%{redirect_url}" "${PROXY[@]}" "http://127.0.0.1:$PORT/chats")
[ "$loc" = "https://app.example.test/login" ] && check "Weiterleitung auf die Anmeldung nutzt die Proxy-Adresse" ok || check "Weiterleitung auf die Anmeldung nutzt die Proxy-Adresse" bad "$loc"

loc=$(curl -s -o /dev/null -w "%{redirect_url}" "${PROXY[@]}" "http://127.0.0.1:$PORT/switch-character?character=x&next=/chats")
[ "$loc" = "https://app.example.test/login" ] && check "/switch-character nutzt die Proxy-Adresse" ok || check "/switch-character nutzt die Proxy-Adresse" bad "$loc"

loc=$(curl -s -o /dev/null -w "%{redirect_url}" "${PROXY[@]}" "http://127.0.0.1:$PORT/wiki/zufall")
case "$loc" in *0.0.0.0*) check "/wiki/zufall ohne 0.0.0.0" bad "$loc" ;; *) check "/wiki/zufall ohne 0.0.0.0" ok ;; esac

code=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:$PORT/dev-login")
[ "$code" = "404" ] && check "/dev-login ist im Produktionsbau gesperrt" ok || check "/dev-login ist im Produktionsbau gesperrt" bad "$code"

hdr=$(curl -sI "http://127.0.0.1:$PORT/login")
echo "$hdr" | grep -qi "^x-frame-options: SAMEORIGIN" && check "Sicherheits-Header gesetzt" ok || check "Sicherheits-Header gesetzt" bad "X-Frame-Options fehlt"

ver=$(curl -s "http://127.0.0.1:$PORT/api/version")
[ "$ver" = "{\"id\":\"$(git rev-parse HEAD)\"}" ] && check "/api/version zeigt den aktuellen Commit" ok || check "/api/version zeigt den aktuellen Commit" bad "$ver"

[ "$fail" = 0 ] && echo "Alles in Ordnung." || { echo "Es gibt Fehler (Container-Protokoll: docker logs $NAME, wird beim Beenden entfernt)."; exit 1; }
