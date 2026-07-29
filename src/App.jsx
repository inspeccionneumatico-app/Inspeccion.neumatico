import datos from './data/datos.json'
import { ESTADOS, colorSurco, colorPresion, fmt } from './estados.js'
import BarrasH from './components/BarrasH.jsx'
import BarrasApiladas from './components/BarrasApiladas.jsx'
import Histograma from './components/Histograma.jsx'
import Linea from './components/Linea.jsx'
import TablaEquipos from './components/TablaEquipos.jsx'

const { resumen: r, porCentro, distSurco, distPresion, marcas, medidas, serie, equipos } = datos

function fecha(iso) {
  if (!iso) return '—'
  const [a, m, d] = iso.split('-')
  return `${d}/${m}/${a}`
}

/** Tarjeta de indicador. El valor va acompañado de contexto, no solo del número. */
function Tile({ label, value, hint, color, pct }) {
  return (
    <div className="card tile">
      <span className="label">{label}</span>
      <span className="value" style={color ? { color } : undefined}>{value}</span>
      {pct != null && (
        <span className="bar-mini" aria-hidden="true">
          <i style={{ width: `${pct}%`, background: color || 'var(--accent)' }} />
        </span>
      )}
      {hint && <span className="hint">{hint}</span>}
    </div>
  )
}

