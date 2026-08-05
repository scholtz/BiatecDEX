#!/bin/bash
set -euo pipefail

# Generates a namespace-scoped kubeconfig for the GitHub Actions CI/CD pipeline
# (.github/workflows/deploy-stage.yml and promote-production.yml).
#
# Run this ONCE (and again whenever the token needs to be rotated) using your own
# admin kubeconfig (KUBECONFIG env var or --kubeconfig pointing at the cluster-admin
# file). It never uses or exposes the admin kubeconfig itself - it only uses it to
# create a restricted ServiceAccount/Role/RoleBinding in the "biatec" namespace and
# to mint a token for that ServiceAccount.
#
# Output: a base64 blob to paste into the GitHub repository secret KUBE_CONFIG.
#
# Requirements: access to a cluster-admin kubeconfig. The "biatec" namespace does
# not need to already exist - both deployment manifests
# (k8s/beta/deployment-beta.yaml, k8s/mainnet/deployment-main.yaml) define the
# Namespace itself, so kubectl apply creates it on first deploy.
#
# Named distinctly per-repo (github-actions-ci-biatec-dex) even though "biatec" is a
# namespace shared with other Biatec services, so this ServiceAccount/Role can never
# be confused with another repo's CI identity in the same namespace.

NAMESPACE="biatec"
SERVICE_ACCOUNT="github-actions-ci-biatec-dex"
ROLE_NAME="github-actions-ci-role-biatec-dex"
ROLE_BINDING_NAME="github-actions-ci-rolebinding-biatec-dex"
CLUSTER_ROLE_NAME="github-actions-ci-clusterrole-biatec-dex-namespace"
CLUSTER_ROLE_BINDING_NAME="github-actions-ci-clusterrolebinding-biatec-dex-namespace"
TOKEN_DURATION="720h" # 30 days - only applies when `kubectl create token` is available, see below
OUTPUT_FILE="ci-kubeconfig.yaml"
OUTPUT_FILE_B64="ci-kubeconfig.base64"
CLUSTER_IP="46.4.54.99"

echo "==> Ensuring namespace '$NAMESPACE' exists"
kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

echo "==> Creating/updating ServiceAccount '$SERVICE_ACCOUNT' in namespace '$NAMESPACE'"
kubectl create serviceaccount "$SERVICE_ACCOUNT" -n "$NAMESPACE" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "==> Creating/updating Role '$ROLE_NAME' scoped to namespace '$NAMESPACE'"
cat <<EOF | kubectl apply -f -
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: $ROLE_NAME
  namespace: $NAMESPACE
