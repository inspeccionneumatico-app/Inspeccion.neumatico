import { useMemo, useState } from 'react'
import { meta, centros, ACTUAL as actual, EQUIPOS as TODOS_EQUIPOS, seriePorCd, TIPOS, todasLasMediciones } from './datos.js'
import { ESTADOS, colorSurco, colorPresion, fmt } from './estados.js'
import { filtrar, agregar, enBinSurco, enBinPresion } from './agregar.js'
import BarraFiltros from './components/BarraFiltros.jsx'
import BarrasH from './components/BarrasH.jsx'
import BarrasApiladas from './components/BarrasApiladas.jsx'
import Descargas from './components/Descargas.jsx'
import DetalleSeleccion from './components/DetalleSeleccion.jsx'
import FichaEquipo from './components/FichaEquipo.jsx'
import ImpactoEconomico from './components/ImpactoEconomico.jsx'
import Histograma from './components/Histograma.jsx'
import Linea from './components/Linea.jsx'
import TablaEquipos from './components/TablaEquipos.jsx'

function fecha(iso) {
  if (!iso) return '—'
  const [a, m, d] = iso.split('-')
  return `${d}/${m}/${a}`
}

const ETIQUETA_TIPO = Object.fromEntries(TIPOS.map((t) => [t.clave, t.etiqueta]))

function Tile({ label, value, hint, color, pct, onClick }) {
  // Con onClick el indicador pasa a ser un boton: abre el detalle de las
  // mediciones que lo formaron.
  if (onClick) {
    return (
      <button
        className="card tile tile-clic"
        onClick={onClick}
        aria-label={`${label}: ${value}. Ver el detalle`}
      >
        <span className="label">{label}</span>
        <span className="value" style={color ? { color } : undefined}>{value}</span>
        {pct != null && (
          <span className="bar-mini" aria-hidden="true">
            <i style={{ width: `${pct}%`, background: color || 'var(--accent)' }} />
          </span>
        )}
        {hint && <span className="hint">{hint}</span>}
        <span className="tile-lupa" aria-hidden="true">ver detalle →</span>
      </button>
    )
  }
  return (
    <div className="card tile">
      <span className="label">{label}</span>
      <span className="value" style={color ? { color } : undefined}>{value}</span>
      {pct != null && (
        <span className="bar-mini" aria-hidden="true">
          <i style={{ width: `${pct}%`, background: color || 'var(--accent)' }} />
        </span>
      )}
      {hint && <span className="hint">{hint}</span>}
    </div>
  )
}

