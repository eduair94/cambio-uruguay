# Contabo bandwidth reduction — 2026-09-04

Server: `147.93.146.232` (`vmi3166359`). Times below are UTC.

**Latest result at 22:28:** outgoing traffic averaged **29.72 Mbit/s over five minutes**, about 71% below the previous ten-day average. A persistent 40 Mbit/s safeguard limits MongoDB responses specifically. Other traffic retains access to the remaining capacity of the 1 Gbit/s connection. Compression is active in the reloaded applications; additional configuration is staged in workers that were left running to avoid further session disruption. Authentication recovery is incomplete: four affected accounts are already connected through other sessions; four other accounts have no working session across the three WASocket hosts.

## Findings

Contabo reported a ten-day average of **101 Mbit/s**, with a two-day grace period before a possible 100 Mbit/s restriction.

Netdata independently showed, around 21:23:

| Window | Outgoing | Incoming |
| --- | ---: | ---: |
| Previous ten days | 102.63 Mbit/s | 22.92 Mbit/s |
| Previous 24 hours | 88.39 Mbit/s | 12.83 Mbit/s |
| Previous hour | 82.33 Mbit/s | 5.90 Mbit/s |

The ten-day outgoing rate corresponds to approximately **1.11 TB/day** in decimal units. Daily averages were sustained, rather than a single transfer spike.

Live socket sampling identified MongoDB as the main outgoing consumer, particularly connections to `104.234.204.107` and `167.148.41.10`. Docker containers accounted for comparatively little traffic. MongoDB 8.0.20 supported compression, but all wire-compressor counters were initially zero.

WASocket's hourly target-statistics cleanup reads the shared `whatsapp_bot.target_lookup_stats` collection from every worker. The collection contained approximately **15.84 million documents / 5.81 GB logical data**. Its projected cleanup responses are smaller than the full documents, but duplicate scans still create substantial avoidable transfers. A sample of 1,000 projected documents occupied 139,375 BSON bytes and compressed to 26,604 bytes with zlib, an indicative 80.9% reduction; this is a sample, not a whole-collection wire measurement.

The separate phone-number statistics collection was only about 13 MB. Its cleanup interval was retained.

## Configuration changes

Existing MongoDB URIs were preserved, including credentials, database names, hosts and authentication options. The following options were added:

```text
compressors=zlib&zlibCompressionLevel=1
```

`zlibCompressionLevel=1` controls client request compression. MongoDB response compression uses the server implementation's default level; it must not be described as server-side level 1. No pool sizes or timeouts were changed in the applications.

On `104.234.204.107`:

- `/root/trustpilot/.env`: compression for `MONGODB_URI`, `SPOTIFY_COOKIE_MONGO_URI`, `TRACKING_MONGO_URI`, and `SPOTIFY_ANALYTICS_MONGODB_URI`. All five `trustpilot` workers were reloaded and confirmed online with successful MongoDB connections.
- `/root/shop-search-engine/api/.env`: compression for `MONGODB_URI`. All five `shop-scraper` workers were reloaded and confirmed online with successful MongoDB connections.
- `/root/WASocket/.env`: compressed `MONGO_URI` added from the exact existing main-connection fallback; compression added to `STATS_MONGO_URI`.

On `167.148.41.10`:

- `/root/WASocket/.env`: the same main/statistics connection compression settings.

On `167.148.41.11`:

- `/home/debian10/WASocket/.env`: the same main/statistics connection compression settings, staged without restarting any workers.

All three WASocket environment files now also set:

```text
TARGET_STATS_PRUNE_INTERVAL_MS=86400000
```

This changes target cleanup from hourly to daily, reducing each worker's scheduled full scans by approximately 96%. It preserves live statistics writes and the existing 168-hour retention cutoff. Expired entries may remain up to roughly one additional day before the next cleanup. Phone-statistics pruning remains every 15 minutes, including its existing protection for banned-number history.

## Activation and health

Further WhatsApp restarts were stopped after an authorization failure caused the application's existing policy to remove a session. Other restarted workers experienced proxy retry cooldowns. No manual session deletion, logout, pairing, proxy-safety bypass, or test messages were performed.

