# Tipo de producto en la calculadora de impuestos de importación

**Fecha:** 2026-06-19
**Herramienta:** `app/pages/herramientas/calculadora-impuestos-importacion.vue`

## Objetivo

Permitir elegir el **tipo de producto** en la calculadora de importación, aclarando
para cada categoría:

- cuáles **no pagan IVA** (exentos),
- cuáles **sí pagan** (y a qué tasa: 22% básica / 10% mínima),
- cuáles **requieren trámites adicionales** (MSP / URSEC / MGAP / SMA),
- cuáles están **prohibidos** por el régimen.

La categoría además **ajusta el cálculo** (IVA según producto, IMESI en régimen
general), no solo informa. Aplica a **ambos regímenes** (courier y general).

## Alcance (decidido en brainstorming)

- **Informar + ajustar cálculo.** La categoría cambia los números; no se suma costo
  de trámite (ej. tasa URSEC/VUCE) al landed cost.
- **Ambos regímenes:** courier (compra online) y general.
- **Prohibidos:** se muestra aviso prominente pero el estimado sigue visible
  (atenuado) para que el usuario vea la math y el motivo.
- **IMESI:** campo editable (no hardcodeado). Las tasas IMESI varían de 0 a 100%+
  según el producto; prefijar un único número engañaría. La categoría solo decide
  si el campo IMESI **aparece** (régimen general).

## Arquitectura

Patrón data-driven, espejo de `courierShipping.ts` / `importTax.ts`:

### 1. Catálogo de datos — `app/utils/importProductTypes.ts`

Funciones/datos puros (sin runtime Vue), unit-testables.

```ts
export type IvaTreatment = 'exento' | 'minima' | 'basica' // 0 / 10 / 22
export type Organism = 'MSP' | 'URSEC' | 'MGAP' | 'SMA'

export interface ImportProcedure {
  organism: Organism
  note: string
  url?: string
}

export interface ImportProductType {
  id: string
  label: string
  icon: string                  // mdi-*
  iva: IvaTreatment
  imesi?: boolean               // IMESI aplica (régimen general)
  procedures?: ImportProcedure[]
  prohibited?: boolean          // prohibido en ambos regímenes
  courierProhibited?: boolean   // OK formal, NO por courier (bienes IMESI, etc.)
  note?: string
}

export const IMPORT_PRODUCT_TYPES: ImportProductType[] = [ /* ver catálogo */ ]

/** Mapea tratamiento IVA → tasa numérica. */
export function ivaPctFor(t: IvaTreatment): number // exento 0, minima 10, basica 22

/** Resuelve parámetros fiscales de una categoría. */
export function resolveProductTax(type: ImportProductType): {
  ivaPct: number
  imesiApplies: boolean
}

export function productTypeById(id: string): ImportProductType
```

JSDoc en cabecera con fecha de verificación (2026-06-19), aclaración de que son
estimadores y fuentes (Aduanas, MSP, URSEC/VUCE, MGAP, DGI).

### 2. Catálogo de categorías

| id | Categoría | IVA | IMESI | Trámite | Courier |
|---|---|---|---|---|---|
| `general` | General / otros (default) | básica 22% | — | — | ✅ |
| `electronica` | Electrónica (sin radio): laptops, tablets, consolas | 22% | — | — | ✅ |
| `radiofrecuencia` | Celulares / radiofrecuencia, drones, GPS, routers | 22% | — | **URSEC** (VUCE) | ✅ c/permiso |
| `ropa` | Ropa, calzado y accesorios | 22% | — | — | ✅ |
| `libros` | Libros y material impreso (diarios, revistas) | **exento 0%** | — | — | ✅ |
| `juguetes` | Juguetes / hobby | 22% | — | — | ✅ |
| `medicamentos` | Medicamentos | **mínima 10%** | — | **MSP** (receta) | ⚠️ restringido |
| `suplementos` | Suplementos y vitaminas | 22% | — | **MSP** | ⚠️ |
| `cosmeticos` | Cosméticos y perfumería | 22% | **sí** | MSP (cantidad) | ❌ courier |
| `medicos` | Productos médicos / ópticos (lentes, tensiómetro) | 22% | — | **MSP** | ✅ c/trámite |
| `alimentos` | Alimentos / comestibles | 22% | — | **MGAP/MSP** | ⚠️ limitado |
| `agro` | Plantas, semillas, fertilizantes | 22% | — | **MGAP** | ⚠️ |
| `alcohol_tabaco` | Bebidas alcohólicas / tabaco | 22% | **sí** | — | ❌ courier |
| `vehiculos` | Vehículos, motos y repuestos | 22% | **sí** | — | ❌ courier (repuestos moto usados prohibidos) |
| `armas` | Armas, réplicas, airsoft | 22% | — | **SMA (Ejército)** | ❌ courier |
| `prohibidos` | Prohibidos: vaper/cig. electrónico, pirotecnia, inflamables, baterías sueltas/power banks, drogas | — | — | — | ❌ **prohibido** |

