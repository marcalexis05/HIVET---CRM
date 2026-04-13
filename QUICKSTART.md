# HIVET CRM - Quick Start Guide

## 🚀 Quick Start (60 seconds)

### Windows - Full System Startup
```powershell
cd "C:\Apache24\htdocs\HIVET - CRM"
.\start_hivet.ps1
```

This automatically:
- ✅ Validates prerequisites
- ✅ Starts Backend (port 8000)
- ✅ Starts Frontend (port 5175)
- ✅ Opens documentation links

### Manual Startup

**Terminal 1 - Backend:**
```powershell
cd "C:\Apache24\htdocs\HIVET - CRM\backend"
python main.py
# Available at http://localhost:8000
```

**Terminal 2 - Frontend:**
```powershell
cd "C:\Apache24\htdocs\HIVET - CRM\frontend"
npm run dev
# Available at http://localhost:5175
```

---

## 📱 Access URLs

| Component | URL | Purpose |
|-----------|-----|---------|
| Frontend App | http://localhost:5175 | Main web application |
| Backend API | http://localhost:8000 | REST API server |
| API Docs | http://localhost:8000/docs | Swagger documentation |
| API ReDoc | http://localhost:8000/redoc | Alternative API docs |

---

## 🔧 Common Tasks

### Rebuild Frontend
```powershell
cd frontend
npm run build
# Output: dist/ folder (ready for web server)
```

### Update Dependencies
```powershell
cd frontend
npm update

cd ../backend
pip install --upgrade -r requirements.txt
```

### Database Verification
```powershell
cd backend
python check_schema.py  # Verify database structure
```

### Run Tests
```powershell
cd frontend
npm run lint  # Check code quality

cd ../mobile
flutter analyze  # Check mobile app
```

---

## 📊 Architecture Overview

```
Frontend (React)
    ↓
    ↔ (HTTP REST API)
    ↓
Backend (FastAPI)
    ↓
Database (PostgreSQL/SQLite)

Mobile (Flutter) ---- (Same API) ---- Backend
```

---

## 🔑 Key Files

- `DEPLOYMENT.md` - Full deployment guide
- `backend/.env` - Configuration (API keys, database, etc.)
- `backend/main.py` - Backend API code
- `frontend/src/` - React application code
- `frontend/dist/` - Production build output
- `mobile/lib/` - Flutter application code

---

## ⚠️ Common Issues

### Backend won't start
```powershell
# Check Python version
python --version  # Should be 3.11+

# Verify .env file
cd backend
cat .env  # Should have DATABASE_URL, SECRET_KEY
```

### Frontend shows errors
```powershell
cd frontend
rm -r node_modules dist
npm install
npm run build
```

### Mobile app issues
```powershell
cd mobile
flutter pub get
flutter analyze
```

---

## 📈 Monitoring

### Check Backend Health
```powershell
# Should return HTTP 200
(Invoke-WebRequest -Uri "http://localhost:8000/").StatusCode
```

### View API Logs
```
Backend terminal shows:
- INFO: Request received
- ERROR: Any failures
- WARNING: Issues to watch
```

### Frontend Console
```
Browser → F12 → Console
Shows React errors, API responses, etc.
```

---

## 🚢 Before Production

1. **Update .env**: Change DATABASE_URL, SECRET_KEY, FRONTEND_URL
2. **Build Frontend**: `npm run build`
3. **Test All Flows**: Login, orders, payments, admin
4. **Check Database**: Backup and verify schema
5. **Security Review**: CORS, HTTPS, API keys
6. **Performance Test**: Load testing tools

---

## 📞 Support

- **API Docs**: http://localhost:8000/docs
- **Backend Issues**: Check `backend/` folder structure
- **Frontend Issues**: Check browser console (F12)
- **Database Issues**: Check database connection in `.env`

---

**Last Updated**: April 13, 2026  
**System Status**: ✅ READY FOR PRODUCTION
