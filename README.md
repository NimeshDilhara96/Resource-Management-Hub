# ApparelFlow ERP

ApparelFlow ERP is a robust, modular Enterprise Resource Planning application designed specifically for the garment manufacturing industry. It digitizes the production floor by managing the flow of cutting orders, quality control verification, and sewing assembly.

## Features

* **Role-Based Access Control (RBAC):** Strict isolation between `cutting_supervisor`, `cutting_verifier`, and `sewing_supervisor`.
* **Cutting Supervisor Terminal:** Form to create cutting batches based on predefined recipes, calculating target quantities against expected garment components.
* **Gatekeeper (Verifier) Terminal:** A secure Quality Control terminal that utilizes a **Traffic Light System** (GREEN/YELLOW/RED) to identify component shortages. 
* **Server-Side Hard Stops:** Strictly enforces business rules by returning `422 Unprocessable Entity` if an unauthorized approval is attempted on a RED (shortage) batch.
* **Fabric Wastage Calculation:** Automatically calculates the percentage of fabric wasted vs. the standard recipe yardage.
* **Sewing Queue:** Query-isolated dashboard that ensures only batches marked as `VERIFIED` ever reach the sewing assembly line.
* **Immutable Audit Trails:** Uses Prisma Database Transactions to securely log verification decisions, verifier IDs, and timestamps.
* **Schema Validation:** Strictly validates all incoming user inputs and API payloads using **Zod** to prevent injection and guarantee data integrity.
* **Automated Testing:** Business rules and wastage calculations are extracted into pure functions and covered by comprehensive Jest Unit Tests.

## Tech Stack

* **Framework:** [Next.js 15](https://nextjs.org/) (App Router & Server Actions)
* **Language:** TypeScript
* **ORM:** [Prisma 5](https://www.prisma.io/)
* **Database:** PostgreSQL (Supabase)
* **Validation:** [Zod](https://zod.dev/)
* **Styling:** Tailwind CSS (Vanilla)
* **Testing:** Jest + `ts-jest`

## Getting Started

### 1. Prerequisites
Ensure you have Node.js (v18+) and npm installed on your machine.

### 2. Installation
Clone the repository and install the dependencies:
```bash
npm install
```

### 3. Database Setup
Push the Prisma schema to the SQLite database and seed the initial users/recipes:
```bash
npx prisma db push
npx tsx prisma/seed.ts
```

### 4. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser. You will be greeted by the **Demo Role Switcher**, which allows you to bypass a standard login and easily test all 3 roles.

## Running Tests

To execute the automated unit tests for the core business logic (Traffic Light & Wastage calculations):
```bash
npx jest
```

## Security & Architecture Notes
This project prioritizes backend security. Form submissions and state transitions are not trusted from the client. All actions (`submitOrderAction`, `submitVerificationAction`) enforce session validation (`requireRole`) and recalculate expected states against the database before committing transactions. See the `AI_OPTIMIZATION_REPORT.md` for more details on architectural decisions.
