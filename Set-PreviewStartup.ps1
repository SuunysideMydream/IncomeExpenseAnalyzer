param([switch]$Remove)

$ErrorActionPreference = 'Stop'
$startupFolder = [Environment]::GetFolderPath([Environment+SpecialFolder]::Startup)
if (-not $startupFolder -or -not (Test-Path -LiteralPath $startupFolder -PathType Container)) {
    throw 'The Windows Startup folder for this user is unavailable.'
}

$shortcutPath = Join-Path $startupFolder 'Moneywise Local Preview.lnk'
$description = 'Start the Moneywise local preview on port 8766.'
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
if ((Test-Path -LiteralPath $shortcutPath) -and $shortcut.Description -ne $description) {
    throw "An unrelated shortcut already uses this name: $shortcutPath"
}

if ($Remove) {
    if (Test-Path -LiteralPath $shortcutPath) { Remove-Item -LiteralPath $shortcutPath }
    Write-Output 'Moneywise preview startup is disabled for this Windows user.'
    return
}

$launcher = Join-Path $PSScriptRoot 'Start-Preview.ps1'
$systemFolder = [Environment]::GetFolderPath([Environment+SpecialFolder]::System)
$powerShellPath = Join-Path $systemFolder 'WindowsPowerShell\v1.0\powershell.exe'
if (-not (Test-Path -LiteralPath $launcher) -or -not (Test-Path -LiteralPath $powerShellPath)) {
    throw 'The Moneywise launcher or Windows PowerShell could not be found.'
}

$shortcut.TargetPath = $powerShellPath
$shortcut.Arguments = '-NoLogo -NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File "' + $launcher + '" -Quiet'
$shortcut.WorkingDirectory = $PSScriptRoot
$shortcut.Description = $description
$shortcut.WindowStyle = 7
$shortcut.Save()
Write-Output "Moneywise preview will start when this Windows user signs in. $shortcutPath"
