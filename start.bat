@echo off
title MCHost Manager
echo ==========================================
echo   MCHost Manager - Startup
echo ==========================================
echo.

:: Check for Node.js
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
  echo [ERROR] Node.js is not installed or not in PATH.
  echo.
  echo Please install Node.js from: https://nodejs.org/
  echo   - Download the LTS version ^(recommended^)
  echo   - Run the installer and restart this script
  echo.
  pause
  exit /b 1
)

for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
echo Node.js: %NODE_VER%
echo.

:: Install dependencies if node_modules missing
if not exist "%~dp0backend\node_modules" (
  echo Installing backend dependencies...
  cd /d "%~dp0backend"
  call npm install
  if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Backend dependency install failed.
    pause
    exit /b 1
  )
  cd /d "%~dp0"
)

if not exist "%~dp0frontend\node_modules" (
  echo Installing frontend dependencies...
  cd /d "%~dp0frontend"
  call npm install
  if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Frontend dependency install failed.
    pause
    exit /b 1
  )
  cd /d "%~dp0"
)

echo.
echo Starting MCHost Manager...
echo.

:: Start backend in new window
start "MCHost Backend :3001" cmd /k "cd /d %~dp0backend && node src/index.js"

:: Wait 2 seconds for backend to initialize
timeout /t 2 /nobreak > nul

:: Start frontend dev server in new window
start "MCHost Frontend :3000" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ==========================================
echo  Backend:  http://localhost:3001
echo  Frontend: http://localhost:3000
echo ==========================================
echo.
echo Opening browser in 3 seconds...
timeout /t 3 /nobreak > nul
start "" "http://localhost:3000"

pause
