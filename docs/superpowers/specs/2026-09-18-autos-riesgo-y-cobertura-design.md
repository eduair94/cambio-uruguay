# Autos: por qué está barato — riesgo declarado, cobertura de ficha y IA donde el parser no llega

**Fecha:** 2026-09-18 · **Estado:** aprobado (orden permanente de auto-aprobación)

## El problema, medido

El directorio tiene 18.426 avisos vigentes y publica 84 oportunidades. Tres mediciones sobre la base
de producción (2026-09-18) dicen dónde está lo que falta:

| medición | resultado |
|---|---|
| avisos con alguna bandera de riesgo | **185 de 18.426 (1 %)** |
| avisos que no pueden entrar a una cohorte | **8.662 (47 %)**: sin versión 7.056, sin motor 2.959, sin caja 2.345 |
| avisos con ficha propia leída | **1.582 (8 %)**; de Mercado Libre, **122 de 16.865** |
| descuento medido de los que sí declaran riesgo | papeles/deuda **−21 %** (n=11, 91 % por debajo), chocado **−35 %** (n=3) |
| descuento de `financing` y `price_mismatch` | **≈0 %** (n=38): no son riesgo, son truco de aviso |

Tres conclusiones:

1. **El riesgo casi no se ve porque no leemos la descripción.** Las banderas salen del título, y el
   vendedor escribe "tiene deuda de SUCIVE" o "chocado leve" en el cuerpo del aviso. De Mercado
   Libre, que es el 89 % del catálogo, tenemos 122 descripciones.
2. **La versión no falta por falta de IA, falta por falta de vocabulario.** 515 de 932 modelos tienen
   la lista de versiones de ML **vacía**, y donde existe, el título usa otra palabra: el vocabulario
   del Sandero Stepway dice "Privilegio" y el título dice "Privilege"; el del Cruze dice "Lt/Ltz" y
   el título dice "Premier Plus"; el del T-Cross dice "Trendline" y el título dice "Trend".
3. **El descuento por riesgo es real y medible, y nadie lo publica.** Cuánto descuenta el mercado
   uruguayo por deuda, por choque o por recupero de seguro es un dato que sale de nuestros propios
   avisos y no existe en ningún lado.

Y una trampa que ya está resuelta en el código y hay que respetar: `affirmed()` en `normalize.ts`
descarta lo negado. Medir sin eso cuenta **"sin deuda"** y **"sin choques"** como riesgo — que es
exactamente al revés, son argumentos de venta. De 43 "deuda" crudas, la mayoría son "sin deuda".

## Qué se construye

### A. Cobertura de ficha propia (`currency-autos-detail`)

Un job nuevo, horario, con presupuesto de lecturas, que baja la página del propio aviso de Mercado
Libre y guarda versión + descripción + estado. **Una lectura sirve a las dos cosas**: destraba la
cohorte (versión) y habilita el riesgo (descripción). Cola de prioridad:

1. sin ficha y **barato contra una cohorte floja** (≥12 % bajo la mediana de modelo+año+km): ahí hay
   un motivo que explicar;
2. sin ficha y **bloqueando cohorte** (sin versión/motor/caja), ordenado por cuántos hermanos de
   cohorte destrabaría;
3. ficha vieja de una oportunidad publicada (refresco);
4. el resto, por más nuevo.

Presupuesto: 700 lecturas por corrida a 1,5 s ≈ 18 min. El atraso de 16.7k se cubre en un día y
después es mantenimiento. No publica nada por sí mismo.

### B. Versión: vocabulario propio y alias

`classes/autos/catalog/trims.ts`:

- **Minado del propio corpus**: los tokens que sobran después del modelo, descontando ruido conocido
  (año, cilindrada, km, cv, "extra full", "full", "at/mt", "4x4", nafta/diésel, colores), contados
  por modelo. Un token que aparece en ≥3 avisos del mismo modelo y no en todos es candidato a versión.
- **La versión de la ficha propia** (`detail.version`) entra al vocabulario: es la palabra que usa ML.
- **Alias por raíz**: "Privilege"≈"Privilegio", "Trend"≈"Trendline", "Comfort"≈"Confort"≈"Comfortline".
  Se unifican por prefijo común de ≥5 letras dentro del mismo modelo, nunca entre modelos.

