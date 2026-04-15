# 🚀 Syncora — Calendly Clone Scheduling Platform

A full-stack scheduling and booking application.

Syncora allows users to create event types, define availability, and share public booking links where invitees can schedule meetings seamlessly.

---

## 🌐 Live Demo

* 🔗 Frontend: *(Add your deployed link here)*
* 🔗 Backend API: *(Add your deployed link here)*

---

## 🛠️ Tech Stack

### Frontend

* React.js (Vite)
* React Router
* CSS (Custom Styling)

### Backend

* Node.js
* Express.js
* MySQL (mysql2)

### Other Tools

* Nodemailer (Email notifications)
* Day.js (Date & Time handling)
* dotenv (Environment variables)

---

## ✨ Features

### ✅ Core Features

#### 1. Event Types Management

* Create, edit, delete event types
* Unique public booking links (slug-based)
* Custom duration, buffer time, location
* Custom invitee questions

#### 2. Availability Scheduling

* Weekly availability (Mon–Sun)
* Time slots (e.g., 9 AM – 5 PM)
* Timezone support
* Date-specific overrides (holidays/custom timings)

#### 3. Public Booking Flow

* Month calendar view
* Dynamic available slots
* Booking form (name, email, custom questions)
* Prevents double booking
* Booking confirmation page

#### 4. Meetings Management

* View upcoming meetings
* View past meetings
* Cancel meetings
* Reschedule via token-based link

---

### ⭐ Bonus Features

* Multiple availability schedules
* Buffer time before/after meetings
* Rescheduling flow
* Email notifications (Nodemailer)
* Responsive UI (mobile + desktop)
* Clean Calendly-inspired UI/UX

---

## ⚙️ Setup Instructions

### 1. Clone Repository

```bash
git clone https://github.com/SriHarshaRajuY/syncora.git
cd syncora
```

---

### 2. Backend Setup

```bash
cd server
npm install
```

#### Create `.env` file:

```env
PORT=4000
CLIENT_ORIGIN=http://localhost:5173

DB_HOST=localhost
DB_PORT=3306
DB_NAME=scaler_scheduler
DB_USER=root
DB_PASSWORD=your_password

DEFAULT_TIMEZONE=Asia/Kolkata
APP_BASE_URL=http://localhost:5173

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=Syncora Scheduler <your_email@gmail.com>
```

---

### ⚠️ Gmail Setup (Important)

To enable email notifications:

1. Enable **2-Step Verification**
2. Generate **App Password**
3. Use that password in `SMTP_PASS`

---

### 3. Database Setup

Run:

```bash
node src/db/seed.js
```

This will:

* Create tables
* Insert sample data

---

### 4. Start Backend

```bash
npm run dev
```

Server runs at:

```
http://localhost:4000
```

---

### 5. Frontend Setup

```bash
cd ../client
npm install
```

#### Create `.env` file:

```env
VITE_API_BASE_URL=http://localhost:4000/api
```

---

### 6. Start Frontend

```bash
npm run dev
```

App runs at:

```
http://localhost:5173
```

---

## 🔗 API Endpoints

### Event Types

* `GET /api/event-types`
* `POST /api/event-types`
* `PUT /api/event-types/:id`
* `DELETE /api/event-types/:id`

### Availability

* `GET /api/availability/schedules`
* `POST /api/availability/schedules`

### Meetings

* `GET /api/meetings`
* `POST /api/meetings/public/event-types/:slug/book`
* `POST /api/meetings/:id/cancel`

---

## 🧠 Key Concepts Implemented

* 🔄 Transaction handling (MySQL)
* 🔐 Row locking (`FOR UPDATE`) to prevent double booking
* ⏱️ Timezone-aware scheduling
* 📅 Slot generation algorithm
* 📩 Email integration using Nodemailer
* 🧩 Modular architecture (MVC + Services)

---

## 🚫 Assumptions

* Single default user (no authentication)
* Email notifications depend on SMTP configuration
* Public booking pages are accessible without login

---

## 📈 Future Improvements

* Authentication (JWT / OAuth)
* Google Calendar integration
* Stripe payments
* Team scheduling (multi-user)
* Webhooks

---

## ⭐ Final Note

This project demonstrates full-stack development skills including:

* System design
* Backend architecture
* UI/UX implementation
* Real-world problem solving (scheduling + concurrency)

---
