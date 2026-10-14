$ErrorActionPreference = 'Stop'
$previewUrl = 'http://localhost:8766/'
$previewListener = Get-NetTCPConnection -LocalPort 8766 -State Listen -ErrorAction SilentlyContinue
if (-not $previewListener) {
    $bundledPython = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
    if (Test-Path -LiteralPath $bundledPython) {
        $pythonPath = $bundledPython
        $pythonArguments = @('-m', 'http.server', '8766', '--bind', '127.0.0.1')
    } else {
        $pythonCommand = Get-Command py.exe, python.exe -ErrorAction SilentlyContinue | Select-Object -First 1
        if (-not $pythonCommand) { throw 'Python was not found. Install Python 3, then run this launcher again.' }
        $pythonPath = $pythonCommand.Source
        $pythonArguments = @('-m', 'http.server', '8766', '--bind', '127.0.0.1')
        if ($pythonCommand.Name -eq 'py.exe') { $pythonArguments = @('-3') + $pythonArguments }
    }
    $previewLog = Join-Path ([System.IO.Path]::GetTempPath()) "moneywise-preview-$PID"
    $previewProcess = Start-Process -FilePath $pythonPath -ArgumentList $pythonArguments -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -RedirectStandardOutput "$previewLog.log" -RedirectStandardError "$previewLog.error.log" -PassThru
    for ($attempt = 0; $attempt -lt 20; $attempt++) {
        Start-Sleep -Milliseconds 250
        $previewProcess.Refresh()
        if ($previewProcess.HasExited) { throw "Preview server exited. Details: $previewLog.error.log" }
        if (Get-NetTCPConnection -LocalPort 8766 -State Listen -ErrorAction SilentlyContinue) { break }
    }
}
$previewResponse = Invoke-WebRequest -UseBasicParsing -Uri $previewUrl -TimeoutSec 10
if ($previewResponse.Content -notmatch 'Moneywise.*Income.*Expense') {
    throw 'Port 8766 is serving a different page. Close that server or select another port.'
}
Write-Host "Moneywise is ready: $previewUrl"
Write-Host 'Refresh your browser tab. Run this launcher again after restarting your computer or if localhost stops.'
