# Nutrilens

Nutrilens is a full-stack application for analyzing food labels using computer vision and generative AI. Capture an image of a food label via your webcam, and the app extracts nutritional information, ingredients, and allergen data using Google's Gemini Vision model.

## Project Structure

```
Nutrilens/
├── backend/                  # FastAPI backend server
│   ├── src/
│   │   ├── app.py           # Main FastAPI app
│   │   ├── database.py      # MongoDB connection setup
│   │   ├── users.py         # (placeholder)
│   │   └── routers/
│   │       ├── auth.py      # Authentication endpoints (signup/signin)
│   │       └── label.py     # Label analysis endpoints
│   └── test/
│       └── ocrTest.py       # OCR tests
├── frontend/                 # React + Vite frontend
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── theme.js
│   │   └── components/
│   │       └── CameraCapture.jsx
│   ├── pages/
│   │   ├── home.jsx / home.css
│   │   ├── signin.jsx / signin.css
│   │   └── signup.jsx / signup.css
│   └── vite.config.js
├── vlm/                      # Vision Language Model logic
│   └── vlm.py               # Gemini integration (refactored as callable function)
├── requirements.txt         # Python dependencies
└── .env                     # Environment variables (secrets)
```

## Prerequisites

- **Python 3.10+** (tested with 3.11, 3.12)
- **Node.js 16+** (recommend 18+) and npm
- **MongoDB** instance (local or MongoDB Atlas cloud)
- **Google API key** with Gemini Vision model access

## Setup

### 1. Clone and navigate to project

```powershell
cd 'C:\Users\HP\Documents\Projects\Nutrilens'
```

### 2. Create and activate Python virtual environment

```powershell
# Create venv
python -m venv venv

# Activate venv (Windows PowerShell)
.\venv\Scripts\Activate.ps1
```

If you get an execution policy error:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Then retry the activation command.

### 3. Install Python dependencies

```powershell
# Upgrade pip
python -m pip install --upgrade pip

# Install from requirements.txt (now includes pymongo, bcrypt, google-generativeai)
python -m pip install -r requirements.txt
```

### 4. Configure environment variables

Ensure `.env` file exists in the project root with:

```properties
MONGO_URL="mongodb+srv://user:password@cluster.mongodb.net/"
GOOGLE_API_KEY="your_google_gemini_api_key"
SECRET_KEY="your_secret_key_here"
```

**Getting credentials:**
- **MongoDB**: Use MongoDB Atlas (cloud) or run locally. Connection string format: `mongodb://localhost:27017` (local) or `mongodb+srv://...` (Atlas).
  - **Important**: If using Atlas, allow your IP in **Network Access** > **Add Current IP** or allow `0.0.0.0/0` for development.
