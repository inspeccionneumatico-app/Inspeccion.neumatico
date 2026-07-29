import { useState, useCallback } from 'react'

/** Tooltip flotante reutilizable: sigue el cursor y no intercepta eventos. */
export function useTooltip() {
  const [tt, setTt] = useState(null)

  const show = useCallback((e, contenido) => {
    setTt({ x: e.clientX, y: e.clientY, contenido })
  }, [])
  const hide = useCallback(() => setTt(null), [])

  return { tt, show, hide }
}

export function Tooltip({ tt }) {
  if (!tt) return null
  // Se desplaza para no quedar bajo el cursor ni salir de la ventana.
  const x = Math.min(tt.x + 14, window.innerWidth - 190)
  const y = Math.max(tt.y - 12, 8)
  return (
    <div className="tt" style={{ left: x, top: y }} role="status">
      {tt.contenido}
    </div>
  )
}

export function TtFila({ color, nombre, valor }) {
  return (
    <div className="tt-r">
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        {color && <i className="swatch" style={{ background: color }} />}
        {nombre}
      </span>
      <span>{valor}</span>
    </div>
  )
}
