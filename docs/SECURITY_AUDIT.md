# Security Audit — Study-Group

**Assessment date:** 2026-10-27
**Scope:** Next.js App Router/API, session handling, group/task/resource authorization, upload storage, realtime transport, dependency lockfile, and the associated regression tests. This is a source review and automated dependency scan—not a third-party penetration test or formal compliance assessment.

## Executive summary

The review found object-level authorization gaps around group tasks and several group-scoped resources/focus operations, plus unsafe cross-group message replies. These have been corrected and regression cases added. The authenticated API wrapper now rejects browser requests marked cross-site or carrying a mismatched `Origin`/`Referer`; session JWT configuration requires at least 32 UTF-8 bytes. New Blob writes are private and downloads proxy through server-side authorization. Realtime connections use short-lived one-use group tickets, strict origins, membership revalidation, minimal HMAC-authenticated invalidations, and REST as the source of truth.

The final full-tree and production-only `npm audit` runs after the compatible package updates and scoped overrides reported **0 critical, high, moderate, or low advisories**. That result is a point-in-time registry scan; it does not prove that application code is vulnerability-free. Important operational risks remain: old public Blob URLs are not retroactively revoked, the Next.js login/AI/quiz limits are process-local, Redis Pub/Sub is not durable, and quiz scoring trusts a client-supplied correctness flag.

## What was reviewed

The source pass covered central auth/API wrappers, group membership helpers, group creation/join/invites, task listing/create/update/delete/comments, resources/bookmarks/uploads, focus logs/rooms, message replies and mutations, the new realtime ticket/publisher/service, package metadata/lockfile, and API/realtime E2E coverage. Existing user changes and database state were preserved; no production migration, deploy, push, or commit was performed.

## Findings and remediations

| Finding | Impact | Status / fix |
|---|---|---|
| Group task list and mutation could use creator/assignee identity without rechecking current group membership; task assignees were not constrained to the group. | A former member or outsider could learn or alter group-task data through direct assignment/creator shortcuts. | **Fixed.** `scope=mine` includes group tasks only for current memberships. Group-task PATCH/DELETE require current membership before role/creator/assignee checks. Create and reassignment require any group assignee to be a current member. E2E coverage includes nonmember assignment and removed-member access. |
| Resource listing/bookmarks and ungrouped file reads did not consistently constrain results by group membership or uploader ownership. | Unauthorized access to group material or another user's uploaded file. | **Fixed.** Resource queries are visibility-scoped; group bookmarks require membership; ungrouped file bookmarks/downloads require the uploader; reads are private/no-store. |
| Blob upload objects were public and clients could receive provider URLs. | Anyone who obtained a direct object URL could bypass app authorization. | **Fixed for new objects.** New writes use private access and server-side reads are proxied only after app ACL checks. **Legacy caveat:** older public Blob URLs remain publicly fetchable until each object is migrated/rotated; code changes cannot revoke already exposed provider URLs. |
| Group-attributed focus logs and focus-room task references lacked sufficient relationship checks; rejected nonhost transitions could mutate participant state before denial. | Cross-group data association and rejected-request side effects. | **Fixed.** Caller must belong to group; task-room group/solo association is validated; host/state authorization occurs before participant writes. |
| Message replies could refer to a message outside the current group. | Cross-group parent content could be exposed in a reply response. | **Fixed.** Parent must be non-deleted and in the same group. |
| Private group self-join/discovery and return-path handling were incomplete. | Private group access confusion and unsafe external redirect potential. | **Fixed.** Private groups require invite links, join endpoint rejects new private joins, invite creation/preview/accept/revocation are scoped, and login return targets are same-origin relative paths. |
| Browser session requests had no central same-origin/Fetch Metadata gate. | Cookie-authenticated cross-site mutation risk. | **Mitigated.** `withUser` rejects `Sec-Fetch-Site: cross-site` and mismatched supplied Origin/Referer; SameSite=Lax remains. Header-less non-browser clients remain allowed, and there is no synchronizer CSRF token. E2E includes an attacker-origin mutation regression. |
| Realtime event/ticket boundary. | Unauthorized group subscription or forged internal invalidation could reveal presence/trigger sync. | **Hardened.** Short-lived 60-second group-scoped HS256 tickets, one-use IDs, exact HTTP(S) origin allowlist, membership checks at connect and about every 10 seconds, 2 KiB client frame limit, typing throttling, and timestamped HMAC-SHA256 publication. Socket invalidations contain no message body. Ticket expiry limits handshake only; established sockets remain until disconnect/revocation. |
| Dependency advisories in the prior lockfile. | Known vulnerable framework/transitive packages. | **Remediated at scan time.** Next.js 15.5.28 / eslint-config-next 15.5.28; Prisma and Prisma Client aligned to 6.19.3; Zod 4.6.7; Blob SDK 2.4.0; `ws` 8.22.0. Compatible vulnerable transitive packages were updated; scoped overrides pin `postcss` 8.5.28 under Next and `deepmerge-ts` 8.0.2 under `@prisma/config`. Prisma schema validation/client generation and `npm audit` were rerun. Revalidate these overrides whenever the parent packages change.

