# 🎓 AI Student Budget Tracker with SMS & Category Sensor

A smart, student-focused financial management website featuring real-time AI SMS transaction sensing, automated merchant and category classification, immediate AI transaction feedback, live account balance tracking, visual analytics, and an intelligent student savings coach.

---

## 🌟 Key Features

### 1. 🧠 AI SMS & Category Sensor
- **Real-Time SMS Detection**: Senses bank, card, and UPI SMS alerts as you type or paste them.
- **Accurate Field Extraction**:
  - **Transaction Type**: Accurately detects Debits (Expenses) vs Credits (Allowances, Stipends, Inflows).
  - **Amount & Currency**: Parses ₹, INR, Rs., and $.
  - **Merchant / Payee**: Cleans and identifies merchants like Swiggy, Zomato, Campus Bookstore, Canteen, DMRC Metro, Netflix, Zepto, and direct UPI handles.
  - **AI Category Classification**: Evaluates multi-factor keywords and merchant profiles to categorize transactions with a confidence score (e.g. 98%) and reasoning.
  - **Account Balance Auto-Sync**: Senses "Avl Bal" in SMS notifications and updates your active balance automatically.
- **Interactive Preset Simulator**: Includes 10 pre-loaded realistic student transaction SMS alerts (Swiggy food, college bookstore, dad allowance, canteen lunch, metro recharge, PG rent, Netflix student plan, Zepto groceries, pharmacy medicine, stipend).
- **Live Category Sandbox**: Type any merchant or item name (e.g., *"Starbucks"*, *"Coursera"*, *"Hostel Rent"*) to watch the AI Category Sensor classify it live.

### 2. 🤖 Instant AI Transaction Responder
- Whenever a transaction is detected or added, the AI evaluates its budget impact and generates a context-aware student response:
  - **Food Delivery Velocity Alerts**: Warns when delivery orders are consuming too much of the weekly dining budget and suggests campus mess meals to save ~₹300.
  - **Parent Allowance Credits**: Suggests auto-allocating 20% to an emergency/savings goal right away.
  - **Overbudget Alerts**: Color-coded notifications whenever a category exceeds 75% or 100% of its allocation.

### 3. 📊 Interactive Dashboard
- **Current Account Balance**: Real-time balance card with visual highlights.
- **Monthly Allowance vs Total Spent**: Instant cash flow overview.
- **Safe Daily Spending Limit**: Computes `(Remaining Allowance) / (Days Remaining in Month)` so students always know how much they can safely spend per day.
- **Category Donut Chart**: Responsive, interactive SVG chart showing exact spend distribution and percentages.
- **7-Day Spending Velocity**: Bar chart comparing daily spends with the safe limit threshold.
- **Category Budgets**: Progress bars for Food, Academics, Housing, Travel, Entertainment, Shopping, Health, and Utilities.

### 4. 💡 AI Savings Coach & 50/30/20 Rule
- **Student 50/30/20 Rule**: Breaks down spending into Needs (50%), Wants (30%), and Savings (20%).
- **Personalized Savings Tactics**: Actionable tips for student discounts (Spotify, Prime, Apple Music), textbook exchanges, and transit passes.
- **Savings Goals Tracker**: Track progress toward targets like a *Laptop Upgrade*, *Semester Trip*, or *Emergency Fund*.

### 5. ✨ Gemini 2.5 AI Budget & Savings Coach
- **Conversational Chat Assistant**: Embedded directly into your dashboard.
- **Dedicated Savings Suggestions Generator**: 1-click "💡 Get Saving Suggestions" analyzes active spends and computes potential savings on food deliveries, streaming discounts, textbooks, and transit passes.
- **Budget Q&A**:
  - *"Can I afford a ₹1,500 weekend outing?"*
  - *"How much did I spend on food and dining this month?"*
  - *"What is my 50/30/20 budget breakdown?"*
  - *"What is my daily safe spending limit?"*
  - *"How can I reach my savings goals faster?"*
- **Dual AI Engine**:
  - **Built-in Smart Engine**: High-speed, 100% offline, privacy-first, zero setup required.
  - **Live Google Gemini 2.5 Flash Integration**: Enter your Gemini API key in settings or chat badge to power live multi-turn reasoning with Google's Gemini 2.5 Flash (`gemini-2.5-flash`).

### 6. 📱 FinArt & SMS Gateway API Integration
- **Real-Time Webhook Gateway**: Built directly into `server.js` with zero external dependencies.
- **REST Endpoints**:
  - `POST /api/sms/webhook`: Accepts raw SMS strings or structured FinArt transaction JSON.
  - `GET /api/sms/poll`: Frontend polling endpoint to fetch unread transaction alerts.
  - `GET /api/sms/gateway-info`: Returns LAN IP, port, and gateway status.
  - `GET /api/sms/history`: Recent 50 incoming SMS gateway logs.
  - `POST /api/sms/test`: Simulates receiving an authentic bank SMS.
