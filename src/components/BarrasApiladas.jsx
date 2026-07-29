import { useTooltip, Tooltip, TtFila } from './Tooltip.jsx'
import { ESTADOS } from '../estados.js'

/**
 * Barras apiladas por categoría con los tres estados.
 * Separación de 2px entre segmentos (color del lienzo), extremos redondeados y
 * etiqueta directa del total. La identidad nunca depende solo del color:
 * siempre hay leyenda y el detalle está en la tabla.
 */
export default function BarrasApiladas({ datos, campoNombre, mostrarPct = true }) {
  const { tt, show, hide } = useTooltip()
  if (!datos?.length) return null

  const totales = datos.map((d) => ESTADOS.reduce((a, e) => a + (d[e.clave] || 0), 0))
  const max = Math.max(...totales) || 1

  return (
    <>
      <ul className="legend">
        {ESTADOS.map((e) => (
          <li key={e.clave}>
            <i className="swatch" style={{ background: e.color }} />
            {e.etiqueta}
          </li>
        ))}
      </ul>

      <div style={{ display: 'grid', gap: 10 }}>
        {datos.map((d, i) => {
          const total = totales[i]
          const pctRiesgo = total ? Math.round((d.riesgo / total) * 100) : 0
          return (
            <div key={d[campoNombre]}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span className="cat-label" style={{ fontWeight: 600 }}>{d[campoNombre]}</span>
                <span className="val-label">
                  {total.toLocaleString('es-CL')} neum.
                  {mostrarPct && <> · <span style={{ color: 'var(--critical)' }}>{pctRiesgo}% riesgo</span></>}
                </span>
              </div>
              <div
                style={{ display: 'flex', height: 16, gap: 2, width: `${(total / max) * 100}%`, minWidth: 40 }}
                onMouseLeave={hide}
              >
                {ESTADOS.map((e, idx) => {
                  const v = d[e.clave] || 0
                  if (!v) return null
                  const esPrimero = idx === 0 || ESTADOS.slice(0, idx).every((p) => !d[p.clave])
                  const esUltimo = ESTADOS.slice(idx + 1).every((p) => !d[p.clave])
                  return (
                    <i
                      key={e.clave}
                      style={{
                        display: 'block',
                        flex: `${v} 0 0`,
                        background: e.color,
                        borderTopLeftRadius: esPrimero ? 4 : 0,
                        borderBottomLeftRadius: esPrimero ? 4 : 0,
                        borderTopRightRadius: esUltimo ? 4 : 0,
                        borderBottomRightRadius: esUltimo ? 4 : 0,
                      }}
                      onMouseMove={(ev) =>
                        show(ev, (
                          <>
                            <div className="tt-t">{d[campoNombre]}</div>
                            {ESTADOS.map((s) => (
                              <TtFila
                                key={s.clave}
                                color={s.color}
                                nombre={s.etiqueta}
                                valor={`${(d[s.clave] || 0).toLocaleString('es-CL')}`}
                              />
                            ))}
                            <TtFila nombre="Total" valor={total.toLocaleString('es-CL')} />
                          </>
                        ))
                      }
                    />
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
      <Tooltip tt={tt} />
    </>
  )
}
