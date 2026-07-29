# Reporte de Inspección de Neumáticos

Reporte visual (React + Vite) del estado de los neumáticos de la flota, generado
a partir de la base de datos de la app de inspección.

🔗 **Ver el reporte:** https://inspeccionneumatico-app.github.io/Inspeccion.neumatico/

## Qué muestra

- **Indicadores** del estado actual: equipos, neumáticos vigentes, en riesgo,
  advertencia, óptimos, surco y presión críticos, promedios.
- **Composición** del estado de los neumáticos en servicio.
- **Análisis por centro de distribución** (volumen y % en riesgo).
- **Distribución** de surco y presión medidos, con las zonas de riesgo marcadas.
- **Tendencia histórica** mensual: actividad de inspección y desgaste promedio.
- **Equipos que requieren atención** (ranking por neumáticos fuera de estándar).
- **Marcas y medidas** en servicio.
- **Detalle por equipo**: buscable por patente o centro, filtrable y ordenable.

## Criterios de clasificación

| Estado | Regla |
|---|---|
| 🔴 **Riesgo** | Surco bajo el mínimo del equipo (3 mm) **o** presión bajo lo recomendado menos 5 PSI |
| 🟡 **Advertencia** | Surco ≤ 6 mm estando sobre el mínimo |
| 🟢 **Óptimo** | El resto |

Los indicadores de estado consideran **solo la última inspección de cada equipo**,
para reflejar la situación vigente y no el acumulado histórico. Las tendencias sí
usan todo el histórico.

## Notas sobre los datos

- Origen: base histórica de inspecciones (jun 2021 – nov 2025).
- Las inspecciones importadas no incluyen odómetro ni fotografías.
- Se descartaron 129 mediciones fuera de rango físico (errores de captura del
  archivo original, donde la columna de surco contenía un número de serie de
  fecha de Excel).

## Desarrollo

```bash
npm install
npm run dev      # servidor local
npm run build    # genera docs/ para GitHub Pages
```

El sitio se publica desde la carpeta `docs/` de la rama `main`
(*Settings → Pages → Source: Deploy from a branch → main / docs*).

Los datos viven en `src/data/datos.json`, generado con el script
`tool/exportar_datos_reporte.py` del proyecto de la app.
