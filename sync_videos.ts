// Daily video snapshot (pm2 app `currency-videos`). Reads the public YouTube Atom feed of every
// channel in `classes/videos/channels.ts`, drops the Shorts and the off-topic uploads, classifies
// each survivor by money topic, and writes ONE aggregate document (`videossnapshots`) into the
// NUXT APP's database, which /api/videos serves to /videos-de-economia-uruguay and its per-topic
// pages.
//
// Why a backend cron and not a Nitro task: the app runs as a pm2 cluster of 2, so every
// scheduledTask there fires twice (see classes/cluster.ts and the note in AGENTS.md). This job is
// single-instance by construction.
//
// Never blanks the stored snapshot. Two guards, both of which have a real precedent in this repo:
// an all-empty run is refused outright, and a run that lost more than half its channels — or that
// came back with less than half the videos already serving — is refused too, because a YouTube
// hiccup that leaves three rows standing produces a page that looks alive and is empty.
// `--allow-empty` exists only to seed a brand-new database on purpose.
import dotenv from "dotenv";
dotenv.config();

import { appDbConfigured } from "./classes/appdb";
import { VIDEO_CHANNELS } from "./classes/videos/channels";
import { buildVideosSnapshot, snapshotIsEmpty, snapshotIsThin } from "./classes/videos/refresh";
import { saveVideos, storedVideoCount } from "./classes/videos/store";

async function main(): Promise<void> {
  if (!appDbConfigured()) {
    console.error(
      "[videos] APP_MONGO_URI is not set — refusing to run. The snapshot lives in the Nuxt app's " +
        "database (copy the value from app/.env's MONGO_URI); writing it to the backend database " +
        "would leave /videos-de-economia-uruguay empty forever with no error anywhere."
    );
    process.exit(1);
  }

  const allowEmpty = process.argv.includes("--allow-empty");

  try {
    const previous = await storedVideoCount();
    const snapshot = await buildVideosSnapshot();
    const { videos, channelsOk, channelsDown, uruguayan } = snapshot.counts;
    console.log(
      `[videos] ${videos} videos de ${channelsOk}/${VIDEO_CHANNELS.length} canales ` +
        `(${uruguayan} uruguayos) · ${channelsDown} canales caídos · antes había ${previous}`
    );

    for (const channel of snapshot.channels) {
      if (!channel.ok) console.warn(`[videos] canal caído: ${channel.id} — ${channel.error}`);
    }

    const topics = Object.entries(snapshot.topicCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([slug, n]) => `${slug} ${n}`)
      .join(" · ");
    if (topics) console.log(`[videos] temas: ${topics}`);

    if (snapshotIsEmpty(snapshot) && !allowEmpty) {
      console.error(
        "[videos] ningún canal devolvió videos publicables; no se pisa el snapshot anterior. " +
          "Usá --allow-empty sólo para sembrar una base nueva."
      );
      process.exit(1);
    }

    if (!allowEmpty && snapshotIsThin(snapshot, previous)) {
      console.error(
        `[videos] corrida flaca (${videos} videos, ${channelsOk}/${channelsOk + channelsDown} ` +
          `canales vivos, antes ${previous}); no se pisa el snapshot anterior.`
      );
      process.exit(1);
    }

    await saveVideos(snapshot);
    console.log(`[videos] guardado ${snapshot.capturedAt.toISOString()}`);
    process.exit(0);
  } catch (err) {
    console.error("[videos] falló:", err);
    process.exit(1);
  }
}

void main();
