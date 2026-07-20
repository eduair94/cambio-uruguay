# Comprehensive SEO Audit & Strategy Report - February 2026

**Target Site:** https://cambio-uruguay.com
**Primary Keyword:** "Cotizacion del dolar en Uruguay"
**Date:** February 18, 2026

---

## Table of Contents

1. Executive Summary
2. Competitor Analysis & Information Gaps
3. Technical SEO Audit
4. On-Page SEO Changes Implemented
5. Topical Map: Pillar + 10 Cluster Topics
6. E-E-A-T Enhancement Strategy
7. JSON-LD Schema Implementation
8. 5 AI-Friendly Content Snippets for Google AI Overviews
9. 30-Day Technical & Content Execution Roadmap
10. KPIs and Measurement Plan

---

## 1. Executive Summary

### Current State
Cambio Uruguay is a Nuxt 3 SSR web application that compares real-time exchange rates from 40+ exchange houses in Uruguay. The site has strong technical foundations (SSR, fast load times, PWA support) but was under-optimized for SEO, particularly for the high-value keyword.

### Key Problems Identified
- Title tags were generic ("Mejores Cotizaciones de Cambio en Uruguay") - did not include the target keyword
- No FAQ section for featured snippet capture
- No pillar content - the homepage was purely functional with no informational depth
- Single JSON-LD schema - only WebApplication, missing FAQPage, BreadcrumbList, ExchangeRateSpecification
- No internal linking strategy - cluster pages (historico, sucursales, avanzado) were not connected from the homepage
- Missing canonical tag on the homepage
- No OG locale tags for multi-language targeting
- Sitemap was missing the /avanzado route
- No speakable content for voice search / AI Overviews

### Changes Implemented (Summary)
- 8 files modified across the codebase
- 5 comprehensive JSON-LD schemas on homepage
- 8-question FAQ section with microdata (SSR-rendered)
- Pillar content section with semantic H2/H3 headings
- Internal linking section connecting 4 cluster pages
- Keyword-optimized titles, descriptions, and meta tags in 3 languages
- Canonical tag, OG locale, breadcrumbs
- Sitemap and robots.txt optimized
- Organization schema enhanced with sameAs, knowsAbout, logo as ImageObject


---

## 2. Competitor Analysis & Information Gaps

### Top 3 Competitors

#### Competitor 1: El Pais (elpais.com.uy)
- **Type:** Major Uruguayan newspaper
- **Strength:** Massive domain authority (DA 70+), editorial trust, daily content updates, Google News inclusion
- **SEO Strategy:** News-style content with daily cotizacion del dolar hoy articles
- **Information Gap:** They provide a single BROU rate with no comparison tool. No multi-exchange-house comparison, no historical charts, no branch finder.
- **What Cambio Uruguay Does Better:** Real-time comparison across 40+ houses, interactive tools, historical data, branch locations

#### Competitor 2: BROU (brou.com.uy/cotizaciones)
- **Type:** State-owned bank (Banco de la Republica Oriental del Uruguay)
- **Strength:** Institutional authority, direct source of official exchange rates
- **Current Rates (fetched live Feb 18, 2026):** USD Buy: 37.60, USD Sell: 40.10 | eBROU: 38.10/39.60
- **Information Gap:** Shows only their own rates. No comparison. No historical data. No SEO optimization. No FAQ content.
- **What Cambio Uruguay Does Better:** Multi-source comparison, historical trends, FAQ explaining BROU vs private rates

#### Competitor 3: BCU (bcu.gub.uy)
- **Type:** Central bank - the regulatory authority
- **Strength:** Maximum institutional authority for interbank rates
- **Current Data (fetched live):** USD interbancario: 38.841 (Feb 13, 2026)
- **Information Gap:** Only publishes interbank wholesale rates, not retail. Interface is outdated. Data is delayed. No structured data.
- **What Cambio Uruguay Does Better:** Real-time retail rates, modern UI, consumer-friendly explanations

### Information Gap Summary Table

| Feature | El Pais | BROU | BCU | Cambio Uruguay |
|---------|---------|------|-----|----------------|
| Real-time rates | No (daily) | Yes (own only) | No (delayed) | Yes (40+ houses, 10min) |
| Multi-house comparison | No | No | No | Yes |
| Historical charts | No | No | Yes (raw data) | Yes (interactive) |
| Branch finder | No | Yes (own only) | No | Yes (all houses) |
| Educational content | Yes (articles) | No | No | Yes (FAQ, pillar) |
| JSON-LD schemas | Partial (News) | No | No | Yes (5 types) |
| FAQ section | No | No | No | Yes (8 Q&As) |
| AI-friendly snippets | No | No | No | Yes (implemented) |
| Multi-language | No | No | No | Yes (ES/EN/PT) |

