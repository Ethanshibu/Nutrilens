# Nutrilens - Project Analysis & Architecture Overview

## 📋 Executive Summary

**Nutrilens** is an AI-powered food label toxicology analyzer that helps users make informed decisions about food products by analyzing ingredient labels using computer vision and providing personalized health insights based on allergen profiles.

**Version**: 1.0.0  
**Status**: Active Development  
**Last Updated**: March 2026

---

## 🎯 Core Purpose

Nutrilens addresses the challenge of understanding complex food labels by:
1. Using AI vision to read and analyze product labels from images
2. Identifying potentially harmful ingredients and toxicology risks
3. Detecting allergens and providing personalized warnings
4. Recommending safer product alternatives via Amazon search
5. Tracking purchase history for personalized recommendations

---

## 🏗️ Architecture Overview

### Technology Stack

**Backend (Python)**
- **Framework**: FastAPI 0.119.0 - Modern async web framework
- **Server**: Uvicorn 0.37.0 - ASGI server
- **Database**: MongoDB (via PyMongo 4.6.0) - NoSQL for user data and purchase history
- **AI/ML**: Google Gemini 2.5 Flash - Vision model for label analysis
- **Search**: SearchApi.io - Amazon product search integration
- **Authentication**: Bcrypt 4.3.0 - Password hashing
- **Image Processing**: Pillow 10.4.0
- **HTTP Client**: HTTPX 0.28.1 - Async HTTP requests

**Frontend (JavaScript/React)**
- **Framework**: React 19.1.1 - UI library
- **Build Tool**: Vite 7.1.7 - Fast development server and bundler
- **Routing**: React Router DOM 7.9.4 - Client-side routing
- **Camera**: React Webcam 7.2.0 - Camera integration for label capture

**Infrastructure**
- **CORS**: Enabled for cross-origin requests (development: all origins)
- **SSL/TLS**: Certifi for secure MongoDB connections
- **Environment**: Python-dotenv for configuration management

---

## 📁 Project Structure

```
Nutrilens/
├── backend/
│   ├── src/
│   │   ├── app.py                    # FastAPI application entry point
│   │   ├── database.py               # MongoDB connection & collections
│   │   ├── routers/
│   │   │   ├── auth.py              # Authentication endpoints
│   │   │   ├── label.py             # Label analysis with Gemini AI
│   │   │   └── recommendations.py   # Product recommendations & history
│   │   └── services/
│   │       ├── __init__.py
│   │       └── amazon_search.py     # Amazon search via SearchApi.io
│   └── test/
│       ├── ocrTest.py               # OCR testing utilities
│       └── test*.png                # Test images
├── frontend/
│   ├── src/
│   │   ├── App.jsx                  # Main app with routing
│   │   ├── main.jsx                 # React entry point
│   │   ├── components/
│   │   │   ├── CameraCapture.jsx   # Webcam capture component
│   │   │   └── Navbar.jsx          # Navigation bar
│   │   └── pages/
│   │       ├── home.jsx            # Main analysis page
│   │       ├── signin.jsx          # Authentication
│   │       ├── signup.jsx          # User registration
│   │       └── profile.jsx         # User profile & allergen management
│   ├── public/
│   ├── index.html
│   └── vite.config.js
├── requirements.txt                 # Python dependencies
├── package.json                     # Root package.json
└── README.md                        # Comprehensive documentation
```

---

## 🔄 Data Flow Architecture

```mermaid
graph TB
    A[User] -->|Captures Image| B[React Frontend]
    B -->|POST /api/v1/label/analyze| C[FastAPI Backend]
    C -->|Fetch User Allergens| D[MongoDB]
    C -->|Send Image + Prompt| E[Google Gemini 2.5 Flash]
    E -->|JSON Analysis| C
    C -->|Toxicology Report| B
    B -->|Display Results| A
    
    A -->|Request Alternatives| B
    B -->|POST /api/v1/recommendations/suggest| C
    C -->|Search Query| F[SearchApi.io]
    F -->|Amazon Products| C
    C -->|Filtered Results| B
    B -->|Show Products| A
    
    A -->|Mark as Purchased| B
    B -->|POST /api/v1/recommendations/purchase| C
    C -->|Store Purchase| D
```

---

## 🔌 API Endpoints

