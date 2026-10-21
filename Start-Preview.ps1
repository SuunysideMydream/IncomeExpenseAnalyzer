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
    catch { throw "Port $Port is not serving the Vite development runtime. Stop the old static preview and run this launcher again." }
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

    $previewReady = Test-MoneywisePreview
    if (-not $previewReady) {
        if (Test-PreviewPort) { throw "Port $Port is occupied but not responding as Moneywise. That server has not been changed." }
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
        for ($attempt = 0; $attempt -lt 40; $attempt++) {
            Start-Sleep -Milliseconds 250
            $previewProcess.Refresh()
            if ($previewProcess.HasExited) { throw "Preview server exited (code $($previewProcess.ExitCode)). Check Node.js, installed dependencies, and whether port $Port is available." }
            if (Test-MoneywisePreview) { $previewReady = $true; break }
        }
        if (-not $previewReady) { throw "Preview did not become ready at $previewUrl" }
    }
    if (-not $Quiet) {
        Write-Host "Moneywise is ready: $previewUrl"
        Write-Host 'Refresh your browser tab. The Codex startup hook can run this launcher automatically after you trust it.'
    }
} finally {
    if ($previewLocked) { $previewMutex.ReleaseMutex() }
    $previewMutex.Dispose()
}
