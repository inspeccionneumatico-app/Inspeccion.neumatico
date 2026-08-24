import { useEffect, useMemo, useState } from 'react'
import { fmt } from '../estados.js'

/**
 * Impacto en combustible y en costo de la baja presión y del surco bajo.
 *
 * Los factores NO son inventados: cada uno viene de una fuente publicada que
 * se cita abajo, en la sección. Los parámetros de la flota (precio del diésel,
 * consumo, kilometraje, costo del neumático) sí son supuestos: se muestran
 * editables porque cambian el resultado y solo el dueño de la flota los sabe.
 *
 * OJO con el surco: un neumático gastado NO consume más combustible, rueda
 * MÁS fácil (su resistencia a la rodadura baja ~20% a lo largo de su vida,
 * TRB Special Report 286). El costo del surco bajo es de seguridad y de
 * pérdida del casco, no de combustible. Presentarlo como gasto de combustible
 * sería falso.
 */

// --- Factores documentados (ver FUENTES al final del componente) -----------

// TMC/ATA RP 235A: ±20 psi respecto del objetivo dieron 2% de variación de
// consumo en un tracto de 18 ruedas -> 0,5% por cada 10 psi. NACFE da el
// rango 0,5–1,0% por cada 10 psi. Se muestran los dos extremos.
const FUEL_POR_10PSI_MIN = 0.005
const FUEL_POR_10PSI_MAX = 0.010

// TMC/ATA RP 235A: "A constant 20 percent underinflation/overload decreases
// the life of the tire by 30 percent."
const UMBRAL_VIDA = 0.20
const PERDIDA_VIDA = 0.30

const DEFECTO = {
  diesel: 1275,      // CLP/litro · ENAP, informe semanal 20-08-2026
  consumo: 30,       // litros/100 km
  km: 45000,         // km por equipo al año
  neumatico: 350000, // CLP, costo de un neumático nuevo
  recauchado: 40,    // % del valor de uno nuevo (rango documentado 30–50%)
}

const CLAVE_LS = 'impacto-parametros'

const clp = (n) =>
  '$' + Math.round(n).toLocaleString('es-CL')

