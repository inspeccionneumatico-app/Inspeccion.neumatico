import { useMemo, useState } from 'react'
import { ESTADOS, fmt } from '../estados.js'

const COLS = [
  { k: 'patente', t: 'Patente', num: false },
  { k: 'cd', t: 'Centro', num: false },
  { k: 'neumaticos', t: 'Neum.', num: true },
  { k: 'estado', t: 'Estado actual', num: false, noSort: true },
  { k: 'riesgo', t: 'Riesgo', num: true },
  { k: 'surcoProm', t: 'Surco prom.', num: true },
  { k: 'presionProm', t: 'Presión prom.', num: true },
  { k: 'inspecciones', t: 'Insp.', num: true },
  { k: 'ultima', t: 'Última', num: false },
  { k: 'historial', t: 'Historial', num: false, noSort: true },
]

export default function TablaEquipos({ equipos, onAbrir }) {
  const [orden, setOrden] = useState({ k: 'riesgo', asc: false })

  const filas = useMemo(() => {
    let out = [...equipos]
    const { k, asc } = orden
    out = out.sort((a, b) => {
      const va = a[k] ?? (typeof b[k] === 'number' ? -1 : '')
      const vb = b[k] ?? (typeof a[k] === 'number' ? -1 : '')
      if (typeof va === 'number' && typeof vb === 'number') return asc ? va - vb : vb - va
      return asc ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va))
    })
    return out
  }, [equipos, orden])

  function ordenar(k) {
    setOrden((o) => (o.k === k ? { k, asc: !o.asc } : { k, asc: false }))
  }

  return (
    <>
      <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--ink-2)' }}>
        {fmt(filas.length)} equipo{filas.length === 1 ? '' : 's'} · ordenados por{' '}
        {COLS.find((c) => c.k === orden.k)?.t.toLowerCase()}
        {orden.asc ? ' ascendente' : ' descendente'} · toca una fila para ver su historial
      </p>

      <div className="tbl-wrap" style={{ maxHeight: 520, overflowY: 'auto' }}>
        <table>
          <caption className="sr-only" style={{ position: 'absolute', left: -9999 }}>
            Detalle por equipo: centro, cantidad de neumáticos, estado actual, promedios y última inspección
          </caption>
          <thead>
            <tr>
              {COLS.map((c) => (
                <th key={c.k} className={c.num ? 'num' : undefined} style={c.num ? { textAlign: 'right' } : undefined}
                    aria-sort={orden.k === c.k ? (orden.asc ? 'ascending' : 'descending') : 'none'}>
                  {c.noSort ? c.t : (
                    <button className="th" onClick={() => ordenar(c.k)}>
                      {c.t}{orden.k === c.k ? (orden.asc ? ' ▲' : ' ▼') : ''}
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((e) => {
              const tot = (e.riesgo || 0) + (e.advertencia || 0) + (e.bueno || 0)
              return (
                <tr
                  key={e.patente}
                  className="clicable"
                  tabIndex={0}
                  onClick={() => onAbrir(e)}
                  onKeyDown={(ev) => {
                    if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); onAbrir(e) }
                  }}
                >
                  <td className="pat">{e.patente}</td>
                  <td style={{ color: 'var(--ink-2)' }}>{e.cd ?? '—'}</td>
                  <td className="num">{e.neumaticos}</td>
                  <td>
                    {tot === 0 ? (
                      <span style={{ color: 'var(--ink-muted)', fontSize: 12 }}>sin datos</span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <span className="mini-stack" role="img"
                              aria-label={ESTADOS.map((s) => `${e[s.clave] || 0} ${s.etiqueta}`).join(', ')}>
                          {ESTADOS.map((s) =>
                            (e[s.clave] || 0) > 0 ? (
                              <i key={s.clave} style={{ background: s.color, flex: `${e[s.clave]} 0 0` }} />
                            ) : null,
                          )}
                        </span>
                        <span style={{ fontSize: 11.5, color: 'var(--ink-2)', fontVariantNumeric: 'tabular-nums' }}>
                          {e.riesgo || 0}/{tot}
                        </span>
                      </span>
                    )}
                  </td>
                  <td className="num">
                    {(e.riesgo || 0) > 0 ? (
                      <span className="pill" style={{ background: 'var(--critical)' }}>▲ {e.riesgo}</span>
                    ) : (
                      <span style={{ color: 'var(--good)', fontWeight: 700 }}>✓ 0</span>
                    )}
                  </td>
                  <td className="num">{e.surcoProm != null ? `${e.surcoProm} mm` : '—'}</td>
                  <td className="num">{e.presionProm != null ? `${e.presionProm} PSI` : '—'}</td>
                  <td className="num">{e.inspecciones}</td>
                  <td style={{ color: 'var(--ink-2)' }}>{e.ultima ?? '—'}</td>
                  <td className="ver-hist">Ver historial →</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {filas.length === 0 && (
        <p style={{ marginTop: 14, color: 'var(--ink-2)' }}>Ningún equipo coincide con la búsqueda.</p>
      )}
    </>
  )
}