Notas de exactitud:
- `iva` es el tratamiento general DGI; el régimen courier hoy grava la franquicia
  al 22% salvo excepción TIFA. Con tipo de producto, libros → 0% y medicamentos →
  10% sobre la porción gravada.
- IMESI no se hardcodea: la categoría solo marca que aplica.
- Lista no taxativa (Aduanas: "de carácter no taxativo"); disclaimers lo aclaran.

### 3. Integración con el cálculo

- `courierImport` ya acepta `ivaPct`. La página pasa `ivaPctFor(categoria.iva)`.
  La excepción USA-TIFA (≤ US$200) sigue forzando IVA 0% por encima del producto.
- `generalImport` ya acepta `ivaPct` e `imesiPct`. La página pasa el IVA de la
  categoría; si `imesi`, muestra el campo IMESI (hoy oculto) prefijado con un
  placeholder editable + hint "varía según producto".
- `prohibited` (ambos) o `courierProhibited` (en régimen courier) → `VAlert` roja;
  el resultado se sigue renderizando atenuado.

### 4. UI (`calculadora-impuestos-importacion.vue`)

- `VSelect` "Tipo de producto" cerca del tope, visible en ambos regímenes.
  Default `general` ⇒ comportamiento idéntico al actual (backward-compat).
- Panel de estado bajo el selector:
  - chip de IVA (Exento / 10% / 22%),
  - chips de trámite por organismo (con link a VUCE / MSP),
  - `VAlert` de prohibición cuando corresponde al régimen activo.
- Régimen general: el campo IMESI (%) aparece solo si la categoría lo marca.

### 5. Contenido y fuentes

- Actualizar `#content`, `faq`, `#disclaimer` para explicar tipos de producto,
  trámites y prohibiciones.
- Ampliar `sources` con MSP, URSEC/VUCE, MGAP y la página de Aduanas de
  mercaderías controladas / prohibidas bajo encomiendas postales.

### 6. Tests

- `app/tests/unit/importProductTypes.test.ts`: `ivaPctFor`, `resolveProductTax`,
  integridad del catálogo (ids únicos, flags coherentes).
- Ampliar `app/tests/unit/importTax.test.ts`: courier con IVA exento (libros) y
  10% (medicamentos); general con IMESI activo; TIFA sigue forzando 0%.

## Fuentes

- Aduanas — ¿Qué mercadería no puedo traer bajo encomiendas postales?:
  https://www.aduanas.gub.uy/innovaportal/v/25107/3/innova.front/que-mercaderia-no-puedo-traer-bajo-el-regimen-de-encomiendas-postales-internacionales.html
- Aduanas — Mercaderías controladas por otros organismos:
  https://www.aduanas.gub.uy/innovaportal/v/25358/15/innova.front/
- VUCE / URSEC (homologación radiofrecuencia): https://vuce.gub.uy/
- Gripper — Envíos con restricciones: https://www.gripper.com.uy/restricciones
- FedEx Uruguay — Artículos prohibidos: https://www.fedex.com/es-uy/shipping/prohibited-items.html
- DGI — IVA e impuestos: https://www.dgi.gub.uy

## Fuera de alcance (YAGNI)

- Búsqueda por código NCM/HS (miles de partidas).
- Cálculo de tasas IMESI exactas por producto.
- Costeo del trámite (tasa URSEC/VUCE/MSP) en el landed cost.
