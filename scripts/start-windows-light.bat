@echo off
REM ==============================================================================
REM EconQuest - Sovereign Council Orchestrator
REM One-Click Windows Batch Launcher, light mode for a modest laptop (no AI model on this computer)
REM ==============================================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-windows.ps1" -Light
pause