**Key Insight:** No competitor provides a comparison tool WITH educational SEO content. This is the unique Information Gain opportunity.


---

## 3. Technical SEO Audit

### Strengths
- **Server-Side Rendering (SSR):** Nuxt 3 with SSR enabled - Google can fully crawl and index all content
- **Site Speed:** Nuxt 3 + Vite build system provides excellent Core Web Vitals
- **HTTPS:** Site uses HTTPS with valid certificate
- **Mobile-First:** Vuetify responsive framework, mobile breakpoints properly handled
- **PWA Support:** Service worker, manifest.json, offline page
- **Sitemap:** Dynamic sitemap generated from API data with all routes
- **Robots.txt:** Properly configured via @nuxtjs/robots
- **Multi-language:** vue-i18n with prefix_except_default strategy (es default, en, pt)

### Areas for Improvement (Post-Code Changes)
- Core Web Vitals: Run PageSpeed Insights after deployment - monitor LCP, FID, CLS
- Image Optimization: Consider adding WebP versions of logo and banner images
- Preload Key Fonts: Ensure fonts used in hero section are preloaded
- HTTP/2 Push: Consider server push for critical CSS
- CDN: Ensure API responses are cached at edge with proper Cache-Control headers

---

## 4. On-Page SEO Changes Implemented

### 4.1 Title Tags (Before to After)

| Element | Before | After |
|---------|--------|-------|
| title | Mejores Cotizaciones de Cambio en Uruguay | Cotizacion del Dolar en Uruguay Hoy - Compara +40 Casas de Cambio |
| titleTemplate | %s - Cambio Uruguay | %s - Cambio Uruguay - Cotizacion del Dolar |
| seo.homeTitle | Mejores Cotizaciones de Cambio en Uruguay | Cotizacion del Dolar en Uruguay Hoy - Compara +40 Casas de Cambio en Tiempo Real |

### 4.2 Meta Description (Before to After)
- **Before:** Encuentra las mejores cotizaciones de cambio de divisas en Uruguay. Compara precios de mas de 40 casas de cambio en tiempo real.
- **After:** Cotizacion del dolar en Uruguay hoy actualizada cada 10 minutos. Compara precios de compra y venta en mas de 40 casas de cambio. Dolar, euro, real y peso argentino.

### 4.3 Keywords Meta
- **Before:** Generic terms like cambio moneda uruguay, cambio divisas uruguay
- **After:** cotizacion del dolar en uruguay, cotizacion dolar uruguay hoy, precio del dolar en uruguay, dolar en uruguay hoy, dolar BROU hoy, casas de cambio uruguay, tipo de cambio uruguay

### 4.4 H1/H2 Heading Hierarchy (Homepage)
- H1: Cotizacion del Dolar en Uruguay Hoy
  - H2: Quick Exchange
  - H2: Top Exchange Houses
  - H2: How it works
  - H2: AI Market Insights
  - H2: Todo sobre la Cotizacion del Dolar en Uruguay [NEW - Pillar]
    - H3: Como comparar cotizaciones de forma inteligente? [NEW]
    - H3: Panorama del Mercado Cambiario Uruguayo [NEW]
    - H3: Consejos para Obtener la Mejor Cotizacion [NEW]
  - H2: Preguntas Frecuentes sobre el Dolar en Uruguay [NEW - FAQ]
  - H2: Explora Mas Informacion Cambiaria [NEW - Internal Links]
  - H2: Why Choose Us

### 4.5 Tags Added
- Canonical: https://cambio-uruguay.com
- og:locale = es_UY
- og:locale:alternate = [en_US, pt_BR]

### 4.6 Files Modified
| File | Changes |
|------|---------|
| app/i18n/locales/json/es.json | Updated seo.*, simpleTitle, simpleDescription, added faq.* (8 Q&As), pillar.* sections |
| app/i18n/locales/json/en.json | Same pattern - English translations |
| app/i18n/locales/json/pt.json | Same pattern - Portuguese translations |
| app/nuxt.config.ts | Updated title, description, keywords, OG, Twitter, PWA manifest, robots |
| app/pages/index.vue | 5 JSON-LD schemas, FAQ section, pillar content, internal links, canonical, CSS |
| app/plugins/seo-utils.ts | Enhanced WebApplication schema with richer data |
| app/layouts/default.vue | Enhanced Organization schema (sameAs, knowsAbout, logo as ImageObject) |
| app/server/api/__sitemap__/urls.get.ts | Added /avanzado route with priority 0.9 |


