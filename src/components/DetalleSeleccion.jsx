import { useEffect, useMemo, useState } from 'react'
import { TIPOS } from '../datos.js'
import { ESTADOS, COLOR_ESTADO, fmt } from '../estados.js'

/** Cuántas filas se dibujan; el resto se anuncia, no se esconde. */
const TOPE = 400

const SIGLA = Object.fromEntries(TIPOS.map((t) => [t.clave, t.sigla]))
const ETIQ_TIPO = Object.fromEntries(TIPOS.map((t) => [t.clave, t.etiqueta]))
const PESO_NIVEL = { riesgo: 0, advertencia: 1, bueno: 2 }

function fecha(iso) {
  if (!iso) return '—'
  const [a, m, d] = iso.split('-')
  return `${d}/${m}/${a}`
}

const COLS = [
  { k: 'p', t: 'Patente' },
  { k: 'f', t: 'Fecha' },
  { k: 'c', t: 'Centro' },
  { k: 'o', t: 'Pos', num: true },
  { k: 't', t: 'Tipo' },
  { k: 'm', t: 'Marca' },
  { k: 'd', t: 'Medida' },
  { k: 's', t: 'Surco', num: true },
  { k: 'r', t: 'Presión', num: true },
  { k: 'n', t: 'Estado' },
]

/**
 * Detalle de lo que hay detrás de un gráfico: las mediciones que formaron la
 * barra, la columna o el indicador en que se hizo clic.
 *
 * `filas` son filas de medición (la forma de ACTUAL, con `f` si vienen del
 * histórico). Tocar una abre la ficha de ese equipo.
 */