| Host | Workers | Compression | Daily target cleanup |
| --- | --- | --- | --- |
| `104.234.204.107` | `trustpilot` IDs 207–211 | Active | Not applicable |
| `104.234.204.107` | `shop-scraper` IDs 83, 84, 89, 90, 227 | Active | Not applicable |
| `104.234.204.107` | WASocket ID 141 | Active | Next normal restart |
| `104.234.204.107` | WASocket ID 142 | Active | Active |
| `104.234.204.107` | WASocket ID 144 | Next normal restart | Next normal restart |
| `167.148.41.10` | WASocket IDs 17, 18 | Active | Next normal restart |
| `167.148.41.10` | WASocket ID 19 | Active | Active |
| `167.148.41.10` | WASocket ID 20 | Next normal restart | Next normal restart |
| `167.148.41.11` | WASocket IDs 12–15 | Next normal restart | Next normal restart |

All four `.11` workers retained their original PIDs and healthy session counts: 10/10, 13/13, 11/11 and 10/10. Staged settings have not been represented as active.

Initial WhatsApp observations (approximately 21:42–21:46; superseded where applicable by the account-level recovery findings below). These services' session counts also change during normal operation:

| Host / worker | Recovery observation |
| --- | --- |
| `.10` / 17 | 12 connected before and after; no 401/logout found. |
| `.10` / 18 | All original 12 identifiers explicitly verified present and connected. |
| `.10` / 19 | 10 connected before, 9 afterward. One original session's credentials remained, but loaded with `registered=false`; automatic rediscovery skips that state. It may need pairing or separate recovery. No 401/logout or credential deletion was found. |
| `.10` / 20 | Not restarted; 12/12 at the final agent check. |
| `.104` / 141 | Recovered to 8/8. No exact pre-restart session baseline was captured. One session received 401 during startup, and the application's existing logout handler deleted its credentials. No recoverable local/archive copy was found. |
| `.104` / 142 | 12/12 before, 9/9 afterward. Several startup restores failed during the proxy cooldown; credentials/backups remained. One startup entry required QR authentication. No 401/440 was found; exact missing-account comparison is unavailable because baseline identifiers were not captured. |
| `.104` / 144 | Not restarted; initially 11/11. Its count also later changed during ordinary operation, so count changes alone do not establish restart causation. |

All checked HTTP health endpoints and MongoDB connections were healthy after the rollout. That does **not** establish that every WhatsApp account was restored. Remaining WASocket changes are deliberately staged; activate them during a maintenance window with session recovery available.

A root-only incident note on `.104` identifies the affected session and failed restores without including credential values:

```text
/root/deployment-backups/contabo-bandwidth-20260904/wasocket104-session-recovery-note.json
```

### Account recovery follow-up, 22:10–22:28

Remaining candidate authentication directories were securely archived outside the live session trees before any recovery attempts. The application deletes live credentials and its adjacent backup copies after an authentication rejection, so those local copies alone are insufficient protection.

Source inspection showed that `registered=false` does **not** by itself prove that device credentials are unusable: the installed Baileys client attempts login when a saved `creds.me` identity exists. The application's administrative rediscovery instead skips `registered=false`. Five previously active candidate sessions with saved identities and cryptographic keys therefore received one narrowly targeted recovery attempt each, after backup and correction of that metadata flag. No worker was restarted during this follow-up, and working session credentials were not changed.

None of the five old device logins was accepted. Four received WhatsApp protocol 401 and one received protocol 403 from the installed Baileys `CB:failure` handler. This was distinct from an HTTP proxy authentication error. The application's rejection handler removed the attempted live credentials; the complete offline archives remain available. No repeated attempt was made with credentials already rejected by WhatsApp. Two additional historical backup candidates contained different account identities and were not restored.

An account-level comparison then checked all **120 connected sessions** across `.104`, `.10`, and `.11`, representing **30 distinct accounts**. It compared SHA-256 hashes of normalized credential identities rather than copying phone numbers into this report. The nine affected session cases represent eight distinct accounts:

