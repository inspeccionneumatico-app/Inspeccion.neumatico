import { useState } from 'react'
import { descargarExcel } from '../exportar.js'

/**
 * Descargas del reporte.
 *
 * El PDF sale del diálogo de impresión del navegador ("Guardar como PDF"):
 * imprime lo que está en pantalla, con el filtro aplicado, sin sumar una
 * librería de render al bundle.
 */
export default function Descargas({ cd, q }) {
  const [estado, setEstado] = useState(null)

  async function excel() {
    setEstado('generando')
    try {
      await descargarExcel()
      setEstado('listo')
      setTimeout(() => setEstado(null), 4000)
    } catch (e) {
      console.error(e)
      setEstado('error')
    }
  }

  const filtrado = cd || q.trim()

  return (
    <div className="descargas no-print">
      <button className="btn-descarga" onClick={() => window.print()}>
        <span aria-hidden="true">🖨️</span> Descargar PDF
      </button>
      <button className="btn-descarga" onClick={excel} disabled={estado === 'generando'}>
        <span aria-hidden="true">📊</span>{' '}
        {estado === 'generando' ? 'Generando…' : 'Descargar Excel'}
      </button>
      <span className="descargas-nota">
        {estado === 'error'
          ? 'No se pudo generar el Excel. Revisa la consola.'
          : estado === 'listo'
            ? 'Excel descargado.'
            : <>El PDF sale con {filtrado ? 'el filtro aplicado' : 'el reporte completo'} —
              elige «Guardar como PDF» en el diálogo. El Excel trae la base completa
              (estado actual, histórico y equipos).</>}
      </span>
    </div>
  )
}
