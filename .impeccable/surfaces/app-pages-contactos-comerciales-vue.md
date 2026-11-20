---
version: 1
slug: "app-pages-contactos-comerciales-vue"
primary_target: "app/pages/contactos-comerciales.vue"
related_targets: ["app/utils/commercialContactMessages.ts"]
---

Mode: Operate. Private contact lookup for the site's administrator.

The user needs to find public business reception/branch phone numbers for car dealerships and
real estate agencies. Use the established directory language from DESIGN.md: compact heading,
search and sector/platform filters, spacious company rows, source and consultation date beside
each phone. Desktop pairs identity with contact; mobile stacks those two groups.

Only manually corroborated business lines. Do not include private sellers or infer a Marketplace
presence from a Facebook page. Distinguish company-owned links from indexed adverts whose
availability was not checked. Keep loading, sign-in, forbidden, failure, empty and copied states
explicit. No automatic outreach. Admin API only; data clears when sessions change.

The service being offered remains unspecified, so the page provides lookup and copying without
inventing a sales pitch. Initial coverage is a small curated selection, not an exhaustive directory.
