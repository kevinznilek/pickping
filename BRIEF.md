# PickPing — MVP Build Brief

## What It Is
A dead-simple pickup pickleball game roster manager with auto-fill subs and Venmo payment links.

## Target User
The pickup game organizer — the person who herds cats every week to fill a court.

## Core Features (MVP only — nothing else)

### 1. Create a Recurring Game
- Name (e.g. "Thursday Night Doubles")
- Location (court name / address)
- Day & time (recurring weekly)
- Total spots (e.g. 8)

### 2. Roster Management
- **Regulars:** Players who are in every week by default. They confirm or drop out.
- **Subs:** A ranked pool of backup players. When a regular drops, subs get notified automatically.
- Players are identified by name + phone number (no accounts needed for v1).

### 3. Auto-Fill Logic
- Organizer sets the game. Regulars are auto-added each week.
- X days before the game (configurable, e.g. 2 days), regulars get a text: "Thursday 6pm at Bobby Riggs — you in? Reply YES or NO"
- If a regular replies NO (or doesn't reply by cutoff), subs get pinged in priority order via SMS.
- First sub to reply YES gets the spot. Others get "Spot filled, you're still on the sub list."
- Organizer gets a text when roster is full (or if it's not full by a warning cutoff).

### 4. Venmo Payment Links
- Organizer sets a per-player cost (e.g. $8 for court rental split).
- When the roster locks, each confirmed player gets a text with a Venmo deep link: `venmo://paycharge?txn=charge&recipients=ORGANIZER_USERNAME&amount=8&note=Thursday%20Pickleball%204/17`
- This opens Venmo pre-filled. Player confirms payment in Venmo. We don't process payments ourselves.

### 5. Organizer Dashboard (Web)
- Simple web UI for the organizer to:
  - Create/edit games
  - Manage regulars and sub list (add/remove/reorder)
  - See upcoming game roster status (who's confirmed, who's dropped, open spots)
  - Manually add/remove players from a specific week
  - Set Venmo username and per-player cost

## What Is NOT in MVP
- No user accounts/auth for players (they interact via SMS only)
- No social features, feeds, or discovery
- No native mobile app (web only, mobile-responsive)
- No in-app payments processing
- No skill-level matching
- No court booking integration
- No league/tournament features

## Tech Stack
- **Frontend:** Next.js (React) with Tailwind CSS. Simple, fast, mobile-responsive.
- **Backend:** Next.js API routes (serverless functions).
- **Database:** PostgreSQL (via Supabase or Neon for quick setup).
- **SMS:** Twilio (send + receive SMS for confirmations).
- **Auth:** Simple auth for organizers only (email/password or magic link).
- **Hosting:** Vercel (free tier to start).
- **Payments:** Venmo deep links only (no payment processing).

## Database Schema (starter)

### organizers
- id, email, password_hash, name, phone, venmo_username, created_at

### games
- id, organizer_id, name, location, day_of_week, time, total_spots, cost_per_player, confirm_deadline_hours, created_at

### players
- id, name, phone, created_at

### game_rosters
- id, game_id, player_id, role (regular|sub), priority (for subs), created_at

### game_instances
- id, game_id, date, status (upcoming|confirmed|completed|cancelled), created_at

### game_confirmations
- id, game_instance_id, player_id, status (pending|confirmed|declined|no_response), responded_at, created_at

## SMS Flow Example

**Tuesday (2 days before Thursday game):**
```
To regulars: "🏓 Thursday 6pm at Bobby Riggs — you in? Reply YES or NO"
```

**Regular replies NO:**
```
To sub #1: "🏓 Spot opened for Thursday 6pm at Bobby Riggs! Reply YES to claim it."
To regular: "Got it, you're out this week. See you next time!"
```

**Sub #1 replies YES:**
```
To sub #1: "You're in! See you Thursday 6pm at Bobby Riggs."
To organizer: "Mike claimed the open spot. Roster: 7/8 filled."
```

**Wednesday (roster locks):**
```
To all confirmed: "🏓 Tomorrow 6pm at Bobby Riggs — you're confirmed! Pay $8 → [Venmo link]"
To organizer: "Roster locked: 8/8. All payment links sent."
```

## File Structure
```
pickleup/
├── src/
│   ├── app/              # Next.js app router
│   │   ├── page.tsx      # Landing page
│   │   ├── dashboard/    # Organizer dashboard
│   │   ├── api/          # API routes
│   │   │   ├── games/
│   │   │   ├── players/
│   │   │   ├── sms/      # Twilio webhook handler
│   │   │   └── cron/     # Scheduled jobs (confirmation texts, roster lock)
│   │   └── layout.tsx
│   ├── lib/
│   │   ├── db.ts         # Database client
│   │   ├── twilio.ts     # SMS helper
│   │   ├── venmo.ts      # Deep link generator
│   │   └── roster.ts     # Auto-fill logic
│   └── components/       # UI components
├── prisma/
│   └── schema.prisma     # Database schema
├── public/
├── package.json
├── tailwind.config.ts
└── .env.example
```

## Priority Order
1. Database schema + models
2. Organizer auth + dashboard (create game, manage roster)
3. SMS send/receive via Twilio (confirmation flow)
4. Auto-fill logic (regular drops → sub gets pinged)
5. Venmo deep link generation + payment reminder texts
6. Cron jobs for automated weekly flow
7. Landing page (simple, explains what it does)
