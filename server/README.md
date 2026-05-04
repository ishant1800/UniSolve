# UniSolve Backend

This directory contains the Express.js backend for UniSolve, the AI-powered campus helpdesk system.

## Setup

1. Copy `.env.example` to `.env`.
2. Install dependencies:
   ```bash
   cd server
   npm install
   ```
3. Start the backend locally:
   ```bash
   npm run dev
   ```

## API structure

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/tickets`
- `POST /api/tickets`
- `GET /api/tickets/:id`
- `PUT /api/tickets/:id`
- `DELETE /api/tickets/:id`
- `POST /api/ai/create-ticket`

## Notes

- Authentication uses JWT.
- User passwords are hashed with bcrypt.
- SLA deadlines are calculated by priority.
- A cron job checks overdue tickets every 5 minutes and marks them as `Escalated`.
- Socket.io is configured for real-time events.
