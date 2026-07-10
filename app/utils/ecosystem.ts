// Links to assets we publish ourselves: source, package, MCP server, API docs,
// long-form guides. This is deliberately NOT an "as featured in" strip — as of
// 2026-07-10 no third-party editorial mention of the site exists (the
// awesome-mcp-servers PR is unmerged, the MCP registry returns zero results).
// When a genuine third-party mention lands, it belongs in its own section, not
// mixed in here.

export interface EcosystemLink {
  /** Stable key; also the i18n key suffix under `ecosystem.links`. */
  id: string
  /** Absolute https URL, or a root-relative path when `internal`. */
  url: string
  icon: string
  internal?: boolean
}

export const ECOSYSTEM_LINKS: EcosystemLink[] = [
  { id: 'github', url: 'https://github.com/eduair94/cambio-uruguay', icon: 'mdi-github' },
  { id: 'npm', url: 'https://www.npmjs.com/package/cambio-uruguay-mcp', icon: 'mdi-npm' },
  { id: 'mcp', url: 'https://mcp.cambio-uruguay.com', icon: 'mdi-robot-outline' },
  // /desarrolladores, never /api-reference — the latter is robots-disallowed to
  // avoid duplicate-content indexing of the Scalar reference.
  { id: 'api', url: '/desarrolladores', icon: 'mdi-api', internal: true },
  {
    id: 'mediumEs',
    url: 'https://cambio-uruguay.medium.com/c%C3%B3mo-saber-el-mejor-precio-del-d%C3%B3lar-en-uruguay-hoy-sin-recorrer-casas-de-cambio-27d3669d3839',
    icon: 'mdi-post-outline',
  },
  {
    id: 'mediumEn',
    url: 'https://cambio-uruguay.medium.com/currency-exchange-in-uruguay-how-to-find-the-best-rate-before-you-trade-3a5fd46e3fc4',
    icon: 'mdi-post-outline',
  },
]