export default function App() {
  const [cd, setCd] = useState(null)
  const [q, setQ] = useState('')
  // Equipo cuyo historial se está mirando (null = ficha cerrada).
  const [ficha, setFicha] = useState(null)
  // Selección de un gráfico: las filas que lo formaron (null = cerrado).
  const [detalle, setDetalle] = useState(null)

  // Equipos por centro (para el conteo de los chips), fijo.
  const conteosCd = useMemo(() => {
    const m = {}
    for (const e of TODOS_EQUIPOS) {
      if (e.cd) m[e.cd] = (m[e.cd] || 0) + 1
    }
    return m
  }, [])

  const filas = useMemo(() => filtrar(actual, cd, q), [cd, q])
  const a = useMemo(() => agregar(filas), [filas])

  // Equipos de la tabla: respetan el mismo filtro.
  const equiposFiltrados = useMemo(() => {
    const term = q.trim().toUpperCase()
    return TODOS_EQUIPOS.filter(
      (e) => (!cd || e.cd === cd) && (!term || e.patente.includes(term)),
    )
  }, [cd, q])

  // La tendencia usa el histórico completo del centro elegido.
  const serie = seriePorCd[cd ?? 'TODOS'] ?? []

  // --- Bajar al detalle desde cualquier gráfico -------------------------
  // Cada gráfico avisa qué se tocó; acá se traduce a las mediciones que lo
  // formaron y se abren en el panel.
  const termino = q.trim().toUpperCase()
  const contexto = [cd, termino && `patente ${termino}`].filter(Boolean).join(' · ')

  const abrir = (titulo, criterio, base = filas) =>
    setDetalle({
      titulo,
      descripcion: [criterio, contexto].filter(Boolean).join(' — '),
      filas: base,
    })

  const abrirDonde = (titulo, criterio, predicado, base = filas) =>
    abrir(titulo, criterio, base.filter(predicado))

  // El histórico completo se arma solo cuando hace falta (clic en la tendencia).
  const abrirMes = (punto) => {
    const delMes = todasLasMediciones().filter(
      (f) => f.f.slice(0, 7) === punto.mes && (!cd || f.c === cd),
    )
    abrir(`Inspecciones de ${punto.mes}`, `${punto.inspecciones} inspecciones del mes`, delMes)
  }

  const verEquipo = (patente) => {
    const equipo = TODOS_EQUIPOS.find((e) => e.patente === patente)
    if (equipo) {
      setDetalle(null)
      setFicha(equipo)
    }
  }

  const sinResultados = a.vigentes === 0

  return (
    <div className="wrap">
      <header className="top">
        {/* El logo vive en public/logo.png. Si el archivo no está, la imagen se
            oculta sola y el encabezado queda igual que antes. */}
        <div className="marca">
          <img
            className="marca-logo"
            src={`${import.meta.env.BASE_URL}logo.png`}
            alt="Logo corporativo"
            onError={(e) => { e.currentTarget.parentElement.style.display = 'none' }}
          />
        </div>
        <p className="eyebrow">Reporte de flota · Inspección de neumáticos</p>
        <h1>Estado de los neumáticos de la flota</h1>
        <p className="lede">
          Consolidado de {fmt(meta.inspecciones)} inspecciones sobre {fmt(meta.equipos)} equipos.
          Los indicadores reflejan la <strong>última inspección de cada equipo</strong>;
          las tendencias usan el histórico completo.
        </p>
        <span className="periodo">📅 {fecha(meta.desde)} → {fecha(meta.hasta)}</span>
        <Descargas cd={cd} q={q} />
      </header>

      {/* Solo en el PDF: deja constancia de qué se está viendo. */}
      <p className="solo-print">
        {cd ? `Centro: ${cd}. ` : 'Todos los centros. '}
        {q.trim() ? `Patente: ${q.trim().toUpperCase()}. ` : ''}
        Datos al {fecha(meta.hasta)}.
      </p>

      <BarraFiltros
        centros={centros}
        conteos={conteosCd}
        cd={cd}
        setCd={setCd}
        q={q}
        setQ={setQ}
        vigentes={a.vigentes}
        equipos={a.equipos}
        totalEquipos={TODOS_EQUIPOS.length}
      />

      {sinResultados ? (
        <div className="card" style={{ marginTop: 24, textAlign: 'center', padding: 40 }}>
          <p style={{ margin: 0, fontWeight: 700 }}>Ningún equipo coincide con el filtro</p>
          <p style={{ margin: '6px 0 0', color: 'var(--ink-2)' }}>
            Revisa la patente o elige otro centro.
          </p>
        </div>
      ) : (
        <>
          {/* ------------------------------------------------ indicadores */}
          <section>
            <div className="sec-head">
              <h2>Indicadores</h2>
              <p>Estado actual según la última inspección registrada de cada equipo.</p>
            </div>
            <div className="grid g-tiles">
              <Tile
                label="Equipos" value={fmt(a.equipos)} hint={cd ? `en ${cd}` : 'toda la flota'}
                onClick={() => abrir('Todos los equipos', `${a.equipos} equipos con inspección vigente`)}
              />
              <Tile
                label="Neumáticos vigentes" value={fmt(a.vigentes)} hint="en servicio hoy"
                onClick={() => abrir('Neumáticos vigentes', 'la última inspección de cada equipo')}
              />
              <Tile
                label="En riesgo" value={fmt(a.riesgo)} hint={`${a.pctRiesgo}% de los vigentes`}
                color="var(--critical)" pct={a.pctRiesgo}
                onClick={() => abrirDonde('Neumáticos en riesgo', 'bajo el mínimo de surco, o presión baja sin regularizar', (f) => f.n === 'riesgo')}
              />
              <Tile
                label="Advertencia" value={fmt(a.advertencia)} hint={`${a.pctAdv}% · surco ≤ 6 mm`}
                color="var(--warning)" pct={a.pctAdv}
                onClick={() => abrirDonde('Neumáticos en advertencia', 'surco ≤ 6 mm, todavía sobre el mínimo', (f) => f.n === 'advertencia')}
              />
              <Tile
                label="Óptimos" value={fmt(a.bueno)} hint={`${a.pctBueno}% de los vigentes`}
                color="var(--good)" pct={a.pctBueno}
                onClick={() => abrirDonde('Neumáticos óptimos', 'sobre el mínimo de surco y con la presión en norma', (f) => f.n === 'bueno')}
              />
              <Tile
                label="Surco crítico" value={fmt(a.surcoCritico)} hint="< 2,5 mm — cambio inmediato"
                color="var(--critical)"
                onClick={() => abrirDonde('Surco crítico', 'menos de 2,5 mm: cambio inmediato', (f) => f.s < 2.5)}
              />
              <Tile
                label="Presión sin regularizar" value={fmt(a.presionCritica)} hint="< 95 PSI y no se corrigió"
                color="var(--serious)"
                onClick={() => abrirDonde('Presión sin regularizar', 'bajo 95 PSI y no se corrigió en la inspección', (f) => f.r < 95 && !f.reg)}
              />
              <Tile
                label="Presión regularizada" value={fmt(a.presionRegularizada)} hint="llegó baja y se corrigió en terreno"
                color="var(--good)"
                onClick={() => abrirDonde('Presión regularizada en terreno', 'llegaron bajo estándar y el inspector las corrigió', (f) => f.r < f.rr - 5 && f.reg)}
              />
              <Tile
                label="Promedios" value={`${a.surcoPromedio} mm`} hint={`${fmt(a.presionPromedio)} PSI de presión al llegar`}
                onClick={() => abrir('Promedios', 'todas las mediciones vigentes que entran en el promedio')}
              />
            </div>
          </section>

          {/* ------------------------------------------------ composición */}
          <section>
            <div className="sec-head">
              <h2>Composición del estado actual</h2>
              <p>Los {fmt(a.vigentes)} neumáticos vigentes, clasificados por condición.</p>
            </div>
            <div className="card">
              <ul className="legend">
                {ESTADOS.map((e) => (
                  <li key={e.clave}>
                    <i className="swatch" style={{ background: e.color }} />
                    {e.etiqueta} — <strong style={{ color: 'var(--ink)' }}>{fmt(a[e.clave])}</strong>
                    {' '}({a.vigentes ? Math.round((a[e.clave] / a.vigentes) * 100) : 0}%)
                  </li>
                ))}
              </ul>
              <div style={{ display: 'flex', height: 26, gap: 2, borderRadius: 4, overflow: 'hidden' }}>
                {ESTADOS.map((e, i) =>
                  a[e.clave] > 0 ? (
                    <i
                      key={e.clave}
                      role="button"
                      tabIndex={0}
                      aria-label={`${e.etiqueta}: ${fmt(a[e.clave])}. Ver el detalle`}
                      title={`${e.etiqueta}: ${fmt(a[e.clave])} — clic para ver el detalle`}
                      onClick={() => abrirDonde(`Neumáticos en ${e.etiqueta.toLowerCase()}`, 'de la composición del estado actual', (f) => f.n === e.clave)}
                      onKeyDown={(ev) => {
                        if (ev.key === 'Enter' || ev.key === ' ') {
                          ev.preventDefault()
                          abrirDonde(`Neumáticos en ${e.etiqueta.toLowerCase()}`, 'de la composición del estado actual', (f) => f.n === e.clave)
                        }
                      }}
                      style={{
                        flex: `${a[e.clave]} 0 0`,
                        background: e.color,
                        cursor: 'pointer',
                        borderRadius: i === 0 ? '4px 0 0 4px' : i === ESTADOS.length - 1 ? '0 4px 4px 0' : 0,
                      }}
                    />
                  ) : null,
                )}
              </div>
              <p style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--ink-2)' }}>
                <strong style={{ color: 'var(--critical)' }}>▲ {a.pctRiesgo}%</strong> de los neumáticos en
                servicio está bajo el estándar de surco o de presión y requiere atención.
                {' '}<span className="pista-clic">Toca un tramo de la barra para ver esos neumáticos.</span>
              </p>
            </div>
          </section>

          {/* ------------------------------------------------ por centro */}
          {a.porCentro.length > 1 && (
            <section>
              <div className="sec-head">
                <h2>Por centro de distribución</h2>
                <p>
                  Volumen y condición de los neumáticos en servicio de cada centro.
                  {' '}<span className="pista-clic">Toca un centro, o un color, para ver el detalle.</span>
                </p>
              </div>
              <div className="card">
                <BarrasApiladas
                  datos={a.porCentro}
                  campoNombre="cd"
                  onSelect={(d, estado) =>
                    abrirDonde(
                      estado ? `${d.cd} · ${ESTADOS.find((e) => e.clave === estado).etiqueta}` : d.cd,
                      estado ? 'neumáticos de ese centro en ese estado' : 'todos los neumáticos vigentes del centro',
                      (f) => f.c === d.cd && (!estado || f.n === estado),
                    )
                  }
                />
              </div>
            </section>
          )}

          {/* ------------------------------------------------ original vs recauchado */}
          <section>
            <div className="sec-head">
              <h2>Original vs recauchado</h2>
              <p>
                Los neumáticos recauchados se desgastan distinto, así que se miran aparte.
                El dato viene de la columna «ORIGINAL» de la planilla de inspección.
                {' '}<span className="pista-clic">Toca un tipo, o un color, para ver el detalle.</span>
              </p>
            </div>
            <div className="card">
              <BarrasApiladas
                datos={a.porTipo.map((t) => ({ ...t, nombre: ETIQUETA_TIPO[t.tipo] }))}
                campoNombre="nombre"
                onSelect={(d, estado) =>
                  abrirDonde(
                    estado ? `${d.nombre} · ${ESTADOS.find((e) => e.clave === estado).etiqueta}` : d.nombre,
                    estado ? 'de ese tipo y en ese estado' : 'todos los neumáticos vigentes de ese tipo',
                    (f) => f.t === d.tipo && (!estado || f.n === estado),
                  )
                }
              />
            </div>
          </section>

          {/* ------------------------------------------------ distribuciones */}
          <section>
            <div className="sec-head">
              <h2>Distribución de mediciones</h2>
              <p>
                Cómo se reparten las mediciones de los neumáticos vigentes. El color marca la zona de riesgo.
                {' '}<span className="pista-clic">Toca una columna para ver qué neumáticos la forman.</span>
              </p>
            </div>
            <div className="grid g-2">
              <div className="card">
                <h3 style={{ margin: '0 0 4px', fontSize: 14 }}>Surco medido (mm)</h3>
                <p style={{ margin: '0 0 14px', fontSize: 12.5, color: 'var(--ink-2)' }}>
                  Mínimo legal 3 mm · advertencia desde 6 mm
                </p>
                <Histograma
                  datos={a.distSurco} colorDe={colorSurco} unidad="mm" total={a.vigentes}
                  onSelect={(bin) =>
                    abrirDonde(`Surco ${bin.rango} mm`, 'neumáticos cuyo surco cae en ese rango', (f) => enBinSurco(f.s, bin.rango))
                  }
                />
              </div>
              <div className="card">
                <h3 style={{ margin: '0 0 4px', fontSize: 14 }}>Presión al llegar (PSI)</h3>
                <p style={{ margin: '0 0 14px', fontSize: 12.5, color: 'var(--ink-2)' }}>
                  Cómo se encontró el neumático, antes de regularizar.
                  Recomendada 100 PSI (dirección 115) · tolerancia 5 PSI
                </p>
                <Histograma
                  datos={a.distPresion} colorDe={colorPresion} unidad="PSI" total={a.vigentes}
                  onSelect={(bin) =>
                    abrirDonde(`Presión ${bin.rango} PSI`, 'presión con que llegaron, antes de regularizar', (f) => enBinPresion(f.r, bin.rango))
                  }
                />
              </div>
            </div>
          </section>

          {/* ------------------------------------------ impacto economico */}
          <ImpactoEconomico filas={filas} cd={cd} />

          {/* ------------------------------------------------ tendencia */}
          <section>
            <div className="sec-head">
              <h2>Tendencia histórica {cd && <span style={{ fontWeight: 400, color: 'var(--ink-2)' }}>· {cd}</span>}</h2>
              <p>
                Actividad de inspección y desgaste promedio mes a mes ({serie.length} meses con registros).
                Sigue el filtro de centro; la búsqueda por patente no la altera.
                {' '}<span className="pista-clic">Toca un mes para ver sus inspecciones.</span>
              </p>
            </div>
            <div className="grid g-2">
              <div className="card">
                <h3 style={{ margin: '0 0 12px', fontSize: 14 }}>Inspecciones por mes</h3>
                <Linea datos={serie} campoY="inspecciones" etiquetaY="Inspecciones" colorHex="#2a78d6" onSelect={abrirMes} />
              </div>
              <div className="card">
                <h3 style={{ margin: '0 0 12px', fontSize: 14 }}>Surco promedio medido (mm)</h3>
                <Linea
                  datos={serie}
                  campoY="surcoProm"
                  etiquetaY="Surco promedio"
                  colorHex="#1baf7a"
                  referencia={3}
                  etiquetaReferencia="mínimo 3 mm"
                  sufijo=" mm"
                  onSelect={abrirMes}
                />
              </div>
            </div>
          </section>

          {/* ------------------------------------------------ prioridades */}
          {a.criticos.length > 0 && (
            <section>
              <div className="sec-head">
                <h2>Equipos que requieren atención</h2>
                <p>
                  Los {a.criticos.length} equipos con más neumáticos fuera de estándar en su última inspección.
                  {' '}<span className="pista-clic">Toca uno para abrir su historial.</span>
                </p>
              </div>
              <div className="card">
                <BarrasH
                  datos={a.criticos} color="var(--critical)" anchoEtiqueta={190}
                  onSelect={(d) => verEquipo(d.clave)}
                />
              </div>
            </section>
          )}

          {/* ------------------------------------------------ marcas/medidas */}
          <section>
            <div className="sec-head">
              <h2>Marcas y medidas en servicio</h2>
              <p>
                Distribución de los neumáticos vigentes.
                {' '}<span className="pista-clic">Toca una barra para ver el detalle.</span>
              </p>
            </div>
            <div className="grid g-2">
              <div className="card">
                <h3 style={{ margin: '0 0 14px', fontSize: 14 }}>Marcas más usadas</h3>
                <BarrasH
                  datos={a.marcas}
                  onSelect={(d) => abrirDonde(`Marca ${d.nombre}`, 'neumáticos vigentes de esa marca', (f) => f.m === d.nombre)}
                />
              </div>
              <div className="card">
                <h3 style={{ margin: '0 0 14px', fontSize: 14 }}>Medidas más usadas</h3>
                <BarrasH
                  datos={a.medidas} anchoEtiqueta={130}
                  onSelect={(d) => abrirDonde(`Medida ${d.nombre}`, 'neumáticos vigentes de esa medida', (f) => f.d === d.nombre)}
                />
              </div>
            </div>
          </section>

          {/* ------------------------------------------------ tabla */}
          <section>
            <div className="sec-head">
              <h2>Detalle por equipo</h2>
              <p>
                Ordena por cualquier columna y abre un equipo para ver su historial de
                inspecciones. Usa los filtros de arriba para acotar.
              </p>
            </div>
            <div className="card">
              <TablaEquipos equipos={equiposFiltrados} onAbrir={setFicha} />
            </div>
          </section>
        </>
      )}

      {detalle && (
        <DetalleSeleccion
          titulo={detalle.titulo}
          descripcion={detalle.descripcion}
          filas={detalle.filas}
          onCerrar={() => setDetalle(null)}
          onVerEquipo={verEquipo}
        />
      )}

      {ficha && <FichaEquipo equipo={ficha} onCerrar={() => setFicha(null)} />}

      <footer className="foot">
        <p>
          <strong>Criterios.</strong> Riesgo: surco bajo el mínimo del equipo (3 mm), o presión bajo lo
          recomendado menos 5 PSI <strong>sin que se haya regularizado</strong> en la inspección.
          Advertencia: surco ≤ 6 mm estando sobre el mínimo. Óptimo: el resto.
        </p>
        <p>
          Cuando el inspector regula la presión, el neumático sale en su estándar, así que no arrastra
          un riesgo vigente: la presión registrada es la que tenía <em>al llegar</em> y se contabiliza
          aparte, en «presión regularizada». En esta base eso ocurre en la enorme mayoría de los casos.
        </p>
        <p>
          Los indicadores consideran solo la última inspección de cada equipo, para reflejar la situación
          vigente y no el acumulado histórico. Las inspecciones importadas no incluyen odómetro ni
          fotografías. Se descartaron {meta.descartadas} mediciones fuera de rango físico (errores de
          captura del archivo original).
        </p>
        <p>
          Generado desde la base de la app Inspección Neumáticos · {fmt(meta.equipos)} equipos ·{' '}
          {fmt(meta.neumaticosHistoricos)} registros históricos · {fecha(meta.desde)} a {fecha(meta.hasta)}.
        </p>
      </footer>
    </div>
  )
}
