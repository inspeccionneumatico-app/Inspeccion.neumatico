/**
 * Agregaciones del reporte, calculadas en el navegador sobre las filas del
 * estado actual (una por neumático vigente). Así el filtro por centro y la
 * búsqueda por patente recalculan TODO el reporte, no solo la tabla.
 */

const BORDES_SURCO = [2.5, 4, 6, 8, 10, 12, Infinity]
const ETIQ_SURCO = ['< 2,5', '2,5–4', '4–6', '6–8', '8–10', '10–12', '> 12']

const BORDES_PRESION = [80, 90, 95, 100, 105, 110, Infinity]
const ETIQ_PRESION = ['< 80', '80–90', '90–95', '95–100', '100–105', '105–110', '> 110']

function histograma(valores, bordes, etiquetas) {
  const cuentas = new Array(etiquetas.length).fill(0)
  for (const v of valores) {
    for (let i = 0; i < bordes.length; i++) {
      if (v < bordes[i]) { cuentas[i]++; break }
    }
  }
  return etiquetas.map((rango, i) => ({ rango, cantidad: cuentas[i] }))
}

function top(filas, campo, n) {
  const c = new Map()
  for (const f of filas) {
    const k = f[campo] || 'Sin dato'
    c.set(k, (c.get(k) || 0) + 1)
  }
  return [...c.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([nombre, cantidad]) => ({ nombre, cantidad }))
}

const prom = (xs, dec = 1) =>
  xs.length ? Number((xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(dec)) : 0

/** Filtra las filas del estado actual por centro y por patente. */
export function filtrar(actual, cd, q) {
  const term = q.trim().toUpperCase()
  if (!cd && !term) return actual
  return actual.filter(
    (f) => (!cd || f.c === cd) && (!term || f.p.includes(term)),
  )
}

/** Todos los agregados que alimentan el reporte, para las filas dadas. */
export function agregar(filas) {
  const equiposSet = new Set()
  let riesgo = 0, advertencia = 0, bueno = 0
  let surcoCritico = 0, presionCritica = 0, presionRegularizada = 0
  const surcos = [], presiones = []
  // Original vs recauchado, con su composición de estado.
  const porTipo = new Map()

  for (const f of filas) {
    equiposSet.add(f.p)
    if (f.n === 'riesgo') riesgo++
    else if (f.n === 'advertencia') advertencia++
    else bueno++
    if (f.s < 2.5) surcoCritico++
    // La presión solo queda pendiente si NO se reguló en la inspección.
    if (f.r < 95 && !f.reg) presionCritica++
    if (f.r < f.rr - 5 && f.reg) presionRegularizada++
    surcos.push(f.s)
    presiones.push(f.r)

    const clave = f.t ?? 'sinDato'
    if (!porTipo.has(clave)) {
      porTipo.set(clave, { tipo: clave, riesgo: 0, advertencia: 0, bueno: 0, surco: [] })
    }
    const t = porTipo.get(clave)
    t[f.n]++
    t.surco.push(f.s)
  }

  const vigentes = filas.length

  // Por centro
  const mapaCd = new Map()
  for (const f of filas) {
    if (!mapaCd.has(f.c)) {
      mapaCd.set(f.c, { cd: f.c, equipos: new Set(), riesgo: 0, advertencia: 0, bueno: 0, surco: [] })
    }
    const e = mapaCd.get(f.c)
    e.equipos.add(f.p)
    e[f.n]++
    e.surco.push(f.s)
  }
  const porCentro = [...mapaCd.values()]
    .map((e) => {
      const tot = e.riesgo + e.advertencia + e.bueno
      return {
        cd: e.cd,
        equipos: e.equipos.size,
        neumaticos: tot,
        riesgo: e.riesgo,
        advertencia: e.advertencia,
        bueno: e.bueno,
        pctRiesgo: tot ? Math.round((e.riesgo / tot) * 100) : 0,
        surcoProm: prom(e.surco),
      }
    })
    .sort((a, b) => b.neumaticos - a.neumaticos)

  // Ranking de equipos con más neumáticos fuera de estándar
  const porEquipo = new Map()
  for (const f of filas) {
    if (!porEquipo.has(f.p)) porEquipo.set(f.p, { p: f.p, c: f.c, riesgo: 0, surco: [] })
    const e = porEquipo.get(f.p)
    if (f.n === 'riesgo') e.riesgo++
    e.surco.push(f.s)
  }
  const criticos = [...porEquipo.values()]
    .filter((e) => e.riesgo > 0)
    .sort((a, b) => b.riesgo - a.riesgo || prom(a.surco) - prom(b.surco))
    .slice(0, 12)
    .map((e) => ({ nombre: `${e.p} · ${e.c}`, cantidad: e.riesgo }))

  return {
    vigentes,
    equipos: equiposSet.size,
    riesgo,
    advertencia,
    bueno,
    surcoCritico,
    presionCritica,
    presionRegularizada,
    porTipo: [...porTipo.values()]
      .map((t) => {
        const tot = t.riesgo + t.advertencia + t.bueno
        return {
          tipo: t.tipo,
          neumaticos: tot,
          riesgo: t.riesgo,
          advertencia: t.advertencia,
          bueno: t.bueno,
          pctRiesgo: tot ? Math.round((t.riesgo / tot) * 100) : 0,
          surcoProm: prom(t.surco),
        }
      })
      .sort((a, b) => b.neumaticos - a.neumaticos),
    surcoPromedio: prom(surcos),
    presionPromedio: prom(presiones, 0),
    pctRiesgo: vigentes ? Math.round((riesgo / vigentes) * 100) : 0,
    pctAdv: vigentes ? Math.round((advertencia / vigentes) * 100) : 0,
    pctBueno: vigentes ? Math.round((bueno / vigentes) * 100) : 0,
    porCentro,
    criticos,
    distSurco: histograma(surcos, BORDES_SURCO, ETIQ_SURCO),
    distPresion: histograma(presiones, BORDES_PRESION, ETIQ_PRESION),
    marcas: top(filas, 'm', 10),
    medidas: top(filas, 'd', 8),
  }
}