| Account outcome | Distinct accounts | Meaning |
| --- | ---: | --- |
| Already working under other device/session IDs | 4 | Current account access exists; this does not mean the rejected old device sessions were restored. This includes the account whose `.104` worker 141 credentials were deleted. |
| No connected session found on any of the three hosts | 4 | Saved logins were rejected or no matching usable backup remained. These require account-status checks and an authorized authentication recovery path. One account appears in affected cases on both `.104` and `.10`. |

The latest health snapshot contained 37 connected sessions on `.104`, 42 on `.10`, and 41 on `.11`. Counts are point-in-time observations, not a guarantee of future session continuity. No QR pairing, outgoing messages, new-account purchase, manual logout, or proxy-guard bypass was performed.

Private identifiers, protocol evidence, complete authentication archives, and recovery details remain root-only on the relevant servers:

```text
# 104.234.204.107
/root/deployment-backups/contabo-bandwidth-20260904/whatsapp-recovery-104/
  recovery-outcome.json
  same-host-identity-comparison.json
  account-hashes.json

# 167.148.41.10
/root/deployment-backups/contabo-bandwidth-20260904/wasocket-recovery-20260904T221011Z/
  incident-report.json
  account-hashes.json
```

The `.104` same-host report alone understates coverage: the later cross-host comparison found worker 141's account active elsewhere. These reports contain operational identifiers and must not be published.

The final cross-host case mapping is preserved on `147.93.146.232` at `/root/deployment-backups/contabo-bandwidth-20260904/cross-host-recovery-summary.json`, mode 600. The four accounts without a working session correspond to the private `.10` incident labels `5057`, `5098`, `5100`, and `7110`; `.104` candidate 3 is the same account as `5057`.

A bounded review of the deployed recovery code found no supported provider route to retrieve or import fresh credentials for these existing accounts. Local credentials, matching backups, and MongoDB fallback records were already checked. Fresh linking requires the current account controller to use WhatsApp's Linked Devices flow on the phone, by QR scan or pairing-code entry. For a protocol 403, the controller must first check and resolve any account restriction. Linking cannot be completed through SSH alone; no replacement account or SMS purchase was initiated.

## Database transfer safeguard

Short-lived application improvements alone were insufficient: by 21:45 a later burst raised the latest five-minute outgoing average to **85.58 Mbit/s**. Instead of restarting more session workers, a targeted egress safeguard was installed on `147.93.146.232`:

- Linux HTB on `eth0`, with a 1 Gbit/s parent.
- IPv4 and IPv6 TCP responses **from port 27017** share a 40 Mbit/s class.
- All other traffic uses a separate class with access to up to 1 Gbit/s when available.
- Fair queues separate connections within each class. Sustained large MongoDB transfers can take longer; this limit applies to all MongoDB clients, not just cleanup jobs.
- The service is active and enabled across reboots: `contabo-mongo-bandwidth.service`.

Files on the Contabo server:

```text
/usr/local/sbin/contabo-mongo-bandwidth
/etc/default/contabo-mongo-bandwidth
/etc/systemd/system/contabo-mongo-bandwidth.service
```

The script's source is kept in this repository at `scripts/ops/contabo-mongo-bandwidth.sh`. The rate is configurable through `/etc/default/contabo-mongo-bandwidth`. A service reload applies rate changes without restarting MongoDB or client applications.

Start, repeated start, stop, repeated stop, and start again were validated on an isolated dummy interface before touching `eth0`. The actual service was installed with a temporary automatic rollback timer; the timer was canceled after fresh SSH, database query, service-health and traffic checks passed.

To remove the safeguard and its reboot activation:

```bash
systemctl disable --now contabo-mongo-bandwidth.service
```

Stopping restores the original FQ-CoDel parameters; its qdisc handle becomes `f001:` so the script can recognize it on a later start. To change the rate, edit the defaults file and reload the service. Do not remove the safeguard without measuring sustained outgoing traffic, since some clients still use their previous connection/cleanup settings.

## Measurements after changes

Around 21:40, Netdata showed **27.34 Mbit/s outgoing over five minutes** and **29.85 Mbit/s over ten minutes**, about 71–73% below the preceding ten-day average. A separate 45-second socket/interface sample averaged 35.51 Mbit/s, with individual 15-second intervals of 18.84, 18.60 and 69.12 Mbit/s, demonstrating continuing bursts.

