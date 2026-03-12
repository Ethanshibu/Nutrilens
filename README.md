# 🔬 Nutrilens - AI-Powered Food Label Toxicology Analyzer

Nutrilens is a full-stack web application that uses AI-powered computer vision to analyze food product labels and provide comprehensive toxicology reports. Capture an image of any food label, and get instant insights about ingredients, potential health risks, allergens, and safer alternatives.

## ✨ Features

- **🎥 Real-time Camera Capture**: Use your device's camera to capture product labels
- **🤖 AI-Powered Analysis**: Leverages Google's Gemini 2.5 Flash Vision model for accurate label reading
- **🧪 Toxicology Assessment**: Identifies ingredients with potential health risks and rates them (low/medium/high)
- **⚠️ Allergen Detection**: Automatically detects common allergens in products
- **👤 Personalized Alerts**: Set your allergen profile and get critical warnings when your allergens are detected
- **💡 Safer Alternatives**: Suggests healthier ingredient alternatives for risky components
- **🔍 Smart Recommendations**: Web search powered by Tavily API to find safer product alternatives based on your allergen profile
- **📦 Purchase History**: Mark products as purchased to build your consumption history
- **🎯 Personalized Suggestions**: Get product recommendations that consider your allergens and purchase history
- **📊 Detailed Reports**: Comprehensive analysis with confidence ratings and scientific explanations
- **🔐 User Authentication**: Secure signup/signin with bcrypt password hashing
- **📱 Responsive Design**: Works seamlessly on desktop and mobile devices

## 🏗️ Project Structure

```
Nutrilens/
├── backend/                      # FastAPI backend server
│   ├── src/
│   │   ├── app.py               # Main FastAPI application
│   │   ├── database.py          # MongoDB connection and configuration
│   │   ├── users.py             # User-related utilities (placeholder)
│   │   └── routers/
│   │       ├── auth.py          # Authentication endpoints (signup/signin/profile)
│   │       ├── label.py         # Label analysis endpoints with Gemini integration
│   │       └── recommendations.py # Product recommendations & purchase history
│   └── test/
│       ├── ocrTest.py           # OCR testing utilities
│       ├── test0.png            # Test image samples
│       └── test1.png
├── frontend/                     # React + Vite frontend
│   ├── src/
│   │   ├── App.jsx              # Main app component with routing
│   │   ├── main.jsx             # React entry point
│   │   ├── theme.js             # Theme configuration
│   │   ├── components/
│   │   │   ├── CameraCapture.jsx # Webcam capture component
│   │   │   └── Navbar.jsx       # Navigation bar
│   │   └── pages/
│   │       ├── home.jsx         # Main analysis page
│   │       ├── signin.jsx       # Sign in page
│   │       ├── signup.jsx       # Sign up page
│   │       └── profile.jsx      # User profile & allergen management
│   ├── public/
│   ├── index.html
│   └── vite.config.js
├── requirements.txt              # Python dependencies
├── package.json                  # Root package.json
├── .gitignore
└── .env                         # Environment variables (not in repo)
```

## 🔧 Prerequisites

- **Python 3.10+** (tested with 3.11, 3.12)
- **Node.js 16+** (recommend 18+) and npm
- **MongoDB** instance (local or MongoDB Atlas)
- **Google Gemini API key** with access to Gemini 2.5 Flash model
- **Tavily API key** for web search and product recommendations

## 🚀 Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Nutrilens
```

### 2. Backend Setup

#### Create Python Virtual Environment

**macOS/Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

**Windows (PowerShell):**
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

If you encounter an execution policy error on Windows:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

#### Install Python Dependencies

```bash
# Upgrade pip
python -m pip install --upgrade pip

# Install dependencies
pip install -r requirements.txt
```

**Key Dependencies:**
- `fastapi` - Web framework
- `uvicorn` - ASGI server
- `pymongo` - MongoDB driver
- `bcrypt` - Password hashing
- `google-generativeai` - Gemini API client
- `tavily-python` - Web search API client
- `python-dotenv` - Environment variable management
- `pillow` - Image processing

### 3. Frontend Setup

```bash
cd frontend
npm install
```

**Key Dependencies:**
- `react` & `react-dom` - UI framework
- `react-router-dom` - Routing
- `react-webcam` - Camera capture
- `vite` - Build tool and dev server

### 4. Environment Configuration

Create a `.env` file in the project root:

```env
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/
GEMINI_API_KEY=your_gemini_api_key_here
TAVILY_API_KEY=your_tavily_api_key_here
SECRET_KEY=your_secret_key_for_sessions
```

#### Getting Your Credentials

**MongoDB:**
- **Option 1 (Cloud)**: Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
  - Get connection string from "Connect" → "Connect your application"
  - **Important**: Whitelist your IP in Network Access settings
- **Option 2 (Local)**: Install MongoDB locally
  - Connection string: `mongodb://localhost:27017`

