# Cliq — AI Shopping Agent

> **TartanHacks 2026** | Tracks: Capital One (Best Financial Hack), Conway (Best AI for Decision Support), Polychrome Mosaic (Cross-field Innovation)

Cliq is an AI-powered shopping assistant that lets you describe what you want in **natural language** instead of keyword search. It interprets your intent, recommends curated products with clear value labels, and offers a simulated **one-click purchase** flow.

## Features

- **Natural Language Search** — Describe what you need (e.g., "I need a warm jacket for Pittsburgh winter") and the AI interprets your intent
- **Smart Recommendations** — Products tagged with "Best value", "Best overall", "Fastest shipping", etc.
- **Follow-up Questions** — The agent asks clarifying questions when your request is ambiguous
- **One-Click Buy Simulation** — Save a payment method and simulate instant purchases with autofill transparency
- **Purchase History & Spending Overview** — Track simulated purchases with category breakdowns
- **Watchlist** — Save products to watch for later
- **External Link Safeguards** — Clear warnings when navigating to external shopping sites
- **Coupon Stub** — Placeholder for future coupon/deal aggregation (Honey/Capital One Shopping-like)

## Tech Stack

| Layer     | Technology                              |
| --------- | --------------------------------------- |
| Frontend  | React, TypeScript, Vite, Tailwind CSS v4, Framer Motion |
| Backend   | Python, FastAPI, Pydantic               |
| AI        | Google Gemini API (gemini-2.0-flash)    |
| Icons     | Lucide React                            |

## Quick Start

### Prerequisites

- **Node.js** >= 18
- **Python** >= 3.10
- (Optional) A [Gemini API key](https://aistudio.google.com/apikey) for real AI responses

### 1. Backend

```bash
cd backend

# Create a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# (Optional) Set up Gemini API key
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY

# Start the server
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`. Without a Gemini API key, the app uses mock data and keyword matching as a fallback.

### 2. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

The app will be available at `http://localhost:5173`. The Vite dev server proxies `/api` requests to the FastAPI backend.

## Where to Plug In

### Gemini API Key
1. Get a key from [Google AI Studio](https://aistudio.google.com/apikey)
2. Add it to `backend/.env` as `GEMINI_API_KEY=your_key_here`
3. The AI service in `backend/ai_service.py` will automatically use it

### Real Shopping API Integration
- Replace `backend/mock_data.py` with real product data sources
- The `get_mock_products()` function in `ai_service.py` → `generate_mock_response()` is the swap point
- Each product has `source_name` and `source_url` fields ready for real retailer links

### Browser Automation / Headless Shopping
- The one-click buy flow in `OneClickBuyModal.tsx` is designed as a stub
- Replace the `purchaseProduct()` API call with real checkout automation
- The autofill preview step shows exactly what fields would be filled

### Capital One Nessie API
- Endpoint: `api.nessieisreal.com`
- Can be integrated to provide mock banking/transaction data
- Wire into the spending overview and purchase history features

## Architecture

```
tartanhacks2/
├── backend/
│   ├── main.py              # FastAPI app + all endpoints
│   ├── models.py            # Pydantic data models
│   ├── ai_service.py        # Gemini AI integration + fallback
│   ├── mock_data.py         # Mock product database
│   ├── requirements.txt     # Python dependencies
│   └── .env.example         # Environment variable template
├── frontend/
│   ├── src/
│   │   ├── App.tsx           # Main layout (chat + products split)
│   │   ├── types.ts          # TypeScript interfaces
│   │   ├── api.ts            # Backend API client
│   │   ├── context/
│   │   │   └── UserProfileContext.tsx  # User preferences + state
│   │   └── components/
│   │       ├── Header.tsx
│   │       ├── ChatPanel.tsx
│   │       ├── MessageList.tsx
│   │       ├── MessageInput.tsx
│   │       ├── FollowUpChips.tsx
│   │       ├── ProductList.tsx
│   │       ├── ProductCard.tsx
│   │       ├── OneClickBuyModal.tsx
│   │       ├── SaveCardModal.tsx
│   │       ├── ExternalLinkModal.tsx
│   │       ├── PurchaseHistory.tsx
│   │       └── SpendingOverview.tsx
│   └── ...
└── README.md
```

## API Endpoints

| Method | Endpoint                    | Description                          |
| ------ | --------------------------- | ------------------------------------ |
| POST   | `/api/search`               | Natural language product search      |
| POST   | `/api/purchase`             | Record a simulated purchase          |
| GET    | `/api/purchases`            | Get purchase history                 |
| GET    | `/api/profile`              | Get user preferences                 |
| POST   | `/api/profile`              | Update user preferences              |
| GET    | `/api/watchlist`            | Get watchlist                        |
| POST   | `/api/watchlist`            | Add to watchlist                     |
| DELETE | `/api/watchlist/{id}`       | Remove from watchlist                |
| GET    | `/api/coupons/{product_id}` | Get available coupons (stub)         |
| GET    | `/api/spending`             | Get spending overview                |

## Team

Built at TartanHacks 2026, Carnegie Mellon University.
