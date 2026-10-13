# Phase 4 Cloud Run deployment contract

This is the handoff contract for the named platform owner. It is documentation, not authoritative infrastructure. Authoritative Terraform and deployment workflow changes belong in `kapetacom/kapeta-cloud-infra`, must be reviewed there, and are intentionally not part of this PR.

The decision is Cloud Run in the company `kapeta-staging` GCP project, using the provider URL and IAP directly on the service. A named platform owner is still required before provisioning or secret injection.

## Existing company patterns inspected

The `kapeta-cloud-infra` default branch was inspected read-only. Its current GCP Terraform is under `terraform/kapeta-production`, selected for staging with the `staging` workspace and `backend-staging.conf`; there is no separate `terraform/kapeta-staging` directory at the inspected revision. The platform owner must confirm whether to add this service to that workspace-selected layout or a newer staging directory before authoring infrastructure.

- `terraform/kapeta-production/stripe-webhook.tf` is the existing Cloud Run service shape. Unlike that public webhook, Studio must have no `allUsers` invoker binding.
- `terraform/kapeta-production/registries.tf` defines regional Artifact Registry repositories.
- `terraform/kapeta-production/service-accounts.tf` contains service-account and workload-identity bindings. Studio needs narrower resource-level grants than several legacy project-wide examples.
- `.github/workflows/citeotter-release-staging.yml` uses `google-github-actions/auth` with the company workload-identity provider and `github-actions@kapeta-staging.iam.gserviceaccount.com`. Pin all actions to reviewed commit SHAs, matching the infra repository convention.

## Required resources and identities

Use a dedicated Artifact Registry Docker repository or a dedicated path in the existing private staging Docker repository. The GitHub build identity needs only `roles/artifactregistry.writer` on that repository. Authenticate from GitHub with the existing workload-identity provider; do not create or store a service-account key.

Create a dedicated Cloud Run runtime service account for Studio. It needs no project-wide role. Grant it `roles/secretmanager.secretAccessor` on exactly the CiteOtter Basic-auth secret and no other secret. Cloud Run itself must have no unauthenticated invoker. Grant only the deployment identity the minimum Cloud Run deployment and service-account act-as permissions required by the reviewed workflow.

Create the CiteOtter credential in Secret Manager outside Terraform state. The secret payload is the raw `username:password` pair. Mount one version as a read-only file, for example `/var/run/secrets/citeotter/basic-auth`; do not expose it as an environment variable.

Configure IAP directly on the Cloud Run service. Grant `roles/iap.httpsResourceAccessor` to the company Google Group selected by the platform owner. IAP owns authorisation; Studio verifies the signed assertion's signature, issuer, audience, expiry, subject and email as defence in depth. Record the service's IAP OAuth audience exactly as emitted by Google.

## Runtime configuration

Set these server-only environment variables:

| Name | Value |
|---|---|
| `CITEOTTER_UPSTREAM_URL` | The public HTTPS CiteOtter staging origin, with no credential or path suffix. |
| `CITEOTTER_BASIC_AUTH_FILE` | The mounted secret file path. |
| `CITEOTTER_TIMEOUT_MS` | Optional; 30,000 by default, bounded to 1,000–300,000. |
| `IAP_AUDIENCE` | The exact audience for this IAP-protected Cloud Run service. |

Cloud Run supplies `PORT`; the image listens on it as a non-root user. Do not set any of these as `NEXT_PUBLIC_*`. Do not enable `STUDIO_LOCAL_AUTH_BYPASS` in production.

Use liveness against `/healthz`. It is intentionally local, never calls CiteOtter, and returns only `{"status":"ok"}`. Use `/readyz` for operational readiness; it makes a bounded authenticated request to CiteOtter `/healthz` and reports only `{"ready":true|false}`. Keep both endpoints unavailable to the public at the Cloud Run/IAP layer even though application proxy matching exempts them for platform probes.

Disable request-body and header logging. Never log `Authorization`, `x-goog-iap-jwt-assertion`, request bodies, secret file contents, upstream response bodies on failure, or the upstream URL. Default Cloud Run request metadata logging is acceptable after verifying it contains none of those values.

## Exact platform-owner sequence

1. Name the platform owner and the company Google Group that may access the preview.
2. Confirm the authoritative staging Terraform location. Work only through a reviewed `kapeta-cloud-infra` PR and its CI-only apply path; do not apply Terraform locally.
3. Enable or confirm the Artifact Registry, Cloud Run, Secret Manager and IAP APIs in `kapeta-staging`.
4. Provision the private Artifact Registry location and grant repository-scoped writer access to the GitHub workload-identity deployment service account.
5. Create the dedicated runtime service account with no broad project roles.
6. Create the Secret Manager secret out of band, add the Basic-auth value as a secret version, and grant that runtime account `secretAccessor` on this one secret only.
7. Provision the Cloud Run service with no unauthenticated invoker, the runtime service account, the read-only secret file mount, the four runtime variables above, and the image pinned by digest.
8. Enable IAP directly on the Cloud Run service. Grant the company group `roles/iap.httpsResourceAccessor`; do not grant individuals unless the platform owner records the exception.
9. Capture the generated provider URL and IAP audience. Update `IAP_AUDIENCE`, deploy a new revision if required, and verify the revision is healthy before shifting all traffic.
10. Add the pinned GitHub Actions workflow that authenticates through workload identity, builds with `studio-next/Dockerfile`, pushes the immutable commit image, resolves its digest, and deploys that digest. No long-lived JSON key or repository secret is permitted for GCP authentication.
11. Run the smoke procedure below. Only after every check passes may Phase 4 step 2 add `live-gateway`, the deployment evidence, and the Phase 4 receipt.

## Build and smoke procedure

From the common parent directory containing both `Import Studio/` and `Import.io design system/`, build the production image with the tested commit:

```sh
docker build --build-arg GITHUB_SHA="$GITHUB_SHA" --file "Import Studio/studio-next/Dockerfile" --tag "$IMAGE" .
```

After deployment:

1. Request the provider URL with no identity and confirm access is blocked by IAP.
2. Authenticate as a member of the approved Google Group and request `/healthz`; expect HTTP 200 and only `{"status":"ok"}`.
3. Request `/readyz`; expect HTTP 200 and `{"ready":true}`. A 503 must stop the rollout.
4. POST to `/api/engine/smoke/extract` with one approved public HTTPS page, at most ten requested records, and no sensitive page content. Expect a successful CiteOtter task response.
5. Repeat with an HTTP URL, a private/loopback URL, two pages, and eleven records; each must be rejected before CiteOtter is called.
6. Check Cloud Run logs for the smoke request and verify there is no request body, Basic credential, `Authorization` header, IAP assertion, upstream URL or upstream failure body.
7. Inspect the browser's loaded JavaScript and network responses; verify none contains `CITEOTTER_UPSTREAM_URL`, `CITEOTTER_BASIC_AUTH_FILE`, `IAP_AUDIENCE`, the secret path or the credential value.
8. Record the image digest, service revision, provider URL, authenticated smoke timestamp, anonymous rejection result and tested commit SHA for the Phase 4 receipt.

Do not make live calls until the named owner has provisioned the infrastructure and injected the secret. This implementation PR creates neither resource and performs no deployment.
