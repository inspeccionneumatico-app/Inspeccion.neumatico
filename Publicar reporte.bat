@echo off
rem Doble clic aqui para actualizar el reporte en GitHub y abrirlo.
rem Es solo un lanzador: el trabajo lo hace publicar.ps1, al lado de este archivo.
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0publicar.ps1" %*
if errorlevel 1 (
  echo.
  echo Termino con error. Revisa los mensajes de arriba.
  pause
)
