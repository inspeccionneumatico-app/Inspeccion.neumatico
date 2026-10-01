import { FLOTAS } from '../flotas.js'

/**
 * Barra de filtros del reporte completo: flota + centro de distribución +
 * patente. Queda fija arriba porque afecta a TODOS los indicadores y gráficos.
 */
export default function BarraFiltros({
  centros, conteos, cd, setCd, q, setQ, flota, setFlota,
  vigentes, equipos, totalEquipos, totalFlota,
}) {
  const hayFiltro = cd !== null || q.trim() !== ''
  const flotaActiva = FLOTAS.find((f) => f.clave === flota)
  // Con un solo centro la fila de chips no aporta, pero el dato sí: se dice acá.
  const centroUnico = centros.length === 1 ? centros[0] : null

  return (
    <div className="filtros">
      {/* La flota va primero: es el filtro de mayor alcance, los demás se
          aplican dentro de ella. */}
      <div className="filtros-row" role="group" aria-label="Filtrar por flota">
        <span className="filtros-lbl">Flota:</span>
        {FLOTAS.map((f) => (
          <button
            key={f.clave}
            className="chip chip-flota"
            aria-pressed={flota === f.clave}
            onClick={() => setFlota(f.clave)}
          >
            {f.etiqueta} ({f.patentes.length})
          </button>
        ))}
        <button className="chip chip-flota" aria-pressed={flota === null} onClick={() => setFlota(null)}>
          Toda la flota ({totalFlota})
        </button>
      </div>

      <div className="filtros-row">
        <label className="buscador">
          <span aria-hidden="true">🔎</span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value.toUpperCase())}
            placeholder="Buscar patente… (ej: SDBT13)"
            aria-label="Buscar equipo por patente"
            autoComplete="off"
          />
          {q && (
            <button className="limpiar" onClick={() => setQ('')} aria-label="Limpiar búsqueda">
              ✕
            </button>
          )}
        </label>

        {hayFiltro && (
          <button className="chip chip-reset" onClick={() => { setCd(null); setQ('') }}>
            ✕ Quitar filtros
          </button>
        )}
      </div>

      {centros.length > 1 && (
        <div className="filtros-row" role="group" aria-label="Filtrar por centro de distribución">
          <span className="filtros-lbl">Centro:</span>
          <button className="chip" aria-pressed={cd === null} onClick={() => setCd(null)}>
            Todos ({totalEquipos})
          </button>
          {centros.map((c) => (
            <button key={c} className="chip" aria-pressed={cd === c} onClick={() => setCd(c)}>
              {c} ({conteos[c] ?? 0})
            </button>
          ))}
        </div>
      )}

      <p className="filtros-estado" aria-live="polite">
        Mostrando <strong>{equipos.toLocaleString('es-CL')}</strong> equipo{equipos === 1 ? '' : 's'} ·{' '}
        <strong>{vigentes.toLocaleString('es-CL')}</strong> neumáticos vigentes
        {flotaActiva && <> · flota <strong>{flotaActiva.etiqueta}</strong></>}
        {cd && <> · centro <strong>{cd}</strong></>}
        {q.trim() && <> · patente contiene <strong>{q.trim()}</strong></>}
      </p>

      {flotaActiva && (
        <p className="filtros-aviso">
          Solo se están mostrando los <strong>{flotaActiva.patentes.length} equipos</strong> de{' '}
          {flotaActiva.etiqueta} ({flotaActiva.descripcion})
          {centroUnico && <>, todos del centro <strong>{centroUnico}</strong></>}. El resto de la
          flota está oculto — toca «Toda la flota» para verla completa.
        </p>
      )}
    </div>
  )
}
