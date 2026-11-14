import type { CommercialContact } from '../../utils/commercialContacts'

// Manually reviewed business reception/branch lines, never private seller profiles.
// These are consultation dates, not claims about a listing's current availability.
// Keep this catalogue server-only; the admin API performs the only client projection.
const observedAt = '2026-09-21T16:00:00.000Z'
export const COMMERCIAL_CONTACTS: readonly CommercialContact[] = [
  {
    id: 'rp-motors',
    name: 'RP Motors / RP Automóviles',
    sector: 'autos',
    phone: '+59822032070',
    phoneScope: 'business',
    sourceUrl: 'https://www.rpautomoviles.com/',
    observedAt,
    platforms: [
      {
        kind: 'mercadolibre',
        url: 'https://vehiculos.mercadolibre.com.uy/_CustId_135332403',
        evidenceUrl: 'https://www.rpautomoviles.com/',
        evidenceKind: 'official_link',
        observedAt,
      },
    ],
  },
  {
    id: 'amaya-pocitos',
    name: 'Amaya Motors — Pocitos',
    sector: 'autos',
    phone: '+59827067268',
    phoneScope: 'business',
    sourceUrl: 'https://amaya.com.uy/',
    observedAt,
    platforms: [
      {
        kind: 'mercadolibre',
        url: 'https://auto.mercadolibre.com.uy/MLU-1475851190-chevrolet-tracker-12-t-rs-at-_JM',
        evidenceUrl:
          'https://auto.mercadolibre.com.uy/MLU-1475851190-chevrolet-tracker-12-t-rs-at-_JM',
        evidenceKind: 'indexed_listing',
        observedAt,
      },
    ],
  },
  {
    id: 'acsa-central',
    name: 'ACSA — Casa Central',
    sector: 'viviendas',
    phone: '+59829080241',
    phoneScope: 'business',
    sourceUrl: 'https://acsa.com.uy/contacto',
    observedAt,
    platforms: [
      {
        kind: 'mercadolibre',
        url: 'https://terreno.mercadolibre.com.uy/MLU-763820754-venta-de-terrenos-en-barrio-ombues-san-nicolas-_JM',
        evidenceUrl:
          'https://terreno.mercadolibre.com.uy/MLU-763820754-venta-de-terrenos-en-barrio-ombues-san-nicolas-_JM',
        evidenceKind: 'indexed_listing',
        observedAt,
      },
    ],
  },
  {
    id: 'yovanina',
    name: 'Yovanina Negocios Inmobiliarios',
    sector: 'viviendas',
    phone: '+59843787433',
    phoneScope: 'business',
    sourceUrl: 'https://www.inmobiliariayovanina.com/contacto/',
    observedAt,
    platforms: [
      {
        kind: 'mercadolibre',
        url: 'https://casa.mercadolibre.com.uy/MLU-1479726318-casa-en-venta-en-santa-ana-canelones-3-casas-en-un-mismo-padron-inmobiliaria-yovanina-cuchilla-alta-_JM',
        evidenceUrl:
          'https://casa.mercadolibre.com.uy/MLU-1479726318-casa-en-venta-en-santa-ana-canelones-3-casas-en-un-mismo-padron-inmobiliaria-yovanina-cuchilla-alta-_JM',
        evidenceKind: 'indexed_listing',
        observedAt,
      },
    ],
  },
  {
    id: 'kosak-pocitos',
    name: 'Kosak — Pocitos',
    sector: 'viviendas',
    phone: '+59892110025',
    phoneScope: 'business',
    sourceUrl: 'https://www.kosak.com.uy/contacto',
    observedAt,
    platforms: [
      {
        kind: 'mercadolibre',
        url: 'https://casa.mercadolibre.com.uy/MLU-696733685-venta-casa-de-4-dormitorios-pocitos-_JM',
        evidenceUrl:
          'https://casa.mercadolibre.com.uy/MLU-696733685-venta-casa-de-4-dormitorios-pocitos-_JM',
        evidenceKind: 'indexed_listing',
        observedAt,
      },
    ],
  },
]