## Dependency scan evidence

The baseline `npm audit` reported 1 critical, 18 high, and 1 moderate issue across the full tree; production-only reported 1 critical and 11 high. Safe compatible updates first removed the issues with available non-major fixes. Two remaining advisories were due to versions pinned under Next.js and Prisma config; scoped, compatibility-tested overrides resolved them without forcing Next 16 or Prisma 7. The final post-dedupe runs against the active lockfile returned:

| Scan | Critical | High | Moderate | Low | Total |
|---|---:|---:|---:|---:|---:|
| Full dependency tree | 0 | 0 | 0 | 0 | 0 |
| Production-only (`--omit=dev`) | 0 | 0 | 0 | 0 | 0 |

These counts are from the npm registry database at the assessment time and can change. Run both audit modes in CI/deployment and review any newly required major update rather than blindly applying `npm audit fix --force`.

## Residual risks and production actions

1. **Legacy public Blob objects:** enumerate existing file resources, migrate each object to private access, update storage metadata if needed, and rotate/revoke previously shared provider URLs. Keep this as a data migration with backups; it was intentionally not performed here.
2. **Application rate limiting:** the Next.js login/AI/quiz limiters use process memory; serverless instances and concurrent regions have independent counters. Use a distributed atomic limiter before exposing high-volume public traffic, and review trusted proxy configuration for the derived client IP. Separately, the persistent realtime companion uses Redis-backed atomic limits shared by its replicas; those limits do not cover Next.js API routes.
3. **Quiz score integrity:** `POST /api/quiz` currently trusts client-provided `isCorrect` flags. Derive correctness on the server from a trusted answer key or label these results as client-reported before using them for high-stakes analytics.
4. **Shared focus-room completion policy:** any participant can currently complete the shared room. Confirm whether only the host should end it; code comments and observed behavior leave this product policy ambiguous.
5. **Realtime operations and delivery:** horizontal realtime replicas are supported when they share a healthy Redis endpoint and namespace. Redis Pub/Sub is best-effort rather than durable; clients must retain REST reconciliation to recover missed invalidations. Confirm managed Redis HA, latency, failover, and cluster compatibility and run load/failure tests before production scale-out. Redis failure makes the companion unready and distributed coordination fails closed.
6. **CSRF defense depth:** the central origin/Fetched Metadata checks and SameSite=Lax cookie reduce browser CSRF; the app does not use a synchronizer token. If supporting cross-origin browser clients later, define explicit allowed origins and a deliberate credential/CSRF design rather than weakening this guard.
7. **Operational assurance:** no external penetration test, browser matrix, load test, or production provider credential test was performed. Use a staging environment and disposable database for end-to-end release validation.

## Verification status

Final verification on 2026-10-27: full and production-only `npm audit` both reported **0 advisories**; `npm run lint`, `npm run type-check`, `npx prisma validate`, `npx prisma generate`, `npm run test:realtime` (**9/9**, using the disposable Redis endpoint), `npm run test:e2e` (**195 passed, 0 failed** against disposable PostgreSQL 16), `npm run build`, JavaScript syntax checks, and `git diff --check` passed. During final continuation, lint/type-check, Prisma validation, the Redis suite (**9/9**), and the production build were rerun successfully after the Redis readiness hardening and the docs/lockfile updates. Firefox browser smoke confirmed login and authenticated dashboard API calls, no console errors/warnings, and no horizontal overflow at 390×844; registration labels were programmatically associated. The initial browser check caught an origin-guard false positive, which was fixed and retested. The scratch app/database and exact E2E upload artifacts were cleaned up. The build still reports future deprecation notices for Prisma's `package.json#prisma` setting and Next's `next lint` command; neither prevented verification.

## References

- [Architecture and production operations](ARCHITECTURE.md)
- [REST API reference](API.md)
- [Environment variable example](../.env.example)
