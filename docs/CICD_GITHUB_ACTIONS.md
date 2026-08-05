# CI/CD via GitHub Actions

Three workflows under `.github/workflows/`:

| Workflow | Trigger | What it does |
|---|---|---|
| `deploy-stage.yml` | push to `main` (or manual) | Builds `docker/Dockerfile`, pushes `scholtz2/biatec-dex:<version>-beta`, deploys to **stage** (`beta.dex.biatec.io`). |
| `promote-production.yml` | manual only | Re-tags an already-built stage image as `-main` (no rebuild) and deploys it to **production** (`dex.biatec.io`). |
| `generate-screenshots.yml` | manual only | Builds/pushes `scholtz2/biatec-dex-docs:latest` (help screenshots), consumed by `docker/Dockerfile`'s `docs` build stage. |

This replaces the previous flow, which SSH'd into a personal host and ran
`deploy-beta.sh` there (`git pull` + `docker/compose-beta.sh` (`docker
build`/`docker push`) + `sed` the image tag into the checked-in manifest +
`k8s/beta/update-config.sh` (`kubectl apply` + configmap recreate + rollout
restart), all executed on that host over SSH). None of that happens on any host
anymore — the GitHub Actions runner builds/pushes the image itself and talks to the
Kubernetes API directly via a kubeconfig secret. `deploy-beta.sh` (and the old
production equivalent, `deploy.sh`) are no longer used and can be deleted from that
host once these workflows are verified.

Image tag naming is unchanged: `1.<year>.<month>.<day>-beta` for stage (e.g.
`1.2026.08.06-beta`), and the same version suffixed `-main` for production once
promoted (e.g. `1.2026.08.06-main`) — exactly what `deploy-beta.sh`/`deploy.sh`
produced before.

## How the two environments relate

- **stage** (`beta.dex.biatec.io`) is deployed **automatically** on every push to
  `main`. This is the only place new code is built from source.
- **production** (`dex.biatec.io` / `www.dex.biatec.io`) is **never built from
  source**. `promote-production.yml` takes the exact image already running on
  stage (`docker pull` the `-beta` tag, `docker tag`/`docker push` it as `-main`)
  and deploys that. This guarantees production always runs pixel-for-pixel what was
  verified on stage — never a fresh rebuild that could differ if `main` moved on in
  the meantime.
- Run `promote-production.yml` from the Actions tab once a stage deploy has been
  checked out on `beta.dex.biatec.io` and is ready to ship. Leave its `version`
  input empty to promote whatever `k8s/beta/deployment-beta.yaml` currently has
  deployed (the latest stage tag); pass an explicit version (e.g. `1.2026.08.05`)
  to promote an older, already-verified stage build instead.

## GitHub Environments

Both deploy jobs run under a GitHub **Environment** (`stage` / `production`
respectively, via `environment:` in the workflow), so you can optionally attach
protection rules (e.g. required reviewers before a production deploy runs) later
without any workflow changes. Create both under **Settings → Environments** before
first use — see below for what each needs.

## Required GitHub Secrets

Today both environments share the same three secrets — set these as **repository**
secrets (**Settings → Secrets and variables → Actions → Secrets**), since one
Docker Hub account and one Kubernetes cluster/namespace serve both:

| Secret | Used by | Purpose |
|---|---|---|
| `DOCKERHUB_USER` | `deploy-stage`, `promote-production`, `generate-screenshots` | Docker Hub username to push `scholtz2/biatec-dex*` images. |
| `DOCKERHUB_TOKEN` | `deploy-stage`, `promote-production`, `generate-screenshots` | Docker Hub access token (Account Settings → Security → New Access Token) for the user above. |
| `KUBE_CONFIG` | `deploy-stage`, `promote-production` | **Base64-encoded** kubeconfig with write access to the `biatec` namespace (Deployments, Services, Ingresses, ConfigMaps). Generate it with `k8s/create-token.sh` (see below) rather than reusing a personal/admin kubeconfig. |

If you'd rather stage and production use different Kubernetes credentials (e.g.
stricter RBAC for production), add a `KUBE_CONFIG` secret inside the `production`
Environment itself — an Environment-scoped secret of the same name silently takes
priority over the repository-level one for jobs running under that Environment, so
no workflow changes are needed to adopt this later.

### Generating `KUBE_CONFIG`

Run `k8s/create-token.sh` once (and again whenever the token needs rotating) with
your own cluster-admin kubeconfig active:

```bash
KUBECONFIG=/path/to/admin-kubeconfig ./k8s/create-token.sh
```

It creates a namespace-scoped ServiceAccount (`github-actions-ci-biatec-dex`) with
just enough RBAC to manage this app's Deployments/Services/Ingresses/ConfigMaps in
the `biatec` namespace, mints a 30-day bound token for it, and writes
`ci-kubeconfig.base64` — paste that into the `KUBE_CONFIG` secret. **Delete
`ci-kubeconfig.yaml`/`ci-kubeconfig.base64` locally afterward** — they contain a
live (if short-lived) credential. The token expires in ~30 days; re-run the script
and update the secret before then.

`biatec` is a namespace shared with other Biatec services (e.g.
AlgorandGoogleDriveAccount's BiatecMCP/BiatecOIDC) — the script names its
ServiceAccount/Role distinctly per-repo (`*-biatec-dex`) so it can never be
confused with another repo's CI identity in the same namespace.

## One-time cluster prerequisites

- Nothing needs to pre-exist: both `k8s/beta/deployment-beta.yaml` and
  `k8s/mainnet/deployment-main.yaml` define the `biatec` Namespace themselves, so
  the first `kubectl apply` in either workflow creates it if missing.
- DNS for `beta.dex.biatec.io`, `dex.biatec.io`, and `www.dex.biatec.io` must point
  at the ingress-nginx load balancer IP before the first deploy, so cert-manager can
  issue TLS certificates for them.
- `scholtz2/biatec-dex-docs:latest` must exist before the **first** `deploy-stage`
  or `promote-production` run — `docker/Dockerfile` pulls it in a build stage.
  Run `generate-screenshots.yml` manually first if it doesn't exist yet.

## Manifests updated by these workflows

- `k8s/beta/deployment-beta.yaml` (stage image tag) — updated by `deploy-stage.yml`
- `k8s/mainnet/deployment-main.yaml` (production image tag) — updated by
  `promote-production.yml`

Each workflow commits its own manifest change back to `main` with `[skip ci]` so
the checked-in YAML always reflects what's actually deployed, then applies it with
`kubectl apply`.
