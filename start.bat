@echo off
title CardioGuard AI - Startup Launcher
color 0A
cls

echo ===================================================                                         
echo ===================================================
echo  AI-Powered Heart Health Companion Launcher
echo ===================================================
echo.
echo Please select which server you would like to run:
echo.
echo [1] Start Node.js Full-Stack Server (Express + React Frontend on Port 3000)
echo [2] Start Python FastAPI Server (Backend API on Port 8000)
echo [3] Install Node.js dependencies (npm install)
echo [4] Install Python dependencies (pip install -r fastapi-backend/requirements.txt)
echo [5] Exit
echo.
set /p choice="Enter option (1-5): "

if "%choice%"=="1" goto node_server
if "%choice%"=="2" goto fastapi_server
if "%choice%"=="3" goto install_node
if "%choice%"=="4" goto install_python
if "%choice%"=="5" goto end

:node_server
echo.
echo Starting Node.js dev server with Express backend + React (Vite)...
echo Open http://localhost:3000 in your browser when loaded.
echo.
npm run dev
goto end

:fastapi_server
echo.
echo Starting Python FastAPI backend server with Uvicorn...
echo Make sure you have installed requirements.txt.
echo API will run on http://localhost:8000
echo.
python -m uvicorn fastapi-backend.main:app --host 127.0.0.1 --port 8000 --reload
goto end

:install_node
echo.
echo Installing node packages...
call npm install
echo Done. Press any key to return to menu...
pause >nul
goto node_server

:install_python
echo.
echo Installing Python requirements...
pip install -r fastapi-backend/requirements.txt
echo Done. Press any key to return to menu...
pause >nul
goto fastapi_server

:end
echo.
echo Thank you for using CardioGuard AI. Stay heart healthy!
pause
