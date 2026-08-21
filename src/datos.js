/**
 * Decodifica `datos.json`.
 *
 * El archivo trae el histórico completo agrupado por patente. Para que no pese
 * de más, las marcas y medidas viven una sola vez en `cat` y cada neumático es
 * una tupla; aquí se vuelven objetos con nombre.
 */
import datos from './data/datos.json'

export const { meta, centros, equipos: EQUIPOS, seriePorCd } = datos

const CAT_MARCAS = datos.cat.m
const CAT_MEDIDAS = datos.cat.d

// Orden de la tupla de cada neumático (lo escribe tool/exportar_datos_reporte.py).
const POS = 0, MARCA = 1, MEDIDA = 2, SURCO = 3, SURCO_MIN = 4, PRESION = 5,
  PRESION_REC = 6, TIPO = 7, REGULADA = 8

const TOL_PRESION = 5
const SURCO_ADVERTENCIA = 6

/** Original de fábrica o recauchado; el índice 0 es "no se registró". */
export const TIPOS = [
  { clave: 'sinDato', etiqueta: 'Sin dato', sigla: '—' },
  { clave: 'original', etiqueta: 'Original', sigla: 'N' },
  { clave: 'recauchado', etiqueta: 'Recauchado', sigla: 'R' },
]

/**
 * Misma regla que la app: riesgo manda sobre advertencia.
 *
 * Si en la inspección se reguló la presión, el neumático quedó en su estándar
 * antes de que el vehículo saliera: la presión medida es el "como llegó" y no
 * cuenta como riesgo vigente.
 */
export function nivelDe(surco, surcoMin, presion, presionRec, regulada) {
  const presionMala = presion < presionRec - TOL_PRESION
  if (surco < surcoMin || (presionMala && !regulada)) return 'riesgo'
  if (surco <= SURCO_ADVERTENCIA) return 'advertencia'
  return 'bueno'
}

const prom = (xs, dec = 1) =>
  xs.length ? Number((xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(dec)) : null

function neumaticoDe(t) {
  const surco = t[SURCO], surcoMin = t[SURCO_MIN]
  const presion = t[PRESION], presionRec = t[PRESION_REC]
  const regulada = t[REGULADA] === 1
  return {
    pos: t[POS],
    marca: CAT_MARCAS[t[MARCA]],
    medida: CAT_MEDIDAS[t[MEDIDA]],
    tipo: TIPOS[t[TIPO]] ?? TIPOS[0],
    surco,
    surcoMin,
    presion,
    presionRec,
    regulada,
    // Llegó fuera de estándar, aunque después se haya corregido.
    presionBajoEstandar: presion < presionRec - TOL_PRESION,
    nivel: nivelDe(surco, surcoMin, presion, presionRec, regulada),
  }
}

function inspeccionDe(raw) {
  const neumaticos = raw.t.map(neumaticoDe).sort((a, b) => a.pos - b.pos)
  const conteo = { riesgo: 0, advertencia: 0, bueno: 0 }
  for (const n of neumaticos) conteo[n.nivel]++
  return {
    fecha: raw.f,
    cd: raw.c,
    odometro: raw.o ?? null,
    neumaticos,
    total: neumaticos.length,
    regularizadas: neumaticos.filter((n) => n.presionBajoEstandar && n.regulada).length,
    ...conteo,
    surcoProm: prom(neumaticos.map((n) => n.surco)),
    surcoMin: neumaticos.length ? Math.min(...neumaticos.map((n) => n.surco)) : null,
    presionProm: prom(neumaticos.map((n) => n.presion), 0),
  }
}

const cache = new Map()

/** Inspecciones de un equipo, de la más reciente a la más antigua. */
export function historialDe(patente) {
  if (!cache.has(patente)) {
    cache.set(patente, (datos.hist[patente] ?? []).map(inspeccionDe))
  }
  return cache.get(patente)
}

/**
 * TODAS las mediciones del histórico, con la misma forma que `ACTUAL` más la
 * fecha de la inspección. Se arma una sola vez, cuando algún gráfico necesita
 * bajar al detalle de un mes.
 */
let _todas = null
export function todasLasMediciones() {
  if (_todas) return _todas
  _todas = []
  for (const [patente, insps] of Object.entries(datos.hist)) {
    for (const insp of insps) {
      for (const t of insp.t) {
        const regulada = t[REGULADA] === 1
        _todas.push({
          p: patente,
          c: insp.c,
          f: insp.f,
          o: t[POS],
          m: CAT_MARCAS[t[MARCA]],
          d: CAT_MEDIDAS[t[MEDIDA]],
          t: TIPOS[t[TIPO]]?.clave ?? 'sinDato',
          s: t[SURCO],
          sm: t[SURCO_MIN],
          r: t[PRESION],
          rr: t[PRESION_REC],
          reg: regulada,
          n: nivelDe(t[SURCO], t[SURCO_MIN], t[PRESION], t[PRESION_REC], regulada),
        })
      }
    }
  }
  return _todas
}

/**
 * Estado actual: una fila por neumático de la última inspección de cada equipo.
 * Es la entrada de `agregar.js`, con las claves cortas que ese módulo espera.
 */
export const ACTUAL = Object.entries(datos.hist).flatMap(([patente, insps]) => {
  const ultima = insps[0]
  if (!ultima) return []
  return ultima.t.map((t) => ({
    p: patente,
    c: ultima.c,
    o: t[POS],
    m: CAT_MARCAS[t[MARCA]],
    d: CAT_MEDIDAS[t[MEDIDA]],
    t: TIPOS[t[TIPO]]?.clave ?? 'sinDato',
    s: t[SURCO],
    sm: t[SURCO_MIN],
    r: t[PRESION],
    rr: t[PRESION_REC],
    reg: t[REGULADA] === 1,
    n: nivelDe(t[SURCO], t[SURCO_MIN], t[PRESION], t[PRESION_REC], t[REGULADA] === 1),
  }))
})
