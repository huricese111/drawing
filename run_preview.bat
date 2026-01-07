@echo off
cd /d %~dp0
if "%~1"=="" goto PREVIEW

echo Updating gallery.json from dropped folders...
python "%~dp0update_gallery.py" %*

if errorlevel 1 (
    echo Update failed. Press any key to close this window...
    pause >nul
    exit /b 1
)

echo Update complete.
exit /b 0

:PREVIEW
echo Starting local preview on http://localhost:4173/
echo( 
echo Press Ctrl+C in this window to stop the server.
echo -----------------------------------------------
python -m http.server 4173
echo(
echo Server stopped. Press any key to close this window...
pause >nul
