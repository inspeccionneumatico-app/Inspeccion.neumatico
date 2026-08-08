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
const POS = 0, MARCA = 1, MEDIDA = 2, SURCO = 3, SURCO_MIN = 4, PRESION = 5, PRESION_REC = 6

const TOL_PRESION = 5
const SURCO_ADVERTENCIA = 6

/** Misma regla que la app: riesgo manda sobre advertencia. */
export function nivelDe(surco, surcoMin, presion, presionRec) {
  if (surco < surcoMin || presion < presionRec - TOL_PRESION) return 'riesgo'
  if (surco <= SURCO_ADVERTENCIA) return 'advertencia'
  return 'bueno'
}

const prom = (xs, dec = 1) =>
  xs.length ? Number((xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(dec)) : null

function neumaticoDe(t) {
  const surco = t[SURCO], surcoMin = t[SURCO_MIN]
  const presion = t[PRESION], presionRec = t[PRESION_REC]
  return {
    pos: t[POS],
    marca: CAT_MARCAS[t[MARCA]],
    medida: CAT_MEDIDAS[t[MEDIDA]],
    surco,
    surcoMin,
    presion,
    presionRec,
    nivel: nivelDe(surco, surcoMin, presion, presionRec),
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
    s: t[SURCO],
    sm: t[SURCO_MIN],
    r: t[PRESION],
    rr: t[PRESION_REC],
    n: nivelDe(t[SURCO], t[SURCO_MIN], t[PRESION], t[PRESION_REC]),
  }))
})