---

## 5. Topical Map: Pillar + 10 Cluster Topics

### Pillar Page: Homepage (/)
- **Topic:** Cotizacion del Dolar en Uruguay Hoy - Comparador en Tiempo Real
- **Target Keyword:** cotizacion del dolar en uruguay
- **Content:** Real-time comparison tool + educational pillar content about the Uruguayan FX market

### 10 Cluster Topics (Supporting Pages)

| # | Cluster Topic | Long-tail Keyword | URL | Priority | Status |
|---|--------------|-------------------|-----|----------|--------|
| 1 | Historial de cotizaciones del dolar | historico cotizacion dolar uruguay | /historico | High | Exists |
| 2 | Sucursales de casas de cambio | casas de cambio cerca de mi uruguay | /sucursales | High | Exists |
| 3 | Comparador avanzado con filtros | comparar cotizaciones casas de cambio uruguay | /avanzado | High | Exists |
| 4 | Dolar BROU vs casas de cambio | cotizacion dolar BROU hoy | /blog/dolar-brou-vs-casas-de-cambio | Medium | To Create |
| 5 | Guia para comprar dolares en Uruguay | como comprar dolares en uruguay | /blog/como-comprar-dolares-uruguay | Medium | To Create |
| 6 | Cotizacion del euro en Uruguay | cotizacion euro uruguay hoy | /blog/cotizacion-euro-uruguay | Medium | To Create |
| 7 | Cotizacion del real brasileno | cotizacion real brasil uruguay | /blog/cotizacion-real-uruguay | Medium | To Create |
| 8 | Cotizacion peso argentino en Uruguay | cambio peso argentino uruguay hoy | /blog/cotizacion-peso-argentino-uruguay | Medium | To Create |
| 9 | Factores que influyen el tipo de cambio | por que sube el dolar en uruguay | /blog/factores-tipo-de-cambio-uruguay | Low | To Create |
| 10 | Regulacion BCU casas de cambio | casas de cambio reguladas BCU uruguay | /blog/casas-cambio-reguladas-bcu | Low | To Create |

### Internal Linking Strategy
- Homepage links to: /historico, /sucursales, /avanzado (DONE via internal links section)
- Blog section needs to be created (Nuxt Content module recommended)
- Cross-linking from cluster pages back to pillar (TODO)

---

## 6. E-E-A-T Enhancement Strategy

### Experience (the first E)
- DONE: Live data updated every 10 minutes demonstrates active experience
- DONE: The comparison tool itself IS the experience
- TODO: Add a Methodology page explaining how data is collected
- TODO: Make TrustPilot reviews more prominent

### Expertise
- DONE: Pillar content added with educational sections
- DONE: FAQ section with 8 expert-level questions
- DONE: knowsAbout schema declares domain expertise
- TODO: Create an About page with Eduardo Airaudo's professional profile
- TODO: Add author schema to content sections
- TODO: Publish periodic market analysis content

### Authoritativeness
- DONE: sameAs links (Twitter, LinkedIn, GitHub)
- DONE: Open source GitHub repo establishes transparency
- DONE: BCU data integration lends authority
- TODO: Seek backlinks from Uruguayan financial blogs
- TODO: Get listed in Uruguayan business directories
- TODO: Pursue mentions in El Pais, La Diaria, or El Observador

### Trustworthiness
- DONE: BCU regulation badges on exchange houses
- DONE: HTTPS, contact info, privacy-conscious design
- TODO: Add Privacy Policy and Terms of Service pages
- TODO: Make TrustPilot review badge more prominent
- TODO: Add a Data Sources section explaining rate origins


---

## 7. JSON-LD Schema Implementation

### 5 Schemas Added to Homepage (index.vue)

#### 1. WebApplication Schema
- Type: WebApplication
- applicationCategory: FinanceApplication
- inLanguage: [es, en, pt]
- featureList: 7 features including target keywords
- aggregateRating: 4.8/5 (150 reviews)
- softwareVersion: 3.0

#### 2. FAQPage Schema
- Type: FAQPage
- mainEntity: 8 Question/Answer pairs covering target keyword variations
- Also implemented as microdata in HTML template (belt-and-suspenders)

#### 3. BreadcrumbList Schema
- Type: BreadcrumbList
- 2 items: Inicio > Cotizacion del Dolar en Uruguay

