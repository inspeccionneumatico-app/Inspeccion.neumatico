<#
    Publica el reporte de neumaticos.

    Hace la cadena completa: regenera los datos desde la planilla, compila el
    reporte, lo sube a GitHub y lo abre en el navegador cuando GitHub Pages ya
    publico la version nueva.

    Uso:
        .\publicar.ps1                          # cadena completa
        .\publicar.ps1 -Mensaje "texto"         # con mensaje de commit propio
        .\publicar.ps1 -SinDatos                # no regenera datos, solo compila y sube
        .\publicar.ps1 -SoloAbrir               # solo abre el reporte publicado
#>
param(
    [string]$Mensaje = '',
    [switch]$SinDatos,
    [switch]$SoloAbrir
)

$ErrorActionPreference = 'Stop'
$PSDefaultParameterValues['*:Encoding'] = 'utf8'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$REPORTE = $PSScriptRoot
$APP     = Join-Path (Split-Path $PSScriptRoot -Parent) 'InspeccionNeumaticos'
$URL     = 'https://inspeccionneumatico-app.github.io/Inspeccion.neumatico/'

# ---------------------------------------------------------------- utilidades

function Paso($n, $texto) {
    Write-Host ''
    Write-Host "[$n] $texto" -ForegroundColor Cyan
}

function Ok($texto)   { Write-Host "    OK  $texto" -ForegroundColor Green }
function Aviso($texto){ Write-Host "    !   $texto" -ForegroundColor Yellow }

function Morir($texto) {
    Write-Host ''
    Write-Host "ERROR: $texto" -ForegroundColor Red
    Write-Host ''
    Read-Host 'Enter para cerrar'
    exit 1
}

function Correr($exe, $argumentos, $donde) {
    Push-Location $donde
    try {
        & $exe @argumentos
        if ($LASTEXITCODE -ne 0) { Morir "$exe $($argumentos -join ' ') termino con codigo $LASTEXITCODE" }
    } finally {
        Pop-Location
    }
}

Write-Host ''
Write-Host '  REPORTE DE INSPECCION DE NEUMATICOS - publicar' -ForegroundColor White
Write-Host '  ---------------------------------------------' -ForegroundColor DarkGray

if ($SoloAbrir) {
    Start-Process $URL
    Ok "Abierto $URL"
    exit 0
}

# ------------------------------------------------------- 0. requisitos

Paso 0 'Revisando requisitos'
foreach ($cmd in @('git', 'npm')) {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
        Morir "No se encontro '$cmd' en el PATH. Abre una terminal nueva o instalalo."
    }
}
$python = $null
foreach ($cmd in @('python', 'py')) {
    if (Get-Command $cmd -ErrorAction SilentlyContinue) { $python = $cmd; break }
}
if (-not $SinDatos -and -not $python) {
    Aviso 'No se encontro Python: se salta la regeneracion de datos.'
    $SinDatos = $true
}
if (-not (Test-Path $APP)) {
    Aviso "No se encontro la carpeta de la app ($APP): se salta la regeneracion de datos."
    $SinDatos = $true
}
Ok 'git y npm disponibles'

# ------------------------------------------------------- 1. datos

if ($SinDatos) {
    Paso 1 'Datos: se mantienen los actuales (-SinDatos)'
} else {
    Paso 1 'Datos'

    $baseRegenerada = $false
    $seed = Join-Path $APP 'assets\seed\seed.db'
    $planilla = Get-ChildItem (Join-Path $APP '*.xlsx') -ErrorAction SilentlyContinue |
                Sort-Object LastWriteTime -Descending |
                Select-Object -First 1

    if (-not $planilla) {
        Aviso 'No hay ninguna planilla .xlsx en la carpeta de la app.'
    } elseif ((-not (Test-Path $seed)) -or ($planilla.LastWriteTime -gt (Get-Item $seed).LastWriteTime)) {
        # La planilla cambio desde la ultima vez: hay que rearmar la base.
        Write-Host "    Planilla mas nueva que la base: $($planilla.Name)"
        Correr $python @('tool\generar_seed_db.py', $planilla.FullName) $APP
        $baseRegenerada = $true
        Ok 'Base regenerada desde la planilla'
    } else {
        Ok "La base ya esta al dia con $($planilla.Name)"
    }

    Correr $python @('tool\exportar_datos_reporte.py', (Join-Path $REPORTE 'src\data')) $APP
    Ok 'datos.json actualizado'
}

