$RootDir = $PSScriptRoot
$FrontendDist = "$RootDir\frontend\dist"

if (!(Test-Path $FrontendDist)) {
    Write-Host "Building frontend..." -ForegroundColor Cyan
    $env:Path += ";C:\Program Files\nodejs"
    Push-Location "$RootDir\frontend"
    npm install
    npm run build
    Pop-Location
    if (!(Test-Path $FrontendDist)) {
        Write-Error "Frontend build failed."
        exit 1
    }
    Write-Host "Frontend built." -ForegroundColor Green
} else {
    Write-Host "Frontend already built." -ForegroundColor Gray
}

Write-Host "Starting server at http://localhost:8000 ..." -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop." -ForegroundColor Yellow

$env:PYTHONUTF8 = "1"
$env:PYTHONPATH = "$RootDir\backend"
Set-Location "$RootDir\backend"
& .\venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000
