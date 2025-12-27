@echo off
cd /d "%~dp0"
echo ==========================================
echo       CSAT Generator Launcher
echo ==========================================
echo.

:: Try to find Python
set "PYTHON_CMD="

:: Check for 'python'
python --version >nul 2>&1
if %errorlevel% equ 0 set PYTHON_CMD=python

:: If not found, check for 'py' (Python Launcher)
if not defined PYTHON_CMD (
    py --version >nul 2>&1
    if %errorlevel% equ 0 set PYTHON_CMD=py
)

:: If not found, check for 'python3'
if not defined PYTHON_CMD (
    python3 --version >nul 2>&1
    if %errorlevel% equ 0 set PYTHON_CMD=python3
)

:: Result
if defined PYTHON_CMD (
    echo Found Python: %PYTHON_CMD%
    echo Starting server at http://localhost:8000...
    echo.
    %PYTHON_CMD% -m http.server 8000
) else (
    echo [ERROR] Python not found!
    echo.
    echo Please verify:
    echo 1. Python is installed.
    echo 2. "Add to PATH" was checked during installation.
    echo.
    echo If you just installed it, try closing this window and reopening it.
)

echo.
echo ==========================================
echo Server stopped or failed to start.
pause
