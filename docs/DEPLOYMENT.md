# Deployment & Operations Guide

This document describes how to set up, run, deploy, and maintain FitOS on Vercel and Supabase.

---

## 1. Local Development Setup

To run FitOS on your local machine:

### Prerequisites
* **Node.js**: Version 18 or higher.
* **npm**: Version 9 or higher.

### Installation
1. Clone the repository and navigate to the project directory:
   ```bash
   git clone https://github.com/AbdullahMansurii/FitOS.git
   cd FitOS
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory and populate it with your environment variables (see below).
4. Spin up the Vite development server:
   ```bash
   npm run dev
   ```
   The local URL will be output to your terminal (typically `http://localhost:5173`).

---

## 2. Environment Variables

Create a `.env` file in the project root:

```ini
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# AI Coach Configuration
VITE_GROQ_API_KEY=gsk_your_groq_api_key_here
```

* **VITE_SUPABASE_URL**: Your project API URL, found in Supabase Settings → API.
* **VITE_SUPABASE_ANON_KEY**: The public/anon API key, found in Supabase Settings → API.
* **VITE_GROQ_API_KEY**: API key for the Groq Cloud console (used for LLM coaching and food parsing).

---

## 3. Supabase Database Configuration

To initialize a new Supabase instance:

1. Create a new project in the **Supabase Dashboard**.
2. Go to **SQL Editor** → click **New Query**.
3. Copy the contents of the database schema file: [`supabase/schema.sql`](file:///d:/FitOS/supabase/schema.sql).
4. Paste it into the editor and click **Run**.
5. Ensure the query returns successfully: `FitOS schema created successfully 🚀`.

---

## 4. Vercel Deployment

FitOS is built as a Static Site (Single Page App) and can be deployed directly to **Vercel** with zero backend servers.

### Steps
1. Push your clean code to **GitHub**:
   ```bash
   git add .
   git commit -m "deploy: initial setup"
   git push origin main
   ```
2. Open the **Vercel Dashboard** and click **Add New** → **Project**.
3. Import the `FitOS` repository.
4. Expand **Environment Variables** and add:
   * `VITE_SUPABASE_URL`
   * `VITE_SUPABASE_ANON_KEY`
   * `VITE_GROQ_API_KEY`
5. Click **Deploy**. Vercel will automatically detect Vite, compile the TypeScript, and publish the bundle.

---

## 5. Safely Executing SQL Migrations

When updating the database schema in production, follow these rules to prevent data loss or lockouts:

1. **Download Local Backup**: Open the active app → go to **Settings** → click **Download JSON Backup** and **Download Cloud Snapshot**.
2. **Review SQL**: Draft your schema modifications (e.g. adding columns, indexes, or policies) in a temporary file.
3. **Execute Draft**: Paste and run the query in the **Supabase SQL Editor**.
4. **Post-Migration Verification**: Run the verification script immediately to ensure the RLS policies remain correct:
   ```bash
   node scratch/verifyMigration.mjs
   ```
   If this verification fails, use the backup file to restore the database or run the rollback script immediately.