- **Google API Key**: Get from [Google AI Studio](https://aistudio.google.com/apikey). Ensure "Gemini 1.5 Flash" or "Gemini 2.5 Flash" model is available in your API key.

### 5. Verify MongoDB connection (optional but recommended)

Create a quick test script `backend/src/test_mongo.py`:

```python
from dotenv import load_dotenv
import os
from pymongo import MongoClient

load_dotenv()
mongo_url = os.getenv("MONGO_URL")
if not mongo_url:
    print("MONGO_URL missing from .env")
    exit(1)

try:
    client = MongoClient(mongo_url, serverSelectionTimeoutMS=5000)
    info = client.admin.command("ping")
    print("✓ MongoDB connection OK")
    print("Databases:", client.list_database_names())
except Exception as e:
    print("✗ MongoDB connection failed:", e)
```

Run it:
```powershell
cd .\backend\src
python test_mongo.py
```

### 6. Install Node dependencies (frontend)

In a new PowerShell terminal:

```powershell
cd .\frontend
npm install
```

## Running the Application

### Backend (FastAPI)

From the project root with venv activated:

```powershell
cd .\backend\src
python -m uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

Expected output:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete
```

**API Documentation**: Visit `http://127.0.0.1:8000/docs` (Swagger UI) or `http://127.0.0.1:8000/redoc` (ReDoc).

**Key endpoints:**
- `GET /` — Root health check
- `POST /auth/signup` — Create user account
- `POST /auth/signin` — Login user
- `GET /auth/test` — Test auth router
- `POST /api/v1/label/analyze` — Upload image and analyze (main feature)
- `GET /api/v1/label/health` — Check label analyzer health

### Frontend (React + Vite)

From the project root in a new PowerShell terminal:

```powershell
cd .\frontend
npm run dev
```

Expected output:
```
VITE v7.1.7  ready in 123 ms

➜  Local:   http://localhost:5173/
➜  press h + enter to show help
```

Open `http://localhost:5173/` in your browser. You should see the Nutrilens app with navigation links (Home, Sign In, Sign Up).

## Using the Label Analysis Feature

1. **Navigate to Home page** in the frontend (or relevant page with camera component).
2. **Capture or upload an image** of a food label (via `CameraCapture` component).
3. **Submit the image** — the frontend POSTs to `http://localhost:8000/api/v1/label/analyze`.
4. **View results** — the backend calls Google Gemini Vision, extracts JSON, and returns:
   ```json
   {
     "product_name": "Example Brand Cereal",
     "nutrition_facts": {
       "calories": "150",
       "total_fat": "2g",
       "sodium": "200mg",
       "total_sugars": "12g"
     },
     "ingredients": "Whole grain oats, sugar, salt, ...",
     "allergens": ["gluten", "soy"]
   }
   ```

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGO_URL` | MongoDB connection string | `mongodb://localhost:27017` or `mongodb+srv://user:pass@cluster...` |
| `GOOGLE_API_KEY` | Google Gemini API key | `AIzaSy...` |
| `SECRET_KEY` | FastAPI secret (for session/auth) | `your_secret_key_here` |
| `GOOGLE_MODEL` | (Optional) Override Gemini model name | `gemini-2.5-flash` (default if omitted) |

## Development Workflow

### Running both backend and frontend simultaneously

**Terminal 1 (Backend):**
```powershell
# From project root
.\venv\Scripts\Activate.ps1
cd .\backend\src
python -m uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 (Frontend):**
```powershell
# From project root
cd .\frontend
npm run dev
```

### Testing

**Backend endpoints (using PowerShell):**

Test root:
```powershell
Invoke-WebRequest -Uri http://127.0.0.1:8000/ | Select-Object -ExpandProperty Content
```

Test label health:
```powershell
Invoke-WebRequest -Uri http://127.0.0.1:8000/api/v1/label/health | Select-Object -ExpandProperty Content
```

Test label analysis (with a local image):
```powershell
$form = @{
    file = Get-Item 'C:\path\to\image.png'
}
Invoke-RestMethod -Uri http://127.0.0.1:8000/api/v1/label/analyze -Method Post -Form $form
```

### Linting & Building

**Frontend:**
```powershell
cd .\frontend

# Lint
npm run lint

# Build for production
npm run build

# Preview production build
npm run preview
```

## Troubleshooting

### Backend won't start: `ModuleNotFoundError: No module named 'fastapi'`

**Cause**: Python packages installed in wrong environment (e.g., Anaconda instead of venv).

**Solution**: Ensure venv is activated:
```powershell
.\venv\Scripts\Activate.ps1
python -c "import sys; print(sys.executable)"  # Should show .../venv/...
```

Then install packages:
```powershell
python -m pip install -r requirements.txt
```

### MongoDB connection timeout

**Cause**: IP not whitelisted (if using Atlas) or server unreachable.

**Solutions**:
1. **Atlas**: Go to **Network Access** and add your IP (or `0.0.0.0/0` for dev).
2. **Local MongoDB**: Ensure MongoDB is running: `mongod`.
3. **Connection string**: Verify credentials and format in `.env`.

### Image analysis returns error 503: VLM module not available

**Cause**: `GOOGLE_API_KEY` not set or `google-generativeai` package not installed.

**Solutions**:
1. Ensure `.env` has `GOOGLE_API_KEY=your_key`.
2. Verify package installed:
   ```powershell
   python -m pip show google-generativeai
   ```
3. Restart backend after setting environment variable.

### CORS errors when frontend calls backend

**Cause**: Frontend origin not allowed (unlikely given current CORS config).

**Solution**: `app.py` currently allows all origins (`allow_origins=["*"]`). If restricted, update:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Security Notes

⚠️ **Important**: The `.env` file contains sensitive credentials. **Do not commit to version control.**

1. Add `.env` to `.gitignore`:
   ```
   .env
   .env.local
   ```

2. **Rotate secrets** before pushing to production or sharing the repo.

3. For production:
   - Use environment-specific secret management (AWS Secrets Manager, Azure Key Vault, etc.).
   - Set `allow_origins` to specific frontend domain instead of `["*"]`.
   - Use strong `SECRET_KEY` (e.g., `secrets.token_urlsafe(32)`).

## Architecture Overview

### Data Flow (Image Analysis)

```
Frontend (React)
  ↓ (captures image, shows loading)
  ↓ POST /api/v1/label/analyze + image file
  ↓
Backend (FastAPI)
  ↓ (validates file, calls VLM in threadpool)
  ↓
VLM (vlm.py)
  ↓ (sends image bytes to Google Gemini Vision)
  ↓
Google Gemini API
  ↓ (returns structured JSON: nutrition, ingredients, allergens)
  ↓
Backend (parses and returns JSON)
  ↓
Frontend (displays results)
```

### Authentication Flow

1. User signs up via `/auth/signup` → hashed password stored in MongoDB (Logins collection).
2. User signs in via `/auth/signin` → credentials verified against stored hash.
3. (Future: add JWT tokens for session management.)

## Next Steps / Enhancements

- [ ] Add JWT-based authentication and session management
- [ ] Store analysis results in MongoDB for history
- [ ] Add caching for frequently analyzed products (UPC code lookup)
- [ ] Improve VLM prompt for higher accuracy
- [ ] Add user-specific history/favorites
- [ ] Implement background job processing for heavy workloads (Celery + Redis)
- [ ] Add unit and integration tests
- [ ] Deploy backend to cloud (Heroku, AWS, GCP) and frontend to CDN (Vercel, Netlify)
- [ ] Add dietary preference filtering (vegan, gluten-free, etc.)

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make changes and commit: `git commit -am "Add feature"`
3. Push: `git push origin feature/your-feature`
4. Open a pull request.

## License

ISC (as per `package.json`)

## Contact

For questions or issues, open a GitHub issue or contact the maintainers.

---

**Last Updated**: October 2025  
**Status**: Development (MVP)