/** Redondea a millones cuando la cifra es grande, para que se pueda leer. */
const clpCorto = (n) => {
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toLocaleString('es-CL', { maximumFractionDigits: 1 })} M`
  return clp(n)
}

function Param({ etiqueta, valor, onChange, sufijo, paso = 1, ancho = 92 }) {
  return (
    <label className="param">
      <span className="param-lbl">{etiqueta}</span>
      <span className="param-campo">
        <input
          type="number"
          value={valor}
          min={0}
          step={paso}
          style={{ width: ancho }}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        />
        <em>{sufijo}</em>
      </span>
    </label>
  )
}

export default function ImpactoEconomico({ filas, cd }) {
  const [p, setP] = useState(() => {
    try {
      return { ...DEFECTO, ...JSON.parse(localStorage.getItem(CLAVE_LS) || '{}') }
    } catch {
      return DEFECTO
    }
  })
  const set = (k) => (v) => setP((prev) => ({ ...prev, [k]: v }))

  useEffect(() => {
    try { localStorage.setItem(CLAVE_LS, JSON.stringify(p)) } catch { /* modo privado */ }
  }, [p])

  const m = useMemo(() => {
    // Las presiones en 0 son "no medida", no un neumático desinflado: si se
    // dejaran, inventarían un déficit enorme.
    const conPresion = filas.filter((f) => f.r > 0)
    const equipos = new Set(conPresion.map((f) => f.p))

    let deficitTotal = 0
    let bajos = 0
    let muyBajos = 0 // 20% o más bajo el estándar: el umbral que documenta TMC
    for (const f of conPresion) {
      const d = Math.max(0, f.rr - f.r)
      deficitTotal += d
      if (d > 0) bajos++
      if (f.rr > 0 && d / f.rr >= UMBRAL_VIDA) muyBajos++
    }
    const deficit = conPresion.length ? deficitTotal / conPresion.length : 0

    // Combustible: el factor es por vehículo, así que se aplica al déficit
    // promedio de la flota y al kilometraje de los equipos con medición.
    const litrosAno = (equipos.size * p.km * p.consumo) / 100
    const pctMin = (deficit / 10) * FUEL_POR_10PSI_MIN
    const pctMax = (deficit / 10) * FUEL_POR_10PSI_MAX

    // Vida útil: solo los que están en el umbral que documenta la fuente.
    const vidaPerdida = muyBajos * PERDIDA_VIDA * p.neumatico

    // Surco: los que están bajo el mínimo del equipo. El costo no es
    // combustible, es el casco: si se pasan del punto de retiro puede dejar de
    // ser recauchable y hay que comprar uno nuevo en vez de recauchar.
    const bajoMinimo = filas.filter((f) => f.s < f.sm).length
    const costoRecauchado = p.neumatico * (p.recauchado / 100)
    const cascosEnJuego = bajoMinimo * (p.neumatico - costoRecauchado)

    return {
      medidos: conPresion.length,
      sinMedir: filas.length - conPresion.length,
      equipos: equipos.size,
      bajos,
      pctBajos: conPresion.length ? Math.round((bajos / conPresion.length) * 100) : 0,
      deficit,
      muyBajos,
      litrosAno,
      litrosMin: litrosAno * pctMin,
      litrosMax: litrosAno * pctMax,
      pctMin, pctMax,
      costoMin: litrosAno * pctMin * p.diesel,
      costoMax: litrosAno * pctMax * p.diesel,
      vidaPerdida,
      bajoMinimo,
      cascosEnJuego,
      costoRecauchado,
    }
  }, [filas, p])

  return (
    <section>
      <div className="sec-head">
        <h2>Impacto en combustible y costos {cd && <span style={{ fontWeight: 400, color: 'var(--ink-2)' }}>· {cd}</span>}</h2>
        <p>
          Qué cuesta rodar con la presión baja, aplicando factores publicados a las mediciones
          de esta flota. Ajusta los parámetros con tus valores reales: quedan guardados en este
          navegador.
        </p>
      </div>

      <div className="card">
        <div className="params">
          <Param etiqueta="Diésel" valor={p.diesel} onChange={set('diesel')} sufijo="$/L" paso={25} />
          <Param etiqueta="Consumo" valor={p.consumo} onChange={set('consumo')} sufijo="L/100 km" paso={1} ancho={72} />
          <Param etiqueta="Recorrido anual" valor={p.km} onChange={set('km')} sufijo="km/equipo" paso={5000} ancho={104} />
          <Param etiqueta="Neumático nuevo" valor={p.neumatico} onChange={set('neumatico')} sufijo="$" paso={25000} ancho={104} />
          <Param etiqueta="Recauchado" valor={p.recauchado} onChange={set('recauchado')} sufijo="% del nuevo" paso={5} ancho={62} />
        </div>

        {/* ------------------------------------------------ combustible */}
        <h3 className="imp-h3">1 · Combustible perdido por baja presión</h3>
        <p className="nota">
          De los {fmt(m.medidos)} neumáticos vigentes con presión medida, <strong>{fmt(m.bajos)}</strong>
          {' '}({m.pctBajos}%) llegan bajo el estándar. El déficit promedio de la flota es de{' '}
          <strong>{m.deficit.toFixed(1)} PSI</strong>.
        </p>

        <div className="grid g-tiles">
          <div className="card tile">
            <span className="label">Sobreconsumo estimado</span>
            <span className="value" style={{ fontSize: 26, color: 'var(--serious)' }}>
              {(m.pctMin * 100).toFixed(2)}–{(m.pctMax * 100).toFixed(2)}%
            </span>
            <span className="hint">sobre el consumo de la flota</span>
          </div>
          <div className="card tile">
            <span className="label">Litros al año</span>
            <span className="value" style={{ fontSize: 26 }}>
              {fmt(Math.round(m.litrosMin))}–{fmt(Math.round(m.litrosMax))}
            </span>
            <span className="hint">de {fmt(Math.round(m.litrosAno))} L que consume la flota</span>
          </div>
          <div className="card tile">
            <span className="label">Costo al año</span>
            <span className="value" style={{ fontSize: 26, color: 'var(--critical)' }}>
              {clpCorto(m.costoMin)}–{clpCorto(m.costoMax)}
            </span>
            <span className="hint">{m.equipos} equipos · {fmt(p.km)} km cada uno</span>
          </div>
          <div className="card tile">
            <span className="label">Por equipo al año</span>
            <span className="value" style={{ fontSize: 26 }}>
              {clpCorto(m.costoMin / (m.equipos || 1))}–{clpCorto(m.costoMax / (m.equipos || 1))}
            </span>
            <span className="hint">promedio</span>
          </div>
        </div>

        <p className="nota imp-cav">
          <strong>Cómo leerlo.</strong> La presión registrada es la que traía el neumático <em>al
          llegar</em> a la inspección, y ahí se corrige. Esta cifra es el costo de rodar con ese
          déficit: es un techo, no un promedio del año. Cuanto más seguido se revise la presión,
          menos tiempo pasa la flota en esa condición.
        </p>

        {/* ------------------------------------------------ vida útil */}
        <h3 className="imp-h3">2 · Vida útil que se pierde por baja presión</h3>
        <p className="nota">
          El <strong>TMC</strong> (Technology &amp; Maintenance Council de la American Trucking
          Associations, el comité técnico que fija las prácticas de mantenimiento del transporte
          de carga en Estados Unidos) documenta que una baja presión constante del 20% reduce la
          vida del neumático en un 30%. En esta flota hay <strong>{fmt(m.muyBajos)}</strong>{' '}
          neumáticos vigentes en esa condición o peor.
        </p>
        <div className="grid g-tiles">
          <div className="card tile">
            <span className="label">Neumáticos 20% o más bajo el estándar</span>
            <span className="value" style={{ fontSize: 26, color: 'var(--serious)' }}>{fmt(m.muyBajos)}</span>
            <span className="hint">umbral documentado por el TMC</span>
          </div>
          <div className="card tile">
            <span className="label">Vida útil perdida</span>
            <span className="value" style={{ fontSize: 26, color: 'var(--critical)' }}>{clpCorto(m.vidaPerdida)}</span>
            <span className="hint">30% de la vida de {fmt(m.muyBajos)} neumáticos</span>
          </div>
        </div>
        <p className="nota imp-cav">
          Aplica si la condición es <em>constante</em>, que es el supuesto de la fuente. Es el
          valor que se deja de aprovechar, no un desembolso inmediato.
        </p>

        {/* ------------------------------------------------ surco */}
        <h3 className="imp-h3">3 · Surco bajo: no es combustible, es el casco</h3>
        <p className="nota">
          El costo del surco bajo es de seguridad —frenado en mojado, riesgo de reventón— y de{' '}
          <strong>pérdida del casco</strong>. Si el neumático se pasa del punto de retiro, el casco
          puede dejar de ser recauchable y hay que comprar uno nuevo en vez de recauchar.
        </p>
        <div className="grid g-tiles">
          <div className="card tile">
            <span className="label">Bajo el mínimo del equipo</span>
            <span className="value" style={{ fontSize: 26, color: 'var(--critical)' }}>{fmt(m.bajoMinimo)}</span>
            <span className="hint">cambio inmediato</span>
          </div>
          <div className="card tile">
            <span className="label">Diferencia nuevo vs recauchado</span>
            <span className="value" style={{ fontSize: 26 }}>{clp(p.neumatico - m.costoRecauchado)}</span>
            <span className="hint">por neumático, si se pierde el casco</span>
          </div>
          <div className="card tile">
            <span className="label">En juego en esos {fmt(m.bajoMinimo)}</span>
            <span className="value" style={{ fontSize: 26, color: 'var(--serious)' }}>{clpCorto(m.cascosEnJuego)}</span>
            <span className="hint">si los cascos no se pueden recauchar</span>
          </div>
        </div>

        {/* ------------------------------------------------ fuentes */}
        <details className="fuentes-caja">
          <summary>Fuentes de los factores usados (6)</summary>
        <ul className="fuentes">
          <li>
            <strong>TMC/ATA · Recommended Practice RP 235A</strong>, «Guidelines for Tire Inflation
            Pressure Maintenance» (VMRS 017, 2003, rev. 2008). De aquí salen los dos factores
            centrales: la baja presión constante del 20% que reduce la vida del neumático en 30%, y
            el ensayo en un tracto de 18 ruedas donde ±20 psi respecto del objetivo dieron 2% de
            variación de consumo — o sea 0,5% por cada 10 psi.{' '}
            <a href="http://higherlogicdownload.s3.amazonaws.com/TMCCONNECT/800693ba-be1e-4270-b529-e98b2936c5c3/UploadedImages/RP%20235A(T)_bal%20Guidelines%20for%20PRessure%20Maintenance.pdf" target="_blank" rel="noreferrer">documento</a>
          </li>
          <li>
            <strong>NACFE</strong> (North American Council for Freight Efficiency), «Tire Pressure
            Inflation». Sitúa el sobreconsumo en 0,5% a 1,0% por cada 10 psi de baja presión en
            vehículos pesados; es el extremo superior del rango que usa este cálculo. Documenta
            además que solo el 46% de los neumáticos de tracto inspeccionados estaba dentro de ±5
            psi del objetivo.{' '}
            <a href="https://nacfe.org/research/technology/tires-rolling-resistance/tire-pressure-inflation/" target="_blank" rel="noreferrer">informe</a>
          </li>
          <li>
            <strong>Transportation Research Board · Special Report 286</strong>, «Tires and
            Passenger Vehicle Fuel Economy» (National Academies). La resistencia a la rodadura de
            un neumático cae 20% o más a medida que el surco se desgasta: es la base de que el
            surco bajo no sea un costo de combustible.{' '}
            <a href="https://www.nationalacademies.org/read/11620/chapter/6" target="_blank" rel="noreferrer">capítulo</a>
          </li>
          <li>
            <strong>TMC/ATA · Future Truck Position Paper 2018-5</strong>, «Dynamic Tire Inflation
            for Commercial Vehicles». La presión incorrecta cuesta dinero por desgaste de banda y
            por vida del casco, y la baja presión exige más energía por mayor resistencia a la
            rodadura.{' '}
            <a href="https://tmc.trucking.org/sites/default/files/FT_PP_2018_5_Dynamic_Tire_Inflation_for_Commercial_Vehicles.pdf" target="_blank" rel="noreferrer">documento</a>
          </li>
          <li>
            <strong>Bridgestone / Bandag</strong> y <strong>EPA SmartWay</strong> (programa de
            certificación de recauchados). Un recauchado cuesta entre 30% y 50% menos que un
            neumático nuevo, y un casco bien mantenido admite tres o cuatro recauchados. De ahí el
            parámetro editable de arriba.{' '}
            <a href="https://commercial.bridgestone.com/en-us/resource-center/articles/retread/retread-cost-savings" target="_blank" rel="noreferrer">Bandag</a>{', '}
            <a href="https://www.continental-tires.com/us/en/products/truck/resources/insights/smartway/" target="_blank" rel="noreferrer">SmartWay</a>
          </li>
          <li>
            <strong>ENAP</strong> · informe semanal de precios de referencia (20-08-2026): diésel
            en torno a $1.275 por litro. Es el valor por defecto; si la flota compra con descuento
            o recupera impuesto específico, cámbialo arriba.{' '}
            <a href="https://www.enap.cl/informe-semanal-de-precios" target="_blank" rel="noreferrer">informe</a>
          </li>
        </ul>
          <p className="nota" style={{ marginTop: 10, marginBottom: 0 }}>
            Los factores son de las fuentes citadas; el precio del diésel, el consumo, el recorrido
            anual y el costo del neumático son <strong>supuestos editables</strong> de esta flota.
            Cambiarlos cambia todas las cifras de esta sección.
          </p>
        </details>
      </div>
    </section>
  )
}
