@echo off
rem Opens the bookshelf on this computer. Always use this same address:
rem the browser keeps the saved library per address (including the port).
cd /d "%~dp0"
start "" "http://127.0.0.1:8765/app.html"
python -m http.server 8765 --bind 127.0.0.1