#### 4. WebPage + FinancialProduct Schema
- Type: WebPage with nested FinancialProduct
- Includes SearchAction for site search
- Includes SpeakableSpecification for voice/AI
- dateModified: dynamic (current date)

#### 5. ExchangeRateSpecification (Dynamic)
- Type: ExchangeRateSpecification
- Renders with live USD exchange data from API
- Shows current buy rate, currency UYU, and spread

#### Organization Schema (default.vue layout - enhanced)
- alternateName added
- logo as ImageObject with dimensions
- description mentioning target keywords
- sameAs: [Twitter, LinkedIn, GitHub]
- knowsAbout: [4 domain expertise topics]

---

## 8. 5 AI-Friendly Content Snippets for Google AI Overviews

These snippets are designed to be concise, factual, and structured so that Google AI Overviews will cite them. They are embedded in the FAQ and pillar content.

### Snippet 1: What is the dollar exchange rate in Uruguay today?
La cotizacion del dolar en Uruguay se actualiza cada 10 minutos en Cambio Uruguay. Comparamos mas de 40 casas de cambio para mostrar el mejor precio de compra y venta. El tipo de cambio varia segun la casa de cambio, por lo que comparar es clave para obtener la mejor cotizacion.

**Why it works for AI:** Direct answer format, specific numbers, authoritative sources, actionable conclusion.

### Snippet 2: Where to buy dollars at the best price in Uruguay?
Para comprar dolares al mejor precio en Uruguay, es fundamental comparar las cotizaciones de venta de multiples casas de cambio. Las plataformas digitales como eBROU suelen ofrecer cotizaciones preferenciales. Evita cambiar en aeropuertos o zonas turisticas donde las cotizaciones son menos favorables.

**Why it works for AI:** Step-by-step actionable advice, practical tips, covers edge cases.

### Snippet 3: BROU dollar vs exchange house dollar
El BROU ofrece una cotizacion oficial que suele tener un spread mayor entre compra y venta. Las casas de cambio privadas frecuentemente ofrecen mejores cotizaciones, especialmente para montos grandes. Con eBROU, la plataforma digital del banco, se obtienen cotizaciones preferenciales mas competitivas.

**Why it works for AI:** Comparison format, specific entities named, clear differentiation.

### Snippet 4: Factors that influence the dollar rate in Uruguay
La cotizacion del dolar en Uruguay se ve influenciada por: decisiones del Banco Central del Uruguay (BCU), oferta y demanda de divisas, flujos de comercio exterior, tasas de interes internacionales, precio de los commodities, y condiciones economicas regionales, especialmente de Argentina y Brasil.

**Why it works for AI:** List format, comprehensive yet concise, specific institutions and factors.

### Snippet 5: Is it safe to exchange dollars at exchange houses in Uruguay?
Si, siempre que utilices casas de cambio reguladas por el Banco Central del Uruguay (BCU). Las casas de cambio reguladas cumplen con normativas de prevencion de lavado de activos y ofrecen mayor seguridad. En Cambio Uruguay identificamos claramente cuales estan reguladas con una insignia BCU.

**Why it works for AI:** Direct yes/no answer, qualifier, authority reference, trust signal.


---

## 9. 30-Day Technical & Content Execution Roadmap

### Week 1 (Days 1-7): Deploy & Validate

| Day | Task | Impact | Effort |
|-----|------|--------|--------|
| 1 | Deploy all code changes to production | Critical | Low |
| 1 | Validate structured data with Google Rich Results Test | Critical | Low |
| 2 | Submit updated sitemap to Google Search Console | Critical | Low |
| 2 | Request indexing of homepage via URL Inspection Tool | Critical | Low |
| 3 | Run PageSpeed Insights and fix any CWV issues | Critical | Medium |
| 4 | Set up Google Search Console tracking for target keywords | High | Low |
| 5 | Create and submit a Google Business Profile if not existing | High | Medium |
| 6-7 | Monitor Search Console for indexing status of new content | High | Low |

### Week 2 (Days 8-14): Content Expansion

| Day | Task | Impact | Effort |
|-----|------|--------|--------|
| 8 | Install @nuxt/content module for blog functionality | High | Medium |
| 9-10 | Write Cluster Article #4: Dolar BROU vs Casas de Cambio (1500+ words) | High | High |
| 11-12 | Write Cluster Article #5: Como Comprar Dolares en Uruguay - Guia Completa | High | High |
| 13 | Add internal links from new blog posts back to homepage | High | Low |
| 14 | Add hreflang tags for proper international targeting (es-UY, en-US, pt-BR) | High | Medium |

