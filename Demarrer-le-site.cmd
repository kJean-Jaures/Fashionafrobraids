@echo off
setlocal EnableExtensions DisableDelayedExpansion
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Installez Node.js 24 depuis https://nodejs.org puis relancez ce fichier.
  pause
  exit /b 1
)
node scripts/local-preview.mjs
if errorlevel 1 (
  echo.
  echo Le site n'a pas pu demarrer. Lisez le message ci-dessus.
  pause
  exit /b 1
)
