# Global loading incident — 2026-09-06

The Android screenshot shows 01:49 Uruguay (04:49 UTC). Production logs confirm an interruption at that time; a fresh browser working afterward did not disprove the report.

## Evidence

- Workflow `34011803666` finished building Nitro at 04:48:07, swapped output at 04:48:19, and reloaded both PM2 workers by 04:48:24. Its first stable health check did not pass until 04:52:25.
- Nginx completed no frontend responses between 04:48:34 and 04:50:22 (108 seconds). The surrounding window had six 502s and five 499s, with upstream resets. There were no missing Nuxt assets in that window. Backend health still answered at 04:49:02.
- Disk measurements at 04:50 showed 17 blocked processes and 173 ms average device wait. CPU was not exhausted and there was no observed OOM. The sampling does not identify a particular process as the cause of disk pressure.
- Separately, the public homepage and widget still sent `max-age=31536000`, even on a fresh CDN miss. The origin sent zero: Cloudflare's zone Browser Cache TTL had been set to one year.
- The service worker bound its navigation fallback to `/`, absent from the SSR build's precache. Executing the real Workbox code reproduced `non-precached-url` before its runtime routes registered.

## Changes

- Cloudflare **Browser Cache TTL → Respect Existing Headers**, applied to `cambio-uruguay.com` at approximately 05:02 UTC. Verified on public HIT responses: homepage `max-age=0, s-maxage=3600`; widget `max-age=0, s-maxage=300`. Static assets retain their immutable cache headers. This setting is external to Git.
- The custom Nitro entry renders `/acerca` inside its **own** instance **before opening the listening socket**; only then can it accept requests and send PM2 `ready`. `wait_ready` alone does not prevent an already-listening worker from receiving traffic. A shared-port HTTP probe could accidentally warm another worker. Graceful shutdown receives 35 seconds, covering Nitro's 30-second drain.
- Before swapping output, the deploy boots the exact candidate with IPC on a separate local port, requires readiness and a complete SSR response, and fails while leaving the live output in place if that check fails. Scheduled jobs are disabled in this probe. PM2's listen timeout alone is not a failed-deploy rollback: it can retire the old process when the timeout expires.
- The deploy retains the previous generation's lazy server chunks through the rolling reload. A manifest records only each build's own chunks, preventing inherited generations from accumulating or overwriting current code.
- Homepage rate calls stop after 2.5 seconds with no retry; optional FAQ context stops after 1.5 seconds. Existing deterministic fallbacks remain available when upstream services hang.
- PWA navigation fallback is explicitly disabled for SSR. Only the exact public, same-origin Bankos discount endpoint is cached; the former generic API rule is removed so fixing initialization cannot enable caching of private responses.

## Verification

Regression tests exercise actual hanging HTTP upstreams, generated Workbox execution, PM2 readiness/error/body completion, and three generations of server chunks. Production verification must include mobile navigation with an active service worker, actual public cache headers, and requests across the deployment window.

Local production build passed. Booting that exact artifact through `check-staging.cjs` rendered SSR in 806 ms **before** listening on port 13311, passed the HTTP/content check, and shut down cleanly. The complete app suite passed: 5,327 tests, with 10 skipped (including two POSIX signal cases that run on Ubuntu CI). Changed JavaScript/TypeScript passed ESLint; both deployment shell scripts passed `bash -n`.

Previously stored one-year HTML cannot be invalidated retroactively by changing a response header. A tab already stuck on that document may need a reload. Do not claim the Cloudflare setting alone clears existing browser caches.
