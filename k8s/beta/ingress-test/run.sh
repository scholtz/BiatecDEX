#!/usr/bin/env bash
# Verifies the ingress rules of k8s/beta/deployment-beta.yaml against a REAL ingress-nginx, in a throwaway kind cluster:
# the DEX app and the Biatec Chat backend are replaced by two tiny fakes that echo what they receive.
#
#   k8s/beta/ingress-test/run.sh            # creates the cluster, runs the checks, deletes the cluster
#   KEEP=1 k8s/beta/ingress-test/run.sh     # keeps the cluster for poking at (kind delete cluster --name biatec-dex-ingress)
#
# Needs: docker, kind, kubectl, curl, python3. About three minutes (images are pulled the first time). It refuses to run
# against a cluster that already exists (REUSE=1 to do it anyway: it then installs ingress-nginx and the fakes into it
# and leaves them there).
# What it proves (it is the evidence behind chatIngress.test.ts, which only pins the text of the manifest):
#   - /chat and everything below it reaches the chat backend with the FULL path, query, Host and Origin/Cookie (the backend,
#     not the ingress, decides what it answers there), and server-sent events are not buffered;
#   - everything else on the host (including /chatty, /chat-x, /chat1 and the like) still reaches the DEX app;
#   - another host is not routed.
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MANIFEST="$DIR/../deployment-beta.yaml"
CLUSTER="${CLUSTER:-biatec-dex-ingress}"
CTX="kind-$CLUSTER"
PORT="${PORT:-8088}"
INGRESS_NGINX="${INGRESS_NGINX:-controller-v1.12.1}"
WORK="$(mktemp -d)"
CREATED=0
# Git Bash on Windows runs native kind/kubectl/python: they need Windows paths. Elsewhere this is a no-op.
native() { if command -v cygpath >/dev/null 2>&1; then cygpath -m "$1"; else printf '%s' "$1"; fi; }
# Only a cluster this run created is deleted: one that already existed (CLUSTER=...) is left alone.
trap 'rm -rf "$WORK"; if [ "$CREATED" = 1 ] && [ "${KEEP:-0}" != 1 ]; then kind delete cluster --name "$CLUSTER" >/dev/null 2>&1 || true; fi' EXIT

k() { kubectl --context "$CTX" "$@"; }
fail=0
check() { # check <description> <expected substring> <actual>
  if [[ "$3" == *"$2"* ]]; then echo "ok:   $1"; else echo "FAIL: $1 (wanted '$2', got '${3:0:160}')"; fail=1; fi
}
get() { curl -s -m 10 -H 'Host: beta.dex.biatec.io' "http://127.0.0.1:$PORT$1" | head -1; }

echo "== cluster"
cat > "$WORK/kind.yaml" <<EOF
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
name: $CLUSTER
nodes:
  - role: control-plane
    kubeadmConfigPatches:
      - |
        kind: InitConfiguration
        nodeRegistration:
          kubeletExtraArgs:
            node-labels: "ingress-ready=true"
    extraPortMappings:
      - {containerPort: 80, hostPort: $PORT, protocol: TCP}
EOF
if kind get clusters 2>/dev/null | grep -qx "$CLUSTER"; then
  [ "${REUSE:-0}" = 1 ] || { echo "The kind cluster $CLUSTER already exists; delete it (kind delete cluster --name $CLUSTER), pick another CLUSTER, or set REUSE=1." >&2; exit 1; }
else
  CREATED=1 # before the attempt: a create that fails halfway must not leave its cluster behind
  kind create cluster --config "$(native "$WORK/kind.yaml")" --wait 120s >/dev/null
fi
k apply -f "https://raw.githubusercontent.com/kubernetes/ingress-nginx/$INGRESS_NGINX/deploy/static/provider/kind/deploy.yaml" >/dev/null
k -n ingress-nginx rollout status deployment/ingress-nginx-controller --timeout=240s >/dev/null
# The existing DEX ingress uses the regex path /(.*) with pathType Prefix, which a STRICT admission webhook (default since
# ingress-nginx 1.8) rejects; the production controller accepts it, so strictness is switched off here for that one object.
k -n ingress-nginx patch cm ingress-nginx-controller --type merge -p '{"data":{"strict-validate-path-type":"false"}}' >/dev/null

echo "== manifest under test: the file as it is, minus what needs a real cluster (Namespace, Deployment, TLS secret, cert-manager)"
python3 - "$(native "$MANIFEST")" "$(native "$WORK/under-test.yaml")" <<'PY'
import re, sys
src = open(sys.argv[1], encoding="utf-8").read()
docs = [d for d in re.split(r"\n---\s*\n", src) if d.strip()]
out = []
for d in docs:
    if re.search(r"^kind: (Namespace|Deployment)$", d, re.M):
        continue
    d = re.sub(r"\n  tls:\n    - hosts:\n        - beta\.dex\.biatec\.io\n      secretName: tls-beta\.dex\.biatec\.io", "", d)
    d = re.sub(r"\n    cert-manager\.io/cluster-issuer: [^\n]+", "", d)
    out.append(d)
