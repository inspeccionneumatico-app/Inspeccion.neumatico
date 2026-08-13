/** Arma las hojas del Excel a partir de la base del reporte. */
import { EQUIPOS, historialDe, meta } from './datos.js'
import { construirXlsx, descargar } from './xlsx.js'

const ETIQUETA_NIVEL = { riesgo: 'Riesgo', advertencia: 'Advertencia', bueno: 'Óptimo' }

const COLUMNAS_MEDICION = [
  'Patente', 'Centro', 'Fecha inspección', 'Posición', 'Tipo', 'Marca', 'Medida',
  'Surco (mm)', 'Surco mínimo (mm)', 'Presión al llegar (PSI)',
  'Presión recomendada (PSI)', 'Presión bajo estándar', '¿Se reguló?', 'Estado',
]
const ANCHOS_MEDICION = [12, 20, 15, 9, 12, 16, 16, 11, 17, 20, 23, 20, 12, 13]

function filaMedicion(patente, insp, n) {
  return [
    patente,
    insp.cd,
    { fecha: insp.fecha },
    n.pos,
    n.tipo.etiqueta,
    n.marca,
    n.medida,
    n.surco,
    n.surcoMin,
    n.presion,
    n.presionRec,
    n.presionBajoEstandar ? 'Sí' : 'No',
    n.regulada ? 'Sí' : 'No',
    ETIQUETA_NIVEL[n.nivel],
  ]
}

/**
 * Tres hojas: el estado vigente (lo que muestra el reporte), el histórico
 * completo y un resumen por equipo.
 */
export function hojasDeDatos() {
  const actual = [COLUMNAS_MEDICION]
  const historico = [COLUMNAS_MEDICION]

  for (const e of EQUIPOS) {
    const inspecciones = historialDe(e.patente)
    inspecciones.forEach((insp, i) => {
      for (const n of insp.neumaticos) {
        const fila = filaMedicion(e.patente, insp, n)
        historico.push(fila)
        if (i === 0) actual.push(fila)
      }
    })
  }

  const equipos = [[
    'Patente', 'Centro', 'Tipo', 'Ejes', 'Neumáticos', 'Inspecciones',
    'Última inspección', 'En riesgo', 'Advertencia', 'Óptimos',
    'Surco promedio (mm)', 'Presión promedio (PSI)',
  ]]
  for (const e of EQUIPOS) {
    equipos.push([
      e.patente, e.cd ?? 'Sin centro', e.tipo, e.ejes, e.neumaticos,
      e.inspecciones, e.ultima ? { fecha: e.ultima } : '',
      e.riesgo, e.advertencia, e.bueno,
      e.surcoProm ?? '', e.presionProm ?? '',
    ])
  }

  return [
    { nombre: 'Estado actual', filas: actual, anchos: ANCHOS_MEDICION },
    { nombre: 'Histórico', filas: historico, anchos: ANCHOS_MEDICION },
    { nombre: 'Equipos', filas: equipos, anchos: [12, 20, 12, 7, 12, 13, 17, 10, 12, 10, 19, 21] },
  ]
}

export async function descargarExcel() {
  const blob = await construirXlsx(hojasDeDatos())
  descargar(blob, `inspeccion-neumaticos-${meta.hasta}.xlsx`)
}
