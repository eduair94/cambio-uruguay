# Production SSR runtime

## Incident measured on 2026-09-07

The public rental address flow intermittently returned HTTP 502 during verification.
Both frontend PM2 workers had no `NODE_ENV` in their configured or actual process
environment. They repeatedly exceeded the 900 MiB restart threshold, reaching
1.2–1.98 GiB RSS. Most observed traffic was bots rendering individual rental pages.

Although Nuxt had built a production artifact, external Vue packages still chose
their development runtime at process startup. On the same local artifact, 80 SSR
requests to `/acerca` reached approximately 1,719 MiB RSS without `NODE_ENV`, versus
608 MiB with `NODE_ENV=production`. Forced GC reduced heap use but did not return
the development process's large RSS allocation to the operating system.

This setting was one contributor, not a complete diagnosis of all memory growth:
workers still crossed the restart threshold after a targeted production-mode reload.
Their default V8 heap allowance was also larger than PM2's process memory cutoff,
so short-lived allocations could trigger a worker restart before collection. The
isolated comparisons below are bounded tests, not proof that every future workload
will stay below the cutoff.

A separate production-mode candidate on the VPS used the deployed `7e86be7`
artifact: `/acerca` and 30 rental detail pages all returned 200 in 41.5 seconds,
with maximum RSS 261 MiB. The candidate used a private loopback port, disabled
scheduled work, rejected database writes and was closed after the check.

A longer local comparison used 80 renders across Spanish, English and Portuguese,
with concurrency three and no forced GC. Capping old space at 512 MiB reduced peak
RSS from 801.7 to 564.9 MiB; p95 latency was 662 versus 609 ms. Both runs returned
80 successful responses. Major collections increased from six to seventeen, while
final used heap was similar (222.9 versus 219.6 MiB).

The matching 512 MiB candidate on the VPS returned 200 for `/acerca` and 30 rental
detail pages (ten per language), with concurrency two and no forced GC. It completed
in 16.74 seconds at maximum RSS 280 MiB. Node 22's effective total heap limit was
560 MiB, including the young generation. No database write was attempted. This
sample validates the runtime with real data; the longer local comparison exercises
collection pressure. Neither changes the production RSS restart threshold.

## Configuration

- `app/ecosystem.config.cjs` explicitly sets `env.NODE_ENV` to `production`.
- Its `node_args` sets `--max-old-space-size=512`, allowing collection before the
  process reaches PM2's 900 MiB RSS limit and leaving room for native allocations.
- `app/scripts/check-staging.cjs` sets the same value after copying the deploy
  shell's environment and uses the same heap argument, so the preflight exercises
  the runtime that will serve users rather than the build's larger heap allowance.
- The existing rolling reload, readiness check and 900 MiB limit remain in place.
  The fix does not increase the memory allowance.
- The deploy uses `pm2 startOrReload` with the ecosystem file and `--update-env`,
  so future releases retain the setting. A build alone cannot fix an already
  running worker's environment.

Regression tests verify the actual PM2 configuration and launch a staging child
from shells with absent, development and production `NODE_ENV` values. All three
must run the candidate in production mode and stop the probe child on completion.
The child reports its effective heap limit, which must remain below 900 MiB even
when the deploy shell provides an 8 GiB `NODE_OPTIONS` build allowance.

PM2's cluster container assigns its saved environment before importing the application.
On Linux, `/proc/<pid>/environ` can still show the original exec environment, so it is
not sufficient to verify this assignment after a reload. Check PM2's configured value
and observe worker behavior over several former restart cycles.
