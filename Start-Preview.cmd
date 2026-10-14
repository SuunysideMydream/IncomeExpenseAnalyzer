@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Start-Preview.ps1"
if errorlevel 1 (
  echo Preview could not start. See the message above.
)
pause