export default function App() {
  const vig = r.neumaticosVigentes || 1
  const pctRiesgo = Math.round((r.riesgo / vig) * 100)
  const pctAdv = Math.round((r.advertencia / vig) * 100)
  const pctBueno = Math.round((r.bueno / vig) * 100)

  // Top 12 equipos con más neumáticos en riesgo (acción inmediata).
  const criticos = [...equipos]
    .filter((e) => (e.riesgo || 0) > 0)
    .sort((a, b) => b.riesgo - a.riesgo || (a.surcoProm ?? 99) - (b.surcoProm ?? 99))
    .slice(0, 12)
    .map((e) => ({ nombre: `${e.patente} · ${e.cd ?? 's/c'}`, cantidad: e.riesgo }))

  return (
    <div className="wrap">
      <header className="top">
        <p className="eyebrow">Reporte de flota · Inspección de neumáticos</p>
        <h1>Estado de los neumáticos de la flota</h1>
        <p className="lede">
          Consolidado de {fmt(r.inspecciones)} inspecciones sobre {fmt(r.equipos)} equipos.
          Los indicadores de estado reflejan la <strong>última inspección de cada equipo</strong>
          {' '}({fmt(r.neumaticosVigentes)} neumáticos vigentes); las tendencias usan el histórico completo.
        </p>
        <span className="periodo">📅 {fecha(r.desde)} → {fecha(r.hasta)}</span>
      </header>

      {/* ------------------------------------------------ indicadores */}
      <section>
        <div className="sec-head">
          <h2>Indicadores</h2>
          <p>Estado actual de la flota según la última inspección registrada por equipo.</p>
        </div>
        <div className="grid g-tiles">
          <Tile label="Equipos" value={fmt(r.equipos)} hint={`${fmt(r.inspecciones)} inspecciones históricas`} />
          <Tile label="Neumáticos vigentes" value={fmt(r.neumaticosVigentes)} hint={`${fmt(r.neumaticosHistoricos)} registros históricos`} />
          <Tile label="En riesgo" value={fmt(r.riesgo)} hint={`${pctRiesgo}% de los vigentes`} color="var(--critical)" pct={pctRiesgo} />
          <Tile label="Advertencia" value={fmt(r.advertencia)} hint={`${pctAdv}% · surco ≤ 6 mm`} color="var(--warning)" pct={pctAdv} />
          <Tile label="Óptimos" value={fmt(r.bueno)} hint={`${pctBueno}% de los vigentes`} color="var(--good)" pct={pctBueno} />
          <Tile label="Surco crítico" value={fmt(r.surcoCritico)} hint="< 2,5 mm — cambio inmediato" color="var(--critical)" />
          <Tile label="Presión crítica" value={fmt(r.presionCritica)} hint="< 95 PSI" color="var(--serious)" />
          <Tile label="Promedios" value={`${r.surcoPromedio} mm`} hint={`${fmt(r.presionPromedio)} PSI de presión media`} />
        </div>
      </section>

      {/* ------------------------------------------------ composición */}
      <section>
        <div className="sec-head">
          <h2>Composición del estado actual</h2>
          <p>Los {fmt(r.neumaticosVigentes)} neumáticos vigentes, clasificados por condición.</p>
        </div>
        <div className="card">
          <ul className="legend">
            {ESTADOS.map((e) => (
              <li key={e.clave}>
                <i className="swatch" style={{ background: e.color }} />
                {e.etiqueta} — <strong style={{ color: 'var(--ink)' }}>{fmt(r[e.clave])}</strong> ({Math.round((r[e.clave] / vig) * 100)}%)
              </li>
            ))}
          </ul>
          <div style={{ display: 'flex', height: 26, gap: 2, borderRadius: 4, overflow: 'hidden' }}>
            {ESTADOS.map((e, i) => (
              <i
                key={e.clave}
                title={`${e.etiqueta}: ${fmt(r[e.clave])}`}
                style={{
                  flex: `${r[e.clave]} 0 0`,
                  background: e.color,
                  borderRadius: i === 0 ? '4px 0 0 4px' : i === ESTADOS.length - 1 ? '0 4px 4px 0' : 0,
                }}
              />
            ))}
          </div>
          <p style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--ink-2)' }}>
            <strong style={{ color: 'var(--critical)' }}>▲ {pctRiesgo}%</strong> de los neumáticos en servicio está bajo el
            estándar de surco o de presión y requiere atención.
          </p>
        </div>
      </section>

      {/* ------------------------------------------------ por centro */}
      <section>
        <div className="sec-head">
          <h2>Por centro de distribución</h2>
          <p>Volumen y condición de los neumáticos en servicio de cada centro.</p>
        </div>
        <div className="card">
          <BarrasApiladas datos={porCentro} campoNombre="cd" />
        </div>
      </section>

      {/* ------------------------------------------------ distribuciones */}
      <section>
        <div className="sec-head">
          <h2>Distribución de mediciones</h2>
          <p>Cómo se reparten las mediciones de los neumáticos vigentes. El color marca la zona de riesgo.</p>
        </div>
        <div className="grid g-2">
          <div className="card">
            <h3 style={{ margin: '0 0 4px', fontSize: 14 }}>Surco medido (mm)</h3>
            <p style={{ margin: '0 0 14px', fontSize: 12.5, color: 'var(--ink-2)' }}>
              Mínimo legal 3 mm · advertencia desde 6 mm
            </p>
            <Histograma datos={distSurco} colorDe={colorSurco} unidad="mm" total={vig} />
          </div>
          <div className="card">
            <h3 style={{ margin: '0 0 4px', fontSize: 14 }}>Presión medida (PSI)</h3>
            <p style={{ margin: '0 0 14px', fontSize: 12.5, color: 'var(--ink-2)' }}>
              Recomendada 100 PSI (dirección 115) · tolerancia 5 PSI
            </p>
            <Histograma datos={distPresion} colorDe={colorPresion} unidad="PSI" total={vig} />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ tendencia */}
      <section>
        <div className="sec-head">
          <h2>Tendencia histórica</h2>
          <p>Actividad de inspección y desgaste promedio mes a mes ({serie.length} meses con registros).</p>
        </div>
        <div className="grid g-2">
          <div className="card">
            <h3 style={{ margin: '0 0 12px', fontSize: 14 }}>Inspecciones por mes</h3>
            <Linea datos={serie} campoY="inspecciones" etiquetaY="Inspecciones" colorHex="#2a78d6" />
          </div>
          <div className="card">
            <h3 style={{ margin: '0 0 12px', fontSize: 14 }}>Surco promedio medido (mm)</h3>
            <Linea
              datos={serie}
              campoY="surcoProm"
              etiquetaY="Surco promedio"
              colorHex="#1baf7a"
              referencia={3}
              etiquetaReferencia="mínimo 3 mm"
              sufijo=" mm"
            />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ prioridades */}
      <section>
        <div className="sec-head">
          <h2>Equipos que requieren atención</h2>
          <p>Los 12 equipos con más neumáticos fuera de estándar en su última inspección.</p>
        </div>
        <div className="card">
          <BarrasH datos={criticos} color="var(--critical)" anchoEtiqueta={190} />
        </div>
      </section>

      {/* ------------------------------------------------ marcas/medidas */}
      <section>
        <div className="sec-head">
          <h2>Marcas y medidas en servicio</h2>
          <p>Distribución de los neumáticos vigentes.</p>
        </div>
        <div className="grid g-2">
          <div className="card">
            <h3 style={{ margin: '0 0 14px', fontSize: 14 }}>Marcas más usadas</h3>
            <BarrasH datos={marcas} />
          </div>
          <div className="card">
            <h3 style={{ margin: '0 0 14px', fontSize: 14 }}>Medidas más usadas</h3>
            <BarrasH datos={medidas} anchoEtiqueta={130} />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ tabla */}
      <section>
        <div className="sec-head">
          <h2>Detalle por equipo</h2>
          <p>Busca por patente o centro, filtra y ordena por cualquier columna.</p>
        </div>
        <div className="card">
          <TablaEquipos equipos={equipos} centros={porCentro} />
        </div>
      </section>

      <footer className="foot">
        <p>
          <strong>Criterios.</strong> Riesgo: surco bajo el mínimo del equipo (3 mm) o presión bajo lo
          recomendado menos 5 PSI. Advertencia: surco ≤ 6 mm estando sobre el mínimo. Óptimo: el resto.
        </p>
        <p>
          Los indicadores de estado consideran solo la última inspección de cada equipo, para reflejar la
          situación vigente y no el acumulado histórico. Las inspecciones importadas no incluyen odómetro
          ni fotografías.
        </p>
        <p>Generado desde la base de la app Inspección Neumáticos · {fmt(r.equipos)} equipos · {fecha(r.desde)} a {fecha(r.hasta)}.</p>
      </footer>
    </div>
  )
}
