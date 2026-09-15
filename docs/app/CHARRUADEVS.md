# Termómetro del mercado IT (r/CharruaDevs) — `/mercado-it-uruguay`

Qué tan negativa es la visión sobre el desarrollo de software como profesión en r/CharruaDevs, el
sub de desarrolladores de Uruguay, medida sobre todo su historial y mantenida al día por un job.

## Flujo

```
Arctic Shift (posts + comentarios) ─┐
API de Reddit (votos, borrados) ────┼─ currency-charruadevs (12:14 UTC) ─► APP DB ─► /api/charruadevs/summary ─┐
Gemini 3.5 Flash-Lite (askJSON) ────┤   classes/charruadevs/*              charruadevstexts                    ├─ /mercado-it-uruguay
FRED: Indeed software postings ─────┘                                      charruadevssnapshots ─► /api/charruadevs/search ┘
```

- **Corpus**: todos los posts; de los comentarios, los "candidatos" (palabras de trabajo/mercado o
  hilo de mercado, `filter.ts`). En la siembra: 13.900 posts y 207.109 comentarios (abr-2021 →
  15-sep-2026), de los que ~140k comentarios son candidatos y se clasificaron todos.
- **Etiqueta** (`rubric.ts`): `rel` (¿habla del mercado o la carrera?), `stance` −2…+2, hasta 3
  temas, visión de la IA, relato en primera persona (busca / consiguió / lo echaron / contrata) y,
  en posts, perfil del autor. Una pregunta angustiada es −1; una oferta sin opinión es 0.
- **Ponderación** (`analyze.ts`): los posts pesan 1; cada comentario pesa candidatos/clasificados de
  su mes, así un hueco de clasificación no achica un mes. Con el corpus completo el peso es ~1.
- **Control sin IA** (`lexicon.ts`): frases de alarma literales por cada 1.000 comentarios. Si el
  clasificador inventara el pesimismo, esa curva no lo acompañaría.

## Validación (2026-09-15)

Muestra ciega: 60 posts y 60 comentarios leídos por Claude sin ver la etiqueta del modelo.

| | posts | comentarios |
|---|---|---|
| ¿es del mercado? (acuerdo) | 78 % | 67 % |
| mismo signo (neg/neutral/pos) | 69 % | 61 % |
| postura a ±1 punto | 100 % | 100 % |
| kappa de Cohen (4 clases) | 0,33 | 0,25 |
| sesgo modelo − humano | −0,12 | −0,06 |

Lectura honesta: el modelo es "justo" como clasificador fino (kappa 0,25–0,33) pero nunca se va a
más de un punto, y su sesgo de nivel es chico y apenas pesimista. El desacuerdo típico es neutral
contra ±1, y el modelo cuenta como "del mercado" textos que un humano deja afuera (esos suelen ser
neutrales, así que diluyen la negatividad, no la inflan). Las tendencias son más confiables que los
niveles: el error es el mismo todos los meses, y la curva sin IA se mueve igual.

## Operación

- Diario: `node dist/sync_charruadevs.js`. Baja los dos últimos meses completos, clasifica sólo lo
  nuevo, recalcula esas dos filas mensuales, refresca votos/borrados de los últimos 30 días y rehace
  el snapshot. Lo que Gemini no etiqueta no se guarda y se reintenta al día siguiente.
- Siembra: `node dist/sync_charruadevs.js --seed <dir>` con `texts.jsonl` (un doc por texto, forma
  `charruadevstexts`) y `state.json` (`{ months: MonthRow[] }`). Se hizo una vez, el 2026-09-15.
- `--dry-run` calcula todo y no escribe.
- Guardas: sin `APP_MONGO_URI` se niega; un snapshot con 10 % menos textos que el guardado no se
  escribe; un mes que Arctic Shift devuelve vacío no pisa la fila guardada.
- Privacidad: no se guarda ningún autor. Lo borrado hoy en Reddit (autor o moderación) queda
  `gone: true`: cuenta en los agregados anónimos pero no aparece en el buscador ni en las citas.

## Cambiar la rúbrica o el modelo

Es un cambio de metodología: la serie deja de ser comparable consigo misma. Hacerlo implica
reclasificar todo el corpus con la versión nueva (no sólo lo nuevo), rehacer la validación ciega y
actualizar `validation.ts` y esta página con la fecha.