Objetivo medible: bajar los 7.056 sin versión. Se mide antes/después sobre el corpus real y se
reporta el número; si no mejora, no se mergea.

### C. Riesgo declarado (`classes/autos/risk.ts`)

Taxonomía sobre el texto **del propio vendedor**, con la frase como evidencia:

| categoría | qué dice el aviso | gravedad |
|---|---|---|
| `deuda` | deuda de SUCIVE, prenda, embargo, multas, "debe 52 mil" | alta |
| `papeles` | sólo libreta, sin título, sucesión, matrículas entregadas, a nombre de terceros | alta |
| `siniestro` | chocado, granizo, inundado, incendiado, volcado | alta |
| `recupero` | recuperado de seguro, resto de aseguradora, salvamento | alta |
| `mecanica` | motor fundido, no arranca, para repuestos, para desarme | alta |
| `chapa_extranjera` | chapa argentina/brasilera, empadronado afuera | media |
| `uso_intensivo` | ex taxi, remise, flota, escuela de manejo | media |

Reglas duras:

- Todo pasa por `affirmed()`: lo negado no cuenta.
- Cada riesgo guarda la **frase textual** (≤160 caracteres, limpiada de teléfonos/links con
  `cleanPublicText`) y de dónde salió (título o descripción). **Se publica la cita, no una
  conclusión nuestra**: el que afirma es el vendedor.
- `financing` y `price_mismatch` **no son riesgo** (descuento medido ≈0). Quedan como ruido de aviso.

`classes/autos/riskAnalyze.ts` mide el descuento contra una **cohorte limpia**: misma clave de
cohorte, comparables con cero riesgos declarados, mínimos del tier exploratorio (n≥5, 3 vendedores).
Publica por aviso el gap y la mediana, y por categoría el descuento mediano con su n.

### D. Gemini donde el parser no llega

1. **Hechos** (`classes/autos/llm/facts.ts` → APP DB `carllmfacts`, cacheado por clave + hash del
   texto): versión/motor/caja **restringidos por enum** al vocabulario del modelo, y riesgos con su
   cita. **Portón anti-alucinación**: si la cita no es subcadena literal del texto de entrada, se
   descarta la respuesta entera. Sin `GEMINI_API_KEY` el módulo es inerte.
2. **Fotos** (`classes/autos/llm/vision.ts`, con `askJSONWithImages` nuevo en `classes/gemini.ts`):
   sólo para la lista corta (oportunidades de gap alto + avisos con riesgo declarado), hasta 3 fotos.
   Pregunta: ¿el auto de la foto es el modelo/carrocería declarados?, ¿se ve daño?, ¿es una foto de
   catálogo en vez del auto?
   **La visión sirve para excluir en silencio y para corroborar lo que el vendedor ya declaró, nunca
   para acusar.** Una oportunidad que no pasa el control de fotos no se publica; un aviso que declara
   choque puede mostrar "las fotos lo confirman". Nunca se publica "esta foto muestra un choque" sobre
   un aviso que no lo declara.
3. **Señal barata sin IA**: la misma foto en avisos de vendedores distintos (foto reutilizada).

Topes por corrida: `AUTOS_LLM_MAX_CALLS` (200), `AUTOS_VISION_MAX` (60).

### E. Lo que ve la persona que busca una oportunidad

- **Página nueva `/autos-chocados-y-con-deuda-uruguay`**: qué descuenta el mercado por cada riesgo
  (mediana y n, medido sobre nuestros avisos), la lista de avisos vigentes con su cita y su descuento,
  y **cómo verificar cada riesgo antes de pagar** (SUCIVE, Registro de la Propiedad Automotor,
  título con leyenda de recuperado, chapa extranjera). Con fuentes y fecha.
- **`/oportunidades-autos-usados-uruguay`** gana la columna que falta: **por qué está barato**. Si hay
  riesgo declarado, la cita; si no, "sin motivo declarado", que es justamente la oportunidad.

## Qué NO se hace

- No se afirma nada que el aviso no diga. No hay "este auto está chocado" de cosecha propia.
- No se publica patente, cara ni dato de contacto de nadie, ni se pide la ficha a un tercero.
- No se promete que un auto sin riesgo declarado esté limpio: la ausencia no es afirmación.
- No se recalcula la mediana con avisos riesgosos adentro: la cohorte de referencia es limpia.
