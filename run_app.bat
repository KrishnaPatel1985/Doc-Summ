@echo off
echo Starting PostgreSQL database...
set PG_BIN="C:\Users\Admin\Downloads\postgresql\pgsql\bin"
set DATA_DIR="C:\Users\Admin\Downloads\postgresql\pgsql\data"
set LOG_FILE="C:\Users\Admin\Downloads\postgresql\pgsql\postgres.log"

tasklist | find /i "postgres.exe" > nul
if %errorlevel% neq 0 (
    start "" %PG_BIN%\pg_ctl.exe -D %DATA_DIR% -l %LOG_FILE% start
    timeout /t 2 > nul
) else (
    echo PostgreSQL is already running.
)

echo Starting Backend API server...
start powershell -NoExit -Command "cd '%~dp0backend'; $env:PYTHONUTF8=1; $env:PYTHONPATH='%~dp0backend'; .\venv\Scripts\python.exe -m uvicorn main:app --port 8000"

echo Starting Frontend Dev server...
start powershell -NoExit -Command "cd '%~dp0frontend'; $env:Path += ';C:\Program Files\nodejs'; npm run dev"

echo ========================================================
echo Application started! You can access it at: http://localhost:3000
echo To stop, close the two opened terminal windows and run stop_app.bat
echo ========================================================
