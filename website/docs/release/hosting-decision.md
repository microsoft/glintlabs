# Hosting decision

> Historical staging record. The original options and status below are retained
> for provenance. The approved current architecture is a public GitHub Pages
> reader with authenticated Studio remaining local; see the
> [integration decision](../migration/integration.md#scope-and-provenance).
> The earlier "no production host" status does not describe the current reader.

## Status

No production host is selected. A product owner, service owner, security
reviewer, and official repository maintainer must approve the decision before
deployment configuration or production secrets are added.

## Runtime requirements

This is not a static-only site:

- it uses Next.js server rendering and Node.js route handlers;
- publication APIs accept authenticated requests up to 50 MB;
- staging and approval write report manifests and assets to the local
  filesystem;
- owner authentication uses `GLINT_LABS_OWNER_KEY` or a machine-local key; and
- published previews currently use machine-local filesystem storage.

GitHub Pages and static-only hosting are therefore not valid for the full
Publishing Studio. The public reader could be separated into a static artifact
later, but that is a different architecture and must preserve the publishing,
integrity, and approval contract.

## Options to evaluate

| Option | Fit | Decisions required |
|---|---|---|
| Azure App Service | Runs the Next.js Node server and supports deployment slots | Durable storage replacement, managed identity, Key Vault, network/security baseline, scaling, health checks |
| Azure Container Apps | Explicit container/runtime control and revision rollback | Container build, persistent object/database storage, ingress, identity, observability, cold-start expectations |
| Vercel | Native Next.js preview workflow and managed deployments | Microsoft tenant/procurement approval, regional/data requirements, function body limits, durable storage replacement, secret ownership |
| Split reader and Studio | Public reader on static/edge hosting; authenticated Studio/API on Azure | Two deployment pipelines, signed publication transfer, origin/CORS policy, operational ownership, end-to-end rollback |

Do not use local disk as the durable production publication store. Select an
approved object store and metadata store, then adapt the existing storage
interfaces without weakening content-integrity validation.

## Required environments

| Environment | Purpose | Data and access |
|---|---|---|
| Development | Local engineering and generated test content | No production secrets or customer data |
| Pull request preview | Review the exact official-repository commit | Non-production content; authenticated when unpublished material is present |
| Staging | Release candidate, accessibility and operational validation | Production-like configuration with non-production secrets and storage |
| Production | Public approved site | Only reviewed content; least-privilege deployment and runtime identities |

## Decision criteria

The approved record must name:

- service and incident owner;
- domain and DNS owner;
- data classification, residency, retention, and deletion policy;
- persistent publication storage and backup strategy;
- secret store, rotation owner, and access-review cadence;
- preview authentication and unpublished-content boundary;
- deployment approval and separation of duties;
- body-size, execution-time, scaling, and availability requirements;
- logging, privacy scrubbing, telemetry, alerting, and support expectations;
- cost center and capacity plan; and
- disaster recovery objective and dependency failure behavior.

## Deployment and rollback gate

1. Build once from the reviewed official-repository commit.
2. Promote the same immutable artifact through preview, staging, and
   production; do not rebuild from a different source revision.
3. Run smoke, accessibility, content-integrity, and link checks in staging.
4. Require explicit release approval after the official pull request merges.
5. Keep the previous known-good artifact and compatible content schema.
6. Roll back application and content independently when possible.
7. Verify health, primary routes, report integrity, and publication reads after
   deployment or rollback.

Production deployment remains blocked until this record identifies the chosen
option, owners, storage design, security review, domain, secrets, monitoring,
and rollback procedure.
