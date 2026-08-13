/**
 * Generador de .xlsx sin dependencias.
 *
 * Un xlsx es un ZIP con XML adentro. El navegador ya trae DEFLATE
 * (CompressionStream), así que solo hace falta armar el contenedor: evita
 * sumar una librería de ~400 KB a una página que se descarga entera.
 */

// ------------------------------------------------------------------ ZIP

const CRC_TABLA = (() => {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[i] = c >>> 0
  }
  return t
})()

function crc32(bytes) {
  let c = 0xffffffff
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLA[(c ^ bytes[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

async function deflateRaw(bytes) {
  if (typeof CompressionStream === 'undefined') return null
  const cs = new CompressionStream('deflate-raw')
  const buf = await new Response(
    new Blob([bytes]).stream().pipeThrough(cs),
  ).arrayBuffer()
  return new Uint8Array(buf)
}

/** Fecha DOS (los ZIP no guardan la hora en formato normal). */
function fechaDos(d) {
  const hora = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)
  const dia = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()
  return { hora, dia }
}

/** Arma un ZIP a partir de [{ nombre, datos:Uint8Array }]. */
async function zip(archivos, cuando) {
  const { hora, dia } = fechaDos(cuando)
  const codificador = new TextEncoder()
  const locales = []
  const central = []
  let offset = 0

  for (const a of archivos) {
    const nombre = codificador.encode(a.nombre)
    const crc = crc32(a.datos)
    const comprimido = await deflateRaw(a.datos)
    // Si el navegador no trae CompressionStream se guarda sin comprimir:
    // el archivo pesa más pero sigue siendo un xlsx válido.
    const metodo = comprimido ? 8 : 0
    const cuerpo = comprimido ?? a.datos

    const cabecera = new DataView(new ArrayBuffer(30))
    cabecera.setUint32(0, 0x04034b50, true)
    cabecera.setUint16(4, 20, true)
    cabecera.setUint16(6, 0, true)
    cabecera.setUint16(8, metodo, true)
    cabecera.setUint16(10, hora, true)
    cabecera.setUint16(12, dia, true)
    cabecera.setUint32(14, crc, true)
    cabecera.setUint32(18, cuerpo.length, true)
    cabecera.setUint32(22, a.datos.length, true)
    cabecera.setUint16(26, nombre.length, true)
    cabecera.setUint16(28, 0, true)
    locales.push(new Uint8Array(cabecera.buffer), nombre, cuerpo)

    const dir = new DataView(new ArrayBuffer(46))
    dir.setUint32(0, 0x02014b50, true)
    dir.setUint16(4, 20, true)
    dir.setUint16(6, 20, true)
    dir.setUint16(8, 0, true)
    dir.setUint16(10, metodo, true)
    dir.setUint16(12, hora, true)
    dir.setUint16(14, dia, true)
    dir.setUint32(16, crc, true)
    dir.setUint32(20, cuerpo.length, true)
    dir.setUint32(24, a.datos.length, true)
    dir.setUint16(28, nombre.length, true)
    dir.setUint32(42, offset, true)
    central.push(new Uint8Array(dir.buffer), nombre)

    offset += 30 + nombre.length + cuerpo.length
  }

  const tamCentral = central.reduce((n, b) => n + b.length, 0)
  const fin = new DataView(new ArrayBuffer(22))
  fin.setUint32(0, 0x06054b50, true)
  fin.setUint16(8, archivos.length, true)
  fin.setUint16(10, archivos.length, true)
  fin.setUint32(12, tamCentral, true)
  fin.setUint32(16, offset, true)

  return new Blob([...locales, ...central, new Uint8Array(fin.buffer)], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

// ----------------------------------------------------------------- XLSX

const esc = (s) =>
  String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))

/** Nombre de columna de Excel: 1 → A, 27 → AA. */
function columna(n) {
  let s = ''
  while (n > 0) {
    const r = (n - 1) % 26
    s = String.fromCharCode(65 + r) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

/** Excel cuenta los días desde el 30/12/1899. */
function serieFecha(iso) {
  const [a, m, d] = iso.split('-').map(Number)
  return Math.round((Date.UTC(a, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000)
}

// Estilos: 0 normal · 1 encabezado (negrita) · 2 fecha
const ESTILO_ENCABEZADO = 1
const ESTILO_FECHA = 2

const ESTILOS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="1"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/></numFmts>
<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>
<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="3">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`

/**
 * Celda. El valor puede ser:
 *   número → numérica · {fecha:'YYYY-MM-DD'} → fecha · otro → texto.
 */
function celda(ref, valor, estilo) {
  const s = estilo ? ` s="${estilo}"` : ''
  if (valor === null || valor === undefined || valor === '') {
    return `<c r="${ref}"${s}/>`
  }
  if (typeof valor === 'number' && Number.isFinite(valor)) {
    return `<c r="${ref}"${s}><v>${valor}</v></c>`
  }
  if (valor && typeof valor === 'object' && valor.fecha) {
    return `<c r="${ref}" s="${ESTILO_FECHA}"><v>${serieFecha(valor.fecha)}</v></c>`
  }
  return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${esc(valor)}</t></is></c>`
}

/** XML de una hoja: `filas` es un arreglo de arreglos; la primera es el encabezado. */
function hojaXml(filas, anchos) {
  const cols = anchos
    ? `<cols>${anchos
        .map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`)
        .join('')}</cols>`
    : ''

  const cuerpo = filas
    .map((fila, f) => {
      const celdas = fila
        .map((v, c) => celda(`${columna(c + 1)}${f + 1}`, v, f === 0 ? ESTILO_ENCABEZADO : 0))
        .join('')
      return `<row r="${f + 1}">${celdas}</row>`
    })
    .join('')

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
${cols}<sheetData>${cuerpo}</sheetData></worksheet>`
}

/**
 * Construye el libro y lo devuelve como Blob.
 * `hojas` = [{ nombre, filas, anchos }]
 */
export async function construirXlsx(hojas, cuando = new Date()) {
  const codificador = new TextEncoder()
  const txt = (s) => codificador.encode(s)

  const hojasRel = hojas
    .map((h, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`)
    .join('')

  const archivos = [
    {
      nombre: '[Content_Types].xml',
      datos: txt(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
${hojas.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}
</Types>`),
    },
    {
      nombre: '_rels/.rels',
      datos: txt(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`),
    },
    {
      nombre: 'xl/workbook.xml',
      datos: txt(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>${hojas.map((h, i) => `<sheet name="${esc(h.nombre)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets>
</workbook>`),
    },
    {
      nombre: 'xl/_rels/workbook.xml.rels',
      datos: txt(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${hojasRel}<Relationship Id="rId${hojas.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`),
    },
    { nombre: 'xl/styles.xml', datos: txt(ESTILOS_XML) },
    ...hojas.map((h, i) => ({
      nombre: `xl/worksheets/sheet${i + 1}.xml`,
      datos: txt(hojaXml(h.filas, h.anchos)),
    })),
  ]

  return zip(archivos, cuando)
}

/** Dispara la descarga de un Blob con el nombre dado. */
export function descargar(blob, nombre) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Se libera después del click; revocarla de inmediato cancela la descarga.
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}