# ------------------------------------------------------- 2. compilar

Paso 2 'Compilando el reporte'
if (-not (Test-Path (Join-Path $REPORTE 'node_modules'))) {
    Write-Host '    Primera vez: instalando dependencias (puede tardar)'
    Correr 'npm' @('install') $REPORTE
}
Correr 'npm' @('run', 'build') $REPORTE
Ok 'Compilado en docs\'

# Sello unico de esta publicacion. Se espera por este archivo y no por el
# nombre del bundle: cuando el cambio no toca el JS (agregar una imagen, por
# ejemplo) el nombre no cambia y la espera daria por publicada la version
# anterior.
$huella = Get-Date -Format 'yyyyMMdd-HHmmss'
Set-Content -Path (Join-Path $REPORTE 'docs\version.txt') -Value $huella -Encoding utf8 -NoNewline
# Evita que GitHub procese el sitio con Jekyll (ignoraria archivos con _).
$noJekyll = Join-Path $REPORTE 'docs\.nojekyll'
if (-not (Test-Path $noJekyll)) { Set-Content -Path $noJekyll -Value '' -NoNewline }
Write-Host "    version: $huella"

# ------------------------------------------------- 2b. guardar la base en la app

# Si se regenero la base, quedo modificada dentro del proyecto de la app. Se
# guarda ahi mismo (repo local, sin remoto) para no dejarlo con cambios
# sueltos y poder volver a la base anterior si hiciera falta.
if ($baseRegenerada -and (Test-Path (Join-Path $APP '.git'))) {
    Paso '2b' 'Guardando la base nueva en el repo de la app'
    Push-Location $APP
    try {
        git add assets/seed/seed.db tool/seed_meta.json
        $cambios = git status --porcelain assets/seed/seed.db tool/seed_meta.json
        if ($cambios) {
            git commit -m "Regenera la base desde $($planilla.Name) ($(Get-Date -Format 'dd-MM-yyyy'))" | Out-Null
            Ok 'Base guardada (commit local; este repo no tiene remoto)'
        } else {
            Ok 'La base no cambio'
        }
    } finally {
        Pop-Location
    }
}

# ------------------------------------------------------- 3. subir a GitHub

Paso 3 'Subiendo a GitHub'
Push-Location $REPORTE
try {
    git add -A
    $pendientes = git status --porcelain
    if ($pendientes) {
        if ([string]::IsNullOrWhiteSpace($Mensaje)) {
            $Mensaje = "Actualiza el reporte ($(Get-Date -Format 'dd-MM-yyyy HH:mm'))"
        }
        git commit -m $Mensaje | Out-Null
        if ($LASTEXITCODE -ne 0) { Morir 'No se pudo crear el commit.' }
        Ok "Commit: $Mensaje"
    } else {
        Ok 'No habia cambios que guardar'
    }

    $antes = git rev-parse HEAD
    git push origin main
    if ($LASTEXITCODE -ne 0) {
        Morir 'Fallo el push. Revisa tu conexion o tus credenciales de GitHub.'
    }
    Ok 'Subido a origin/main'
} finally {
    Pop-Location
}

# ------------------------------------------------------- 4. esperar y abrir

Paso 4 'Esperando que GitHub Pages publique'
$publicado = $false
if ($huella) {
    for ($i = 1; $i -le 30; $i++) {
        Start-Sleep -Seconds 5
        try {
            $sinCache = $URL + 'version.txt?t=' + [guid]::NewGuid().ToString()
            $r = Invoke-WebRequest -Uri $sinCache -UseBasicParsing -TimeoutSec 15
            if ($r.Content.Trim() -eq $huella) { $publicado = $true; break }
        } catch {
            # Pages puede responder 404 mientras reconstruye; se sigue esperando.
        }
        Write-Host "    ...$($i * 5)s" -NoNewline
        Write-Host "`r" -NoNewline
    }
}
Write-Host ''
if ($publicado) {
    Ok 'Pages ya sirve la version nueva'
} else {
    Aviso 'Se agoto la espera. Se abre igual; si ves lo anterior, recarga con Ctrl+F5 en un rato.'
}

Start-Process $URL
Write-Host ''
Write-Host "  Listo: $URL" -ForegroundColor Green
Write-Host ''
