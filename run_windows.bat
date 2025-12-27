@echo off
cd /d "%~dp0"
echo Starting CSAT Generator...
echo -----------------------------------------------------
echo Local Access:     http://localhost:8000
echo -----------------------------------------------------
echo If you see an error saying 'python' is not recognized,
echo please install Python from https://www.python.org/
echo and make sure to check "Add Python to PATH" during installation.
echo -----------------------------------------------------

python -m http.server 8000
pause
