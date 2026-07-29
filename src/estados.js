/**
 * Paleta de ESTADO (fija, no tematizada) — ver dataviz/references/palette.md.
 * Nunca se usa color solo: cada estado va con etiqueta y/o ícono.
 */
export const ESTADOS = [
  { clave: 'riesgo', etiqueta: 'Riesgo', color: '#d03b3b', icono: '▲' },
  { clave: 'advertencia', etiqueta: 'Advertencia', color: '#fab219', icono: '●' },
  { clave: 'bueno', etiqueta: 'Óptimo', color: '#0ca30c', icono: '✓' },
]

export const COLOR_ESTADO = {
  riesgo: '#d03b3b',
  advertencia: '#fab219',
  bueno: '#0ca30c',
}

/** Color del bin de surco según los umbrales de negocio. */
export function colorSurco(rango) {
  if (rango.startsWith('<')) return '#d03b3b'      // < 2,5 mm  crítico
  if (rango === '2,5–4') return '#ec835a'          // serio
  if (rango === '4–6') return '#fab219'            // advertencia
  return '#0ca30c'                                  // sobre 6 mm
}

/** Color del bin de presión (recomendada 100 PSI, tolerancia 5). */
export function colorPresion(rango) {
  if (rango === '< 80') return '#d03b3b'
  if (rango === '80–90') return '#ec835a'
  if (rango === '90–95') return '#fab219'
  return '#0ca30c'
}

export const fmt = (n) => (n ?? 0).toLocaleString('es-CL')
