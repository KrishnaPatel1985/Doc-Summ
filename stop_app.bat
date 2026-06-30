@echo off
echo Stopping PostgreSQL database...
set PG_BIN="C:\Users\Admin\Downloads\postgresql\pgsql\bin"
set DATA_DIR="C:\Users\Admin\Downloads\postgresql\pgsql\data"

tasklist | find /i "postgres.exe" > nul
if %errorlevel% EQU 0 (
    %PG_BIN%\pg_ctl.exe -D %DATA_DIR% stop
    timeout /t 1 > nul
)

echo Stopping any residual backend/frontend processes...
taskkill /f /im node.exe > nul 2>&1
taskkill /f /im python.exe /fi "WINDOWTITLE eq uvicorn*" > nul 2>&1

echo All application processes stopped.
