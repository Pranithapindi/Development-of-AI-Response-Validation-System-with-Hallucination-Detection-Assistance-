# start.ps1 — Start both frontend and backend with one command
Write-Host "Starting AI Response Validation System..." -ForegroundColor Cyan
Write-Host ""

# Start FastAPI backend
Write-Host "[1/2] Starting FastAPI Backend (http://localhost:8000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; python main.py"

# Wait a moment for backend to init
Start-Sleep -Seconds 3

# Start React frontend
Write-Host "[2/2] Starting React Frontend (http://localhost:5173)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; npm run dev"

Write-Host ""
Write-Host "Both servers started!" -ForegroundColor Green
Write-Host "  Frontend : http://localhost:5173" -ForegroundColor Cyan
Write-Host "  Backend  : http://localhost:8000" -ForegroundColor Cyan
Write-Host "  API Docs : http://localhost:8000/docs" -ForegroundColor Cyan
