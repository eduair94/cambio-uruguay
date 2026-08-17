// Cron entry: post ONE evergreen guide to X, rotating through the catalogue.
//
// The site's own analytics are the argument for this job: on 2026-08-17 a single
// t.co referral delivered 471 sessions in a morning against an organic baseline
// of ~30 users/day. The daily report broadcasts the dollar figures; this posts
// the guides, which are the pages people actually pass around.
//
// SAFETY GATE — read before wondering why nothing is being posted.
// This job needs BOTH Twitter credentials AND `CONTENT_PROMO_ENABLED=1`. The
// second flag is not redundant: the credentials are already on the box for the
// daily report, so without it, deploying this file would have started posting to
// a real audience the moment pm2 picked it up. Publishing under somebody's name
// is theirs to switch on, so the default is a dry run that prints the tweet.
//
//   DRY_RUN=1  print instead of post (also the behaviour when the gate is off)
//   FORCE=1    bypass the once-a-day dedup
import "dotenv/config";
import { loadConfig } from "../config.js";
import { CONTENT_PROMOS, formatContentPromo, tweetLength, TWEET_LIMIT } from "../format/promos.js";
import { TwitterPublisher } from "../publish/twitter.js";
import { connectMongo, disconnectMongo } from "../store/mongo.js";
import { markRanToday, wasRunToday } from "../store/job_state.js";
import { markPromoPosted, pickNextPromo } from "../store/promo_state.js";

const JOB = "content_promo";

async function main(): Promise<void> {
  const cfg = loadConfig();
  await connectMongo(cfg.mongoUri).catch((e) => console.error("mongo connect failed:", e));

  if (!cfg.force && (await wasRunToday(JOB))) {
    console.log(`${JOB} already ran today; use FORCE=1 to override. Skipping.`);
    return;
  }

  const promo = await pickNextPromo(CONTENT_PROMOS);
  if (!promo) {
    console.error("content promo catalogue is empty; nothing to post.");
    return;
  }

  const tweet = formatContentPromo(promo, cfg.siteBaseUrl);
  const length = tweetLength(tweet);
  if (length > TWEET_LIMIT) {
    // formatContentPromo trims the hook, so this can only mean the URL itself is
    // absurd. Refuse rather than let X reject it silently on the box.
    console.error(`refusing to post: ${length} chars > ${TWEET_LIMIT} for ${promo.slug}`);
    return;
  }

  const enabled = process.env.CONTENT_PROMO_ENABLED === "1";
  const dryRun = cfg.dryRun || !enabled;

  console.log(`\n----- ${JOB} (${length}/${TWEET_LIMIT} chars) -----\n${tweet}\n---------------------------------\n`);

  if (!enabled) {
    console.log("CONTENT_PROMO_ENABLED is not 1 — not posting. Set it to go live.");
  }

  const tw = new TwitterPublisher(cfg.twitter, { dryRun });
  if (!tw.isConfigured()) {
    console.log("no Twitter credentials configured; nothing sent.");
  } else {
    await tw.tweet(tweet);
  }

  // Only advance the rotation on a real post, so a week of dry runs does not burn
  // through the catalogue without anybody seeing it.
  if (enabled && !cfg.dryRun && tw.isConfigured()) {
    await markPromoPosted(promo.slug).catch(() => undefined);
    await markRanToday(JOB).catch(() => undefined);
    console.log(`posted ${promo.slug}`);
  }
}

main()
  .catch((err) => {
    console.error(`${JOB} failed:`, err);
    process.exitCode = 1;
  })
  .finally(() => disconnectMongo().catch(() => undefined));
