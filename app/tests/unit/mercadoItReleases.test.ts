// Los marcadores de lanzamientos de IA sobre /mercado-it-uruguay.
//
// El test lee la página de disco porque lo que puede pudrirse en silencio acá no es una función:
// es el cableado. Un marcador que se cae, un tooltip que deja de pasarse, una serie trimestral que
// alguien decide marcar "para que quede igual", o la tabla sin `data-label` — todo eso sigue
// compilando, sigue pintando un gráfico y nadie se entera. Por eso las aserciones son sobre el
// texto del archivo y no sobre un render: el contrato vive en cómo está escrito el archivo.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { AI_RELEASES, releaseMonth } from '../../utils/aiReleases'

const page = readFileSync(join(__dirname, '../../pages/mercado-it-uruguay.vue'), 'utf8')

describe('la página usa la lista editorial y no una copia propia', () => {
  it('importa de ~/utils/aiReleases', () => {
    expect(page).toContain("from '~/utils/aiReleases'")
    for (const name of [
      'AI_RELEASES',
      'beforeAfter',
      'markReleaseMonths',
      'releaseMonth',
      'releasesInMonth',
      'riseSplit',
    ]) {
      expect(page).toContain(name)
    }
  })

  it('no vuelve a escribir fechas de lanzamiento en la página', () => {
    // Si alguien agrega una fecha acá, deja de estar verificada contra el dominio del fabricante.
    for (const r of AI_RELEASES) expect(page).not.toContain(`'${r.date}'`)
  })
})

