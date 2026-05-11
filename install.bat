@echo off
title MCHost Manager - Install Dependencies
echo ==========================================
echo   MCHost Manager - Installing Dependencies
echo ==========================================
echo.

:: Check for Node.js
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
  echo [ERROR] Node.js is NOT installed.
  echo.
  echo Download and install Node.js LTS from:
  echo   https://nodejs.org/
  echo.
  echo After installing, re-run this script.
  pause
  exit /b 1
)

for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
for /f "tokens=*" %%v in ('npm -v') do set NPM_VER=%%v
echo Node.js: %NODE_VER%
echo npm:     %NPM_VER%
echo.

:: Check for Java using a flag variable (avoids goto-inside-block batch bug)
set JAVA_OK=0
where java >nul 2>&1
if %ERRORLEVEL% EQU 0 set JAVA_OK=1

if %JAVA_OK% EQU 0 (
  echo [WARNING] Java is NOT installed or not in PATH.
  echo   Java is required to run Minecraft Java Edition servers.
  echo.
  echo Installing Java 21 via winget...
  winget install --id EclipseAdoptium.Temurin.21.JDK -e --silent --accept-package-agreements --accept-source-agreements
  if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [!] Automatic install failed. Please install Java manually:
    echo     https://adoptium.net/
    echo     Download Temurin 21 LTS and run the installer.
    echo     Then re-run this script.
    echo.
    pause
    exit /b 1
  )
  echo  Java installed successfully.
  echo  NOTE: You may need to restart your PC before starting servers.
)
if %JAVA_OK% EQU 1 echo Java:    found
echo.

echo [1/2] Installing backend dependencies...
cd /d "%~dp0backend"
call npm install
if %ERRORLEVEL% NEQ 0 (
  echo [ERROR] Backend install failed!
  pause
  exit /b 1
)
echo  Backend OK
echo.

echo [2/2] Installing frontend dependencies...
cd /d "%~dp0frontend"
call npm install
if %ERRORLEVEL% NEQ 0 (
  echo [ERROR] Frontend install failed!
  pause
  exit /b 1
)
echo  Frontend OK
echo.

echo ==========================================
echo  Installation complete!
echo  Run start.bat to launch MCHost Manager.
echo ==========================================
pause
