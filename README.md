# PickPing - Pickup Pickleball Game Manager

Dead-simple pickup pickleball game roster manager with auto-fill subs and Venmo payment links.

## What It Does

PickPing automates the tedious parts of organizing pickup pickleball games:

- **Auto-Fill Subs**: When regulars drop out, subs get notified automatically in priority order
- **SMS Confirmations**: Players confirm via simple YES/NO text messages (no app required)
- **Venmo Integration**: Automatic payment links for court fees
- **Organizer Dashboard**: Simple web interface to manage games and rosters

## Tech Stack

- **Frontend**: Next.js 14 (App Router), Tailwind CSS, TypeScript
- **Backend**: Next.js API Routes, NextAuth.js for authentication
- **Database**: PostgreSQL with Prisma ORM
- **SMS**: Twilio for sending and receiving text messages
- **Hosting**: Designed for Vercel (free tier)
- **Payments**: Venmo deep links (no payment processing)

## Setup Instructions

### 1. Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (local or cloud like Supabase/Neon)
- Twilio account for SMS
- Vercel account for hosting (optional)

### 2. Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/pickleup"

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Twilio
TWILIO_ACCOUNT_SID="your-twilio-account-sid"
TWILIO_AUTH_TOKEN="your-twilio-auth-token"
TWILIO_PHONE_NUMBER="+1234567890"

# Cron Jobs (optional - for automated scheduling)
CRON_SECRET="your-cron-secret-key"

# App Configuration
CONFIRM_DEADLINE_HOURS="48"
ROSTER_LOCK_HOURS="24"
```

### 3. Database Setup

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# (Optional) Open Prisma Studio to view data
npm run db:studio
```

### 4. Development

```bash
# Start development server
npm run dev

# Visit http://localhost:3000
```

### 5. Twilio Webhook Setup

1. In your Twilio console, configure your phone number's webhook URL to:
   ```
   https://your-domain.com/api/sms/webhook
   ```

2. Set the HTTP method to POST

### 6. Production Deployment

Deploy to Vercel:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set up environment variables in Vercel dashboard
# Configure cron jobs for automated scheduling (optional)
```

## Usage Guide

### For Organizers

1. **Sign up** at your deployed URL
2. **Create a game** with location, day/time, and cost
3. **Add regulars** - players who play every week
4. **Add subs** in priority order - backup players
5. **Let it run automatically** - confirmations and subs are handled via SMS

### For Players

Players interact entirely via SMS:

- Regulars get "you in?" texts 2 days before games
- Reply **YES** or **NO**
- If a regular drops out, subs get notified automatically
- Confirmed players get Venmo payment links

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create organizer account
- `POST /api/auth/signin` - Sign in
- `GET/POST /api/auth/[...nextauth]` - NextAuth.js handlers

### Games Management
- `GET /api/games` - List organizer's games
- `POST /api/games` - Create new game
- `GET /api/games/[id]` - Get game details
- `PUT /api/games/[id]` - Update game
- `DELETE /api/games/[id]` - Delete game

### Roster Management
- `POST /api/games/[id]/roster` - Add player to roster
- `DELETE /api/games/[id]/roster/[rosterId]` - Remove player
- `PUT /api/games/[id]/roster/[rosterId]/priority` - Change sub priority

### SMS Integration
- `POST /api/sms/webhook` - Twilio webhook handler

### Automated Jobs (Cron)
- `POST /api/cron/send-confirmations` - Send confirmation texts
- `POST /api/cron/lock-rosters` - Lock rosters and send payment links
- `POST /api/cron/cleanup` - Mark completed games, expired confirmations

### Utilities
- `GET /api/test-db` - Test database connection

## Database Schema

- **organizers** - Game organizers with Venmo usernames
- **games** - Recurring game definitions
- **players** - Players identified by phone number
- **game_rosters** - Regular and sub assignments per game
- **game_instances** - Specific occurrences of games
- **game_confirmations** - Player responses per game instance

## SMS Flow Example

**Tuesday (2 days before Thursday game):**
> 🏓 Thursday 6pm at Bobby Riggs — you in? Reply YES or NO

**Regular replies NO:**
> Got it, you're out this week. See you next time!

**Sub #1 gets notified:**
> 🏓 Spot opened for Thursday 6pm at Bobby Riggs! Reply YES to claim it.

**Wednesday (roster locks):**
> 🏓 Tomorrow 6pm at Bobby Riggs — you're confirmed! Pay $8 → [Venmo link]

## Development Notes

- Built following the MVP brief exactly - no extra features
- Production-quality code with proper error handling
- Mobile-responsive design using Tailwind CSS
- TypeScript throughout for type safety
- Prisma for type-safe database operations

## Contributing

This is an MVP implementation. See `BRIEF.md` for the original specifications.

## License

MIT License - see LICENSE file for details# Force deployment Tue Apr 14 14:02:41 PDT 2026
