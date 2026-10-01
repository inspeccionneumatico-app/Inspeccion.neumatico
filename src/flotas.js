/**
 * Flotas: subconjuntos de equipos que se miran aparte del resto.
 *
 * El reporte nació para la flota completa, pero hay grupos que se gestionan por
 * separado y necesitan sus propios indicadores. Una flota es, simplemente, una
 * lista de patentes; todo el reporte se recalcula sobre ella.
 *
 * Logística: las 13 PPU del archivo «PPU.xlsx» entregado por la operación
 * (columna PATENTE, con el guion quitado para que coincida con la base).
 */
export const FLOTAS = [
  {
    clave: 'logistica',
    etiqueta: 'Logística',
    descripcion: 'camiones de reparto de la operación logística',
    patentes: [
      'TFSX20', 'PZKG36', 'VBTR22', 'TFSX19', 'VBTR26', 'SDPY50', 'VBTR27',
      'SDPY49', 'VBTR23', 'SXWS50', 'RDBL20', 'SDPY51', 'RYWG63',
    ],
  },
]

// Para filtrar sin recorrer la lista en cada fila.
const INDICE = new Map(FLOTAS.map((f) => [f.clave, new Set(f.patentes)]))

export const flotaPorClave = (clave) => FLOTAS.find((f) => f.clave === clave) ?? null

/** ¿La patente pertenece a la flota? Sin flota elegida, pasa todo. */
export function enFlota(patente, clave) {
  if (!clave) return true
  const set = INDICE.get(clave)
  return set ? set.has(patente) : true
}