result = "\n---\n".join(out)
# The stripping must really have happened and nothing else may have changed: fail loudly if the manifest was reformatted.
assert not re.search(r"^kind: (Namespace|Deployment)$", result, re.M), "Namespace/Deployment still present"
assert "tls:" not in result and "cert-manager.io" not in result, "TLS block or cert-manager annotation still present"
assert len(out) == len(docs) - 2, f"expected to drop exactly the Namespace and the Deployment ({len(docs)} -> {len(out)})"
assert "biatec-dex-beta-chat" in result and "biatec-chat-backend" in result, "the chat Ingress or Service is missing"
open(sys.argv[2], "w", encoding="utf-8", newline="\n").write(result)
PY
k apply -f "$(native "$DIR/fakes.yaml")" >/dev/null
# The admission webhook may not answer for a moment after the controller became ready, and the config reload takes a few seconds.
for attempt in 1 2 3 4 5 6; do k apply -f "$(native "$WORK/under-test.yaml")" >/dev/null 2>&1 && break || sleep 5; done
k apply -f "$(native "$WORK/under-test.yaml")" >/dev/null
k -n biatec rollout status deploy/fake-dex --timeout=180s >/dev/null
k -n biatec-chat-stage rollout status deploy/fake-chat --timeout=180s >/dev/null
# Wait until both routes answer (the controller reloads nginx after the ingresses appear), at most about a minute.
for attempt in $(seq 1 30); do
  [[ "$(get /)" == DEX-APP* && "$(get /chat/session/probe)" == CHAT-BACKEND* ]] && break
  sleep 2
done

echo "== the chat backend (full path kept)"
for p in /chat/session/probe /chat/chat/messages "/chat/auth/login?req=1&nonce=a+b" /chat/public/chat \
         /chat/.well-known/evidence-jwks.json "/chat/session/probe?x=%20y" /chat /chat/ /chat/health /chat/contracts; do
  check "$p reaches the chat backend with its full path" "CHAT-BACKEND method=GET path=$p host=beta.dex.biatec.io" "$(get "$p")"
done
check "/CHAT/session/probe (the regex is case-insensitive; the backend answers it with a 404)" "CHAT-BACKEND method=GET path=/CHAT/session/probe" "$(get /CHAT/session/probe)"
check "POST keeps Origin and Cookie" "origin=https://beta.dex.biatec.io cookie=__Host-biatec_session=abc" \
  "$(curl -s -m 10 -X POST -H 'Host: beta.dex.biatec.io' -H 'Origin: https://beta.dex.biatec.io' -H 'Cookie: __Host-biatec_session=abc' --data '{}' "http://127.0.0.1:$PORT/chat/chat/messages")"
check "no forwarded prefix is added" "xfp=None" "$(get /chat/session/probe)"

echo "== the DEX app"
for p in / /markets /assets/x.js /chatty /chat-x /chat1 /chatx/chat/session /static/chat/session "/?q=chat"; do
  check "$p stays with the DEX app" "DEX-APP path=$p host=beta.dex.biatec.io" "$(get "$p")"
done

echo "== server-sent events are not buffered (events about a second apart, not all at the end)"
# The fake backend sends four events one second apart. Buffered, they would all arrive together at the end; streamed, the
# first and the last are about three seconds apart. One process reads the stream and stamps each event as it arrives, so the
# measurement itself adds no delay between events.
read -r count spread_ms < <(python3 - "$PORT" <<'PY'
import http.client, sys, time
conn = http.client.HTTPConnection("127.0.0.1", int(sys.argv[1]), timeout=20)
conn.request("GET", "/chat/chat/stream", headers={"Host": "beta.dex.biatec.io"})
resp = conn.getresponse()
stamps = []
while True:
    line = resp.readline()  # decodes the chunked body and returns b'' at its end
    if not line:
        break
    if line.strip():
        stamps.append(time.monotonic())
print(len(stamps), int((stamps[-1] - stamps[0]) * 1000) if stamps else 0)
PY
)
CR=$(printf '\r'); count="${count%"$CR"}"; spread_ms="${spread_ms%"$CR"}" # a native python prints CRLF on Windows
if [ "${count:-0}" -ge 4 ] && [ "${spread_ms:-0}" -ge 2000 ]; then echo "ok:   $count events over ${spread_ms} ms"; else echo "FAIL: the stream was buffered or cut (${count:-0} events over ${spread_ms:-0} ms)"; fail=1; fi

echo "== another host"
check "an unknown host is not routed" "404" "$(curl -s -o /dev/null -w '%{http_code}' -H 'Host: other.example' "http://127.0.0.1:$PORT/chat/session/probe")"

[ "$fail" = 0 ] && echo "ALL CHECKS PASSED" || { echo "SOME CHECKS FAILED"; exit 1; }
