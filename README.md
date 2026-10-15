# 🏢 ResHub — Enterprise Resource Reservation Management System

ResHub is a full-stack, enterprise-grade **Resource Reservation & Asset Management System** built with **Next.js 16 (App Router)**, **React 19**, **TypeScript**, **Tailwind CSS v4**, and **Prisma ORM (PostgreSQL)**.

It provides centralized scheduling, conflict-free booking, physical asset return workflows, real-time synchronization, and comprehensive administrative oversight across **Meeting Rooms**, **Corporate Vehicles**, and **Specialized Equipment**.

---

## 🌟 Key Features

### 📅 1. Interactive Visual Timeline

- **High-Contrast Scheduling Matrix:** Displays an interactive daily timeline for each resource track with 30-minute granularity.
- **Smart Horizontal Scrubbing:** Hovering the mouse wheel over the sticky hours ruler scrolls through the day smoothly.
- **Role-Adaptive Color Palette:**
  - **Admin View:** Executive Dark Slate (`bg-slate-900`) for confirmed bookings, warm amber dashed cards for pending requests, and clean badges for physical returns.
  - **Employee View:** Vibrant Brand Coral (`#ff6b35`) for own bookings, clean neutral slate for colleagues' reservations.
- **Intelligent Day Clamping:** Employees cannot book slots in past hours of the current day or select past dates. Admins retain full historical navigation.
- **Maintenance Mode Overlay:** Inactive resources display diagonal hazard stripes with locked interaction banners preventing accidental reservations.

---

### 🛡️ 2. Dual-Role Experience (RBAC)

#### 👨‍💼 Administrator

- **Direct Timeline Actions:** Click any reservation card directly on the timeline to:
  - ✅ **Approve** or ❌ **Reject** pending reservation requests.
  - 📦 **Mark as Returned** for physical assets (Vehicles & Equipment).
  - 🗑 **Cancel** any scheduled booking with automated audit logs.
- **Pending Approvals Quick Toggle:** Toolbar badge (`⏳ X Pending Approval`) isolates only the resources with pending requests on the selected day.
- **Admin Management Console (`/admin`):**
  - **Resource Catalog:** Create, edit, and toggle maintenance mode (`ACTIVE` / `INACTIVE`).
  - **Reservations Hub:** Search, filter, approve, and track reservations across all departments.
  - **Analytics & Insights:** Live charts on utilization rates, popular peak hours, and category breakdown.
  - **System Monitor & Role Governance:** Corporate Users Directory with one-click Administrator promotion, access revocation, search filtering, and immutable security audit logs.

#### 👩‍💻 Employee

- **Fast Booking Form:** Click any empty slot on an active resource track or use the Floating Action Button (`+`) to launch the booking modal with prefilled times.
- **Real-Time Conflict Prevention:** Automatic availability check against existing bookings before submission.
- **My Bookings Modal:** Floating, responsive modal to inspect, filter by status, and cancel upcoming own bookings without navigating away.
- **Live In-App Notification Center:** Bell notification center that automatically alerts employees when an administrator approves, rejects, or modifies their booking requests.

---

### 🚗 3. Physical Asset Return Lifecycle

Specialized workflows tailored for physical corporate property:

- **Meeting Rooms:** Standard conclusion lifecycle (`PENDING` ➔ `CONFIRMED` ➔ `COMPLETED`).
- **Vehicles & Equipment:** Dedicated check-in workflow (`PENDING` ➔ `CONFIRMED` [Active / Issued] ➔ `COMPLETED` [Returned]).
- Admins can verify physical item return with one click directly from the visual timeline or the admin hub.

---

### ⚡ 4. Real-Time Background Synchronization

- **Zero-Interruption Polling:** Background synchronization polls every 3.5 seconds to refresh timeline states, reservation statuses, and employee notifications.
- **Clean Experience:** Operates silently in the background without intrusive banners or manual refresh buttons.

---

### 🔒 5. Enterprise Security & Architecture

- **BOLA / IDOR Protection:** Object-Level Authorization ensures employees can strictly modify or cancel only their own reservations.
- **Server-Side Authorization:** Server Actions verify role credentials directly from cryptographically signed session cookies before any mutation.
- **Zod Schema Validation:** Every payload is validated against strict schemas to prevent SQL injection and malformed inputs.
- **Structured Security Audit Logs:** Critical actions (status changes, authorization violations, cancellations) are timestamped and logged with actor IDs.

