import { useEffect, useMemo, useState } from 'react'
import { historialDe } from '../datos.js'
import { ESTADOS, COLOR_ESTADO, fmt } from '../estados.js'

function fecha(iso) {
  if (!iso) return '—'
  const [a, m, d] = iso.split('-')
  return `${d}/${m}/${a}`
}

/** Variación entre dos mediciones, con signo y color. */
function Delta({ actual, previo, sufijo = '', dec = 1, bajarEsMalo = true }) {
  if (previo == null || actual == null) return null
  const d = Number((actual - previo).toFixed(dec))
  if (d === 0) return <span className="delta">=</span>
  const malo = bajarEsMalo ? d < 0 : d > 0
  return (
    <span className="delta" style={{ color: malo ? 'var(--critical)' : 'var(--good)' }}>
      {d > 0 ? '▲' : '▼'} {Math.abs(d).toFixed(dec)}{sufijo}
    </span>
  )
}

function MiniStack({ insp }) {
  return (
    <span
      className="mini-stack"
      role="img"
      aria-label={ESTADOS.map((s) => `${insp[s.clave]} ${s.etiqueta}`).join(', ')}
    >
      {ESTADOS.map((s) =>
        insp[s.clave] > 0 ? <i key={s.clave} style={{ background: s.color, flex: `${insp[s.clave]} 0 0` }} /> : null,
      )}
    </span>
  )
}

/**
 * Evolución del surco a lo largo de las inspecciones del equipo.
 * Dos series en la MISMA escala (mm): promedio y peor neumático.
 */
function Evolucion({ inspecciones, referencia }) {
  const asc = [...inspecciones].reverse()
  if (asc.length < 2) return null

  const W = 640, H = 180
  const P = { t: 14, r: 16, b: 28, l: 38 }
  const iw = W - P.l - P.r
  const ih = H - P.t - P.b

  const valores = asc.flatMap((i) => [i.surcoProm, i.surcoMin]).filter((v) => v != null)
  const maxY = Math.max(...valores, referencia)
  const lo = 0
  const hi = maxY * 1.12 || 1

  const px = (i) => P.l + (iw * i) / (asc.length - 1)
  const py = (v) => P.t + ih - ((v - lo) / (hi - lo)) * ih
  const path = (campo) =>
    asc.map((d, i) => `${i === 0 ? 'M' : 'L'}${px(i)},${py(d[campo])}`).join(' ')

  const ticks = [0, hi / 2, hi]
  const cadaEtiqueta = Math.ceil(asc.length / 6)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img"
         aria-label="Surco promedio y del peor neumático en cada inspección"
         style={{ width: '100%', height: 'auto' }}>
      {ticks.map((v, k) => (
        <g key={k}>
          <line className="gridline" x1={P.l} x2={W - P.r} y1={py(v)} y2={py(v)} />
          <text className="tick" x={P.l - 7} y={py(v) + 4} textAnchor="end">{v.toFixed(0)}</text>
        </g>
      ))}

      <line x1={P.l} x2={W - P.r} y1={py(referencia)} y2={py(referencia)}
            stroke="var(--critical)" strokeWidth="1.5" strokeDasharray="5 4" />
      <text className="tick" x={W - P.r} y={py(referencia) - 5} textAnchor="end"
            style={{ fill: 'var(--critical)' }}>
        mínimo {referencia} mm
      </text>

      <path d={path('surcoMin')} fill="none" stroke="var(--warning)" strokeWidth="1.8"
            strokeDasharray="4 3" strokeLinejoin="round" />
      <path d={path('surcoProm')} fill="none" stroke="var(--accent)" strokeWidth="2.2"
            strokeLinejoin="round" strokeLinecap="round" />

      {asc.map((d, i) => (
        <g key={i}>
          <circle cx={px(i)} cy={py(d.surcoMin)} r="3" fill="var(--warning)" />
          <circle cx={px(i)} cy={py(d.surcoProm)} r="3.8" fill="var(--accent)"
                  stroke="var(--surface)" strokeWidth="1.5">
            <title>{`${fecha(d.fecha)} · promedio ${d.surcoProm.toFixed(1)} mm · peor ${d.surcoMin.toFixed(1)} mm`}</title>
          </circle>
        </g>
      ))}

      <line className="axisline" x1={P.l} x2={W - P.r} y1={P.t + ih} y2={P.t + ih} />
      {asc.map((d, i) =>
        i % cadaEtiqueta === 0 || i === asc.length - 1 ? (
          <text key={i} className="tick" x={px(i)} y={H - 9} textAnchor="middle">
            {d.fecha.slice(2, 7)}
          </text>
        ) : null,
      )}
    </svg>
  )
}

