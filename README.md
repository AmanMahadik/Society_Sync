<div align="center">

# 🏢 SocietySync

### The Digital Nervous System for Modern Residential Societies

**Communication · Maintenance · Parking · Emergencies · Finance — Unified.**

<br/>

![Platform](https://img.shields.io/badge/Platform-iOS%20%7C%20Android-000000?style=for-the-badge&logo=apple&logoColor=white)
![Expo](https://img.shields.io/badge/Expo-SDK%2054-000020?style=for-the-badge&logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React%20Native-Paper%20MD3-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Supabase](https://img.shields.io/badge/Backend-Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![License](https://img.shields.io/badge/License-Proprietary-red?style=for-the-badge)

<br/>

```
╔══════════════════════════════════════════════════════════╗
║   🚨 SOS Alerts   💰 Ledgers   🚗 Parking   💬 Voting    ║
╚══════════════════════════════════════════════════════════╝
```

</div>

<br/>

> **SocietySync** consolidates every fragmented, paper-based, and chat-group-scattered process of running a residential society into **one secure, real-time mobile app** — with strict role-based access for Admins, Owners, Tenants, and Security Guards.

<br/>

---

## ✨ Why SocietySync?

<table>
<tr>
<td width="50%" valign="top">

### 😩 Before
- 📋 Maintenance dues tracked on paper ledgers
- 📱 Society updates lost in WhatsApp chaos
- 🚗 Visitor parking = first-come, double-booked chaos
- 🆘 Emergencies reported via phone calls that go unanswered
- 💸 Festival fund collections with zero transparency

</td>
<td width="50%" valign="top">

### 🚀 After SocietySync
- ✅ Real-time maintenance tracker with payment status
- ✅ Structured, threaded society discussions & live polls
- ✅ Slot-based parking booking with admin approval
- ✅ One-tap SOS Shield with instant guard/admin alarm
- ✅ Fully auditable festival income & expense ledgers

</td>
</tr>
</table>

<br/>

## 🎬 App in Motion

<div align="center">

| 🚨 Emergency SOS Shield | 💬 Live Council Chat & Polls | 🚗 Smart Parking Grid |
|:---:|:---:|:---:|
| Full-screen red alert, persistent vibration, real-time acknowledge → resolve workflow | Threaded discussions with Supabase Realtime-powered live vote counting | Visual V1–V10 slot grid that updates instantly as bookings are approved |

</div>

> 💡 *Tip for repo maintainers: drop your screen-recording GIFs into `/assets/demo/` and reference them here, e.g.*
> `![SOS Demo](./assets/demo/sos-alert.gif)` — animated GIFs render natively on GitHub and are the fastest way to show off Realtime features in action.

<br/>

## 🏗️ System Architecture

SocietySync follows a **thin-client, Realtime-first** architecture — the mobile app is purely presentational, while Supabase handles auth, data, storage, and live sync, all locked down with Postgres Row-Level Security.

```mermaid
flowchart TB
    subgraph Client["📱 Expo React Native Client"]
        UI["React Native Paper UI<br/>(Material Design 3)"]
        Router["Expo Router<br/>(File-based Navigation)"]
        Cache["AsyncStorage<br/>(Theme / Locale Cache)"]
        UI --> Router
        UI -.-> Cache
    end

    subgraph Edge["🌐 Realtime Channel Layer"]
        WS["Supabase Realtime<br/>(WebSockets)"]
    end

    subgraph Backend["☁️ Supabase Cloud Backend"]
        Auth["Supabase Auth<br/>(JWT · Google OAuth)"]
        DB["PostgreSQL<br/>+ Row-Level Security"]
        Storage["Supabase Storage<br/>(Avatars · Receipt Bills)"]
    end

    subgraph Roles["🧑‍🤝‍🧑 Role-Based Access"]
        Admin["🛡️ Admin"]
        Owner["🏡 Owner"]
        Tenant["👥 Tenant"]
        Guard["👮 Security Guard"]
    end

    Router -->|REST / RPC| DB
    Router -->|Sign In / Sign Up| Auth
    Router -->|Upload / Fetch Media| Storage
    Router <-->|Subscribe: SOS, Chat, Polls| WS
    WS <-->|Postgres Changes| DB
    Auth -->|Issues JWT| DB

    Admin & Owner & Tenant & Guard -->|Scoped by RLS Policy| DB

    style Client fill:#6C5CE7,stroke:#4834d4,color:#fff
    style Edge fill:#00B894,stroke:#00866e,color:#fff
    style Backend fill:#0984E3,stroke:#055086,color:#fff
    style Roles fill:#2D3436,stroke:#000,color:#fff
```

<br/>

### 🔄 Real-Time SOS Alert Flow

```mermaid
sequenceDiagram
    participant R as 🏡 Resident
    participant DB as 🗄️ Supabase (complaints table)
    participant RT as 📡 Realtime Channel
    participant G as 👮 Guard
    participant A as 🛡️ Admin

    R->>DB: Tap SOS Shield + description
    DB->>RT: INSERT complaints (status: Red)
    RT->>G: 🔴 Full-screen alarm + vibration
    RT->>A: 🔴 Full-screen alarm + vibration
    G->>DB: Acknowledge (status: Orange)
    DB->>RT: Broadcast status change
    RT->>R: 🟠 "Your SOS was acknowledged"
    G->>DB: Resolve (status: Green)
    DB->>RT: Broadcast resolution
    RT->>R: 🟢 "Your SOS was resolved"
    RT->>A: ✅ Feedback notification confirming resolution
```

<br/>

## 🧱 Tech Stack

<div align="center">

### 📱 Frontend

<img src="https://skillicons.dev/icons?i=react,typescript" height="50"/>

| Layer | Technology | Purpose |
|:---|:---|:---|
| **Framework** | `Expo (React Native) SDK 54` | Single codebase → native iOS & Android |
| **Navigation** | `Expo Router` | File-based routing for stacks, tabs & nested screens |
| **UI Library** | `React Native Paper (MD3)` | Cards, dialogs, snackbars, portals — Material Design 3 |
| **Icons** | `@expo/vector-icons` | Material Community Icons |
| **Local Storage** | `AsyncStorage` | Persists theme & language preferences |
| **Layout Safety** | `react-native-safe-area-context` | Notch / punch-hole / status-bar aware spacing |

### ☁️ Backend

<img src="https://skillicons.dev/icons?i=supabase,postgres" height="50"/>

| Layer | Technology | Purpose |
|:---|:---|:---|
| **Database** | `PostgreSQL` (Supabase) | Enterprise-grade relational storage |
| **Auth** | `Supabase Auth` | JWT sessions, Google Sign-In, password recovery |
| **Realtime** | `Supabase Realtime (WebSockets)` | Live chat, poll updates, SOS alarms |
| **Storage** | `Supabase Storage Buckets` | Avatars & transaction receipt bills |
| **Security** | `Postgres Row-Level Security (RLS)` | Per-role, per-user data access policies |

</div>

<br/>

## 🧩 Core Modules

<table>
<tr>
<td width="20%" align="center">🚨<br/><b>Emergency<br/>SOS Shield</b></td>
<td>One-tap crisis alert that triggers a persistent full-screen alarm for Admins & Guards, with an Acknowledge → Resolve workflow and automatic resident + admin feedback loops.</td>
</tr>
<tr>
<td width="20%" align="center">💰<br/><b>Festival Ledgers<br/>& Maintenance</b></td>
<td>Transparent festival fund tracking (Chandaa, Expenses, Balance) with receipt uploads, plus a monthly maintenance dues tracker (Pending / Paid / Partial / Overdue).</td>
</tr>
<tr>
<td width="20%" align="center">🚗<br/><b>Smart Visitor<br/>Parking</b></td>
<td>Live V1–V10 slot grid by date & time-block, an admin approval queue, and a guard-facing Gate Entry Checklist that auto-populates on approval.</td>
</tr>
<tr>
<td width="20%" align="center">💬<br/><b>Council Chats<br/>& Live Polls</b></td>
<td>Category-threaded discussions (#General, #Water-Infra, #Budget) plus Realtime voting polls with results updating live across every screen.</td>
</tr>
<tr>
<td width="20%" align="center">👤<br/><b>Profile &<br/>Roster</b></td>
<td>Wing/flat-organized resident directory, role cycling for admins, Dark/Light/System theming, and a diagnostics panel for connectivity health.</td>
</tr>
</table>

<br/>

## 🔐 Role-Based Access Control (RBAC)

<div align="center">

| Feature / Permission | 🛡️ Admin | 🏡 Owner | 👥 Tenant | 👮 Guard |
|:---|:---:|:---:|:---:|:---:|
| Manage Roster (Approve/Reject) | ✅ | ❌ | ❌ | ❌ |
| Cycle User Roles | ✅ | ❌ | ❌ | ❌ |
| Acknowledge & Resolve SOS | ✅ | ❌ | ❌ | ✅ |
| Record Festival Income/Expense | ✅ | ❌ | ❌ | ❌ |
| Approve/Reject Parking | ✅ | ❌ | ❌ | ❌ |
| Gate Entry Checklist | ❌ | ❌ | ❌ | ✅ |
| Create Voting Polls | ✅ | ❌ | ❌ | ❌ |
| Cast Votes | ✅ | ✅ | ✅ | ❌ |
| Post Chat Messages | ✅ | ✅ | ✅ | ❌ |

</div>

<br/>

## 🗄️ Database Schema

```mermaid
erDiagram
    PROFILES ||--o{ COMPLAINTS : raises
    PROFILES ||--o{ COMPLAINTS : resolves
    PROFILES ||--o{ PARKING_REQUESTS : books
    PARKING_SLOTS ||--o{ PARKING_REQUESTS : reserved_by
    PROFILES ||--o{ TRANSACTIONS : records
    EVENTS ||--o{ TRANSACTIONS : contains
    CHAT_THREADS ||--o{ CHAT_MESSAGES : contains
    PROFILES ||--o{ CHAT_MESSAGES : posts
    CHAT_THREADS ||--o{ POLLS : hosts
    POLLS ||--o{ POLL_OPTIONS : has
    POLL_OPTIONS ||--o{ POLL_VOTES : receives
    PROFILES ||--o{ POLL_VOTES : casts
    PROFILES ||--o{ NOTIFICATIONS : receives

    PROFILES {
        uuid id PK
        string email
        string name
        string wing
        string flat_number
        string role
        bool approved
        string phone
        string vehicle_number
        string bio
    }
    COMPLAINTS {
        uuid id PK
        uuid raised_by FK
        uuid resolved_by FK
        string status
        string description
    }
    PARKING_SLOTS {
        string slot_id PK
        string status
    }
    PARKING_REQUESTS {
        uuid id PK
        string slot_id FK
        uuid resident_id FK
        string status
    }
    EVENTS {
        uuid id PK
        string name
        numeric total_chandaa
        numeric total_expense
    }
    TRANSACTIONS {
        uuid id PK
        uuid event_id FK
        numeric amount
        string type
        string receipt_url
    }
```

> 🔐 **Row-Level Security is enforced on every table.** Profiles are publicly readable (for the roster) but only self-or-admin editable. SOS complaints can be inserted by any approved resident but only updated by Guards/Admins. Notifications are strictly scoped to `auth.uid() = user_id`.

<br/>

## 🎨 UI/UX Principles

- **🧭 Safe-Area Aware** — `useSafeAreaInsets` keeps headers clear of notches & punch-holes on every device.
- **📐 Clearance Spacing** — 80–100px bottom padding keeps content clear of the floating tab bar.
- **🌗 Theme-Aware Contrast** — colors bind to `theme.colors.onSurface` / `theme.colors.surface`, never hardcoded — full Dark & Light mode support.
- **🏷️ Smart Contrast Badging** — role badges auto-adjust shade per theme (e.g. `#047857` for Owners in Light Mode) to stay readable.

<br/>

## 📂 Project Structure

```
societysync/
├── app/                      # Expo Router screens (file-based routing)
│   ├── (auth)/                 # Sign in / sign up / password recovery
│   ├── (tabs)/                  # Home, Parking, Chat, Profile tabs
│   └── (admin)/                 # Admin-only approval & roster screens
├── components/                # Reusable RN Paper UI components
├── lib/
│   ├── supabase.ts              # Supabase client init
│   └── realtime/                # Realtime channel subscriptions
├── assets/
│   └── demo/                    # 🎬 Drop your demo GIFs here
└── supabase/
    ├── migrations/               # SQL schema & RLS policies
    └── seed.sql
```

<br/>

## 🚀 Getting Started

```bash
# 1. Clone the repository
git clone https://github.com/<your-org>/societysync.git
cd societysync

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
# Add your Supabase URL & anon key

# 4. Run database migrations
npx supabase db push

# 5. Start the app
npx expo start
```

<br/>

<div align="center">

### 🌟 Built for societies that deserve better than spreadsheets and WhatsApp groups.

<br/>

**Made with ❤️ using Expo, React Native & Supabase**

</div>
