param(
    [string]$Fallback = "127.0.0.1"
)

$ErrorActionPreference = "SilentlyContinue"
$ip = $null

try {
    $config = Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway -and $_.IPv4Address } | Select-Object -First 1
    if ($config) {
        $ip = $config.IPv4Address.IPAddress
    }
} catch {
}

if (-not $ip) {
    try {
        $ip = Get-NetIPAddress -AddressFamily IPv4 |
            Where-Object { $_.IPAddress -ne "127.0.0.1" -and $_.IPAddress -notlike "169.254*" } |
            Select-Object -First 1 -ExpandProperty IPAddress
    } catch {
    }
}

if (-not $ip) {
    $ip = $Fallback
}

Write-Output $ip