### Authentication Router (`/auth`)

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| POST | `/auth/signup` | Create new user account | `{username, password, name?, allergens?}` | User created confirmation |
| POST | `/auth/signin` | Sign in user | `{username, password}` | User data with allergens |
| GET | `/auth/profile/{username}` | Get user profile | - | User profile data |
| PUT | `/auth/profile/{username}` | Update profile & allergens | `{name?, allergens?}` | Updated profile |
| GET | `/auth/test` | Test auth router | - | Status message |

### Label Analysis Router (`/api/v1/label`)

| Method | Endpoint | Description | Parameters | Response |
|--------|----------|-------------|------------|----------|
| POST | `/api/v1/label/analyze` | Analyze product label image | `file` (multipart), `username?` (query) | Toxicology analysis JSON |
| GET | `/api/v1/label/health` | Health check | - | Service status |

### Recommendations Router (`/api/v1/recommendations`)

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| POST | `/api/v1/recommendations/purchase` | Mark product as purchased | `{username, product_name, analysis_data, image_url?}` | Purchase confirmation |
| GET | `/api/v1/recommendations/history/{username}` | Get purchase history | `limit?` (query, default: 10) | Purchase list |
| DELETE | `/api/v1/recommendations/purchase/{purchase_id}` | Delete purchase | `username` (query) | Deletion confirmation |
| POST | `/api/v1/recommendations/suggest` | Get product recommendations | `{username, current_product?, limit?}` | Amazon product list |
| GET | `/api/v1/recommendations/health` | Health check | - | Service status |

---

## 🗄️ Database Schema

### MongoDB Collections

**Collection: `users`**
```javascript
{
  _id: ObjectId,
  username: String (unique),
  password: Binary (bcrypt hashed),
  name: String,
  allergens: [String]  // e.g., ["Peanuts", "Milk", "Gluten"]
}
```

**Collection: `purchases`**
```javascript
{
  _id: ObjectId,
  username: String,
  product_name: String,
  analysis_data: {
    product_name: String,
    ingredients: [String],
    toxicology_risks: [{
      ingredient: String,
      risk_level: String,  // "low" | "medium" | "high"
      description: String,
      alternatives: [String]
    }],
    allergens: [String],
    user_allergens_detected: [String],
    confidence: String,  // "low" | "medium" | "high"
    summary: String
  },
  image_url: String (optional),
  purchased_at: ISODate,
  allergens: [String],
  ingredients: [String],
  toxicology_risks: [Object]
}
```

---

## 🤖 AI Integration - Google Gemini 2.5 Flash

### Label Analysis Process

1. **Image Capture**: User captures product label via webcam or uploads image
2. **User Context**: System retrieves user's allergen profile from MongoDB
3. **Prompt Engineering**: Dynamic system prompt includes:
   - User's specific allergens for personalized warnings
   - Instructions for toxicology analysis
   - JSON schema for structured output
4. **Vision Analysis**: Gemini 2.5 Flash processes image and returns:
   - Product name
   - Complete ingredient list
   - Toxicology risks with severity levels
   - Detected allergens (general)
   - User-specific allergen matches
   - Safer ingredient alternatives
   - Confidence rating
   - Summary with warnings

### System Prompt Structure

The prompt in [`label.py:15-62`](Nutrilens/backend/src/routers/label.py:15-62) dynamically includes:
- User allergen context when available
- Strict JSON output format requirements
- Risk assessment guidelines (low/medium/high)
- Scientific, neutral language requirements
- Confidence rating instructions

### Response Processing

