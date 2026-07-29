import { useTooltip, Tooltip, TtFila } from './Tooltip.jsx'

/**
 * Histograma de columnas. Los bins se colorean con la paleta de ESTADO cuando
 * los cortes son umbrales de negocio (surco/presión), acompañados siempre de
 * etiqueta de rango y del valor, de modo que el color no es el único canal.
 */
export default function Histograma({ datos, colorDe, unidad = '', total }) {
  const { tt, show, hide } = useTooltip()
  if (!datos?.length) return null

  const max = Math.max(...datos.map((d) => d.cantidad)) || 1
  const ALTO = 150

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${datos.length}, 1fr)`, gap: 6, alignItems: 'end', height: ALTO }}>
        {datos.map((d) => {
          const h = Math.max((d.cantidad / max) * (ALTO - 26), d.cantidad > 0 ? 3 : 0)
          const color = colorDe ? colorDe(d.rango) : 'var(--seq-450)'
          const pct = total ? Math.round((d.cantidad / total) * 100) : null
          return (
            <div
              key={d.rango}
              style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: 5, height: '100%' }}
              onMouseMove={(e) =>
                show(e, (
                  <>
                    <div className="tt-t">{d.rango} {unidad}</div>
                    <TtFila color={color} nombre="Neumáticos" valor={d.cantidad.toLocaleString('es-CL')} />
                    {pct !== null && <TtFila nombre="Del total" valor={`${pct}%`} />}
                  </>
                ))
              }
              onMouseLeave={hide}
            >
              <span className="val-label">{d.cantidad.toLocaleString('es-CL')}</span>
              {/* extremo superior redondeado 4px, anclado a la base */}
              <i style={{ display: 'block', width: '100%', height: h, background: color, borderRadius: '4px 4px 0 0' }} />
            </div>
          )
        })}
      </div>
      {/* línea base */}
      <div style={{ height: 1, background: 'var(--axis)', margin: '0 0 6px' }} />
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${datos.length}, 1fr)`, gap: 6 }}>
        {datos.map((d) => (
          <span key={d.rango} className="tick" style={{ textAlign: 'center' }}>{d.rango}</span>
        ))}
      </div>
      <Tooltip tt={tt} />
    </>
  )
}
