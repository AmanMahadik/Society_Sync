<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:0F2027,50:203A43,100:6C5CE7&height=220&section=header&text=SocietySync&fontSize=46&fontColor=A3FFB0&animation=fadeIn&fontAlignY=38&desc=Track.%20Connect.%20Protect.%20Repeat.&descAlignY=58&descSize=18" width="100%" alt="SocietySync banner"/>

<br/>
<img width="150" height="150" alt="logo" src="https://github.com/user-attachments/assets/1c5a3458-a8b0-4e01-a8a3-bcef9cd937cc" />


[![Made with Supabase](https://img.shields.io/badge/Backend-Supabase-2EA043?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red.svg?style=for-the-badge)](#-license)
[![Platform](https://img.shields.io/badge/Platform-iOS%20%7C%20Android-000000?style=for-the-badge&logo=apple&logoColor=white)](#)

<br/>

[![Repo Size](https://img.shields.io/github/repo-size/AmanMahadik/Society_Sync?style=flat-square&color=6C5CE7)](https://github.com/AmanMahadik/Society_Sync)
[![Last Commit](https://img.shields.io/github/last-commit/AmanMahadik/Society_Sync?style=flat-square&color=6C5CE7)](https://github.com/AmanMahadik/Society_Sync/commits)
[![Stars](https://img.shields.io/github/stars/AmanMahadik/Society_Sync?style=flat-square&color=yellow)](https://github.com/AmanMahadik/Society_Sync/stargazers)
[![Forks](https://img.shields.io/github/forks/AmanMahadik/Society_Sync?style=flat-square&color=blue)](https://github.com/AmanMahadik/Society_Sync/network/members)
[![Issues](https://img.shields.io/github/issues/AmanMahadik/Society_Sync?style=flat-square&color=orange)](https://github.com/AmanMahadik/Society_Sync/issues)

### 🏢 A premium, secure digital society manager that helps Admins, Owners, Tenants, and Guards **run residential life — from one app, in real time.**

#### 🌐 Live Deployments
* 💻 **Admin Web Portal:** [https://society-sync-portal.vercel.app](https://society-sync-portal.vercel.app/)
* 📄 **Landing Info Website:** [https://society-sync-info.vercel.app](https://society-sync-info.vercel.app/)

</div>

<br/>

<div align="center">

### 🛠️ Built With

<img src="https://skillicons.dev/icons?i=react,supabase,postgres,nodejs&theme=dark" />

<br/><br/>

**Expo (React Native SDK 54)** &nbsp;•&nbsp; **React Native Paper (MD3)** &nbsp;•&nbsp; **Supabase Auth** &nbsp;•&nbsp; **PostgreSQL + RLS** &nbsp;•&nbsp; **Supabase Realtime**

</div>

<br/>

---

## 📲 Get the App

<div align="center">

### 👉 [**⬇️ Download the Android Build (Expo)**](https://expo.dev/accounts/aman1611/projects/society-sync/builds/83da809f-7ae0-4cd1-ba99-559bdab33899) 👈

Click the link above to open the Expo build page, then tap **"Download build"** to get the standalone `.apk` directly — or scan the QR with **Expo Go** on your Android device.

</div>

---

## 📚 Table of Contents

- [About the Project](#-about-the-project)
- [Key Features](#-key-features)
- [App in Motion](#-app-in-motion)
- [System Architecture](#%EF%B8%8F-system-architecture)
- [Tech Stack](#-tech-stack)
- [Role-Based Access Control](#-role-based-access-control-rbac)
- [Database Schema](#%EF%B8%8F-database-schema)
- [Project Structure](#-project-directory-structure)
- [Environment Setup](#%EF%B8%8F-environment-configuration)
- [Running Locally](#-running-the-project-locally)
- [UI/UX Principles](#-uiux-principles)
- [Contributing](#-contributing)
- [License](#-license)
- [Author](#-author)

---

## 🌱 About the Project

**SocietySync** is a full-stack digital society management platform built to replace fragmented WhatsApp groups, paper registers, and manual parking logs with one secure, real-time mobile app. Whether you're a Society Administrator auditing festival funds, a Resident booking visitor parking, or a Security Guard managing gate entries — SocietySync gives every role exactly the tools they need, and nothing they don't.

> 💡 *Tap the SOS Shield. Watch the alarm reach every admin instantly. Resolve, repeat, sleep easier.*

It's underpinned by **Supabase** and **Expo React Native**, with strict **Role-Based Access Control (RBAC)** enforced all the way down to the database layer via Postgres Row-Level Security.

---

## ✨ Key Features

<table>
<tr>
<td width="50%" valign="top">

### 🚨 Real-Time Emergency SOS Shield
One-tap crisis alert from the resident dashboard. Triggers a **persistent full-screen alarm + vibration** for all active Admins and Guards, with a full Acknowledge → Resolve workflow and automatic feedback loops back to the resident and admin team.

### 💰 Chandaa Drives & Razorpay Payments
*   **Online Gateways**: Secure in-app payments using native **Razorpay Checkout SDK**. Successful transactions automatically trigger secure backend webhooks, record payment entries, and issue PDF receipts.
*   **Offline Collection**: Log cash/UPI payments directly in the app. Submit transaction screenshot proofs and UTR IDs to your wing coordinator.
*   **Collector Panels**: Appointed Wing Coordinators get a dedicated panel to review pending collections, view wing stats, and approve/reject logs.

### 🚗 Smart Visitor Parking Management
Live **V1–V10** slot grid by date and time-block (Morning / Afternoon / Evening / Overnight). Residents request, Admins approve or reject, and approved bookings auto-populate the Guard's **Gate Entry Checklist**.

</td>
<td width="50%" valign="top">

### 🔒 Biometric Security App Lock
Secures your app usage using **local authentication (FaceID, Fingerprint, or Device PIN)**. Features a quick toggle under Settings, safe-key storage, and auto-lock screen triggers when the app enters the background.

### 💬 Council Chats & Live Voting Polls
Category-threaded discussions (`#General-Complaints`, `#Water-Infrastructure`, `#Annual-Budget`) plus Admin-created polls with **Supabase Realtime** vote counts updating live on every screen.

### 👤 Unified Profile, Settings & Roster
Wing/flat-organized resident directory, role cycling for Admins, Dark/Light/System theming, and a diagnostics panel showing live connectivity (Supabase, WebSockets, Notifications).

### 🛠️ Stable Flat-Routing Architecture
Refactored nested route screens into a robust **flat page layout** at the root of `app/` (e.g. `chanda.tsx`, `chanda-detail.tsx`, `chanda-history.tsx`). This prevents Expo Router race-conditions and stops accidental tab-fallback redirects during loading states.

</td>
</tr>
</table>

<div align="center">

```
🏢 ──────────────────────────────────────────── 🏢
   Less Chaos On Paper   →   More Trust In The App
🏢 ──────────────────────────────────────────── 🏢
```

</div>

---

## 🎬 App in Motion

<div align="center">

| 🚨 Emergency SOS Shield | 💬 Live Council Chat & Polls | 🚗 Smart Parking Grid |
|:---:|:---:|:---:|
| Full-screen red alert, persistent vibration, real-time acknowledge → resolve workflow | Threaded discussions with Realtime-powered live vote counting | Visual V1–V10 slot grid that updates instantly as bookings are approved |

</div>

> 💡 *Drop your screen-recording GIFs into `docs/demo/` and reference them here, e.g. `![SOS Demo](./docs/demo/sos-alert.gif)` — animated GIFs render natively on GitHub and are the fastest way to show Realtime features in action.*

---

## 🏗️ System Architecture

<div align="center">
<img src="https://raw.githubusercontent.com/AmanMahadik/Society_Sync/main/docs/architecture-diagram.png" width="650" alt="System architecture diagram"/>

<sub>📌 <i>Export the Mermaid diagram below as a PNG into <code>docs/architecture-diagram.png</code> so this image renders — see note below.</i></sub>
</div>

```mermaid
flowchart TB
    subgraph Client["📱 Expo React Native Client"]
        UI["React Native Paper UI<br/>(Material Design 3)"]
        Router["Expo Router<br/>(File-based Navigation)"]
        Cache["AsyncStorage<br/>(Theme / Locale Cache)"]
        Bio["Expo Local Authentication<br/>(Biometrics FaceID/Fingerprint)"]
        UI --> Router
        UI -.-> Cache
        UI -.-> Bio
    end

    subgraph Edge["🌐 Realtime Channel Layer"]
        WS["Supabase Realtime<br/>(WebSockets)"]
    end

    subgraph Backend["☁️ Supabase Cloud Backend"]
        Auth["Supabase Auth<br/>(JWT · Google OAuth)"]
        DB["PostgreSQL<br/>+ Row-Level Security"]
        Storage["Supabase Storage<br/>(Avatars · Receipt Bills · UTR Proofs)"]
    end

    subgraph Roles["🧑🤝🧑 Role-Based Access"]
        Admin["🛡️ Admin"]
        Owner["🏡 Owner"]
        Tenant["👥 Tenant"]
        Guard["👮 Security Guard"]
        Collector["🤝 Wing Coordinator"]
    end

    Router -->|REST / RPC| DB
    Router -->|Sign In / Sign Up| Auth
    Router -->|Upload / Fetch Media| Storage
    Router <-->|Subscribe: SOS, Chat, Polls| WS
    WS <-->|Postgres Changes| DB
    Auth -->|Issues JWT| DB

    Admin & Owner & Tenant & Guard & Collector -->|Scoped by RLS Policy| DB

    style Client fill:#1f6feb,color:#fff,stroke:#0d419d
    style Edge fill:#2ea043,color:#fff,stroke:#1a7f37
    style Backend fill:#8957e5,color:#fff,stroke:#6639ba
    style Roles fill:#2D3436,color:#fff,stroke:#000
```

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

### 🔄 Project Workflow Architecture

```mermaid
flowchart TD
    subgraph Onboarding["1. Onboarding & Registration Workflow"]
        A[Society Representative] -->|Registers Society & Uploads Docs| B(Societies DB: pending_verification)
        B -->|Notifies| C[Master Admin]
        C -->|Audits Docs & Pinned Location| D{Approve Request?}
        D -->|No| E(Rejected Status)
        D -->|Yes| F(Active Status & Generate Society Code)
    end

    subgraph ResidentJoin["2. Resident Verification Workflow"]
        F -->|Shares Code| G[Residents]
        G -->|Signs Up with Society Code| H(Profiles DB: pending)
        H -->|Notifies| I[Society Admin]
        I -->|Verifies Flat / Wing| J{Approve Resident?}
        J -->|No| K(Rejected Status)
        J -->|Yes| L(Approved Status & Grant App Access)
    end

    subgraph GateSecurity["3. Guard Gate Control & SOS Workflow"]
        L -->|Trigger emergency crisis| M[Resident SOS Trigger]
        M -->|Realtime WebSockets broadcast| N[Guard Sirens & Admin Alert]
        N -->|Security desk intervention| O[Guard Resolves Alert]

        L -->|Generate Pre-approved Passcode| P[Guest Entry Code]
        P -->|Share via WhatsApp / SMS| Q[Visitor at Gate]
        Q -->|Presents Code| R[Guard Gate Console]
        R -->|Logs check-in/out| S(Visitor Logs DB)
    end

    subgraph Financials["4. Chanda Payment & Razorpay Workflow"]
        I -->|Generates monthly maintenance/chanda drive| T[Invoices / Campaigns]
        L -->|Pays Online / Uploads Offline Receipt| U[Submit Payment / UTR Screenshot]
        U -->|Bucket storage audit / Webhook verification| V[Admin / Coordinator Review]
        V -->|Triggers PDF receipt generator| W(Transactions Ledger: Paid)
    end

    style Onboarding fill:#09090b,stroke:#27272a,color:#fafafa
    style ResidentJoin fill:#09090b,stroke:#27272a,color:#fafafa
    style GateSecurity fill:#09090b,stroke:#27272a,color:#fafafa
    style Financials fill:#09090b,stroke:#27272a,color:#fafafa
    style F fill:#00d4aa,stroke:#00b390,color:#09090b
    style L fill:#00d4aa,stroke:#00b390,color:#09090b
    style N fill:#ff3b30,stroke:#d32f2f,color:#fff
    style W fill:#ffd700,stroke:#f5b041,color:#09090b
```

| Layer | Technology |
|---|---|
| **Frontend** | Expo (React Native SDK 54), Expo Router, React Native Paper (MD3), `@expo/vector-icons`, AsyncStorage, react-native-safe-area-context, react-native-razorpay, expo-local-authentication |
| **Backend** | Supabase Auth (JWT + Google Sign-In), Supabase Realtime (WebSockets), Supabase Storage (Buckets), Next.js API endpoints, Nodemailer, Razorpay API |
| **Database** | PostgreSQL on Supabase + Postgres Row-Level Security (RLS) |

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|:---|:---|:---|
| **Framework** | `Expo (React Native) SDK 54` | Single codebase → native iOS & Android |
| **Navigation** | `Expo Router` | File-based routing for stacks, tabs & nested screens |
| **UI Library** | `React Native Paper (MD3)` | Cards, dialogs, snackbars, portals — Material Design 3 |
| **Biometrics** | `expo-local-authentication` | Device biometric authentication (FaceID / Fingerprint) |
| **Payments** | `react-native-razorpay` | Online payment SDK integration for mobile transactions |
| **Local Storage** | `AsyncStorage` | Persists theme, lock parameters, and preferences |
| **Layout Safety** | `react-native-safe-area-context` | Notch / punch-hole / status-bar aware spacing |
| **Database** | `PostgreSQL` (Supabase) | Enterprise-grade relational storage |
| **Auth** | `Supabase Auth` | JWT sessions, Google Sign-In, password recovery |
| **Realtime** | `Supabase Realtime (WebSockets)` | Live chat, poll updates, SOS alarms |
| **Storage** | `Supabase Storage Buckets` | Avatars, bills, and payment verification proofs |
| **Security** | `Postgres Row-Level Security (RLS)` | Per-role, per-user data access policies |

---

## 🔐 Role-Based Access Control (RBAC)

<div align="center">

| Feature / Permission | 🛡️ Admin | 🏡 Owner | 👥 Tenant | 👮 Guard | 🤝 Coordinator |
|:---|:---:|:---:|:---:|:---:|:---:|
| Manage Roster (Approve/Reject) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Cycle User Roles | ✅ | ❌ | ❌ | ❌ | ❌ |
| Acknowledge & Resolve SOS | ✅ | ❌ | ❌ | ✅ | ❌ |
| Record Festival Income/Expense | ✅ | ❌ | ❌ | ❌ | ❌ |
| Verify Offline Collections | ✅ | ❌ | ❌ | ❌ | ✅ |
| Approve/Reject Parking | ✅ | ❌ | ❌ | ❌ | ❌ |
| Gate Entry Checklist | ❌ | ❌ | ❌ | ✅ | ❌ |
| Create Voting Polls | ✅ | ❌ | ❌ | ❌ | ❌ |
| Cast Votes | ✅ | ✅ | ✅ | ❌ | ✅ |
| Post Chat Messages | ✅ | ✅ | ✅ | ❌ | ✅ |

</div>

---

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
    WINGS ||--o{ FLATS : contains
    WINGS ||--o{ CHANDA_PAYMENTS : receives
    FLATS ||--o{ CHANDA_PAYMENTS : has
    PROFILES ||--o{ CHANDA_PAYMENTS : pays
    CHANDA_CAMPAIGNS ||--o{ CHANDA_PAYMENTS : logs
    CHANDA_CAMPAIGNS ||--o{ CHANDA_OFFLINE_CONTRIBUTIONS : logs
    PROFILES ||--o{ CHANDA_OFFLINE_CONTRIBUTIONS : logs

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
    WINGS {
        uuid id PK
        string name
        uuid collector_user_id FK
        string collector_upi_id
    }
    FLATS {
        uuid id PK
        uuid wing_id FK
        string flat_number
    }
    CHANDA_CAMPAIGNS {
        uuid id PK
        string title
        string description
        numeric target_amount
        numeric suggested_amount
        numeric min_amount
        string status
    }
    CHANDA_PAYMENTS {
        uuid id PK
        uuid campaign_id FK
        uuid society_id FK
        uuid wing_id FK
        uuid flat_id FK
        uuid resident_id FK
        numeric amount
        string status
        string razorpay_order_id
        string razorpay_payment_id
    }
    CHANDA_OFFLINE_CONTRIBUTIONS {
        uuid id PK
        uuid campaign_id FK
        uuid society_id FK
        uuid wing_id FK
        uuid flat_id FK
        uuid resident_id FK
        numeric amount
        string proof_image_url
        string utr_id
        string status
    }
```

> 🔐 **Row-Level Security is enforced on every table.** Profiles are publicly readable (for the roster) but only self-or-admin editable. SOS complaints can be inserted by any approved resident but only updated by Guards/Admins. Notifications are strictly scoped to `auth.uid() = user_id`.

---

## 📂 Project Directory Structure

```text
societysync/
├── app/                          # Expo Router screens (file-based routing)
│   ├── (auth)/                     # Sign in / sign up / password recovery
│   ├── (tabs)/                      # Home, Parking, Chat, Profile tabs
│   ├── chanda.tsx                   # [FLAT ROUTE] Active/past chanda drives list
│   ├── chanda-detail.tsx            # [FLAT ROUTE] Drive summary, Razorpay pay desk
│   ├── chanda-history.tsx           # [FLAT ROUTE] Transaction ledger & PDF download desk
│   ├── chanda-log-entry.tsx         # [FLAT ROUTE] Log offline payments & upload UTR proof
│   ├── chanda-my-entries.tsx        # [FLAT ROUTE] Coordinator review desk
│   ├── settings.tsx                 # Profile configurations & Biometrics toggle
│   └── about.tsx                    # Connectivity diagnostic dashboard
│
├── src/
│   ├── components/                 # Reusable UI cards, inputs, and portals
│   ├── lib/                        # Supabase client & Context Providers (Auth, Theme)
│   └── components/screens/chanda   # Chanda views code controllers
│
├── docs/
│   ├── architecture-diagram.png     # 📌 Exported architecture diagram
│   └── demo/                        # 🎬 Drop your demo GIFs here
│
└── supabase/
    ├── migrations/                   # SQL schema & RLS policies
    └── seed.sql
```

---

## ⚙️ Environment Setup

<details>
<summary><b>🔧 App Environment (<code>.env</code>)</b> — click to expand</summary>

<br/>

Create a `.env` file in the project root with the following variables:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_public_key
```

</details>

<details>
<summary><b>🗄️ Supabase Project Setup</b> — click to expand</summary>

<br/>

1. Create a new project at [supabase.com](https://supabase.com).
2. Run the migrations in `supabase/migrations/` and `migration_chanda.sql` to create tables and RLS policies.
3. Create Storage buckets named `avatars` (profile photos) and `chanda_proofs` (for coordinator payment proofs).
4. Copy your Project URL and public key into your app `.env` and Next.js portal configurations.

</details>

---

## 💻 Running the Project Locally

**1️⃣ Install Dependencies**

```bash
npm install
```

**2️⃣ Configure Environment**

```bash
cp .env.example .env
# fill in your Supabase URL & anon key
```

**3️⃣ Push Database Migrations**

```bash
npx supabase db push
```

**4️⃣ Start the App**

```bash
npx expo start
```

> **✨ Tip:** Scan the Metro QR code with **Expo Go** on your phone, or press `a` / `i` in the terminal to launch an Android/iOS simulator.

---

## 🎨 UI/UX Principles

- **🔒 Biometric Gate Guarding** — Secures dashboard entry using secure local authenticators before reading financial statements.
- **🧭 Safe-Area Aware** — `useSafeAreaInsets` keeps headers clear of notches & punch-holes on every device.
- **📐 Clearance Spacing** — 80–100px bottom padding keeps content clear of the floating tab bar.
- **🌗 Theme-Aware Contrast** — colors bind to `theme.colors.onSurface` / `theme.colors.surface`, never hardcoded — full Dark & Light mode support.

---

## 🤝 Contributing

Contributions, forks, and pull requests are welcome! 🎉

```bash
# 1. Fork the repo
# 2. Clone your fork
git clone https://github.com/AmanMahadik/Society_Sync.git

# 3. Create your feature branch
git checkout -b feature/amazing-feature

# 4. Commit your changes
git commit -m "Add some amazing feature"

# 5. Push to the branch
git push origin feature/amazing-feature

# 6. Open a Pull Request 🚀
```

Found a bug or have an idea? [Open an issue](../../issues) — every contribution helps make society management a little less painful for the next admin who picks it up.

---

## 📄 License

This project is **Proprietary**. All rights reserved. Redistribution, modification, or commercial use requires explicit prior permission from the author.

---

## 👤 Author

<div align="center">

**Aman Mahadik**

[![GitHub](https://img.shields.io/badge/GitHub-AmanMahadik-181717?style=for-the-badge&logo=github)](https://github.com/AmanMahadik)

<br/>

### ⭐ If SocietySync made your residential society a little less chaotic, consider giving it a star!

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:6C5CE7,50:203A43,100:0F2027&height=120&section=footer" width="100%"/>

</div>
