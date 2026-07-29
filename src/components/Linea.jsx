import { useRef, useState } from 'react'
import { Tooltip, TtFila } from './Tooltip.jsx'

/**
 * Serie temporal de una sola medida (línea 2px + marcadores 8px).
 * Un solo eje de valores — nunca dos escalas en el mismo gráfico.
 * Capa de interacción: crosshair vertical + tooltip del punto más cercano.
 */
export default function Linea({
  datos,
  campoX = 'mes',
  campoY,
  etiquetaY,
  color = 'var(--accent)',
  colorHex = '#2a78d6',
  referencia = null,
  etiquetaReferencia = '',
  sufijo = '',
}) {
  const [idx, setIdx] = useState(null)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const ref = useRef(null)

  if (!datos?.length) return null

  const W = 760, H = 210
  const P = { t: 14, r: 14, b: 30, l: 44 }
  const iw = W - P.l - P.r
  const ih = H - P.t - P.b

  const ys = datos.map((d) => d[campoY])
  const maxY = Math.max(...ys, referencia ?? -Infinity)
  const minY = Math.min(...ys, referencia ?? Infinity)
  const pad = (maxY - minY) * 0.12 || 1
  const lo = Math.max(0, minY - pad)
  const hi = maxY + pad

  const px = (i) => P.l + (datos.length === 1 ? iw / 2 : (iw * i) / (datos.length - 1))
  const py = (v) => P.t + ih - ((v - lo) / (hi - lo)) * ih

  const linea = datos.map((d, i) => `${i === 0 ? 'M' : 'L'}${px(i)},${py(d[campoY])}`).join(' ')
  const area = `${linea} L${px(datos.length - 1)},${P.t + ih} L${px(0)},${P.t + ih} Z`

  const ticks = 4
  const marcasY = Array.from({ length: ticks + 1 }, (_, k) => lo + ((hi - lo) * k) / ticks)

  function mover(e) {
    const r = ref.current.getBoundingClientRect()
    const xRel = ((e.clientX - r.left) / r.width) * W
    let mejor = 0, dmin = Infinity
    datos.forEach((_, i) => {
      const d = Math.abs(px(i) - xRel)
      if (d < dmin) { dmin = d; mejor = i }
    })
    setIdx(mejor)
    setPos({ x: e.clientX, y: e.clientY })
  }

  const activo = idx !== null ? datos[idx] : null

  return (
    <>
      <svg
        ref={ref}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${etiquetaY} por mes`}
        onMouseMove={mover}
        onMouseLeave={() => setIdx(null)}
        style={{ width: '100%', height: 'auto' }}
      >
        {marcasY.map((v, k) => (
          <g key={k}>
            <line className="gridline" x1={P.l} x2={W - P.r} y1={py(v)} y2={py(v)} />
            <text className="tick" x={P.l - 8} y={py(v) + 4} textAnchor="end">
              {Math.round(v).toLocaleString('es-CL')}
            </text>
          </g>
        ))}

        {referencia !== null && (
          <g>
            <line
              x1={P.l} x2={W - P.r} y1={py(referencia)} y2={py(referencia)}
              stroke="var(--critical)" strokeWidth="1.5" strokeDasharray="5 4"
            />
            <text className="tick" x={W - P.r} y={py(referencia) - 6} textAnchor="end" style={{ fill: 'var(--critical)' }}>
              {etiquetaReferencia}
            </text>
          </g>
        )}

        <path d={area} fill={colorHex} opacity="0.10" />
        <path d={linea} fill="none" stroke={colorHex} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {activo && (
          <line className="axisline" x1={px(idx)} x2={px(idx)} y1={P.t} y2={P.t + ih} strokeDasharray="3 3" />
        )}

        {datos.map((d, i) => (
          <circle
            key={i}
            cx={px(i)} cy={py(d[campoY])}
            r={idx === i ? 5.5 : 3.5}
            fill={colorHex}
            stroke="var(--surface)" strokeWidth="2"
          />
        ))}

        <line className="axisline" x1={P.l} x2={W - P.r} y1={P.t + ih} y2={P.t + ih} />

        {datos.map((d, i) =>
          i % Math.ceil(datos.length / 8) === 0 ? (
            <text key={i} className="tick" x={px(i)} y={H - 10} textAnchor="middle">
              {d[campoX].slice(2)}
            </text>
          ) : null,
        )}
      </svg>

      {activo && (
        <Tooltip
          tt={{
            x: pos.x,
            y: pos.y,
            contenido: (
              <>
                <div className="tt-t">{activo[campoX]}</div>
                <TtFila color={colorHex} nombre={etiquetaY} valor={`${activo[campoY].toLocaleString('es-CL')}${sufijo}`} />
                <TtFila nombre="Inspecciones" valor={activo.inspecciones?.toLocaleString('es-CL') ?? '—'} />
                <TtFila nombre="Neumáticos" valor={activo.neumaticos?.toLocaleString('es-CL') ?? '—'} />
              </>
            ),
          }}
        />
      )}
    </>
  )
}
