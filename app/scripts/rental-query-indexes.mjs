import { fileURLToPath } from 'node:url'
import path from 'node:path'
import mongoose from 'mongoose'

// Explicit migration only: importing a live Mongoose schema must not start these builds.
export const RENTAL_QUERY_INDEXES = [
  { name: 'rental_key_es_v1', key: { key: 1 } },
  { name: 'rental_advert_id_es_v1', key: { 'offers.listingId': 1 } },
  {
    name: 'rental_cohort_es_v1',
    key: { department: 1, neighborhood: 1, propertyType: 1, bedrooms: 1 },
  },
].map(index => ({ ...index, unique: false, collation: { locale: 'es', strength: 1 } }))

const sameKey = (a, b) =>
  JSON.stringify(Object.entries(a ?? {})) === JSON.stringify(Object.entries(b ?? {}))
const collationDefaults = {
  caseLevel: false,
  caseFirst: 'off',
  numericOrdering: false,
  alternate: 'non-ignorable',
  maxVariable: 'punct',
  normalization: false,
  backwards: false,
}
function sameCollation(actual, expected) {
  return (
    actual?.locale === expected.locale &&
    actual?.strength === expected.strength &&
    Object.entries(collationDefaults).every(([key, value]) => (actual[key] ?? value) === value)
  )
}
function equivalent(actual, expected) {
  return (
    sameKey(actual.key, expected.key) &&
    sameCollation(actual.collation, expected.collation) &&
    !actual.unique &&
    !actual.hidden &&
    !actual.sparse &&
    actual.partialFilterExpression === undefined &&
    actual.expireAfterSeconds === undefined
  )
}

/** Preflight every entry before creating anything; never drop, replace or alter existing indexes. */
export function planRentalQueryIndexes(existing) {
  const uniqueKey = existing.find(
    index =>
      sameKey(index.key, { key: 1 }) &&
      index.unique === true &&
      (!index.collation || index.collation.locale === 'simple') &&
      !index.sparse &&
      index.partialFilterExpression === undefined
  )
  if (!uniqueKey) throw new Error('The existing unique simple key index must be preserved')
  return RENTAL_QUERY_INDEXES.map(expected => {
    const named = existing.find(index => index.name === expected.name)
    if (named && !equivalent(named, expected))
      throw new Error(`Index definition conflicts: ${expected.name}`)
    const found = named ?? existing.find(index => equivalent(index, expected))
    return {
      ...expected,
      action: found ? 'present' : 'create',
      ...(found ? { existingName: found.name } : {}),
    }
  })
}

export async function prepareRentalQueryIndexes(collection, apply = false) {
  const before = await collection.listIndexes({ maxTimeMS: 10000 }).toArray()
  const plan = planRentalQueryIndexes(before)
  if (!apply) return { mode: 'plan', collection: collection.collectionName, indexes: plan }
  const created = []
  for (const index of plan) {
    if (index.action === 'present') continue
    await collection.createIndex(index.key, {
      name: index.name,
      unique: false,
      collation: index.collation,
      maxTimeMS: 60000,
    })
    created.push(index.name)
  }
  const after = planRentalQueryIndexes(await collection.listIndexes({ maxTimeMS: 10000 }).toArray())
  if (after.some(index => index.action !== 'present')) throw new Error('Index verification failed')
  return { mode: 'apply', collection: collection.collectionName, created, indexes: after }
}

export async function rentalQueryIndexesMain(args = process.argv.slice(2)) {
  if (args.length > 1 || args.some(arg => !['--plan', '--apply'].includes(arg))) {
    throw new Error('Use --plan (default) or --apply after reviewing the plan')
  }
  // Run from app/: node --env-file=.env scripts/rental-query-indexes.mjs --plan
  // Never fall back to the backend database or log credentials.
  const uri = process.env.NUXT_MONGO_URI || process.env.MONGO_URI
  if (!uri || !new URL(uri).pathname.replace(/^\//, ''))
    throw new Error('Explicit app database is required')
  const client = new mongoose.mongo.MongoClient(uri, {
    maxPoolSize: 1,
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
  })
  try {
    await client.connect()
    const db = client.db()
    if (['admin', 'config', 'local'].includes(db.databaseName))
      throw new Error('Application database required')
    const result = await prepareRentalQueryIndexes(
      db.collection('rentallistings'),
      args[0] === '--apply'
    )
    console.log(JSON.stringify({ database: db.databaseName, ...result }, null, 2))
  } finally {
    await client.close()
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  rentalQueryIndexesMain().catch(error => {
    // Driver exception messages can contain connection information. Keep CLI failure output bounded.
    console.error(
      JSON.stringify({
        status: 'failed',
        error: error.name,
        code: Number.isInteger(error.code) ? error.code : null,
      })
    )
    process.exitCode = 1
  })
}