**Google Gemini API Key:**
- Visit [Google AI Studio](https://aistudio.google.com/apikey)
- Create a new API key
- Ensure you have access to Gemini 2.5 Flash model

**Tavily API Key:**
- Visit [Tavily](https://tavily.com/)
- Sign up for a free account
- Get your API key from the dashboard
- Free tier includes 1,000 searches per month

**Secret Key:**
- Generate a secure random key:
  ```python
  python -c "import secrets; print(secrets.token_urlsafe(32))"
  ```

### 5. Verify MongoDB Connection (Optional)

Create `backend/src/test_mongo.py`:

```python
from dotenv import load_dotenv
import os
from pymongo import MongoClient

load_dotenv()
mongo_url = os.getenv("MONGO_URL")

try:
    client = MongoClient(mongo_url, serverSelectionTimeoutMS=5000)
    client.admin.command('ping')
    print("✓ MongoDB connection successful")
    print("Databases:", client.list_database_names())
except Exception as e:
    print(f"✗ MongoDB connection failed: {e}")
```

Run it:
```bash
cd backend/src
python test_mongo.py
```

## 🎮 Running the Application

### Start Backend Server

From the project root with virtual environment activated:

```bash
cd backend/src
python -m uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

Expected output:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete
```

**API Documentation:**
- Swagger UI: http://127.0.0.1:8000/docs
- ReDoc: http://127.0.0.1:8000/redoc

### Start Frontend Development Server

In a new terminal:

```bash
cd frontend
npm run dev
```

Expected output:
```
VITE v7.1.7  ready in 123 ms

➜  Local:   http://localhost:5173/
➜  press h + enter to show help
```

Open http://localhost:5173 in your browser.

## 🎯 Key Features Walkthrough

### Product Analysis with Allergen Detection
1. Sign in to your account
2. Navigate to the Home page
3. Capture or upload a product label image
4. Click "Generate Report" to analyze
5. View detailed toxicology analysis with risk levels
6. If you have allergens set in your profile, critical warnings will appear if detected

### Smart Recommendations System
1. After analyzing a product, click "🔍 Get Safer Alternatives"
2. The system uses Tavily web search to find similar products
3. Results are filtered based on your allergen profile
4. View product recommendations with relevance scores
5. Click on links to explore recommended products

### Purchase History Tracking
1. After analyzing a product, click "📦 Mark as Purchased"
2. Product is saved to your purchase history with full analysis data
3. View your purchase history in the Profile page
4. Future recommendations will consider your purchase patterns


## 📖 API Endpoints

### Authentication (`/auth`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/signup` | Create new user account |
| POST | `/auth/signin` | Sign in user |
| GET | `/auth/profile/{username}` | Get user profile |
| PUT | `/auth/profile/{username}` | Update user profile & allergens |
| GET | `/auth/test` | Test auth router |

### Label Analysis (`/api/v1/label`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/label/analyze` | Analyze product label image |
| GET | `/api/v1/label/health` | Health check |

### Recommendations (`/api/v1/recommendations`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/recommendations/purchase` | Mark product as purchased |
| GET | `/api/v1/recommendations/history/{username}` | Get purchase history |
| POST | `/api/v1/recommendations/suggest` | Get product recommendations |
| GET | `/api/v1/recommendations/health` | Health check |

## 🎯 Using the Application

### 1. Create an Account
- Navigate to Sign Up page
- Enter username, password, and optional name
- Optionally add your allergens during signup

### 2. Set Up Your Allergen Profile
- Go to Profile page after signing in
- Select common allergens or add custom ones
- Save your profile

### 3. Analyze a Product Label
- Go to Home page
- Click "Capture" to take a photo of a product label
- Click "Generate Report" to analyze
- View comprehensive toxicology report including:
  - Product name
  - Toxicology risks (low/medium/high)
  - All detected allergens
  - **Critical warnings** if your allergens are detected
  - Ingredient list
  - Safer alternatives
  - Confidence rating

### 4. Mark Products as Purchased
- After analyzing a product, click "📦 Mark as Purchased"
- Product will be saved to your purchase history
- This helps build your consumption profile for better recommendations

### 5. Get Product Recommendations
- Click "🔍 Get Safer Alternatives" after analyzing a product
- System performs web search using Tavily API
- Recommendations are filtered based on your allergen profile
- View safer product alternatives with relevance scores
- Click links to learn more about recommended products

### 6. View Purchase History
- Go to your Profile page
- View all previously purchased products
- See analysis data for each purchase
- Track your consumption patterns

### 7. Understanding the Report

**Risk Levels:**
- 🚨 **High**: Significant health concerns, avoid if possible
- ⚡ **Medium**: Moderate concerns, use with caution
- ✓ **Low**: Minimal concerns, generally safe

**User Allergen Warnings:**
- If the product contains any of your allergens, you'll see a prominent red warning
- The system will highlight exactly which of your allergens were detected
- A clear "DO NOT CONSUME" message will be displayed

## 🔒 Security Notes

⚠️ **Important Security Practices:**

1. **Never commit `.env` file** - It's already in `.gitignore`
2. **Use strong passwords** - Passwords are hashed with bcrypt
3. **Rotate API keys** before deploying to production
4. **Restrict CORS** in production:
   ```python
   # In backend/src/app.py
   app.add_middleware(
       CORSMiddleware,
       allow_origins=["https://yourdomain.com"],  # Specific domain
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )
   ```

## 🧪 Testing

### Test Backend Endpoints

**Using curl:**
```bash
# Test root
curl http://127.0.0.1:8000/

# Test label health
curl http://127.0.0.1:8000/api/v1/label/health

# Test label analysis
curl -X POST -F "file=@path/to/image.jpg" \
  "http://127.0.0.1:8000/api/v1/label/analyze?username=testuser"
```

**Using Python:**
```python
import requests

# Test analysis
with open('test_image.jpg', 'rb') as f:
    files = {'file': f}
    response = requests.post(
        'http://127.0.0.1:8000/api/v1/label/analyze',
        files=files,
        params={'username': 'testuser'}
    )
    print(response.json())
```

### Frontend Commands

```bash
cd frontend

# Run linter
npm run lint

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🐛 Troubleshooting

### Backend won't start: `ModuleNotFoundError`

**Cause**: Virtual environment not activated or packages not installed.

**Solution**:
```bash
# Activate venv
source venv/bin/activate  # macOS/Linux
.\venv\Scripts\Activate.ps1  # Windows

# Verify correct Python
python -c "import sys; print(sys.executable)"

# Reinstall packages
pip install -r requirements.txt
```

### MongoDB Connection Timeout

**Causes & Solutions**:
1. **Atlas IP Whitelist**: Add your IP in Network Access settings
2. **Local MongoDB**: Ensure `mongod` is running
3. **Connection String**: Verify format and credentials in `.env`
4. **Firewall**: Check if port 27017 (local) or 27015-27017 (Atlas) is blocked

### Gemini API Errors

**Common Issues**:
1. **Invalid API Key**: Verify `GEMINI_API_KEY` in `.env`
2. **Model Access**: Ensure your API key has access to `gemini-2.5-flash`
3. **Rate Limits**: Free tier has usage limits
4. **Image Format**: Ensure image is valid JPEG/PNG

### CORS Errors

**Solution**: Backend already allows all origins in development. If issues persist:
```python
# backend/src/app.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Frontend Can't Connect to Backend

**Checklist**:
- Backend is running on port 8000
- Frontend is using correct API URL (`http://localhost:8000`)
- No firewall blocking connections
- Check browser console for specific errors

## 🏗️ Architecture Overview

### Data Flow

```
User captures image → Frontend (React)
                          ↓
                    POST /api/v1/label/analyze
                          ↓
                    Backend (FastAPI)
                          ↓
                    Gemini Vision API
                          ↓
                    JSON Response (toxicology data)
                          ↓
                    Frontend displays report
```

### Technology Stack

**Backend:**
- FastAPI - Modern Python web framework
- MongoDB - NoSQL database for user data and purchase history
- Google Gemini 2.5 Flash - Vision AI model for label analysis
- Tavily API - Web search for product recommendations
- Bcrypt - Password hashing
- Uvicorn - ASGI server

**Frontend:**
- React 19 - UI library
- Vite - Build tool and dev server
- React Router - Client-side routing
- React Webcam - Camera integration

## 🚀 Deployment

### Backend Deployment Options

**Heroku:**
```bash
# Create Procfile
echo "web: cd backend/src && uvicorn app:app --host 0.0.0.0 --port \$PORT" > Procfile

# Deploy
heroku create nutrilens-api
git push heroku main
```

**Railway/Render:**
- Set build command: `pip install -r requirements.txt`
- Set start command: `cd backend/src && uvicorn app:app --host 0.0.0.0 --port $PORT`
- Add environment variables

### Frontend Deployment Options

**Vercel:**
```bash
cd frontend
npm run build
vercel --prod
```

**Netlify:**
```bash
cd frontend
npm run build
netlify deploy --prod --dir=dist
```

**Update API URL** in production:
```javascript
// frontend/src/pages/home.jsx, signin.jsx, profile.jsx
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
```

## 📈 Future Enhancements

- [ ] JWT-based authentication with refresh tokens
- [ ] Enhanced recommendation algorithm using ML
- [ ] Product barcode/UPC lookup and caching
- [ ] Nutrition facts extraction and visualization
- [ ] Dietary preference filtering (vegan, keto, etc.)
- [ ] Multi-language support
- [ ] Export reports as PDF
- [ ] Social sharing features
- [ ] Mobile app (React Native)
- [ ] Background job processing (Celery + Redis)
- [ ] Unit and integration tests
- [ ] CI/CD pipeline
- [ ] Collaborative filtering for recommendations
- [ ] Price comparison for recommended products

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

ISC License - See package.json for details

## 👥 Authors

Built with ❤️ by the Nutrilens team

## 📞 Support

For issues, questions, or contributions:
- Open a GitHub issue
- Check existing documentation
- Review troubleshooting section

---

**Last Updated**: March 2026  
**Status**: Active Development  
**Version**: 1.0.0