---

## 🛠️ Tech Stack

| Layer              | Technology                                                                                                       |
| ------------------ | ---------------------------------------------------------------------------------------------------------------- |
| **Framework**      | [Next.js 16](https://nextjs.org/) (App Router & Server Actions)                                                  |
| **Language**       | [TypeScript 5](https://www.typescriptlang.org/) (Strict Mode)                                                    |
| **UI & Styling**   | [React 19](https://react.dev/), [Tailwind CSS v4](https://tailwindcss.com/), [Lucide React](https://lucide.dev/) |
| **Database & ORM** | PostgreSQL ([Supabase](https://supabase.com/)), [Prisma ORM 5](https://www.prisma.io/)                           |
| **Validation**     | [Zod 4](https://zod.dev/)                                                                                        |
| **Testing**        | [Jest](https://jestjs.io/) + `ts-jest`                                                                           |

---

## 📂 Project Structure

```text
├── __tests__/                   # Jest automated unit tests (Interval math, overlap logic)
├── prisma/
│   ├── schema.prisma            # Database models (User, Resource, Reservation, Enums)
│   └── seed.ts                  # Database seeding script with corporate demo data
├── src/
│   ├── actions/                 # Next.js Server Actions (Auth, Resource & Reservation mutations)
│   ├── app/                     # Next.js App Router
│   │   ├── admin/               # Admin Console (Resource management, Reservation hub, Analytics)
│   │   ├── api/                 # API Routes (Live timeline sync & notification endpoints)
│   │   ├── dashboard/           # Main Visual Calendar Timeline page
│   │   ├── login/               # Authentication page with demo credential pills
│   │   └── my-reservations/     # Fallback route redirecting to My Bookings modal
│   ├── components/              # Modular UI Components
│   │   ├── AdminHubClient.tsx   # Admin Hub client orchestration
│   │   ├── AdminReservationHub.tsx # Enterprise reservation management table
│   │   ├── AdminResourceManagement.tsx # Resource CRUD & maintenance toggle
│   │   ├── CalendarDashboard.tsx# Core horizontal scrollable timeline engine
│   │   ├── MyReservationsModal.tsx # Employee bookings popover modal
│   │   ├── Navbar.tsx           # Responsive enterprise navigation bar
│   │   └── NotificationCenter.tsx # Real-time notification popover & toast alerts
│   ├── lib/                     # Database client, session helpers, authorization guards
│   ├── schemas/                 # Zod validation schemas
│   └── services/                # Encapsulated business domain services
└── package.json
```

---

## 🚀 Getting Started

### 1. Prerequisites

- **Node.js**: v18.18.0 or newer
- **npm** or **pnpm**
- **PostgreSQL Database**: Local PostgreSQL or cloud instance (e.g. Supabase, Neon)

### 2. Environment Configuration

Create a `.env` file in the root directory (based on `.env.example`):

```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/[DATABASE]?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/[DATABASE]"
SESSION_SECRET="your-secure-random-32-byte-hex-string"
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Database Setup & Seeding

Push the Prisma schema to your PostgreSQL database and seed sample corporate resources and users:

```bash
npx prisma db push
npx prisma db seed
```

### 5. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

---

## 👥 Default Demo Credentials

The seed script creates the following pre-configured accounts:

| Role         | Name          | Email                 | Password      |
| ------------ | ------------- | --------------------- | ------------- |
| **Admin**    | Sarah Jenkins | `admin@primewave.com` | `admin123`    |
| **Employee** | David Chen    | `david@primewave.com` | `employee123` |
| **Employee** | Alex Morgan   | `alex@primewave.com`  | `employee123` |
| **Employee** | Elena Rostova | `elena@primewave.com` | `employee123` |

---

## 🧪 Testing

The repository contains automated unit tests covering the core interval mathematics and conflict overlap detection algorithms:

```bash
# Run Jest unit tests
npx jest
```

### Scheduling Interval Mathematics:

Two reservations $[Start_A, End_A)$ and $[Start_B, End_B)$ conflict if and only if:
$$\text{Conflict} \iff Start_A < End_B \land End_A > Start_B$$
Back-to-back reservations (where $End_A = Start_B$) are strictly non-conflicting and permitted.

---

## 📄 License

This project is licensed under the MIT License.
