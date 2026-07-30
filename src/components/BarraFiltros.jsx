/**
 * Barra de filtros del reporte completo: centro de distribución + patente.
 * Queda fija arriba porque afecta a TODOS los indicadores y gráficos.
 */
export default function BarraFiltros({ centros, conteos, cd, setCd, q, setQ, vigentes, equipos, totalEquipos }) {
  const hayFiltro = cd !== null || q.trim() !== ''

  return (
    <div className="filtros">
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

      <p className="filtros-estado" aria-live="polite">
        Mostrando <strong>{equipos.toLocaleString('es-CL')}</strong> equipo{equipos === 1 ? '' : 's'} ·{' '}
        <strong>{vigentes.toLocaleString('es-CL')}</strong> neumáticos vigentes
        {cd && <> · centro <strong>{cd}</strong></>}
        {q.trim() && <> · patente contiene <strong>{q.trim()}</strong></>}
      </p>
    </div>
  )
}