- **Phone & Wi-Fi Sync**: Detects your computer's local Wi-Fi IP so Android forwarder apps push bank alerts directly to the website over Wi-Fi.

### 7. 🔔 Android Notification Listener & FinArt Intelligence API
- **Direct UPI & App Notification Interception**: Intercepts payment alerts from **Google Pay**, **PhonePe**, **Paytm**, **CRED**, **BHIM UPI**, and mobile banking apps (HDFC, SBI, ICICI, etc.) that don't send SMS.
- **FinArt AI Category Sensing**: Every intercepted push notification is routed directly through the **FinArt AI Sensor** (`SmsSensorEngine`), which accurately classifies transactions into student categories (Food & Dining, Academics, Travel, Entertainment, Shopping, Income, etc.) with confidence scores and reasoning.
- **Instant Interactive Test Simulator**:
  - 1-click test cards for **Google Pay Canteen** (Food), **PhonePe PVR Cinema** (Entertainment), **Paytm University Books** (Academics), **CRED Allowance** (Income), **Chai Point** (Food), and **BHIM Uber Ride** (Travel).
  - Immediate client-side execution with floating alert toast and live activity log update, plus server queue sync.
  - Custom push notification test box to test any payment text on the fly.
- **Server REST Endpoints**:
  - `POST /api/notifications/webhook`: Receives incoming notification JSON payloads `{ packageName, appName, title, text, subText, postTime }`.
  - `GET /api/notifications/poll`: Real-time polling for web clients.
  - `GET /api/notifications/gateway-info`: Returns LAN IP, webhook endpoints, and Tasker/MacroDroid templates.
  - `GET /api/notifications/history`: Fetches recent captured notification logs.
  - `POST /api/notifications/test`: 1-click simulated payment push alerts (GPay, PhonePe, Paytm, CRED).
  - `POST /api/notifications/clear`: Clears notification queue.
- **MacroDroid & Tasker Integration**: Complete step-by-step setup guide with copyable JSON template in the dashboard modal.
- **Floating Alert Toasts**: Real-time popups with 1-click `⚡ Confirm & Log` or `Auto-Confirm` mode.

### 8. 🔥 Google Cloud Firestore Database Integration
- **Real-Time Cloud Synchronization**: Automatically mirrors student transactions, category budgets, savings goals, and reminders to Google Cloud Firestore.
- **Bi-Directional Multi-Device Sync**: Any change made on your laptop, phone, or another browser tab synchronizes instantly via Firestore `onSnapshot` real-time listeners.
- **Offline-First Resilience**: Powered by Firestore's IndexedDB offline persistence and seamless automatic fallback to browser `localStorage` when offline or unconfigured.
- **Dedicated Cloud Firestore Hub**:
  - **1-Click Auto-Fill**: Paste your `const firebaseConfig = { ... }` code snippet directly from the Firebase Console to auto-populate all configuration fields.
  - **Connection Ping Tester**: Measures live roundtrip latency to your Firestore database.
  - **Push & Pull Migration Tools**: 1-click batch upload of local transactions to Cloud Firestore, or download cloud backups to any new device.
  - **Custom Student Namespace**: Partition ledgers with customizable `Profile / User ID` tags (`student_default`, `mohit`, etc.).
  - **Security Rules Helper**: Copy-pasteable test mode and authenticated production rules directly within the dashboard.

---

## 🚀 How to Run

### Option 1: Quick Launch (Windows)
Double-click `start.bat` in this folder. It will start the local server and open `http://localhost:3000` in your default browser.

### Option 2: Command Line (with agy-node or node)
```powershell
agy-node server.js
```
Then visit **[http://localhost:3000](http://localhost:3000)**.

### Option 3: Direct Browser Open
You can also open `index.html` directly in any modern web browser without running a server.

---

## 📁 Project Structure

```
project/
├── index.html            # Main Single-Page Application
├── css/
│   └── styles.css        # Responsive styling, dark/light themes, animations, notification hub
├── js/
│   ├── firestore-db.js   # Cloud Firestore Database Engine & real-time sync service
│   ├── sms-detector.js   # AI SMS & Category Sensor Engine (keywords, regex, heuristics)
│   ├── finart-api.js     # FinArt & SMS Gateway Client Engine
│   ├── notification-listener.js # Android Notification Listener API Client Engine
│   ├── screenshot-analyzer.js # OCR & Image Payment Receipt Analyzer
│   ├── charts.js         # Zero-dependency SVG/Canvas Donut & Bar charts
│   ├── ai-advisor.js     # AI Transaction Responder, Savings Coach, & Gemini 2.5 Flash Chat
│   └── app.js            # State management, local storage, UI controller
├── server.js             # Zero-dependency HTTP server + FinArt SMS & Notification REST API
├── start.bat             # 1-click Windows launcher
└── README.md             # Project documentation
```