export default function DetalleSeleccion({ titulo, descripcion, filas, onCerrar, onVerEquipo }) {
  const [orden, setOrden] = useState({ k: null, asc: true })

  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onCerrar() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onCerrar])

  const resumen = useMemo(() => {
    const equipos = new Set()
    const conteo = { riesgo: 0, advertencia: 0, bueno: 0 }
    let surco = 0, presion = 0, reguladas = 0
    for (const f of filas) {
      equipos.add(f.p)
      conteo[f.n]++
      surco += f.s
      presion += f.r
      if (f.r < f.rr - 5 && f.reg) reguladas++
    }
    const n = filas.length || 1
    return {
      equipos: equipos.size,
      ...conteo,
      reguladas,
      surco: (surco / n).toFixed(1),
      presion: Math.round(presion / n),
    }
  }, [filas])

  // Por defecto, lo más grave primero: es lo que uno viene a ver.
  const ordenadas = useMemo(() => {
    const xs = [...filas]
    if (!orden.k) {
      return xs.sort((a, b) => PESO_NIVEL[a.n] - PESO_NIVEL[b.n] || a.s - b.s)
    }
    const signo = orden.asc ? 1 : -1
    return xs.sort((a, b) => {
      const va = a[orden.k], vb = b[orden.k]
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * signo
      return String(va ?? '').localeCompare(String(vb ?? '')) * signo
    })
  }, [filas, orden])

  const visibles = ordenadas.slice(0, TOPE)
  const hayFecha = filas.some((f) => f.f)
  const cols = COLS.filter((c) => c.k !== 'f' || hayFecha)

  function ordenar(k) {
    setOrden((o) => (o.k === k ? { k, asc: !o.asc } : { k, asc: true }))
  }

  return (
    <div className="ficha-fondo" onClick={onCerrar}>
      <aside
        className="ficha"
        role="dialog"
        aria-modal="true"
        aria-label={`Detalle: ${titulo}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="ficha-top">
          <div>
            <h2 className="ficha-pat" style={{ fontSize: 19, letterSpacing: 0 }}>{titulo}</h2>
            <p className="ficha-sub">{descripcion}</p>
          </div>
          <button className="ficha-cerrar" onClick={onCerrar} aria-label="Cerrar">✕</button>
        </header>

        {filas.length === 0 ? (
          <p className="nota">No hay mediciones en esta selección.</p>
        ) : (
          <>
            <div className="grid g-tiles" style={{ marginBottom: 14 }}>
              <div className="card tile">
                <span className="label">Mediciones</span>
                <span className="value" style={{ fontSize: 24 }}>{fmt(filas.length)}</span>
                <span className="hint">
                  en {fmt(resumen.equipos)} equipo{resumen.equipos === 1 ? '' : 's'}
                </span>
              </div>
              {ESTADOS.map((e) => (
                <div className="card tile" key={e.clave}>
                  <span className="label">{e.etiqueta}</span>
                  <span className="value" style={{ fontSize: 24, color: e.color }}>{fmt(resumen[e.clave])}</span>
                  <span className="hint">
                    {Math.round((resumen[e.clave] / filas.length) * 100)}% de la selección
                  </span>
                </div>
              ))}
              <div className="card tile">
                <span className="label">Promedios</span>
                <span className="value" style={{ fontSize: 24 }}>{resumen.surco} mm</span>
                <span className="hint">{fmt(resumen.presion)} PSI al llegar</span>
              </div>
              {resumen.reguladas > 0 && (
                <div className="card tile">
                  <span className="label">Presión regularizada</span>
                  <span className="value" style={{ fontSize: 24, color: 'var(--good)' }}>{fmt(resumen.reguladas)}</span>
                  <span className="hint">llegaron bajas y se corrigieron</span>
                </div>
              )}
            </div>

            <p className="nota">
              {visibles.length < filas.length ? (
                <>Se listan las {fmt(visibles.length)} más críticas de {fmt(filas.length)}. Para el
                total, usa «Descargar Excel».</>
              ) : (
                <>Las {fmt(filas.length)} mediciones de la selección.</>
              )}
              {' '}Toca una fila para ver el historial del equipo.
            </p>

            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    {cols.map((c) => (
                      <th
                        key={c.k}
                        style={c.num ? { textAlign: 'right' } : undefined}
                        aria-sort={orden.k === c.k ? (orden.asc ? 'ascending' : 'descending') : 'none'}
                      >
                        <button className="th" onClick={() => ordenar(c.k)}>
                          {c.t}{orden.k === c.k ? (orden.asc ? ' ▲' : ' ▼') : ''}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibles.map((f, i) => {
                    const est = ESTADOS.find((e) => e.clave === f.n)
                    return (
                      <tr
                        key={`${f.p}-${f.f ?? ''}-${f.o}-${i}`}
                        className="clicable"
                        tabIndex={0}
                        onClick={() => onVerEquipo(f.p)}
                        onKeyDown={(ev) => {
                          if (ev.key === 'Enter' || ev.key === ' ') {
                            ev.preventDefault()
                            onVerEquipo(f.p)
                          }
                        }}
                      >
                        <td className="pat">{f.p}</td>
                        {hayFecha && <td style={{ color: 'var(--ink-2)' }}>{fecha(f.f)}</td>}
                        <td style={{ color: 'var(--ink-2)' }}>{f.c}</td>
                        <td className="num">{f.o}</td>
                        <td>
                          <span className={`tag-tipo t-${f.t}`} title={ETIQ_TIPO[f.t]}>{SIGLA[f.t]}</span>
                        </td>
                        <td>{f.m}</td>
                        <td style={{ color: 'var(--ink-2)' }}>{f.d}</td>
                        <td className="num">{f.s.toFixed(1)} mm</td>
                        <td className="num">
                          {Math.round(f.r)} PSI
                          {f.r < f.rr - 5 && (
                            <span
                              className="marca-reg"
                              title={f.reg ? 'Se reguló en la inspección' : 'Llegó baja y NO se reguló'}
                              style={{ color: f.reg ? 'var(--good)' : 'var(--critical)' }}
                            >
                              {f.reg ? ' ✓reg' : ' ▲'}
                            </span>
                          )}
                        </td>
                        <td style={{ color: COLOR_ESTADO[f.n], fontWeight: 600 }}>
                          {est.icono} {est.etiqueta}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </aside>
    </div>
  )
}
