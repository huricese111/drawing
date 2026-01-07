@echo off
cd /d %~dp0
echo Starting local preview on http://localhost:4173/
echo( 
echo Press Ctrl+C in this window to stop the server.
echo -----------------------------------------------
python -m http.server 4173
echo(
echo Server stopped. Press any key to close this window...
pause >nul

