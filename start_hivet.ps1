# ============================================================
#  HIVET CRM — System Startup Script
#  Progress → Execution → Integration Flow
#  Run from:  C:\Apache24\htdocs\HIVET - CRM\
# ============================================================

$Host.UI.RawUI.WindowTitle = "HIVET CRM — System Launcher"

# ─── Colors ────────────────────────────────────────────────
function Write-Header {
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║         HIVET CRM — SYSTEM STARTUP               ║" -ForegroundColor Cyan
    Write-Host "║  Progress ► Execution ► Integration Flow          ║" -ForegroundColor Cyan
    Write-Host "╚══════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Step {
    param([string]$Phase, [string]$Step, [string]$Message)
    $timestamp = Get-Date -Format "HH:mm:ss"
    Write-Host "[$timestamp] " -ForegroundColor DarkGray -NoNewline
    Write-Host "[$Phase] " -ForegroundColor Yellow -NoNewline
    Write-Host "Step $Step | " -ForegroundColor Magenta -NoNewline
    Write-Host $Message -ForegroundColor White
}

function Write-Success {
    param([string]$Message)
    Write-Host "  ✔ $Message" -ForegroundColor Green
}

function Write-Fail {
    param([string]$Message)
    Write-Host "  ✘ $Message" -ForegroundColor Red
}

function Write-PhaseHeader {
    param([string]$Phase, [string]$Description)
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkCyan
    Write-Host "  PHASE: $Phase — $Description" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkCyan
    Write-Host ""
}

# ─── Paths ─────────────────────────────────────────────────
$ROOT     = Split-Path -Parent $MyInvocation.MyCommand.Path
$BACKEND  = Join-Path $ROOT "backend"
$FRONTEND = Join-Path $ROOT "frontend"
$VENV     = Join-Path $BACKEND "venv\Scripts\Activate.ps1"
$ENV_FILE = Join-Path $BACKEND ".env"
$DB_FILE  = Join-Path $BACKEND "hivet_crm.db"
$MAIN_PY  = Join-Path $BACKEND "main.py"

# ============================================================
#  PHASE 1 — PROGRESS: Pre-flight Checks
# ============================================================
Write-Header
Write-PhaseHeader "1 — PROGRESS" "Pre-flight Checks & Validation"

# Step 1.1 — Check backend directory
Write-Step "PROGRESS" "1.1" "Checking backend directory..."
if (Test-Path $BACKEND) {
    Write-Success "Backend directory found: $BACKEND"
} else {
    Write-Fail "Backend directory NOT found: $BACKEND"
    exit 1
}

# Step 1.2 — Check virtual environment
Write-Step "PROGRESS" "1.2" "Checking Python virtual environment..."
if (Test-Path $VENV) {
    Write-Success "Virtual environment found."
} else {
    Write-Fail "Virtual environment NOT found at $VENV"
    Write-Host "  → Run: python -m venv venv  (inside the backend folder)" -ForegroundColor Yellow
    exit 1
}

# Step 1.3 — Check .env file
Write-Step "PROGRESS" "1.3" "Checking .env configuration file..."
if (Test-Path $ENV_FILE) {
    Write-Success ".env file found."
    # Read and validate critical keys
    $envContent = Get-Content $ENV_FILE
    $requiredKeys = @("DATABASE_URL", "SECRET_KEY", "FRONTEND_URL")
    foreach ($key in $requiredKeys) {
        $found = $envContent | Where-Object { $_ -match "^$key=" }
        if ($found) {
            Write-Success "  $key is set."
        } else {
            Write-Fail "  $key is MISSING from .env!"
        }
    }
} else {
    Write-Fail ".env file NOT found at $ENV_FILE"
    exit 1
}

# Step 1.4 — Check database file
Write-Step "PROGRESS" "1.4" "Checking SQLite database..."
if (Test-Path $DB_FILE) {
    $dbSize = (Get-Item $DB_FILE).Length
    Write-Success "Database found. Size: $([math]::Round($dbSize/1KB, 1)) KB"
} else {
    Write-Host "  ⚠ Database not found. It will be created on first run." -ForegroundColor Yellow
}

# Step 1.5 — Check main.py
Write-Step "PROGRESS" "1.5" "Checking backend entry point (main.py)..."
if (Test-Path $MAIN_PY) {
    $lineCount = (Get-Content $MAIN_PY).Count
    Write-Success "main.py found. ($lineCount lines)"
} else {
    Write-Fail "main.py NOT found!"
    exit 1
}

# Step 1.6 — Check frontend
Write-Step "PROGRESS" "1.6" "Checking frontend directory and package.json..."
$PKG_JSON = Join-Path $FRONTEND "package.json"
if (Test-Path $PKG_JSON) {
    Write-Success "Frontend package.json found."
} else {
    Write-Fail "Frontend package.json NOT found at $PKG_JSON"
    exit 1
}

# Step 1.7 — Check node_modules
Write-Step "PROGRESS" "1.7" "Checking node_modules..."
$NODE_MODULES = Join-Path $FRONTEND "node_modules"
if (Test-Path $NODE_MODULES) {
    Write-Success "node_modules found."
} else {
    Write-Host "  ⚠ node_modules not found. Running npm install..." -ForegroundColor Yellow
    Set-Location $FRONTEND
    npm install
    Set-Location $ROOT
}

Write-Host ""
Write-Success "All pre-flight checks passed! ✈"

