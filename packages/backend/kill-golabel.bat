@echo off
echo Killing GoLabel processes...

REM Kill GoLabel processes
taskkill /F /IM GoLabel.exe /T 2>nul
taskkill /F /IM "GoLabel II.exe" /T 2>nul
taskkill /F /IM GoLabel*.exe /T 2>nul

REM Kill JIT debugger if hanging
taskkill /F /IM vsjitdebugger.exe /T 2>nul
taskkill /F /IM WerFault.exe /T 2>nul

REM Kill any Godex related processes
taskkill /F /FI "IMAGENAME eq Go*" /FI "WINDOWTITLE eq *GoLabel*" 2>nul

echo.
echo Done! All GoLabel processes terminated.
pause