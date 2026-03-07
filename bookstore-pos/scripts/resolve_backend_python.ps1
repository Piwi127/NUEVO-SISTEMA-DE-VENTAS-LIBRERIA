param(
    [Parameter(Mandatory = $true)]
    [string]$BackendDir
)

function Test-PythonCommand {
    param(
        [string]$Command,
        [string[]]$Arguments = @()
    )

    if (-not $Command) {
        return $false
    }

    try {
        & $Command @Arguments -c "import sys" *> $null
        return $LASTEXITCODE -eq 0
    } catch {
        return $false
    }
}

function Resolve-CommandPath {
    param([string]$Name)

    $command = Get-Command $Name -ErrorAction SilentlyContinue
    if ($command) {
        return $command.Source
    }
    return $null
}

$bootstrapCandidates = @()
foreach ($path in @(
    (Join-Path $env:LOCALAPPDATA 'Programs\Python\Python311\python.exe'),
    (Join-Path $env:LOCALAPPDATA 'Programs\Python\Python312\python.exe'),
    'C:\Program Files\Python311\python.exe',
    'C:\Program Files\Python312\python.exe'
)) {
    if (Test-Path $path) {
        $bootstrapCandidates += [pscustomobject]@{ Command = $path; Args = @() }
    }
}

$pyLauncher = Resolve-CommandPath 'py.exe'
if ($pyLauncher) {
    $bootstrapCandidates += [pscustomobject]@{ Command = $pyLauncher; Args = @('-3.11') }
    $bootstrapCandidates += [pscustomobject]@{ Command = $pyLauncher; Args = @('-3.12') }
}

$pythonCommand = Resolve-CommandPath 'python.exe'
if ($pythonCommand) {
    $bootstrapCandidates += [pscustomobject]@{ Command = $pythonCommand; Args = @() }
}

$bootstrap = $null
foreach ($candidate in $bootstrapCandidates) {
    if (Test-PythonCommand -Command $candidate.Command -Arguments $candidate.Args) {
        $bootstrap = $candidate
        break
    }
}

if (-not $bootstrap) {
    Write-Error 'No se encontro un Python utilizable para crear el entorno virtual del backend.'
    exit 1
}

$venvNames = @('.venv', '.venv_runtime', '.venv_runtime2')
foreach ($venvName in $venvNames) {
    $venvPython = Join-Path $BackendDir (Join-Path $venvName 'Scripts\python.exe')
    if (Test-PythonCommand -Command $venvPython) {
        Write-Output $venvPython
        exit 0
    }
}

$targetVenvDir = $null
foreach ($venvName in $venvNames) {
    $candidateDir = Join-Path $BackendDir $venvName
    if (-not (Test-Path $candidateDir)) {
        $targetVenvDir = $candidateDir
        break
    }
}

if (-not $targetVenvDir) {
    Write-Error 'No se encontro un entorno virtual valido ni una ruta libre para crear uno nuevo.'
    exit 1
}

& $bootstrap.Command @($bootstrap.Args + @('-m', 'venv', $targetVenvDir))
if ($LASTEXITCODE -ne 0) {
    Write-Error 'No se pudo crear un entorno virtual nuevo para el backend.'
    exit 1
}

$targetPython = Join-Path $targetVenvDir 'Scripts\python.exe'
if (-not (Test-PythonCommand -Command $targetPython)) {
    Write-Error 'El entorno virtual creado no quedo operativo.'
    exit 1
}

Write-Output $targetPython