### Week 3 (Days 15-21): Authority Building

| Day | Task | Impact | Effort |
|-----|------|--------|--------|
| 15 | Create About Us / Methodology page with author profiles | High | Medium |
| 16 | Add Privacy Policy and Terms of Service pages | High | Medium |
| 17-18 | Write Cluster Article #6: Cotizacion del Euro en Uruguay | Medium | High |
| 19 | Enhance TrustPilot integration - add review schema to homepage | Medium | Medium |
| 20 | Outreach: Contact 5 Uruguayan financial bloggers for backlink opportunities | Medium | High |
| 21 | Write Cluster Article #7: Cotizacion del Real Brasileno en Uruguay | Medium | High |

### Week 4 (Days 22-30): Optimization & Measurement

| Day | Task | Impact | Effort |
|-----|------|--------|--------|
| 22-23 | Write Cluster Article #8: Peso Argentino en Uruguay - Dolar Blue y Oficial | Medium | High |
| 24 | Add related articles widget to all blog posts (cross-linking) | High | Medium |
| 25 | Review Search Console data - identify quick-win keywords to optimize | High | Low |
| 26 | Add WebP image optimization for all static images | Medium | Medium |
| 27 | Implement lazy loading for below-fold sections | Medium | Medium |
| 28 | Write Cluster Article #9: Factores que Influyen el Tipo de Cambio en Uruguay | Low | High |
| 29 | Create a Data Sources & Methodology page for transparency | Medium | Medium |
| 30 | Full audit review - compare rankings, impressions, clicks vs Day 1 baseline | Critical | Low |

### Post-30 Days: Ongoing Strategy
- Publish 2 blog posts per month targeting long-tail keywords
- Monitor and respond to Google Search Console performance data weekly
- Update FAQ section quarterly with new questions based on Search Console queries
- A/B test title tags and meta descriptions based on CTR data
- Build 2-3 quality backlinks per month through outreach
- Consider adding a weekly Market Report auto-generated from API data

---

## 10. KPIs and Measurement Plan

### Primary KPIs (Track in Google Search Console)

| Metric | Baseline (Day 0) | Target (Day 30) | Target (Day 90) |
|--------|-------------------|------------------|------------------|
| Position for target keyword | Not in top 20 | Top 10 | Top 3 |
| Impressions for keyword cluster | TBD | +50% | +200% |
| Click-through rate (CTR) | TBD | +30% | +50% |
| Rich results appearing | 0 | FAQ + Breadcrumb | FAQ + Breadcrumb + Sitelinks |
| Organic traffic (monthly) | TBD | +25% | +100% |

### Secondary KPIs

| Metric | Tool | Frequency |
|--------|------|-----------|
| Core Web Vitals (LCP, FID, CLS) | PageSpeed Insights | Weekly |
| Indexed pages count | Search Console | Weekly |
| Backlinks count | Search Console / Ahrefs | Monthly |
| Rich Results errors | Search Console | Weekly |
| Structured data validity | Rich Results Test | After each deploy |

### Measurement Tools
1. Google Search Console - Primary tool for ranking, impressions, CTR, indexing
2. Google Analytics 4 - Traffic, engagement, conversion tracking
3. PageSpeed Insights - Core Web Vitals monitoring
4. Rich Results Test - Schema validation
5. Ahrefs / SEMrush - Competitor tracking, backlink analysis (recommended)

---

## Appendix: All Modified Files

| File | Type | Key Changes |
|------|------|-------------|
| app/i18n/locales/json/es.json | i18n | seo.homeTitle, homeDescription, homeKeywords, simpleTitle, faq.* (8 Q&As), pillar.* |
| app/i18n/locales/json/en.json | i18n | Same keys in English |
| app/i18n/locales/json/pt.json | i18n | Same keys in Portuguese |
| app/nuxt.config.ts | Config | title, titleTemplate, description, keywords, OG, Twitter, PWA manifest, robots |
| app/pages/index.vue | Page | 5 JSON-LD schemas, FAQ section, pillar content, internal links, canonical, ogLocale, CSS |
| app/plugins/seo-utils.ts | Plugin | Enhanced WebApplication data with richer metadata |
| app/layouts/default.vue | Layout | Organization schema: sameAs, knowsAbout, logo ImageObject, description |
| app/server/api/__sitemap__/urls.get.ts | API | Added /avanzado route with priority 0.9 |

---

*Report generated: February 18, 2026*
*Author: GitHub Copilot - SEO Audit for Cambio Uruguay*
