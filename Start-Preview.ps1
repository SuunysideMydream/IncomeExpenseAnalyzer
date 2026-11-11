param(
    [switch]$Quiet,
    [ValidateRange(1024, 65535)][int]$Port = 8766
)

$ErrorActionPreference = 'Stop'
$previewUrl = "http://localhost:$Port/"
$previewProbe = "http://127.0.0.1:$Port/"

function Test-MoneywisePreview {
    try { $response = Invoke-WebRequest -UseBasicParsing -Uri $previewProbe -TimeoutSec 2 }
    catch {
        if ($_.Exception.Response) { throw "Port $Port is serving another page or an HTTP error. That server has not been changed." }
        return $false
    }
    if ($response.StatusCode -ne 200 -or $response.Content -notmatch '<title>Moneywise' -or $response.Content -notmatch 'data-moneywise-react') {
        throw "Port $Port is serving a different page. That server has not been changed."
    }
    try { $viteResponse = Invoke-WebRequest -UseBasicParsing -Uri "$previewProbe@vite/client" -TimeoutSec 2 }
    catch {
        # The HTML can answer before Vite finishes transforming its first module.
        # A timeout or a temporary Vite/server error is not proof of a static server.
        if (-not $_.Exception.Response -or [int]$_.Exception.Response.StatusCode -ge 500) { return $false }
        throw "Port $Port is not serving the Vite development runtime. Stop the old static preview and run this launcher again."
    }
    if ($viteResponse.StatusCode -ne 200 -or $viteResponse.Headers['Content-Type'] -notmatch 'javascript') {
        throw "Port $Port is serving the source without Vite. Stop the old static preview and run this launcher again."
    }
    return $true
}

function Test-PreviewPort {
    $connection = [System.Net.Sockets.TcpClient]::new()
    try {
        $pending = $connection.ConnectAsync('127.0.0.1', $Port)
        return ($pending.Wait(500) -and $connection.Connected)
    } catch { return $false }
    finally { $connection.Dispose() }
}

# Serialize simultaneous chat starts, without requiring CIM/network-admin access.
$previewMutex = [System.Threading.Mutex]::new($false, "Local\MoneywisePreview-$Port")
$previewLocked = $false
try {
    try { $previewLocked = $previewMutex.WaitOne(15000) }
    catch [System.Threading.AbandonedMutexException] { $previewLocked = $true }
    if (-not $previewLocked) { throw 'Another Moneywise preview is still starting. Try again shortly.' }

    $previewProcess = $null
    if (-not (Test-PreviewPort)) {
        $vitePath = Join-Path $PSScriptRoot 'node_modules\vite\bin\vite.js'
        if (-not (Test-Path -LiteralPath $vitePath)) { throw 'Project dependencies are not installed. Run pnpm install in this repository, then run this launcher again.' }
        $bundledNode = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
        $nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
        if ($nodeCommand) { $nodePath = $nodeCommand.Source }
        elseif (Test-Path -LiteralPath $bundledNode) { $nodePath = $bundledNode }
        else {
            throw 'Node.js was not found. Install Node.js 22.12+ or use the available Codex Node runtime, then run this launcher again.'
        }
        # ShellExecute detaches the hidden server from the hook's output pipes.
        $previewStart = [System.Diagnostics.ProcessStartInfo]::new()
        $previewStart.FileName = $nodePath
        $previewStart.Arguments = '"' + $vitePath + '" --host 127.0.0.1 --port ' + $Port + ' --strictPort'
        $previewStart.WorkingDirectory = $PSScriptRoot
        $previewStart.UseShellExecute = $true
        $previewStart.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Hidden
        $previewProcess = [System.Diagnostics.Process]::Start($previewStart)
    }
    $previewClock = [System.Diagnostics.Stopwatch]::StartNew()
    $previewReady = $false
    do {
        if ($previewProcess) {
            $previewProcess.Refresh()
            if ($previewProcess.HasExited) { throw "Preview server exited (code $($previewProcess.ExitCode)). Check Node.js, installed dependencies, and whether port $Port is available." }
        }
        if ((Test-PreviewPort) -and (Test-MoneywisePreview)) { $previewReady = $true; break }
        Start-Sleep -Milliseconds 250
    } while ($previewClock.Elapsed.TotalSeconds -lt 35)
    if (-not $previewReady) { throw "Preview did not become ready at $previewUrl within 35 seconds. Any existing server on port $Port was left alone." }
    if (-not $Quiet) {
        Write-Host "Moneywise is ready: $previewUrl"
        Write-Host 'Refresh your browser tab. The Codex startup hook can run this launcher automatically after you trust it.'
    }
} finally {
    if ($previewLocked) { $previewMutex.ReleaseMutex() }
    $previewMutex.Dispose()
}
