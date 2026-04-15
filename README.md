# Syncora – Calendly Clone (Scheduling Platform)

## 🚀 Overview

Syncora is a full-stack scheduling platform inspired by Calendly.
It allows users to create event types, manage availability, and share booking links for others to schedule meetings.

---

## 🛠 Tech Stack

### Frontend

* React.js (Vite)
* CSS (Custom UI inspired by Calendly)

### Backend

* Node.js
* Express.js

### Database

* MySQL (Railway)

### Deployment

* Frontend: Vercel
* Backend: Render

---

## ✨ Features

### Core Features

* Create, edit, delete event types
* Unique public booking links
* Weekly availability setup
* Time slot selection with calendar UI
* Booking form (name, email, custom questions)
* Prevent double booking
* Booking confirmation page
* Meetings dashboard (upcoming & past)
* Cancel meetings

---

### Bonus Features

* Multiple schedules
* Date-specific overrides
* Rescheduling meetings
* Email notifications (Nodemailer)
* Buffer time before/after meetings
* Custom invitee questions
* Responsive UI (mobile + desktop)

---

## 📁 Project Structure

```
Syncora/
│
├── client/        # Frontend (React + Vite)
├── server/        # Backend (Node + Express)
├── README.md
```

---

## ⚙️ Environment Variables

### Backend (.env)

```
PORT=4000

CLIENT_ORIGIN=https://your-frontend.vercel.app
APP_BASE_URL=https://your-frontend.vercel.app

DB_HOST=your-db-host
DB_PORT=your-db-port
DB_NAME=railway
DB_USER=root
DB_PASSWORD=your-password

DEFAULT_TIMEZONE=Asia/Kolkata

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=Scheduler Clone <your-email@gmail.com>
```

---

### Frontend (.env)

```
VITE_API_BASE_URL=https://your-backend.onrender.com/api
```

---

## 🗄 Database Setup

1. Connect to MySQL (Railway)
2. Run:

   * `schema.sql`
   * `seed.sql`

---

## ▶️ Running Locally

### Backend

```
cd server
npm install
npm run dev
```

---

### Frontend

```
cd client
npm install
npm run dev
```

---

## 🌐 Deployment

### Backend (Render)

* Root: `server`
* Build: `npm install`
* Start: `node src/index.js`

### Frontend (Vercel)

* Root: `client`
* Add env: `VITE_API_BASE_URL`

---

## 🧪 Testing Features

* Book a meeting → confirmation page
* Email received
* Try double booking → blocked
* Cancel meeting → works
* Reschedule meeting → works

---

## 🧠 Key Highlights

* Double booking prevention logic
* Clean modular backend structure
* Real-world deployment setup
* Calendly-like UI/UX design
* Full booking lifecycle (create → manage → cancel → reschedule)

---

## 📌 Notes

* No authentication (single default user)
* Designed for evaluation and demonstration
* Uses real email notifications via SMTP

---
