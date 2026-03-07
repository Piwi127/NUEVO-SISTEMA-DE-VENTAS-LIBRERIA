param(
    [Parameter(Mandatory = $true)]
    [string]$Url,
    [int]$TimeoutSeconds = 45,
    [int]$DelayMilliseconds = 750
)

$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()

while ($stopwatch.Elapsed.TotalSeconds -lt $TimeoutSeconds) {
    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 4
        if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
            exit 0
        }
    } catch {
    }
    Start-Sleep -Milliseconds $DelayMilliseconds
}

exit 1
