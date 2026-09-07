import type { PipelineStage } from 'mongoose'
import { RentalListingModel } from '../models/RentalListing'
import { PropertySaleCatalogModel } from '../models/PropertySaleCatalog'
import { connectDb } from './db'
import { RENTAL_STALE_DAYS, rentalPublicStages } from '../../utils/rentals'
import { propertySalesVisibleFilter } from '../../utils/propertySalesQuery'
import {
  ADVERTISER_EVIDENCE_MAX_AGE_DAYS,
  publicAdvertiserProjection,
  publicAdvertiserMetadata,
  type Agency,
  type PublicContact,
} from '../../utils/propertyAdvertiser'
import {
  buildAgencyDirectory,
  type AgencyAggregateRow,
  type AgencySummary,
} from '../../utils/agencies'

/** Compact own-offer evidence before grouping: descriptions, identities and contacts never enter this cache. */
export function agencyGroupingStages(operation: 'rent' | 'sale', now: number): PipelineStage[] {
  const input =
    operation === 'rent'
      ? [
          ...rentalPublicStages({ 'offers.agency.version': 1 }, RENTAL_STALE_DAYS),
          { $unwind: '$offers' },
          {
            $project: {
              _id: 0,
              source: '$offers.source',
              sellerType: '$offers.sellerType',
              listingId: '$offers.listingId',
              agency: '$offers.agency',
              lastSeen: '$offers.lastSeen',
              department: 1,
              neighborhood: 1,
            },
          },
        ]
      : [
          { $match: { ...propertySalesVisibleFilter(now), 'agency.version': 1 } },
          {
            $project: {
              _id: 0,
              source: 1,
              sellerType: 1,
              listingId: 1,
              agency: 1,
              lastSeen: 1,
              department: 1,
              neighborhood: 1,
            },
          },
        ]
  const projection = publicAdvertiserProjection()
  return [
    ...input,
    {
      $project: {
        source: 1,
        sellerType: 1,
        listingId: 1,
        lastSeen: 1,
        department: 1,
        neighborhood: 1,
        ...Object.fromEntries(
          Object.entries(projection).filter(([key]) => key.startsWith('agency.'))
        ),
      },
    },
    {
      $match: {
        source: { $in: ['infocasas', 'casasweb', 'elpais', 'mercadolibre'] },
        sellerType: { $ne: 'particular' },
        'agency.version': 1,
        'agency.name': { $type: 'string', $regex: '\\S', $not: /[<>]/ },
        'agency.profileUrl': {
          $type: 'string',
          $not: /[\r\n]|\/(?:login|signin|dashboard|account|cuenta|auth|oauth)(?:\/|$)|[?&][^=&#]*(?:token|auth|secret|session|password|signature|code)[^=&#]*=/i,
        },
        'agency.key': {
          $type: 'string',
          $regex: '^(infocasas|casasweb|elpais|mercadolibre):[A-Za-z0-9_-]{1,100}$',
        },
        'agency.observedAt': {
          $gte: new Date(now - ADVERTISER_EVIDENCE_MAX_AGE_DAYS * 86400000).toISOString(),
          $lte: new Date(now + 300000).toISOString(),
        },
        listingId: { $type: 'string', $ne: '' },
      },
    },
    // Validate each contributing advert before summing. A valid first profile must not launder
    // malformed source/agency records into another company's counter.
    {
      $match: {
        $expr: {
          $and: [
            { $eq: ['$source', { $arrayElemAt: [{ $split: ['$agency.key', ':'] }, 0] }] },
            {
              $or: [
                {
                  $and: [
                    { $eq: ['$source', 'infocasas'] },
                    {
                      $regexMatch: {
                        input: '$agency.profileUrl',
                        regex: {
                          $concat: [
                            '^https?://(?:www\\.)?infocasas\\.com\\.uy/inmobiliarias/(?:perfil/)?',
                            { $arrayElemAt: [{ $split: ['$agency.key', ':'] }, 1] },
                            '(?:-|/|$)',
                          ],
                        },
                      },
                    },
                  ],
                },
                ...Object.entries({
                  casasweb: '^https?://(?:www\\.)?casasweb\\.com(?:/|$)',
                  elpais: '^https?://inmuebles\\.elpais\\.com\\.uy(?:/|$)',
                  mercadolibre: '^https?://(?:www\\.|inmueble\\.)?mercadolibre\\.com\\.uy(?:/|$)',
                }).map(([source, regex]) => ({
                  $and: [
                    { $eq: ['$source', source] },
                    { $regexMatch: { input: '$agency.profileUrl', regex } },
                  ],
                })),
              ],
            },
          ],
        },
      },
    },
    {
      $set: {
        listingId: {
          $cond: [
            { $eq: [{ $indexOfBytes: ['$listingId', { $concat: ['$source', ':'] }] }, 0] },
            {
              $substrBytes: [
                '$listingId',
                { $add: [{ $strLenBytes: '$source' }, 1] },
                { $strLenBytes: '$listingId' },
              ],
            },
            '$listingId',
          ],
        },
      },
    },
    { $sort: { 'agency.observedAt': -1 } },
    {
      $group: {
        _id: { source: '$source', listingId: '$listingId' },
        keys: { $addToSet: '$agency.key' },
        row: { $first: '$$ROOT' },
      },
    },
    // Ambiguous owners are excluded, not assigned by latest or by company name.
    { $match: { 'keys.1': { $exists: false } } },
    { $replaceRoot: { newRoot: '$row' } },
    { $sort: { 'agency.observedAt': -1 } },
    {
      $group: {
        _id: { key: '$agency.key', department: '$department', neighborhood: '$neighborhood' },
        agency: { $first: '$agency' },
        source: { $first: '$source' },
        count: { $sum: 1 },
        lastSeen: { $max: '$lastSeen' },
      },
    },
    {
      $project: {
        _id: 0,
        agency: 1,
        source: 1,
        count: 1,
        lastSeen: 1,
        operation: { $literal: operation },
        department: { $ifNull: ['$_id.department', ''] },
        neighborhood: { $ifNull: ['$_id.neighborhood', ''] },
      },
    },
    { $limit: 30001 },
  ] as PipelineStage[]
}
let cache: { at: number; rows: AgencySummary[] } | undefined
let pending: Promise<AgencySummary[]> | undefined
/** Only business channels observed on this exact native agency profile, never another home's contact. */
export async function loadAgencyProfileContact(agency: Agency): Promise<PublicContact | null> {
  const now = Date.now(),
    source = agency.key.split(':')[0]
  const projection = {
    _id: 0,
    source: 1,
    sellerType: 1,
    url: 1,
    ...publicAdvertiserProjection('', true),
  }
  const rental = await RentalListingModel.aggregate([
    ...rentalPublicStages({ 'offers.agency.key': agency.key }, RENTAL_STALE_DAYS),
    { $unwind: '$offers' },
    { $match: { 'offers.agency.key': agency.key } },
    { $replaceRoot: { newRoot: '$offers' } },
    { $project: projection },
    { $match: { 'publicContact.version': 1 } },
    { $sort: { 'publicContact.channels.observedAt': -1 } },
    { $limit: 20 },
  ]).option({ maxTimeMS: 10000, allowDiskUse: true })
  const sale = await PropertySaleCatalogModel.aggregate([
    {
      $match: {
        ...propertySalesVisibleFilter(now),
        'agency.key': agency.key,
        'publicContact.version': 1,
      },
    },
    { $project: projection },
    { $sort: { 'publicContact.channels.observedAt': -1 } },
    { $limit: 20 },
  ]).option({ maxTimeMS: 10000, allowDiskUse: true })
  const rows = [...rental, ...sale]
    .map(row => publicAdvertiserMetadata(row, now).publicContact)
    .filter((value): value is PublicContact => !!value)
  const channels = rows
    .flatMap(row => row.channels)
    .filter(channel => channel.sourceUrl === agency.profileUrl)
    .sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt))
  const seen = new Set<string>()
  const unique = channels
    .filter(channel => {
      const key = `${channel.kind}:${channel.value}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, 5)
  return unique.length
    ? publicAdvertiserMetadata(
        { source, agency, publicContact: { version: 1, name: agency.name, channels: unique } },
        now
      ).publicContact || null
    : null
}
export async function loadAgencyDirectory(): Promise<AgencySummary[]> {
  const now = Date.now()
  if (cache && now - cache.at < 60000) return cache.rows
  if (pending) return pending
  pending = (async () => {
    await connectDb()
    const parts = await Promise.all([
      RentalListingModel.aggregate(agencyGroupingStages('rent', now)).option({
        maxTimeMS: 20000,
        allowDiskUse: true,
      }),
      PropertySaleCatalogModel.aggregate(agencyGroupingStages('sale', now)).option({
        maxTimeMS: 20000,
        allowDiskUse: true,
      }),
    ])
    if (parts.some(rows => rows.length > 30000))
      throw new Error('Agency catalogue exceeds bounded projection')
    const rows = buildAgencyDirectory(parts.flat() as AgencyAggregateRow[], now)
    cache = { at: now, rows }
    return rows
  })().finally(() => {
    pending = undefined
  })
  return pending
}