rules:
  - apiGroups: ["apps"]
    resources: ["deployments", "replicasets"]
    verbs: ["get", "list", "watch", "create", "update", "patch"]
  - apiGroups: [""]
    resources: ["pods", "pods/log"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["services"]
    verbs: ["get", "list", "watch", "create", "update", "patch"]
  - apiGroups: [""]
    resources: ["configmaps"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: ["networking.k8s.io"]
    resources: ["ingresses"]
    verbs: ["get", "list", "watch", "create", "update", "patch"]
EOF

echo "==> Binding role to service account"
kubectl create rolebinding "$ROLE_BINDING_NAME" -n "$NAMESPACE" \
  --role="$ROLE_NAME" \
  --serviceaccount="$NAMESPACE:$SERVICE_ACCOUNT" \
  --dry-run=client -o yaml | kubectl apply -f -

# k8s/beta/deployment-beta.yaml and k8s/mainnet/deployment-main.yaml embed the
# "biatec" Namespace object itself, so `kubectl apply -f` needs to GET it (client-side
# 3-way merge) even when it's already unchanged - and Namespace is cluster-scoped, so
# a namespaced Role/RoleBinding (above) can never grant access to it, no matter the
# verbs. This needs a ClusterRole + ClusterRoleBinding instead. `resourceNames`
# restricts it to exactly the "biatec" Namespace object - this identity still can't
# see, list, or touch any other namespace on the cluster. "create" is deliberately
# omitted: resourceNames can't scope create (there's no object yet to name), and the
# namespace already exists, so get/list/watch/patch/update is sufficient for apply.
echo "==> Creating/updating ClusterRole '$CLUSTER_ROLE_NAME' (get/patch of the '$NAMESPACE' Namespace object only)"
cat <<EOF | kubectl apply -f -
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: $CLUSTER_ROLE_NAME
rules:
  - apiGroups: [""]
    resources: ["namespaces"]
    resourceNames: ["$NAMESPACE"]
    verbs: ["get", "list", "watch", "patch", "update"]
EOF

echo "==> Binding cluster role to service account"
kubectl create clusterrolebinding "$CLUSTER_ROLE_BINDING_NAME" \
  --clusterrole="$CLUSTER_ROLE_NAME" \
  --serviceaccount="$NAMESPACE:$SERVICE_ACCOUNT" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "==> Minting a token for '$SERVICE_ACCOUNT'"
# `kubectl create token` needs kubectl+cluster >= 1.24. On an older cluster (or an
# older kubectl binary) it fails client-side with "unknown flag: --duration" before
# even reaching the API server. Fall back to the pre-1.24 mechanism: a Secret of
# type kubernetes.io/service-account-token, annotated to bind it to the
# ServiceAccount, which the token controller then populates automatically on every
# supported version including old ones.
BOUND_TOKEN=true
if ! TOKEN=$(kubectl create token "$SERVICE_ACCOUNT" -n "$NAMESPACE" --duration="$TOKEN_DURATION" 2>/tmp/create-token-err); then
  echo "    'kubectl create token' unavailable ($(tr -d '\n' </tmp/create-token-err)) - falling back to a long-lived Secret-based token."
  BOUND_TOKEN=false
  SECRET_NAME="${SERVICE_ACCOUNT}-token"
  cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Secret
metadata:
  name: $SECRET_NAME
  namespace: $NAMESPACE
  annotations:
    kubernetes.io/service-account.name: $SERVICE_ACCOUNT
type: kubernetes.io/service-account-token
EOF
  echo "    Waiting for the token controller to populate '$SECRET_NAME'..."
  TOKEN_B64=""
  for i in $(seq 1 30); do
    TOKEN_B64=$(kubectl get secret "$SECRET_NAME" -n "$NAMESPACE" -o jsonpath='{.data.token}' 2>/dev/null || true)
    [ -n "$TOKEN_B64" ] && break
    sleep 1
  done
  if [ -z "$TOKEN_B64" ]; then
    echo "Timed out waiting for Secret '$SECRET_NAME' to be populated with a token." >&2
    exit 1
  fi
  TOKEN=$(echo "$TOKEN_B64" | base64 -d)
fi
rm -f /tmp/create-token-err

echo "==> Reading cluster connection details from your current context"
CLUSTER_NAME=$(kubectl config view --minify -o jsonpath='{.clusters[0].name}')
CLUSTER_SERVER=$(kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}')
CLUSTER_CA=$(kubectl config view --minify --raw -o jsonpath='{.clusters[0].cluster.certificate-authority-data}')

# The current context's server is often a loopback address (e.g. https://127.0.0.1:6443)
# when kubectl is run directly on a control-plane node - unreachable from GitHub
# Actions' runners. Rewrite it to the cluster's externally-reachable address so the
# exported kubeconfig actually works from outside the host.
CLUSTER_SERVER=${CLUSTER_SERVER/127.0.0.1/$CLUSTER_IP}

echo "==> Writing restricted kubeconfig to $OUTPUT_FILE"
cat <<EOF > "$OUTPUT_FILE"
apiVersion: v1
kind: Config
current-context: $SERVICE_ACCOUNT@$NAMESPACE
clusters:
  - name: $CLUSTER_NAME
    cluster:
      server: $CLUSTER_SERVER
      certificate-authority-data: $CLUSTER_CA
contexts:
  - name: $SERVICE_ACCOUNT@$NAMESPACE
    context:
      cluster: $CLUSTER_NAME
      namespace: $NAMESPACE
      user: $SERVICE_ACCOUNT
users:
  - name: $SERVICE_ACCOUNT
    user:
      token: $TOKEN
EOF

base64 -w0 "$OUTPUT_FILE" > "$OUTPUT_FILE_B64" 2>/dev/null || base64 "$OUTPUT_FILE" > "$OUTPUT_FILE_B64"

echo
echo "Done."
echo "  - Restricted kubeconfig written to: $OUTPUT_FILE"
echo "  - Base64-encoded (paste this into the GitHub secret KUBE_CONFIG): $OUTPUT_FILE_B64"
echo
if [ "$BOUND_TOKEN" = true ]; then
  echo "This token expires in $TOKEN_DURATION (~30 days). Re-run this script before it expires"
  echo "and update the KUBE_CONFIG GitHub secret with the new value."
else
  echo "This token does NOT expire (long-lived Secret-based token, since 'kubectl create token'"
  echo "isn't available on this cluster). To rotate it: kubectl delete secret ${SERVICE_ACCOUNT}-token -n $NAMESPACE,"
  echo "then re-run this script and update the KUBE_CONFIG GitHub secret with the new value."
fi
echo
echo "IMPORTANT: delete both output files locally once the secret is uploaded - they contain"
echo "a live (if short-lived) credential."
