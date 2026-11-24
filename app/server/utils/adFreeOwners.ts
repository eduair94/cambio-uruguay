// The site's own accounts browse without ads, without paying: anyone on the admin allowlist
// (`NUXT_ADMIN_EMAILS`) or on the ad-free list (`NUXT_AD_FREE_EMAILS`, owners who should not get
// the private dashboards). Pure, so the rule is tested without Firebase:
// tests/unit/adFreeOwners.test.ts.

export function parseEmailList(raw: unknown): string[] {
  return String(raw ?? '')
    .split(/[\s,;]+/)
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)
}

export function isComplimentaryAdFree(
  user: { email: string | null; emailVerified: boolean; anonymous: boolean },
  lists: { adminEmails?: unknown; adFreeEmails?: unknown }
): boolean {
  // Verified only: a password signup can claim any address until it opens the verification link.
  if (user.anonymous || !user.emailVerified || !user.email) return false
  const email = user.email.toLowerCase()
  return (
    parseEmailList(lists.adminEmails).includes(email) ||
    parseEmailList(lists.adFreeEmails).includes(email)
  )
}
