@echo off
echo ====================================================
echo  GlamourStudio – Setup Script
echo ====================================================

REM ── Python backend ────────────────────────────────────
echo.
echo [1/4] Creating Python virtual environment...
cd /d "%~dp0backend"
python -m venv .venv
call .venv\Scripts\activate.bat

echo [2/4] Installing Python dependencies...
pip install --upgrade pip
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
pip install -r requirements.txt
pip install git+https://github.com/tencent-ailab/IP-Adapter.git

REM ── Node frontend ─────────────────────────────────────
echo.
echo [3/4] Installing frontend dependencies...
cd /d "%~dp0frontend"
npm install

echo.
echo [4/4] Setup complete!
echo.
echo ====================================================
echo  To start the app, open two terminals:
echo.
echo  Terminal 1 (backend):
echo    cd backend
echo    .venv\Scripts\activate
echo    uvicorn main:app --host 0.0.0.0 --port 8000 --reload
echo.
echo  Terminal 2 (frontend):
echo    cd frontend
echo    npm run dev
echo.
echo  Then open http://localhost:3000
echo ====================================================
pause
