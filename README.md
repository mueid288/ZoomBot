# ZoomBot

ZoomBot is an automation project that detects Zoom links and joins meetings with mic/camera off by default.

## Project Status

- PRD ready (`prd.md`)
- Implementation not started yet

## Prerequisites

- Node.js 18+
- npm 9+
- Zoom desktop app installed (recommended for deep-link join path)

## Environment Setup

1. Clone the repository:

```bash
git clone https://github.com/mueid288/ZoomBot.git
cd ZoomBot
```

2. Create your local environment file:

```bash
cp .env.example .env
```

3. Update `.env` values:

- `DASHBOARD_USER`
- `DASHBOARD_PASS`
- `SESSION_ENC_KEY`

## Local Development (Planned)

Once implementation starts, expected commands will be:

```bash
npm install
npm run dev
```

## Repository Structure

- `README.md` - setup and project overview
- `prd.md` - product requirements document
- `.env.example` - sample environment configuration

## Security Notes

- Never commit `.env` to git
- Use a strong `DASHBOARD_PASS`
- Use a secure random `SESSION_ENC_KEY`
