import { useTooltip, Tooltip, TtFila } from './Tooltip.jsx'

/**
 * Barras horizontales de una sola serie (magnitud).
 * Un solo tono secuencial; extremo redondeado 4px anclado a la línea base;
 * etiqueta de valor directa en cada barra (no hay eje X redundante).
 */
export default function BarrasH({ datos, campoNombre = 'nombre', campoValor = 'cantidad', sufijo = '', color = 'var(--seq-450)', anchoEtiqueta = 108 }) {
  const { tt, show, hide } = useTooltip()
  if (!datos?.length) return null

  const max = Math.max(...datos.map((d) => d[campoValor])) || 1
  const alturaFila = 30
  const alto = datos.length * alturaFila
  const anchoTotal = 100 // porcentaje del área de trazado

  return (
    <>
      <div style={{ display: 'grid', gap: 6 }}>
        {datos.map((d) => {
          const pct = (d[campoValor] / max) * anchoTotal
          return (
            <div
              key={d[campoNombre]}
              style={{ display: 'grid', gridTemplateColumns: `${anchoEtiqueta}px 1fr auto`, alignItems: 'center', gap: 10 }}
              onMouseMove={(e) =>
                show(e, (
                  <>
                    <div className="tt-t">{d[campoNombre]}</div>
                    <TtFila color={color} nombre="Cantidad" valor={`${d[campoValor].toLocaleString('es-CL')}${sufijo}`} />
                  </>
                ))
              }
              onMouseLeave={hide}
            >
              <span className="cat-label" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {d[campoNombre]}
              </span>
              <span style={{ display: 'block', height: 12, background: 'var(--grid)', borderRadius: 4, overflow: 'hidden' }}>
                <i style={{ display: 'block', height: '100%', width: `${pct}%`, background: color, borderRadius: 4 }} />
              </span>
              <span className="val-label" style={{ minWidth: 52, textAlign: 'right' }}>
                {d[campoValor].toLocaleString('es-CL')}{sufijo}
              </span>
            </div>
          )
        })}
      </div>
      <Tooltip tt={tt} />
      <span className="sr-only" style={{ position: 'absolute', left: -9999 }}>
        Alto máximo del gráfico {alto} px
      </span>
    </>
  )
}
