# Syncora Scheduling Platform

A full-stack Calendly-inspired scheduling platform built with React, Node.js, Express, and MySQL for the Scaler AI Labs SDE Intern fullstack assignment.

## What is implemented

- Event type CRUD with unique public booking links
- Weekly availability schedules with timezone support
- Multiple schedules and per-event schedule assignment
- Date-specific override hours
- Public month calendar booking flow
- Available slot generation with buffer time support
- Double-booking prevention with transactional overlap checks
- Invitee booking form with custom questions
- Booking confirmation page
- Upcoming and past meetings dashboard
- Meeting cancellation flow
- Meeting rescheduling flow with reusable public reschedule link
- Booking and cancellation email hooks via SMTP
- Responsive admin and booking UI
- MySQL schema plus sample seed data
- Deployment-ready setup for a single backend-hosted app

## Tech stack

- Frontend: React + Vite + React Router
- Backend: Node.js + Express
- Database: MySQL
- Utilities: `dayjs`, `mysql2`, `nodemailer`

## Project structure

```text
client/   React frontend
server/   Express API + MySQL integration
server/sql/schema.sql
server/sql/seed.sql
```

## Step-by-step local setup

1. Install MySQL 8+ and create a database user with permission to create databases.
2. Copy `server/.env.example` to `server/.env`.
3. Copy `client/.env.example` to `client/.env`.
4. Update the MySQL values in `server/.env`.
5. From the project root, install dependencies:

```bash
npm install --workspaces
```

6. Seed the database:

```bash
npm run seed
```

7. Start the backend and frontend together:

```bash
npm run dev
```

8. Open:

- Admin dashboard: `http://localhost:5173/events`
- Public booking sample: `http://localhost:5173/book/intro-call`

## Useful scripts

```bash
npm run dev
npm run build
npm run start
npm run seed
```

## Environment variables

### Server

```bash
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
DB_HOST=localhost
DB_PORT=3306
DB_NAME=scaler_scheduler
DB_USER=root
DB_PASSWORD=your_mysql_password
DEFAULT_TIMEZONE=Asia/Kolkata
APP_BASE_URL=http://localhost:5173
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=Scheduler Clone <no-reply@example.com>
```

### Client

```bash
VITE_API_BASE_URL=http://localhost:4000/api
```

## Deployment recommendation

The cleanest submission path is:

1. Push this repository to GitHub.
2. Create a MySQL database on Railway, PlanetScale, Aiven, or Render.
3. Deploy the full app as one service on Render or Railway:
   - Build command: `npm install --workspaces && npm run build`
   - Start command: `npm run start`
4. Add the `server/.env` values in the deployment dashboard.
5. Run `npm run seed` once against the deployed database, or import `server/sql/schema.sql` and `server/sql/seed.sql`.

Because the Express server serves `client/dist` when it exists, you can deploy the UI and API together as one app.

## Submission checklist

1. Record a few screenshots or a short demo video before submitting.
2. Make sure seed data is present on the deployed URL.
3. Test these flows manually:
   - Create, edit, and delete event types
   - Create and edit schedules
   - Book an event
   - Reschedule a booking
   - Cancel a meeting
   - Check responsive layout on mobile width
4. Push to a public GitHub repository.
5. Submit both the GitHub link and deployed link.

## Interview prep points

- Explain how schedules, rules, overrides, event types, and meetings relate in the schema.
- Explain how slot generation works for a given date.
- Explain how buffers affect availability.
- Explain the transactional overlap check that prevents double booking.
- Explain why the reschedule flow uses a reusable token.

## Assumptions

- A single default admin user is assumed to be logged in.
- All admin flows operate on user id `1`.
- Email sending is optional in local development and becomes active only when SMTP credentials are provided.
