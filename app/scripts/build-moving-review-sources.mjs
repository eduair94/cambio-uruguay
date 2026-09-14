// Manual, local projection. The Nuxt build reads only the committed app snapshot.
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'

const app = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const research = JSON.parse(
  readFileSync(resolve(app, '../docs/research/moving/review-sources.json'), 'utf8')
)
const providers = new Set(
  JSON.parse(readFileSync(resolve(app, 'utils/movingServicesData.json'), 'utf8')).map(p => p.id)
)
const ids = new Set()
const profiles = research.profiles.filter(profile => profile.status === 'verified')
function readLink(profile) {
  if (profile.platform !== 'google') return profile.profileUrl
  if (profile.placeId) {
    const url = new URL('https://www.google.com/maps/search/')
    url.search = new URLSearchParams({
      api: '1',
      query: profile.expectedNames[0],
      query_place_id: profile.placeId,
    }).toString()
    return url.href
  }
  if (/^0x[0-9a-f]+:0x[0-9a-f]+$/i.test(profile.featureId || '')) {
    // A Maps CID identifies the same linked feature; it is never passed off as a Places ID.
    return `https://www.google.com/maps?cid=${BigInt(profile.featureId.split(':')[1]).toString()}`
  }
  return profile.profileUrl
}
for (const profile of profiles) {
  if (!providers.has(profile.providerId) || ids.has(profile.id))
    throw new Error(`Invalid/duplicate profile: ${profile.id}`)
  ids.add(profile.id)
  if (!profile.identityEvidence?.length) throw new Error(`No identity evidence: ${profile.id}`)
  const url = new URL(readLink(profile))
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password)
    throw new Error(`Unsafe profile: ${profile.id}`)
}
const output = {
  reviewedAt: research.checkedAt,
  google: profiles
    .filter(p => p.platform === 'google' && p.placeId)
    .map(p => ({
      id: p.id,
      providerId: p.providerId,
      platform: 'google',
      status: 'verified',
      placeId: p.placeId,
      profileUrl: readLink(p),
      label: p.label,
      expectedNames: p.expectedNames,
      expectedCountryCode: p.expectedCountryCode,
      expectedPhoneNumbers: p.expectedPhoneNumbers,
      identityEvidence: p.identityEvidence,
      verifiedAt: p.verifiedAt,
      checkedAt: p.checkedAt,
    })),
  references: profiles.map(p => ({
    id: p.id,
    providerId: p.providerId,
    platform: p.platform,
    label: p.label,
    profileUrl: readLink(p),
    checkedAt: p.checkedAt,
    sourceUrl: p.identityEvidence[0].sourceUrl,
    live: p.platform === 'google' && Boolean(p.placeId),
  })),
}
const file = resolve(app, 'utils/movingReviewSourcesData.json')
const serialized = `${JSON.stringify(output, null, 2)}\n`
if (process.argv.includes('--check')) {
  if (readFileSync(file, 'utf8') !== serialized)
    throw new Error('Review sources snapshot differs; run build-moving-review-sources.mjs')
} else writeFileSync(file, serialized)
console.log(
  JSON.stringify({
    references: output.references.length,
    googleLive: output.google.length,
    providers: new Set(output.references.map(p => p.providerId)).size,
  })
)