MongoDB used roughly 2.25–3.27 CPU cores in that sample on an 18-vCPU server. Compressor counters increased after activation, confirming that actual traffic used compression.

These are short-term observations during a staged rollout, not a guarantee of the next day's average. Restarts also interrupt and reschedule existing cleanup cursors, so the entire observed reduction must not be attributed to compression alone. Some workers still run their previous settings until their next normal restart.

After activating the safeguard, three consecutive 15-second samples at 21:53:55–21:54:25 measured:

| Sample | Total outgoing | MongoDB class |
| --- | ---: | ---: |
| 1 | 42.66 Mbit/s | 39.53 Mbit/s |
| 2 | 43.22 Mbit/s | 39.42 Mbit/s |
| 3 | 43.25 Mbit/s | 39.30 Mbit/s |

Total outgoing averaged **43.04 Mbit/s**. The MongoDB class showed zero dropped packets and approximately 36 KB queued at the end of that check. A ten-query read sample from `.104` had a median of **20.24 ms before** and **18.31 ms after** shaping; this verifies small-read responsiveness in that sample, not unchanged performance for large transfers. All ten main/shop API workers were online. MongoDB stayed running throughout.

At 21:56:32, a further Netdata check measured **43.90 Mbit/s over two minutes** and **44.30 Mbit/s over one minute**. The safeguard was still active and enabled; MongoDB was active; the temporary rollback timer was inactive.

At 22:18:14, outgoing traffic averaged **36.26 Mbit/s over five minutes**. At 22:28:07, it averaged **29.72 Mbit/s over five minutes**; the safeguard remained active. These measurements confirm continuing reduction during the recovery work, but do not erase the earlier ten-day usage history.

## Backups and rollback

Original environment files were retained on their respective hosts under:

```text
/root/deployment-backups/contabo-bandwidth-20260904/
```

Backup files contain credentials and are restricted to root with mode 600. Do not paste their contents into tickets, chat or source control.

- `104.234.204.107`: `trustpilot.env.before`, `shop-api.env.before`, `wasocket104.env.before-compression`, and `wasocket104.env.before-prune`.
- `167.148.41.10`: `wasocket.env.before` and `wasocket.env.before-prune-interval`.
- `167.148.41.11`: `warframe167-wasocket.env.original`, plus baseline/final health JSON summaries.
- `147.93.146.232`: `tc-qdisc-before.txt`, `tc-class-before.txt`, and `tc-filter-before.txt` preserve the original network configuration.

To reverse configuration, restore only the intended application's original file while preserving its owner and permissions. Active processes retain their current settings until reloaded. Treat WASocket restarts as operational changes that can trigger session restoration, proxy cooldowns and re-pairing requirements; do not perform them merely to clear a pending configuration entry.

## Contabo policy context

The [current Contabo policy](https://help.contabo.com/en/support/solutions/articles/103000271195-are-there-any-bandwith-limits-at-contabo-) publishes no guaranteed numeric safe threshold or averaging-window formula. The user's warning supplies the applicable ten-day measurement and two-day grace period. Lower current traffic does not instantly clear an historical average or guarantee that Contabo will waive throttling.

Contabo's [outgoing-traffic reduction guide](https://help.contabo.com/en/support/solutions/articles/103000370782-how-to-reduce-outgoing-traffic) recommends identifying the responsible services and reducing unnecessary transfers, which motivated these changes.

MongoDB references: [server compressor configuration](https://www.mongodb.com/docs/v8.0/reference/configuration-options/#net.compression.compressors), [Node driver compression](https://www.mongodb.com/docs/drivers/node/current/connect/connection-options/network-compression/), and the [wire-compression specification](https://github.com/mongodb/specifications/blob/master/source/compression/OP_COMPRESSED.md#zlibcompressionlevel).

Network safeguard references: [HTB](https://man7.org/linux/man-pages/man8/tc-htb.8.html), [flower classifiers](https://man7.org/linux/man-pages/man8/tc-flower.8.html), and [FQ-CoDel](https://man7.org/linux/man-pages/man8/tc-fq_codel.8.html).
