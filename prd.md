# ZoomBot — Product Requirements Document

**Version:** 3.0  
**Date:** March 2026  
**Status:** Draft — Under Review  
**Document Type:** Product Requirements Document (PRD)  
**Changelog:** v3.0 — Incorporated Gemini technical review. Removed paid CAPTCHA services; adopted fully free stack (playwright-extra + stealth plugin + Buster extension). Resolved all open questions. Whitelist switched to WhatsApp ID format. Dashboard exposed over LAN with HTTP Basic Auth.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Goals & Success Metrics](#3-goals--success-metrics)
4. [Version Roadmap](#4-version-roadmap)
5. [V1 Scope — Manual Link Drop](#5-v1-scope--manual-link-drop)
6. [V2 Scope — Direct WhatsApp Integration](#6-v2-scope--direct-whatsapp-integration)
7. [Functional Requirements](#7-functional-requirements)
8. [Non-Functional Requirements](#8-non-functional-requirements)
9. [System Architecture](#9-system-architecture)
10. [User Stories](#10-user-stories)
11. [Technical Risks & Mitigations](#11-technical-risks--mitigations)
12. [Milestones & Timeline](#12-milestones--timeline)
13. [Resolved Decisions](#13-resolved-decisions)
14. [Appendix](#14-appendix)

---

## 1. Executive Summary

ZoomBot is an intelligent automation bot that detects Zoom meeting links and automatically joins the meeting with microphone muted and camera off — requiring zero manual steps from the user.

The product ships in two versions:

- **V1** — A web-based control panel (accessible on local network) where the user pastes a Zoom link to trigger an immediate auto-join. Establishes the core automation engine with zero paid dependencies.
- **V2** — Adds a background WhatsApp listener that monitors incoming messages in whitelisted chats in real time. Any Zoom link detected automatically triggers the V1 join engine.

> **Core value proposition:** Zero-click Zoom joining. Any detected link becomes a meeting you are silently present in — mic off, camera off — within seconds.

> **Cost:** The entire stack is 100% free and open-source. No paid APIs or subscriptions required.

---

## 2. Problem Statement

### 2.1 Current Pain Points

- WhatsApp links require the user to manually copy the URL, switch apps, and paste into Zoom each time
- Users frequently join meetings with microphone on by default, causing audio disruptions
- Camera accidentally left on is a common source of embarrassment and privacy concern
- Repeated manual steps across multiple meetings per day are cognitively taxing
- Users miss the first few minutes of meetings while navigating between apps

### 2.2 Target Users

Primary users are professionals who:

- Attend 3 or more Zoom meetings per day
- Receive meeting invites primarily via WhatsApp (common in South Asia and Middle East markets)
- Value privacy-first joining — entering meetings silently before choosing to unmute

---

## 3. Goals & Success Metrics

### 3.1 Product Goals

- Join any Zoom meeting with mic muted and camera off — 100% of the time
- Detect valid links and start join workflow within 3 seconds (p95)
- Eliminate CAPTCHA entirely via deep link + stealth browser; resolve unavoidable CAPTCHAs for free using Buster
- Run reliably as a background service with minimal resource usage and zero ongoing cost
- V2: Parse Zoom links from WhatsApp within 3 seconds of message receipt (p95)

### 3.2 Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Detection latency | p95 < 3 seconds | Timestamp from trigger ingestion to parsed valid Zoom link event |
| Join completion latency | p95 < 10 seconds | Timestamp from trigger ingestion to confirmed in-meeting state |
| Join success rate | > 98% | Successful joins / total detected links |
| Mic-off accuracy | 100% | Post-join audio state audit |
| Camera-off accuracy | 100% | Post-join video state audit |
| CAPTCHA encounter rate | < 2% | Encounters / total browser-path joins |
| Background CPU usage (idle) | < 2% | System resource monitor |
| Ongoing cost | $0 | Stack audit — no paid services |
| WhatsApp message scan latency (V2) | p95 < 3 seconds | Message receipt to parsed valid Zoom link event |

---

## 4. Version Roadmap

### Overview

```
V1 (Now)                          V2 (After V1 stable)
─────────────────────             ──────────────────────────────────
User pastes link                  WhatsApp message arrives
        │                                   │
        ▼                                   ▼
  Web UI input          ──▶     whatsapp-web.js listener
  (LAN accessible,               (QR session, whitelisted chats)
   HTTP Basic Auth)                         │
        │                                   │
        ▼                                   │
   Link parser          ◀──────────────────┘
  (extract ID + pwd)
        │
        ▼
 Automation engine        ◀── shared core, unchanged between versions
 (zoommtg:// → Playwright
  + stealth plugin)
        │
        ▼
   Joined ✓
 (mic off, cam off)
```

### Why V1 First

The hard part of ZoomBot is the Zoom automation — pre-join screen control, mic/camera toggles, CAPTCHA avoidance, and deep link integration. That core engine is **identical** in both versions. Building V1 first lets us get it rock-solid before layering WhatsApp complexity on top. V2 is purely additive — a new trigger source feeding the same engine.

### Key Difference Between Versions

| Aspect | V1 | V2 |
|--------|----|----|
| Link source | User pastes manually into web UI | WhatsApp message auto-detected |
| WhatsApp dependency | None | whatsapp-web.js QR session |
| Session management | N/A | Must handle expiry + re-auth |
| Ban risk | None | Low — dedicated account + read-only + whitelist |
| Build complexity | Low | Medium (additive on V1) |
| Core join engine | Same | Same (unchanged) |

---

## 5. V1 Scope — Manual Link Drop

### 5.1 In Scope

- Web UI dashboard with a text input for pasting Zoom links
- Dashboard exposed over LAN (`0.0.0.0`) behind TLS and protected by HTTP Basic Auth
- Zoom link detection and validation via regex
- Zoom deep link (`zoommtg://`) as the **mandatory primary** join path — bypasses browser and CAPTCHA entirely
- Browser fallback using `playwright-extra` + `puppeteer-extra-plugin-stealth` if deep link unavailable
- Pre-join: mic muted + camera disabled before entering meeting
- Browser permission pre-grant (camera/microphone) to suppress popups
- Persistent Chromium profile (saved cookies, fingerprint) for stealth browser path
- CAPTCHA avoidance via stealth plugin (primary); Buster extension as free fallback resolver
- Configurable join delay (`join_delay_seconds`, default: `0`)
- Desktop notifications when a meeting is joined
- Join history log (last 50 events) in the dashboard
- Bot status display (last join, result, errors)
- PM2 process management for auto-restart
- Manual override action in dashboard ("Join anyway") to bypass dedup and in-meeting skip checks

### 5.2 Out of Scope — V1

- WhatsApp integration of any kind
- Auto-joining from email, Slack, Teams, or SMS
- Meeting recording or transcription
- AI-based meeting summarisation
- Multi-account support
- Scheduled auto-join (joining at a specific future time)
- Mobile application
- Calendar integration (Google / Outlook)
- Any paid API or service

---

## 6. V2 Scope — Direct WhatsApp Integration

### 6.1 What V2 Adds

V2 introduces a single new component: a persistent WhatsApp Web session that monitors incoming messages in whitelisted chats and extracts Zoom URLs automatically. Everything else — link parsing, automation engine, CAPTCHA handling, notifications, dashboard — is inherited unchanged from V1.

### 6.2 In Scope — V2

- WhatsApp Web connection via `whatsapp-web.js` (QR code authentication)
- Persistent session storage using `LocalAuth` (survives bot restarts without re-scanning QR)
- Real-time monitoring of incoming messages in whitelisted chats only
- Whitelist configured by WhatsApp ID (e.g. `923001234567@c.us` for contacts, `XXXXXXXXXX@g.us` for groups) with human-readable aliases in config
- Auto-trigger of V1 join engine when a Zoom URL is detected
- 30-minute deduplication cache — same meeting ID won't be joined twice
- Rate limiting — maximum 1 auto-join per 2 minutes
- Session health monitoring — desktop notification + dashboard alert on expiry
- QR re-authentication page at `/whatsapp/qr` in the dashboard
- WhatsApp connection status indicator in dashboard
- If bot is already in a meeting when a new link arrives: ignore the new link, fire desktop notification ("ZoomBot: Skipped — already in a meeting")
- Manual dashboard-triggered joins may override already-in-meeting skip behavior after explicit user confirmation
- Read-only operation — bot never sends any WhatsApp messages

### 6.3 Out of Scope — V2

- Multi-account WhatsApp (one dedicated account per bot instance)
- Sending WhatsApp messages, replies, or confirmations of any kind
- WhatsApp Business API
- Monitoring WhatsApp on mobile (web session only)
- Listening to all chats (whitelist is mandatory, not optional)

### 6.4 WhatsApp Integration — Design Decisions

#### Dedicated Account (Required)

A dedicated WhatsApp account must be used for the bot — never the user's personal number. `whatsapp-web.js` uses the unofficial WhatsApp Web protocol; Meta actively bans automated accounts. Losing a bot number is a minor inconvenience; losing a personal account is a catastrophic failure.

#### Whitelist by WhatsApp ID (Not Contact Name)

Contact names are subjective, depend on address book sync, and can be accidentally changed. The whitelist must use WhatsApp IDs for reliable matching. Human-readable aliases are provided alongside for configuration usability:

```json
{
  "whatsapp": {
    "whitelist": [
      { "id": "923001234567@c.us", "label": "Ahmed Khan" },
      { "id": "120363012345678901@g.us", "label": "Work Team Group" }
    ]
  }
}
```

Contact IDs follow the format `{countrycode}{number}@c.us`. Group IDs follow `{groupid}@g.us` and can be retrieved programmatically via `whatsapp-web.js` at first run.

#### Session Management

The bot must:

1. Detect session expiry within 60 seconds
2. Send a desktop notification prompting re-authentication
3. Expose `/whatsapp/qr` in the dashboard for fresh QR display
4. Resume monitoring automatically after successful re-authentication

#### Already-in-Meeting Behaviour

If a new Zoom link is detected while the bot is currently in a meeting: ignore the new link entirely and send a desktop notification. No queuing — queue management introduces complex timeout logic and risks pulling the user out of an active meeting against their will.

#### No WhatsApp Replies

The bot must never send any WhatsApp messages. Read-only operation is a critical ban-risk mitigation. Confirmation of join is handled entirely via desktop notification (node-notifier).

---

## 7. Functional Requirements

### 7.1 Link Detection & Parsing

**FR-01 — Zoom URL regex**
The bot shall detect Zoom meeting URLs matching the following patterns:

- `https://zoom.us/j/{meetingID}`
- `https://{subdomain}.zoom.us/j/{meetingID}`
- `https://zoom.us/my/{personalID}`
- `zoommtg://zoom.us/join?confno={meetingID}`

Meeting password shall be extracted from the `?pwd=` query parameter when present.

**FR-02 — Duplicate link suppression**
If the same meeting ID is detected more than once within a configurable window (default: 30 minutes), the bot shall not attempt to join again.
Manual dashboard action "Join anyway" shall bypass this suppression.

**FR-03 — WhatsApp listener (V2)**
The bot shall connect to WhatsApp Web using a QR-code-scanned session and monitor incoming messages only from whitelisted WhatsApp IDs. The session shall persist across restarts using `LocalAuth`.

---

### 7.2 Meeting Join Flow

**FR-04 — Zoom deep link launch (mandatory primary path)**
The bot shall always attempt `zoommtg://` first. This is the mandatory primary path — not merely preferred. It launches the native Zoom desktop app directly, bypasses the browser entirely, and eliminates CAPTCHA exposure. The browser path is a fallback only.

**FR-05 — Stealth browser fallback**
If the deep link method fails or Zoom desktop is not installed, the bot shall fall back to `playwright-extra` with `puppeteer-extra-plugin-stealth` in a persistent Chromium profile. The stealth plugin masks `navigator.webdriver`, canvas fingerprinting, and other automation signals that trigger bot detection.

**FR-06 — Pre-join configuration**
Before confirming entry into any meeting, the bot shall:

- Locate and click the mute microphone toggle on the pre-join screen
- Locate and click the disable camera toggle on the pre-join screen
- Verify both toggles are in the off state before clicking Join
- Grant microphone and camera browser permissions (to suppress popups) while keeping Zoom-level toggles off
- Apply `join_delay_seconds` wait if configured before clicking Join

**FR-07 — Join confirmation**
The bot shall detect successful meeting entry by monitoring for Zoom's in-meeting DOM state or app window title, log the event, and send a desktop notification.

---

### 7.3 CAPTCHA Handling

**FR-08 — CAPTCHA elimination via deep link (primary)**
The `zoommtg://` path bypasses the browser entirely — no CAPTCHA is possible on this path. This is the primary reason deep link is the mandatory first attempt.

**FR-09 — CAPTCHA avoidance on browser path**
When using the browser fallback, `playwright-extra` + `puppeteer-extra-plugin-stealth` shall be used to mask automation signals. A persistent Chromium profile with saved cookies and fingerprint data further reduces CAPTCHA trigger probability. The browser shall always run in headful (visible) mode — never headless.

**FR-10 — Buster extension (free CAPTCHA fallback)**
If a CAPTCHA is served on the browser path despite the above mitigations, the bot shall trigger the Buster browser extension. Buster is a free, open-source extension loaded into the Playwright Chromium context. It solves reCAPTCHA and hCaptcha by clicking the audio challenge and using local speech-to-text. No API key, no cost, no external service.

If Buster resolution fails after 2 attempts, the bot shall notify the user and skip the join — logging the failure for review.

---

### 7.4 Web UI / Dashboard

**FR-11 — Manual link input (V1 primary feature)**
The dashboard shall provide a text input for pasting a Zoom link, triggering an immediate join with optional join delay applied.

**FR-12 — LAN accessibility with HTTP Basic Auth**
The dashboard shall bind to `0.0.0.0` (all interfaces) rather than `127.0.0.1` so it is reachable from any device on the local network (e.g. the user's phone). Access shall be protected by TLS plus HTTP Basic Auth (configurable username/password in `.env`) to prevent credential interception and unauthorised LAN triggering.
Accepted deployment patterns:
- Reverse proxy TLS termination (recommended): Caddy/Nginx with HTTPS forwarding to the local dashboard
- Native HTTPS in app (acceptable for single-host setups)
- If TLS is unavailable, bind to localhost only (`127.0.0.1`) and use an authenticated tunnel instead of LAN exposure

**FR-13 — Bot status display**
The dashboard shall show: last detected link with timestamp, last join result, active meeting indicator, and (V2) WhatsApp connection status.

**FR-14 — Join history log**
The dashboard shall display the last 50 join events: meeting ID, time, source (manual/WhatsApp), result, and any error message.

**FR-15 — WhatsApp QR page (V2)**
The dashboard shall expose `/whatsapp/qr` showing a scannable QR code for session authentication or re-authentication.

### 7.5 Acceptance Criteria (Updated Requirements)

**AC-01 — Detection latency (manual and V2 triggers)**
- **Given** a valid Zoom link arrives via dashboard input or a whitelisted WhatsApp message
- **When** the trigger is ingested by the bot
- **Then** the parser emits a valid Zoom-link event within 3 seconds at p95 over a rolling sample of at least 100 events

**AC-02 — Join completion latency**
- **Given** a valid parsed Zoom link event
- **When** the join workflow starts
- **Then** the bot reaches confirmed in-meeting state within 10 seconds at p95 on standard hardware/network baseline

**AC-03 — Duplicate suppression with manual override**
- **Given** meeting ID `X` was already joined within `dedup_window_minutes`
- **When** the same meeting ID `X` is detected automatically
- **Then** auto-join is skipped and a user-visible skip notification/event is logged
- **And** when the user presses dashboard "Join anyway", dedup is bypassed and join proceeds

**AC-04 — Already-in-meeting auto-skip with manual override**
- **Given** the bot is currently in an active meeting
- **When** a new meeting link is detected automatically
- **Then** the new link is skipped and a "Skipped — in meeting" event is emitted
- **And** when the user explicitly confirms dashboard override, the new join workflow is allowed

**AC-05 — LAN security enforcement**
- **Given** dashboard bind is set to `0.0.0.0`
- **When** the service starts
- **Then** startup fails (or switches to safe fallback mode) unless TLS is enabled
- **And** all authenticated dashboard access requires TLS + valid Basic Auth credentials

---

## 8. Non-Functional Requirements

| Requirement | Specification |
|-------------|--------------|
| Performance | End-to-end join within 10 seconds of trigger on standard hardware |
| Reliability | Bot process auto-restarts on crash via PM2 |
| Security | Session data encrypted at rest using AES-256-GCM; key from OS keychain or `SESSION_ENC_KEY`; dashboard access requires TLS + HTTP Basic Auth |
| Cost | $0 ongoing — entirely free and open-source stack |
| Compatibility | Windows 10+, macOS 12+, Ubuntu 22.04+; Node.js 18+ |
| Resource usage | Idle memory < 150 MB; CPU < 2% when not actively joining |
| Configuration | All settings in `.env` + `config.json` — no code changes needed for setup |
| Logging | Structured JSON logs with rotation; errors include stack traces |
| WhatsApp session (V2) | Session survives bot restarts; expiry detected within 60 seconds |

---

## 9. System Architecture

### 9.1 V1 Component Overview

| Component | Technology | Responsibility |
|-----------|-----------|----------------|
| Web Dashboard | Express.js + HTML/CSS | Manual link input, status, join history; LAN-accessible with Basic Auth |
| Link Parser | Regex (Node.js) | Validate and parse meeting ID + password |
| Automation Engine | playwright-extra + stealth plugin | Stealth browser control, pre-join UI interaction |
| Zoom App Bridge | `zoommtg://` + `child_process` | Mandatory first-attempt: launch native Zoom desktop app |
| CAPTCHA Resolver | Buster extension (loaded into Playwright) | Free open-source audio-challenge solver — no API key |
| Notification Service | node-notifier | Desktop alerts on join, skip, and failure events |
| Config Manager | dotenv + config.json | Centralised settings management |
| Process Manager | PM2 | Auto-restart, log rotation, startup daemon |

### 9.2 V2 Additional Components

| Component | Technology | Responsibility |
|-----------|-----------|----------------|
| WhatsApp Listener | whatsapp-web.js (Node.js) | Monitor whitelisted chats, extract Zoom URLs |
| Session Manager | whatsapp-web.js LocalAuth + encrypted store wrapper | Persist session across restarts, encrypt session blobs at rest, detect expiry |
| QR Auth Page | Express.js route `/whatsapp/qr` | Display QR code for (re-)authentication |
| Dedup Cache | In-memory Map (TTL) | Prevent duplicate joins within 30-minute window |

### 9.3 V1 Data Flow

```
User pastes link into web UI (from phone or desktop, via LAN)
        │
        ▼
   Link Parser ──▶ Invalid? ──▶ Show error in UI
        │ Valid
        ▼
  Duplicate check (30-min cache)
        │ Already seen → skip + notify (dashboard allows "Join anyway")
        │ New meeting
        ▼
  Apply join_delay_seconds (default: 0)
        │
        ▼
  Try zoommtg:// deep link  ◀── mandatory first attempt
        │ Success                   Failure (app not installed / blocked)
        ▼                                ▼
 Zoom app opens               playwright-extra opens
 Pre-join screen              zoom.us (stealth mode,
        │                     persistent profile, headful)
        ▼                                │
 Toggle mic off               Check for CAPTCHA
 Toggle cam off                     │ Yes → Buster extension
        │                           │ No  → proceed
        └───────────────┬───────────┘
                        ▼
                   Click Join
                        │
                        ▼
             Confirm in-meeting state
                        │
                        ▼
        Log event + Desktop notification
        Update dashboard history
```

### 9.4 V2 Additional Data Flow

```
WhatsApp message received
        │
        ▼
  Is sender in whitelist? ──▶ No → ignore
        │ Yes
        ▼
  Scan message for Zoom regex
        │ No match → ignore
        │ Match found
        ▼
  Is bot already in a meeting? ──▶ Yes → Desktop notification "Skipped — in meeting" + dashboard override option
        │ No
        ▼
  Rate limit check (1 join per 2 min) ──▶ Throttled → ignore + log
        │ OK
        ▼
  [Feeds into V1 Data Flow from "Duplicate check" onwards]
```

---

## 10. User Stories

| ID | As a... | I want to... | So that... |
|----|---------|-------------|-----------|
| US-01 | User | Paste a Zoom link in the web UI and join instantly | I can join from my laptop or phone on the same WiFi |
| US-02 | User | Join with mic and camera off by default | I don't interrupt the meeting on entry |
| US-03 | User | Get a desktop notification when a meeting is joined | I know the bot acted without checking my screen |
| US-04 | User | See a history of all joins in the dashboard | I can audit when and what was joined |
| US-05 | Admin | Configure all settings in one file without editing code | I can set up and adjust the bot easily |
| US-06 | User | Bot auto-restarts if it crashes | I have reliable coverage without manual intervention |
| US-07 | User | Not pay anything to run the bot | No surprise API bills or subscriptions |
| US-08 (V2) | User | Bot automatically detects Zoom links from WhatsApp | I never have to manually copy and paste a link again |
| US-09 (V2) | User | Only specified WhatsApp chats are monitored | Random links from unknown people don't trigger a join |
| US-10 (V2) | User | Get notified if the WhatsApp session expires | I can re-authenticate before missing a meeting |
| US-11 (V2) | User | Re-authenticate WhatsApp from the dashboard | I don't need to restart the bot to fix a dropped session |
| US-12 (V2) | User | Be notified when a link is skipped because I'm already in a meeting | I know to manually join if I want to switch |

---

## 11. Technical Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Zoom pre-join UI changes (selectors break) | Medium | High | Multiple selector fallbacks; screenshot logging on failure for debugging |
| Buster audio CAPTCHA solve fails | Low | Low | Already the last-resort fallback; user notified to join manually; deep link path never hits this |
| WhatsApp session expiry (V2) | Medium | Medium | Session health monitor + dashboard re-auth flow at `/whatsapp/qr` |
| WhatsApp account restriction (V2) | Low | High | Dedicated account; whitelist-only; strictly read-only; 2-min rate limit |
| `whatsapp-web.js` breaking on WA update (V2) | Medium | Medium | Pin library version; monitor GitHub releases; fallback to manual V1 mode |
| Stealth plugin failing to mask browser (CAPTCHA still served) | Low | Low | Buster handles this; deep link path bypasses entirely |
| Zoom app not installed (deep link fails) | Low | Low | Browser fallback handles automatically |
| LAN dashboard credential interception | Medium | High | Mandatory TLS for LAN mode; fallback to localhost-only when TLS unavailable |
| LAN dashboard accessed by unauthorised user | Low | Medium | TLS + HTTP Basic Auth; optional IP allowlist at reverse proxy |

---

## 12. Milestones & Timeline

### V1 Timeline (~4 weeks)

| Phase | Milestone | Duration | Deliverable |
|-------|-----------|----------|-------------|
| Phase 1 | Web UI + link parser + LAN + Basic Auth | 3 days | Dashboard accessible on local network; regex validates Zoom URLs |
| Phase 2 | playwright-extra + stealth + pre-join automation | 1 week | Stealth browser joins with mic/cam off |
| Phase 3 | Deep link (`zoommtg://`) integration | 3 days | Native Zoom app auto-join as mandatory first path |
| Phase 4 | Buster extension integration + persistent profile | 3 days | Free CAPTCHA fallback; hardened browser fingerprint |
| Phase 5 | Join delay config + notifications + join history | 3 days | Configurable delay; desktop alerts; last 50 events |
| Phase 6 | Testing + hardening + PM2 packaging | 1 week | Auto-restart; `.env` config; README; full test pass |

### V2 Timeline (~3 weeks, after V1 stable)

| Phase | Milestone | Duration | Deliverable |
|-------|-----------|----------|-------------|
| Phase 7 | WhatsApp listener + WhatsApp ID whitelist | 1 week | Detects Zoom URLs from whitelisted chats by WA ID |
| Phase 8 | Session management + QR re-auth page | 1 week | Session persists across restarts; `/whatsapp/qr` re-auth |
| Phase 9 | Dedup + rate limit + already-in-meeting logic + testing | 1 week | No duplicate joins; skip logic; all V2 ban mitigations active |

> **Total estimated duration:** ~7 weeks from kick-off to production-ready V2.

---

## 13. Resolved Decisions

All open questions from PRD v2.0 are resolved. Decisions are documented here for traceability.

| Question | Decision | Rationale |
|----------|----------|-----------|
| Dashboard on localhost or LAN? | LAN with mandatory TLS + HTTP Basic Auth; otherwise localhost-only | Preserves phone UX while preventing LAN credential interception |
| Paid CAPTCHA service (2captcha / CapSolver)? | Removed — replaced with Buster extension | Buster is free, open-source, and loaded directly into the Playwright context. Stealth plugin + deep link make CAPTCHA rare anyway |
| Join delay configurable? | Yes — `join_delay_seconds`, default `0` | Useful for users who receive links slightly early; zero default matches the common "join now" use case |
| Dedicated or personal WhatsApp account? | Dedicated account — strictly required | Losing a personal account to a ban is catastrophic; dedicated account is a minor inconvenience |
| Whitelist by name or phone number? | WhatsApp ID (`@c.us` / `@g.us`) with human-readable alias | Contact names are fragile (sync-dependent, editable); IDs are immutable and unambiguous |
| Link arrives while already in a meeting? | Auto-skip + desktop notification, with manual dashboard override | Safe default avoids involuntary switches while preserving user control in urgent cases |
| Send WhatsApp confirmation reply? | Never | Sending any message spikes ban risk exponentially; desktop notification is sufficient |

---

## 14. Appendix

### 14.1 Technology Stack (100% Free)

| Layer | Technology | Version | License / Cost |
|-------|-----------|---------|---------------|
| Runtime | Node.js | 18+ | Free / MIT |
| WhatsApp client (V2) | whatsapp-web.js | Latest stable | Free / Apache 2.0 |
| Browser automation | playwright-extra | Latest | Free / MIT |
| Stealth plugin | puppeteer-extra-plugin-stealth | Latest | Free / MIT |
| CAPTCHA fallback | Buster extension | Latest | Free / MIT |
| Web framework | Express.js | 4.x | Free / MIT |
| Process manager | PM2 | Latest | Free tier |
| Desktop notifications | node-notifier | Latest | Free / MIT |
| Config management | dotenv + JSON | — | Free / MIT |

> No paid services. No API keys required. Total ongoing cost: $0.

### 14.2 Zoom URL Regex Reference

```regex
https?://([\w-]+\.)?zoom\.us/(j|my)/([\w?=&.-]+)
```

- Group 1: optional subdomain (e.g. `us02web.`)
- Group 2: path type (`j` for meeting ID, `my` for personal room)
- Group 3: meeting ID and query parameters

Password extraction:

```regex
[?&]pwd=([\w.-]+)
```

Deep link extraction:

```regex
zoommtg://zoom\.us/join\?confno=(\d+)(?:&pwd=([\w.-]+))?
```

### 14.3 Config File Reference (`config.json`)

```json
{
  "zoom": {
    "deep_link_enabled": true,
    "join_delay_seconds": 0,
    "dedup_window_minutes": 30
  },
  "browser": {
    "profile_path": "./chrome-profile",
    "headless": false,
    "stealth": true,
    "buster_extension_path": "./extensions/buster"
  },
  "dashboard": {
    "port": 3000,
    "bind": "0.0.0.0",
    "history_limit": 50
  },
  "whatsapp": {
    "enabled": false,
    "whitelist": [
      { "id": "923001234567@c.us", "label": "Ahmed Khan" },
      { "id": "120363012345678901@g.us", "label": "Work Team Group" }
    ],
    "dedup_window_minutes": 30,
    "rate_limit_seconds": 120
  }
}
```

`.env` file (secrets — never commit to version control):

```env
DASHBOARD_USER=admin
DASHBOARD_PASS=your_secure_password_here
SESSION_ENC_KEY=32_byte_base64_or_hex_key_here
```

> `whatsapp.enabled: false` = V1 mode. `whatsapp.enabled: true` = V2 mode. Same binary, one config toggle.

### 14.4 WhatsApp ID Reference

To find WhatsApp IDs for whitelist configuration:

- **Contact ID:** `{countrycode}{phonenumber}@c.us` — e.g. for +92 300 1234567 → `923001234567@c.us`
- **Group ID:** Retrieved programmatically on first run. The bot logs all group IDs at startup when `whatsapp.log_ids: true` is set in config.

---

*ZoomBot PRD v3.0 — Confidential, Internal Use Only*  
*Previous versions: v1.0 (initial), v2.0 (V1/V2 split), v3.0 (Gemini review — free stack, resolved decisions)*  
*For questions or updates, revise this document and increment the version number.*