describe('los marcadores van sólo en las series mensuales', () => {
  // Un trimestre tapa dos o tres lanzamientos: un punto ahí no distingue nada, y marcarlo sería
  // exactamente la correlación espuria que la sección se propone no publicar.
  const dataset = (name: string) => {
    const start = page.indexOf(`const ${name} = computed(`)
    expect(start, `no encuentro ${name}`).toBeGreaterThan(-1)
    return page.slice(start, page.indexOf('\n})', start))
  }

  it('marca la curva, las menciones de IA y las frases de alarma', () => {
    expect(dataset('curveData').match(/markReleaseMonths\(/g)).toHaveLength(2)
    expect(dataset('aiMentionsData')).toContain('markReleaseMonths(')
    expect(dataset('alarmData')).toContain('markReleaseMonths(')
  })

  it('no marca ninguna serie trimestral', () => {
    expect(dataset('eventsData')).not.toContain('markReleaseMonths')
    expect(dataset('aiViewData')).not.toContain('markReleaseMonths')
  })

  it('los tres gráficos mensuales llevan el tooltip y el trimestral no', () => {
    expect(page).toContain(':options="pctLineOptions"')
    expect(page.match(/:options="lexOptions"/g)).toHaveLength(2)
    expect(page).toContain('releaseTooltip(i => curveMonthKeys.value[i])')
    expect(page).toContain('releaseTooltip(i => lexMonthKeys.value[i])')
    // El gráfico de relatos (trimestral) sigue con las opciones sin tooltip.
    expect(page).toContain('const perMilleOptions = computed(() => baseLineOptions(v => `${v} ‰`))')
  })

  it('un dataset sin marcas sigue saliendo con pointRadius 0 y sin color de punto', () => {
    expect(page).toContain('pointRadius: marks ? marks.pointRadius : 0')
    // El piso de 4 es el hoverRadius por defecto de chart.js: sin él un punto sin marcar se
    // ACHICA al pasarle el mouse, que es lo contrario de lo que espera cualquiera.
    expect(page).toContain('pointHoverRadius: marks.pointRadius.map(r => Math.max(r + 2, 4))')
  })
})

describe('la sección nueva', () => {
  it('existe y cuelga de su propio encabezado', () => {
    expect(page).toContain('aria-labelledby="lanzamientos"')
    expect(page).toContain('<h2 id="lanzamientos"')
  })

  it('no agrega un segundo h1', () => {
    expect(page.match(/<h1[\s>]/g) ?? []).toHaveLength(1)
  })

  it('va después de la sección de IA y antes de la de personas', () => {
    const ia = page.indexOf('aria-labelledby="ia"')
    const rel = page.indexOf('aria-labelledby="lanzamientos"')
    const quien = page.indexOf('aria-labelledby="quien"')
    expect(ia).toBeGreaterThan(-1)
    expect(rel).toBeGreaterThan(ia)
    expect(quien).toBeGreaterThan(rel)
  })

  it('el título y el texto salen de la comparación, no de una frase escrita a mano', () => {
    expect(page).toContain('const releasesTitle = computed(')
    expect(page).toContain('const releasesText = computed(')
    expect(page).toContain('riseSplit(')
    // Las dos ramas del título: la que afirma y la que se planta en que no hay diferencia.
    expect(page).toContain('El marcador no separa el lanzamiento de la tendencia')
  })
})

describe('la tabla de lanzamientos', () => {
  const table = page.slice(
    page.indexOf('releases-table'),
    page.indexOf('</VTable>', page.indexOf('releases-table'))
  )

  it('se apila en tarjetas en el teléfono, como el resto de las tablas anchas', () => {
    expect(page).toContain('cu-mobile-cards releases-table')
  })

  it('declara el alcance de cada encabezado', () => {
    expect(table.match(/<th scope="col">/g)).toHaveLength(4)
  })

  it('etiqueta cada celda para la vista apilada', () => {
    expect(table.match(/data-label="/g)).toHaveLength(4)
  })

  it('enlaza el anuncio oficial sin pasar el opener', () => {
    expect(table).toContain('target="_blank"')
    expect(table).toContain('rel="noopener"')
    expect(table).toContain(':href="r.url"')
  })

  it('una ventana incompleta se dice con una raya, no con un número', () => {
    expect(page).toContain("ba.before == null || ba.after == null ? '—'")
  })
})

describe('el caveat', () => {
  const caveat = page.slice(
    page.indexOf('Esto no prueba causa'),
    page.indexOf('</section>', page.indexOf('Esto no prueba causa'))
  )

  it('dice que esto no prueba causa', () => {
    expect(caveat).toContain('Esto no prueba causa')
  })

  it('nombra el racimo, los trimestres sin marcar y lo que se movió por otra cosa', () => {
    expect(caveat).toContain('racimo')
    expect(caveat).toContain('trimestre')
    expect(caveat).toContain('Indeed')
  })
})

describe('las convenciones del sitio', () => {
  it('no formatea ninguna fecha con el locale "es" pelado', () => {
    // ICU escribe "septiembre" con 'es' y "setiembre" con 'es-UY'. La página arma los meses con su
    // propio MES_LARGO, así que la llamada no debería existir en absoluto.
    expect(page).not.toMatch(/toLocaleDateString\(\s*'es'/)
    expect(page).not.toContain('septiembre')
  })

  // `page.indexOf('</template>')` encuentra el cierre del PRIMER `<template #fallback>`, o sea
  // 87 líneas de 1.600: daba por revisada justo la prosa nueva, que empieza mucho más abajo. Se
  // acota a la sección de los lanzamientos, que es lo que agregó este cambio, en vez de a un
  // prefijo que no contiene nada de ella.
  it('no mete un "|" en el texto nuevo, que después pasa por vue-i18n', () => {
    const from = page.indexOf('aria-labelledby="lanzamientos"')
    const to = page.indexOf('aria-labelledby="quien"')
    expect(from).toBeGreaterThan(0)
    expect(to).toBeGreaterThan(from)
    expect(page.slice(from, to)).not.toContain('|')
  })

  it('la celda de prosa de la tabla lleva el escape documentado de cu-mobile-cards', () => {
    // responsive-tables.css: una celda cuyo valor es PROSA necesita `cu-cell-prose`, o en el
    // teléfono queda apretada contra la etiqueta en una cinta angosta y alineada a la derecha.
    expect(page).toContain('<td data-label="Qué salió" class="cu-cell-prose">')
  })

  it('el veredicto del título se decide con la brecha estratificada, no con la cruda', () => {
    // La brecha cruda mide el almanaque: los lanzamientos se amontonan en los años en que la
    // serie subía sola. Si el título vuelve a colgarse de `iaGap`/`negGap` esto lo frena.
    const title = page.slice(page.indexOf('const releasesTitle'), page.indexOf('function riseLine'))
    expect(title).toContain('iaStrat.value.gap')
    expect(title).toContain('negStrat.value.gap')
    expect(title).not.toContain('iaGap.value')
    expect(title).not.toContain('negGap.value')
  })

  it('la cuenta de negatividad no usa la serie ya suavizada', () => {
    // `neg3` es un promedio de tres meses: meterlo en una ventana de tres meses arrastra el mes
    // del lanzamiento adentro del "después". El fix no tenía test y el próximo refactor lo
    // volvía a poner.
    const block = page.slice(page.indexOf('const negRise'), page.indexOf('function gapOf'))
    expect(block).toContain('pct100(m.neg)')
    expect(block).not.toContain('m.neg3')
  })

  it('la respuesta de la FAQ tiene su propia guarda de muestra', () => {
    // Sale entera al JSON-LD, sin la sección que la explica alrededor.
    const block = page.slice(
      page.indexOf('const releasesAnswer'),
      page.indexOf('function dayLabelLong')
    )
    expect(block).toContain('withRelease.share == null')
    expect(block).toContain('todavía no hay meses suficientes')
  })
})

describe('la FAQ', () => {
  it('suma la pregunta por ChatGPT al único emisor de FAQPage de la página', () => {
    expect(page).toContain("id: 'mercado-it-lanzamientos'")
    expect(page).toContain('¿El pesimismo del sub arranca con ChatGPT?')
    expect(page.match(/<FaqSection/g)).toHaveLength(1)
  })
})

describe('todo mes de lanzamiento cae dentro de las series mensuales', () => {
  // No es un test del archivo sino de la lista: un lanzamiento anterior al primer mes de la serie
  // se marcaría en ningún lado y la tabla lo mostraría con dos rayas, sin que nada avise.
  it('ningún lanzamiento es anterior a enero de 2022, que es donde arrancan los dos gráficos', () => {
    expect(page).toContain("m >= '2022-01'")
    for (const r of AI_RELEASES) expect(releaseMonth(r) >= '2022-01').toBe(true)
  })
})