- JSON parsing with markdown cleanup (handles ```json blocks)
- Fallback to raw text if JSON parsing fails
- User allergens appended to response for frontend highlighting

---

## 🛒 Amazon Product Search Integration

### SearchApi.io Service

**Implementation**: [`amazon_search.py`](Nutrilens/backend/src/services/amazon_search.py)

**Features**:
- Async HTTP requests via HTTPX
- Allergen-based filtering (excludes products containing user allergens)
- Department-specific search (default: grocery)
- Product metadata extraction (price, rating, Prime eligibility)
- Recommendation reason generation

**Search Flow**:
1. Build query with allergen exclusions (negative keywords)
2. Request 2x desired results for filtering
3. Filter results by checking title/description for allergens
4. Extract product details (ASIN, price, rating, thumbnail)
5. Generate personalized recommendation reasons
6. Return top N filtered products

**Product Data Structure**:
```javascript
{
  title: String,
  link: String,           // Amazon product URL
  asin: String,           // Amazon Standard Identification Number
  price: String,
  rating: Number,
  ratings_total: Number,
  thumbnail: String,      // Product image URL
  description: String,
  is_prime: Boolean,
  delivery: String,
  reason: String          // Why recommended
}
```

---

## 🔐 Security Implementation

### Authentication
- **Password Hashing**: Bcrypt with salt (via [`auth.py:31`](Nutrilens/backend/src/routers/auth.py:31))
- **Password Verification**: Bcrypt comparison (via [`auth.py:55`](Nutrilens/backend/src/routers/auth.py:55))
- **Session Management**: Client-side localStorage (username storage)
- **No JWT**: Currently uses simple username-based auth (future enhancement opportunity)

### Data Protection
- **Password Exclusion**: MongoDB queries exclude password field (via [`auth.py:68`](Nutrilens/backend/src/routers/auth.py:68))
- **SSL/TLS**: Certifi for secure MongoDB connections
- **CORS**: Currently allows all origins (development mode)

### Security Considerations
⚠️ **Production Recommendations**:
1. Implement JWT-based authentication with refresh tokens
2. Restrict CORS to specific domains
3. Add rate limiting for API endpoints
4. Implement HTTPS for all communications
5. Add input validation and sanitization
6. Implement session timeout mechanisms

---

## 🎨 Frontend Architecture

### Component Structure

**Main Components**:
- [`App.jsx`](Nutrilens/frontend/src/App.jsx) - Router configuration with 4 routes
- [`Navbar.jsx`](Nutrilens/frontend/src/components/Navbar.jsx) - Navigation with auth state
- [`CameraCapture.jsx`](Nutrilens/frontend/src/components/CameraCapture.jsx) - Webcam integration

**Pages**:
- [`home.jsx`](Nutrilens/frontend/src/pages/home.jsx) - Main analysis interface
- [`signin.jsx`](Nutrilens/frontend/src/pages/signin.jsx) - User authentication
- [`signup.jsx`](Nutrilens/frontend/src/pages/signup.jsx) - User registration
- [`profile.jsx`](Nutrilens/frontend/src/pages/profile.jsx) - Profile & allergen management

### State Management

**Home Page State** ([`home.jsx:8-14`](Nutrilens/frontend/src/pages/home.jsx:8-14)):
- `image` - Captured/uploaded image data URL
- `analysisData` - Gemini analysis results
- `loading` - Analysis in progress
- `error` - Error messages
- `recommendations` - Amazon product suggestions
- `loadingRecommendations` - Recommendation fetch status
- `purchaseSuccess` - Purchase marking confirmation

**Profile Page State** ([`profile.jsx:14-23`](Nutrilens/frontend/src/pages/profile.jsx:14-23)):
- `username` - Current user
- `name` - Display name
- `allergens` - User's allergen list
- `customAllergen` - Input for custom allergens
- `loading/saving` - Operation states
- `error/message` - User feedback
- `purchaseHistory` - Past purchases

### User Flow

1. **Sign Up/Sign In** → Store username in localStorage
2. **Home Page** → Capture label image
3. **Analysis** → Send to backend with username
4. **Results Display** → Show toxicology report with allergen warnings
5. **Actions**:
   - Mark as Purchased → Save to history
   - Get Alternatives → Search Amazon
6. **Profile** → Manage allergens, view history

---

## 🔧 Configuration & Environment

### Required Environment Variables

**Backend** (`.env` in `backend/` directory):
```env
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/
GEMINI_API_KEY=your_gemini_api_key_here
SEARCHAPI_API_KEY=your_searchapi_key_here
SECRET_KEY=your_secret_key_for_sessions
```

### API Keys & Services

1. **MongoDB Atlas** (or local MongoDB)
   - Free tier available
   - Requires IP whitelisting for Atlas
   - Connection string format: `mongodb+srv://...`

2. **Google Gemini API**
   - Get from: https://aistudio.google.com/apikey
   - Model: `gemini-2.5-flash`
   - Free tier available with usage limits

3. **SearchApi.io**
   - Get from: https://www.searchapi.io/
   - Free tier: 100 searches/month
   - Used for Amazon product search

4. **Secret Key**
   - Generate: `python -c "import secrets; print(secrets.token_urlsafe(32))"`
   - Used for session management (future JWT implementation)

---

## 🚀 Development Workflow

### Backend Setup
```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # macOS/Linux
# or: .\venv\Scripts\Activate.ps1  # Windows

# Install dependencies
pip install -r requirements.txt

# Run server
cd backend/src
python -m uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev  # Runs on http://localhost:5173
```

### API Documentation
- Swagger UI: http://127.0.0.1:8000/docs
- ReDoc: http://127.0.0.1:8000/redoc

---

## 📊 Key Features Deep Dive

### 1. AI-Powered Label Analysis

**Process**:
1. User captures image via [`CameraCapture.jsx`](Nutrilens/frontend/src/components/CameraCapture.jsx)
2. Image sent to [`/api/v1/label/analyze`](Nutrilens/backend/src/routers/label.py:64)
3. Backend fetches user allergens from MongoDB
4. Gemini 2.5 Flash analyzes image with personalized prompt
5. Returns structured JSON with toxicology data
6. Frontend displays results with risk-level color coding

**Output Structure**:
- Product name identification
- Complete ingredient list
- Toxicology risks (ingredient-level analysis)
- General allergen detection
- User-specific allergen warnings
- Safer ingredient alternatives
- Confidence rating (low/medium/high)
- Summary with critical warnings

### 2. Personalized Allergen Detection

**Implementation**:
- Users set allergens in profile (common + custom)
- Allergens stored in MongoDB user document
- Passed to Gemini in system prompt
- AI specifically checks for user allergens
- Frontend displays critical warnings if detected
- Red alert UI for user-specific allergen matches

**Common Allergens** ([`profile.jsx:7-10`](Nutrilens/frontend/src/pages/profile.jsx:7-10)):
- Peanuts, Tree Nuts, Milk, Eggs
- Fish, Shellfish, Soy, Wheat
- Gluten, Sesame, Sulfites, Mustard

### 3. Amazon Product Recommendations

**Service**: [`amazon_search.py`](Nutrilens/backend/src/services/amazon_search.py)

**Features**:
- Real-time Amazon search via SearchApi.io
- Automatic allergen filtering
- Product metadata (price, rating, Prime)
- Direct purchase links
- Personalized recommendation reasons

**Filtering Logic**:
1. Add negative keywords for allergens in search query
2. Fetch 2x desired results
3. Filter by checking title/description for allergen keywords
4. Return top N allergen-free products

### 4. Purchase History Tracking

**Purpose**: Build user consumption profile for better recommendations

**Features**:
- Store complete analysis data with purchase
- View history in profile page
- Delete purchases
- Future: Use for collaborative filtering

**Data Stored**:
- Product name and analysis results
- Timestamp
- Image URL (optional)
- Extracted allergens and ingredients

---

## 🎯 User Experience Flow

### First-Time User Journey

1. **Landing** → Home page with camera interface
2. **Sign Up** → Create account with optional allergens
3. **Capture** → Take photo of product label
4. **Analyze** → AI processes and returns report
5. **Review** → See toxicology risks and allergen warnings
6. **Action** → Mark as purchased or get alternatives
7. **Profile** → Manage allergens and view history

### Returning User Journey

1. **Sign In** → Authenticate
2. **Quick Analysis** → Capture and analyze labels
3. **Personalized Warnings** → See allergen-specific alerts
4. **History Review** → Check past purchases
5. **Recommendations** → Get safer alternatives based on profile

---

## 🔍 Code Quality & Patterns

### Backend Patterns

**Router Organization**:
- Modular routers for different domains (auth, label, recommendations)
- Consistent error handling with HTTPException
- Async/await for I/O operations
- Pydantic models for request validation

**Database Access**:
- Direct MongoDB operations (no ORM)
- Connection pooling via MongoClient
- Certifi for SSL certificate verification
- Startup connection test

**API Design**:
- RESTful endpoints
- Consistent response formats
- Query parameters for optional filters
- Multipart form data for file uploads

### Frontend Patterns

**Component Structure**:
- Functional components with hooks
- useState for local state management
- useEffect for side effects (data fetching)
- useNavigate for programmatic routing

**State Management**:
- localStorage for authentication state
- Component-level state (no global state management)
- Props for component communication

**API Communication**:
- Fetch API for HTTP requests
- Async/await pattern
- Error handling with try/catch
- Loading states for UX feedback

---

## 📈 Future Enhancements (from README)

### High Priority
- [ ] JWT-based authentication with refresh tokens
- [ ] Enhanced recommendation algorithm using ML
- [ ] Product barcode/UPC lookup and caching
- [ ] Unit and integration tests
- [ ] CI/CD pipeline

### Medium Priority
- [ ] Nutrition facts extraction and visualization
- [ ] Dietary preference filtering (vegan, keto, etc.)
- [ ] Multi-language support
- [ ] Export reports as PDF
- [ ] Social sharing features

### Low Priority
- [ ] Mobile app (React Native)
- [ ] Background job processing (Celery + Redis)
- [ ] Collaborative filtering for recommendations
- [ ] Price comparison for recommended products

---

## 🐛 Known Issues & Limitations

### Current Limitations

1. **Authentication**: Simple username-based, no JWT or sessions
2. **CORS**: Allows all origins (development mode)
3. **Rate Limiting**: No API rate limiting implemented
4. **Caching**: No caching for repeated analyses
5. **Image Storage**: Images not persisted (only data URLs)
6. **Error Recovery**: Limited retry logic for API failures
7. **Offline Support**: No offline functionality

### Technical Debt

1. **requirements.txt**: Contains binary characters (encoding issue)
2. **No Tests**: No unit or integration tests
3. **No Logging**: Limited structured logging
4. **No Monitoring**: No application monitoring or metrics
5. **Hard-coded URLs**: API base URL hard-coded in frontend

---

## 🔧 Troubleshooting Guide

### Common Issues

**MongoDB Connection Timeout**:
- Check IP whitelist in MongoDB Atlas
- Verify connection string format
- Ensure MongoDB service is running (local)

**Gemini API Errors**:
- Verify API key in `.env`
- Check model access (gemini-2.5-flash)
- Monitor rate limits

**CORS Errors**:
- Backend allows all origins by default
- Check if backend is running on port 8000
- Verify frontend uses correct API URL

**Camera Not Working**:
- Check browser permissions
- HTTPS required for camera access (or localhost)
- Verify react-webcam installation

---

## 📚 Key Files Reference

### Backend Core Files
- [`app.py`](Nutrilens/backend/src/app.py) - FastAPI app initialization, CORS, router inclusion
- [`database.py`](Nutrilens/backend/src/database.py) - MongoDB connection, collections setup
- [`auth.py`](Nutrilens/backend/src/routers/auth.py) - User authentication, profile management
- [`label.py`](Nutrilens/backend/src/routers/label.py) - Gemini AI integration, label analysis
- [`recommendations.py`](Nutrilens/backend/src/routers/recommendations.py) - Purchase history, Amazon search
- [`amazon_search.py`](Nutrilens/backend/src/services/amazon_search.py) - SearchApi.io integration

### Frontend Core Files
- [`App.jsx`](Nutrilens/frontend/src/App.jsx) - Main app component, routing
- [`home.jsx`](Nutrilens/frontend/src/pages/home.jsx) - Analysis interface, main user flow
- [`profile.jsx`](Nutrilens/frontend/src/pages/profile.jsx) - User profile, allergen management
- [`CameraCapture.jsx`](Nutrilens/frontend/src/components/CameraCapture.jsx) - Webcam integration

### Configuration Files
- [`requirements.txt`](Nutrilens/requirements.txt) - Python dependencies
- [`frontend/package.json`](Nutrilens/frontend/package.json) - Node.js dependencies
- [`vite.config.js`](Nutrilens/frontend/vite.config.js) - Vite build configuration

---

## 🎓 Learning Resources

### Technologies Used
- **FastAPI**: https://fastapi.tiangolo.com/
- **React**: https://react.dev/
- **MongoDB**: https://www.mongodb.com/docs/
- **Google Gemini**: https://ai.google.dev/docs
- **Vite**: https://vite.dev/

### API Documentation
- **SearchApi.io**: https://www.searchapi.io/docs/amazon
- **React Webcam**: https://www.npmjs.com/package/react-webcam

---

## 📝 Summary

Nutrilens is a well-structured full-stack application that effectively combines:
- Modern web technologies (FastAPI, React, Vite)
- AI/ML capabilities (Google Gemini Vision)
- Real-world integrations (MongoDB, Amazon search)
- User-centric features (allergen detection, purchase history)

**Strengths**:
✅ Clear separation of concerns (routers, services, components)
✅ Comprehensive documentation in README
✅ Modern tech stack with async support
✅ Personalized user experience with allergen profiles
✅ Real product recommendations via Amazon

**Areas for Improvement**:
⚠️ Authentication security (implement JWT)
⚠️ Test coverage (add unit and integration tests)
⚠️ Error handling and logging
⚠️ Production-ready security measures
⚠️ Performance optimization (caching, rate limiting)

The project demonstrates solid software engineering practices and is well-positioned for future enhancements and production deployment with the recommended security improvements.