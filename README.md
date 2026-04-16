# Syncora – Calendly Clone (Scheduling Platform)

## Overview
Syncora is a full-stack scheduling web application inspired by Calendly. It lets teams create **event types**, configure **availability schedules**, and provide a **public booking flow** for invitees to select time slots and confirm meetings.

This project is built for evaluation/demonstration purposes: the admin workspace assumes a **single default user** (no login required).

## Key Features
### Core
- **Event types management**: create, edit, delete event types (name, duration, slug, description, location, buffers, color, active/inactive).
- **Unique public booking links** for each active event type.
- **Availability setup**:
  - weekly working hours per schedule (days of week + start/end times)
  - timezone support
  - date-specific overrides (available/unavailable windows with optional reason)
- **Public booking flow**:
  - month calendar date selection
  - slot selection for the chosen date
  - booking form (invitee name + email + custom invitee questions)
  - **prevents double booking** of overlapping scheduled meetings
- **Booking confirmation page** with meeting details and manage actions.
- **Meetings dashboard**:
  - upcoming and past views
  - cancel meetings
  - reschedule flow

### Bonus (Included)
- Multiple schedules per user and per event-type mapping.
- Buffer time before/after meetings.
- Rescheduling a booking using a token-based flow.
- Email notifications using **Nodemailer**:
  - booking confirmation email
  - cancellation email
  - both include invitee answers (custom questions) and meeting details.

## System Architecture
### High-level flow
Client (React) → API (Express) → Services (business logic) → MySQL (schema/data)

### Tech Stack
**Frontend**
- React (Vite)
- React Router
- Custom CSS styled to follow Calendly-like UI patterns

**Backend**
- Node.js + Express.js (REST API)
- MySQL (via `mysql2`)
- Nodemailer for email delivery

## Database Design
Schema is SQL-first (no ORM):
- `users`
- `availability_schedules`
- `availability_rules`
- `availability_overrides`
- `availability_settings`
- `event_types`
- `meetings`

Key relationships:
- `availability_rules` references `availability_schedules`
- `availability_overrides` references `availability_schedules`
- `event_types` references `availability_schedules`
- `meetings` references `event_types`

Example constraints:
- unique `event_types.slug`
- unique `(schedule_id, override_date)` for overrides

## API Documentation (REST)
Base path: `/api`

### Event Types
- `GET    /api/event-types`
- `POST   /api/event-types`
- `PUT    /api/event-types/:id`
- `DELETE /api/event-types/:id`

### Availability
- `GET    /api/availability/schedules`
- `POST   /api/availability/schedules`
- `PUT    /api/availability/schedules/:id`
- `DELETE /api/availability/schedules/:id`
- `GET    /api/availability/settings`
- `PUT    /api/availability/settings`
- `GET    /api/availability/public/:slug/month?month=YYYY-MM`
- `GET    /api/availability/public/:slug/slots?date=YYYY-MM-DD`

### Meetings + Booking / Reschedule / Cancel
Admin scopes:
- `GET  /api/meetings?scope=upcoming|past`
- `POST /api/meetings/:id/cancel`

Public booking:
- `GET  /api/meetings/public/event-types`
- `GET  /api/meetings/public/event-types/:slug`
- `POST /api/meetings/public/event-types/:slug/book`
- `GET  /api/meetings/public/booking/:id`

Token-based reschedule/cancel:
- `GET  /api/meetings/public/reschedule/:token`
- `POST /api/meetings/public/reschedule/:token`
- `POST /api/meetings/public/reschedule/:token/cancel`

## Email Notifications
Email delivery uses Nodemailer (SMTP).

### Booking confirmation email
Sent after booking is created.
Includes:
- event name
- start/end time + timezone
- location
- **all invitee answers** (custom questions)
- manage-booking link

### Cancellation email
Sent after a booking is cancelled (host cancel or invitee token cancel).
Includes:
- event name
- original meeting start/end + timezone
- location
- cancellation reason (when provided)
- **all invitee answers**

## Project Structure
```
Syncora/
  client/   # React frontend (Vite)
  server/   # Express backend
  README.md
```

Important implementation files:
- `client/src/pages/*` (public + admin views)
- `client/src/styles/index.css` (Calendly-like styling)
- `server/sql/schema.sql` and `server/sql/seed.sql` (database setup)

## Installation
### Prerequisites
- Node.js 18+
- MySQL database instance
- SMTP credentials (if you want real emails; otherwise emails are skipped when SMTP is not configured)

### Setup (Database)
From the project root:
1. Configure MySQL credentials in the server environment.
2. The app can load schema + seed via:
   - `npm run seed` (workspace: `server`)

### Setup (Server)
```bash
cd server
npm install
cp .env.example .env   # if you have one
npm run dev
```

### Setup (Client)
```bash
cd client
npm install
npm run dev
```

## Environment Variables
### Server (`server/.env`)
```bash
PORT=4000

CLIENT_ORIGIN=http://localhost:5173
APP_BASE_URL=http://localhost:5173

DB_HOST=localhost
DB_PORT=3306
DB_NAME=railway
DB_USER=root
DB_PASSWORD=your-db-password

DEFAULT_TIMEZONE=Asia/Kolkata

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="Scheduler Clone <your-email@gmail.com>"
```

### Client (`client/.env`)
```bash
VITE_API_BASE_URL=http://localhost:4000/api
```

## UI/UX Notes
- The booking UI follows a Calendly-style experience:
  - three-step booking flow on the public booking page
  - consistent card spacing, typography, and button styling
- The admin workspace (Scheduling, Availability, Meetings) uses the same design language.
- The layout is responsive for mobile/tablet/desktop.

## Deployment
Suggested deployment:
- **Frontend**: Vercel (builds from `client/`)
- **Backend**: Render (runs from `server/`)

Deployment basics:
- Set `VITE_API_BASE_URL` on the frontend environment
- Set all server `.env` variables on Render (DB + SMTP + base URLs)

## Testing Features (Manual)
- Create an event type → copy its public booking link
- Book a meeting → verify confirmation page + email
- Try double booking → verify slot is blocked
- Cancel meeting → verify cancellation email + status update
- Reschedule meeting → verify token flow works end-to-end

---
This project is original work for an educational full-stack assignment and is designed for evaluation and demonstration.