/** Una inspección del histórico; se despliega para ver neumático por neumático. */
function FilaInspeccion({ insp, previa, abierta, onToggle, indice, total }) {
  const previoPorPos = useMemo(() => {
    const m = new Map()
    for (const n of previa?.neumaticos ?? []) m.set(n.pos, n)
    return m
  }, [previa])

  return (
    <li className="insp">
      <button className="insp-head" onClick={onToggle} aria-expanded={abierta}>
        <span className="insp-caret" aria-hidden="true">{abierta ? '▾' : '▸'}</span>
        <span className="insp-fecha">
          {fecha(insp.fecha)}
          {indice === 0 && <em className="tag-vigente">vigente</em>}
        </span>
        <MiniStack insp={insp} />
        <span className="insp-nums">
          <span>{insp.total} neum.</span>
          <span style={{ color: insp.riesgo ? 'var(--critical)' : 'var(--good)' }}>
            {insp.riesgo ? `▲ ${insp.riesgo} en riesgo` : '✓ sin riesgo'}
          </span>
          <span>
            {insp.surcoProm.toFixed(1)} mm prom.
            <Delta actual={insp.surcoProm} previo={previa?.surcoProm} sufijo=" mm" />
          </span>
          <span>
            {fmt(insp.presionProm)} PSI
            <Delta actual={insp.presionProm} previo={previa?.presionProm} sufijo="" dec={0} />
          </span>
        </span>
        <span className="insp-n">#{total - indice}</span>
      </button>

      {abierta && (
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Pos</th>
                <th>Marca</th>
                <th>Medida</th>
                <th style={{ textAlign: 'right' }}>Surco</th>
                <th style={{ textAlign: 'right' }}>vs anterior</th>
                <th style={{ textAlign: 'right' }}>Presión</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {insp.neumaticos.map((n) => {
                const prev = previoPorPos.get(n.pos)
                const est = ESTADOS.find((e) => e.clave === n.nivel)
                return (
                  <tr key={n.pos}>
                    <td className="pat">{n.pos}</td>
                    <td>{n.marca}</td>
                    <td style={{ color: 'var(--ink-2)' }}>{n.medida}</td>
                    <td className="num">{n.surco.toFixed(1)} mm</td>
                    <td className="num">
                      {prev ? <Delta actual={n.surco} previo={prev.surco} sufijo=" mm" /> : <span className="delta">—</span>}
                    </td>
                    <td className="num">{Math.round(n.presion)} PSI</td>
                    <td>
                      <span style={{ color: COLOR_ESTADO[n.nivel], fontWeight: 600 }}>
                        {est.icono} {est.etiqueta}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!previa && (
            <p className="nota">
              Es la inspección más antigua registrada: no hay una anterior con que comparar.
            </p>
          )}
        </div>
      )}
    </li>
  )
}

export default function FichaEquipo({ equipo, onCerrar }) {
  const historial = useMemo(() => historialDe(equipo.patente), [equipo.patente])
  const [abierta, setAbierta] = useState(0)

  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onCerrar() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onCerrar])

  const referencia = historial[0]?.neumaticos[0]?.surcoMin ?? 3

  return (
    <div className="ficha-fondo" onClick={onCerrar}>
      <aside
        className="ficha"
        role="dialog"
        aria-modal="true"
        aria-label={`Historial de inspecciones de ${equipo.patente}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="ficha-top">
          <div>
            <h2 className="ficha-pat">{equipo.patente}</h2>
            <p className="ficha-sub">
              {equipo.cd ?? 'Sin centro'} · {equipo.tipo} · {equipo.ejes} ejes ·{' '}
              {equipo.neumaticos} neumáticos
            </p>
          </div>
          <button className="ficha-cerrar" onClick={onCerrar} aria-label="Cerrar">✕</button>
        </header>

        {historial.length === 0 ? (
          <p className="nota">Este equipo no tiene inspecciones registradas.</p>
        ) : (
          <>
            <p className="ficha-resumen">
              <strong>{historial.length}</strong> inspecci{historial.length === 1 ? 'ón' : 'ones'}{' '}
              entre {fecha(historial[historial.length - 1].fecha)} y {fecha(historial[0].fecha)}.
            </p>

            {historial.length > 1 && (
              <section className="ficha-sec">
                <h3>Evolución del surco</h3>
                <p className="nota">
                  <i className="swatch" style={{ background: 'var(--accent)' }} /> promedio del equipo ·{' '}
                  <i className="swatch" style={{ background: 'var(--warning)' }} /> peor neumático de cada inspección
                </p>
                <Evolucion inspecciones={historial} referencia={referencia} />
              </section>
            )}

            <section className="ficha-sec">
              <h3>Inspecciones</h3>
              <p className="nota">De la más reciente a la más antigua. Toca una para ver sus neumáticos.</p>
              <ul className="insp-lista">
                {historial.map((insp, i) => (
                  <FilaInspeccion
                    key={`${insp.fecha}-${i}`}
                    insp={insp}
                    previa={historial[i + 1]}
                    indice={i}
                    total={historial.length}
                    abierta={abierta === i}
                    onToggle={() => setAbierta(abierta === i ? -1 : i)}
                  />
                ))}
              </ul>
            </section>
          </>
        )}
      </aside>
    </div>
  )
}