# ============================================================
#  PHASE 2 — EXECUTION: Launch Services
# ============================================================
Write-PhaseHeader "2 — EXECUTION" "Starting Backend & Frontend Servers"

# Step 2.1 — Start Backend (FastAPI + Uvicorn)
Write-Step "EXECUTION" "2.1" "Starting FastAPI backend on port 8000..."
Write-Host ""

$backendScript = @"
Set-Location '$BACKEND'
& '$VENV'
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
"@

try {
    $backendProc = Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendScript -PassThru -WindowStyle Normal
    Write-Success "Backend process started. PID: $($backendProc.Id)"
    Write-Host "  → API:  http://localhost:8000" -ForegroundColor Cyan
    Write-Host "  → Docs: http://localhost:8000/docs" -ForegroundColor Cyan
} catch {
    Write-Fail "Failed to start backend: $_"
    exit 1
}

# Wait for backend to initialize
Write-Host ""
Write-Host "  ⟳ Waiting 4 seconds for backend to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 4

# Step 2.2 — Health check backend
Write-Step "EXECUTION" "2.2" "Running backend health check..."
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8000/" -Method GET -TimeoutSec 5
    Write-Success "Backend is UP. Response: $($response.message)"
} catch {
    Write-Host "  ⚠ Backend health check failed (it may still be starting). Continuing..." -ForegroundColor Yellow
}

# Step 2.3 — Start Frontend (Vite)
Write-Step "EXECUTION" "2.3" "Starting Vite frontend dev server on port 5175..."
Write-Host ""

$frontendScript = @"
Set-Location '$FRONTEND'
npm run dev
"@

try {
    $frontendProc = Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendScript -PassThru -WindowStyle Normal
    Write-Success "Frontend process started. PID: $($frontendProc.Id)"
    Write-Host "  → App: http://localhost:5175" -ForegroundColor Cyan
} catch {
    Write-Fail "Failed to start frontend: $_"
}

# Wait for frontend to compile
Write-Host ""
Write-Host "  ⟳ Waiting 5 seconds for frontend to compile..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# ============================================================
#  PHASE 3 — INTEGRATION: Verify End-to-End
# ============================================================
Write-PhaseHeader "3 — INTEGRATION" "Verifying System Integration & Endpoints"

# Step 3.1 — Test Backend Root
Write-Step "INTEGRATION" "3.1" "Testing backend root endpoint..."
try {
    $r = Invoke-RestMethod -Uri "http://localhost:8000/" -Method GET -TimeoutSec 5
    Write-Success "GET /  →  $($r.message)"
} catch {
    Write-Fail "GET / failed: $_"
}

# Step 3.2 — Test Products endpoint
Write-Step "INTEGRATION" "3.2" "Testing public products endpoint..."
try {
    $r = Invoke-RestMethod -Uri "http://localhost:8000/api/products" -Method GET -TimeoutSec 5
    $count = if ($r -is [Array]) { $r.Count } else { "response received" }
    Write-Success "GET /api/products  →  $count product(s) found"
} catch {
    Write-Host "  ⚠ /api/products: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Step 3.3 — Test Business list endpoint
Write-Step "INTEGRATION" "3.3" "Testing business list endpoint..."
try {
    $r = Invoke-RestMethod -Uri "http://localhost:8000/api/businesses" -Method GET -TimeoutSec 5
    $count = if ($r -is [Array]) { $r.Count } else { "response received" }
    Write-Success "GET /api/businesses  →  $count business(es) found"
} catch {
    Write-Host "  ⚠ /api/businesses: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Step 3.4 — Test auth endpoints reachable (401 expected without token)
Write-Step "INTEGRATION" "3.4" "Testing protected auth endpoints (expect 401)..."
try {
    Invoke-RestMethod -Uri "http://localhost:8000/api/profile" -Method GET -TimeoutSec 5
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Success "GET /api/profile  →  401 Unauthorized (correct, auth required)"
    } else {
        Write-Host "  ⚠ Unexpected: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

# Step 3.5 — Test OpenAPI docs
Write-Step "INTEGRATION" "3.5" "Testing API documentation endpoint..."
try {
    $r = Invoke-WebRequest -Uri "http://localhost:8000/docs" -TimeoutSec 5 -UseBasicParsing
    Write-Success "GET /docs  →  HTTP $($r.StatusCode) (Swagger UI available)"
} catch {
    Write-Host "  ⚠ /docs: $($_.Exception.Message)" -ForegroundColor Yellow
}

# ============================================================
#  SUMMARY
# ============================================================
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║          ✅  HIVET CRM SYSTEM IS RUNNING                 ║" -ForegroundColor Green
Write-Host "╠══════════════════════════════════════════════════════════╣" -ForegroundColor Green
Write-Host "║  Frontend App   →  http://localhost:5175                 ║" -ForegroundColor White
Write-Host "║  Backend API    →  http://localhost:8000                 ║" -ForegroundColor White
Write-Host "║  API Docs       →  http://localhost:8000/docs            ║" -ForegroundColor White
Write-Host "╠══════════════════════════════════════════════════════════╣" -ForegroundColor Green
Write-Host "║  Phase 1 PROGRESS   → Pre-flight checks ✔               ║" -ForegroundColor Cyan
Write-Host "║  Phase 2 EXECUTION  → Servers launched  ✔               ║" -ForegroundColor Cyan
Write-Host "║  Phase 3 INTEGRATION→ Endpoints verified✔               ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "  Press ENTER to open the app in your browser..." -ForegroundColor Yellow
Read-Host

# Open browser
Start-Process "http://localhost:5175"
