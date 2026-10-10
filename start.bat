@echo off
title VoxAI Studio - AI Voice Synthesis
color 0b
echo ================================================================
echo   VoxAI Studio - Professional AI Text-to-Speech Web App
echo ================================================================
echo.

set "NODE_EXE=node"
where node >nul 2>nul
if %errorlevel% neq 0 (
    if exist "%USERPROFILE%\.nodejs\node.exe" (
        set "NODE_EXE=%USERPROFILE%\.nodejs\node.exe"
    ) else (
        echo [!] Node.js was not detected in standard PATH.
        echo [*] Checking Windows PowerShell server fallback...
        start powershell.exe -NoExit -ExecutionPolicy Bypass -File "%~dp0server.ps1"
        timeout /t 2 >nul
        start http://localhost:3000
        exit /b 0
    )
)

echo [*] Starting VoxAI Studio Server on http://localhost:3000 ...
timeout /t 1 >nul
start "" http://localhost:3000
"%NODE_EXE%" "%~dp0server.js"
if %errorlevel% neq 0 (
    echo.
    echo [!] Server exited. Press any key to close.
    pause >nul
)
