# Environment Variables Setup Guide

To run the Wolt AI Chat Agent, you need to populate the three credentials in the `.env` file. This guide explains step-by-step how to obtain each of them.

---

## 1. Google Gemini API Key (`GEMINI_API_KEY`)

The agent uses **Gemini 2.0 Flash** for text generation and **text-embedding-004** for generating vector embeddings.

### Steps to obtain:
1. Go to **[Google AI Studio](https://aistudio.google.com/)**.
2. Sign in with your Google account.
3. Click on the **"Get API key"** button in the top left/sidebar.
4. Click **"Create API key"** (select a project or create a new one).
5. Copy the generated API key (e.g., `AIzaSy...`).
6. Paste it into the `.env` file as:
   ```env
   GEMINI_API_KEY=AIzaSyYourKeyHere
   ```

---

## 2. PostgreSQL Connection URI (`DATABASE_URL`)

The agent stores knowledge embeddings and chat logs in a PostgreSQL database. Since standard cPanel hosting does not support the `pgvector` extension, you must use a cloud-hosted PostgreSQL database. **Neon** and **Supabase** both offer free PostgreSQL databases with native `pgvector` support.

### Option A: Neon DB (Recommended for quick setup)
1. Go to **[Neon.tech](https://neon.tech/)** and sign up for a free account.
2. Create a new project. Select your preferred database version (Postgres 15 or 16 is recommended).
3. On the Neon Dashboard, copy the **Connection string** shown in the "Connection Details" box.
   - *Ensure the connection type is set to **Node.js** or **Pooled** if available.*
   - E.g., `postgresql://heshan:password@ep-cool-fog-123456.us-east-2.aws.neon.tech/neondb?sslmode=require`
4. Paste it into the `.env` file as:
   ```env
   DATABASE_URL=postgresql://heshan:password@ep-cool-fog-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

### Option B: Supabase
1. Go to **[Supabase.com](https://supabase.com/)** and sign up for a free account.
2. Create a new project and set a strong database password.
3. Navigate to **Project Settings** > **Database**.
4. Scroll down to the **Connection URI** section.
5. Copy the URI and replace `[YOUR-PASSWORD]` with the database password you chose.
   - E.g., `postgresql://postgres:your_password@db.xxxxxx.supabase.co:5432/postgres`
6. Paste it into the `.env` file as:
   ```env
   DATABASE_URL=postgresql://postgres:your_password@db.xxxxxx.supabase.co:5432/postgres
   ```

---

## 3. Telegram Bot Token (`TELEGRAM_BOT_TOKEN`)

The agent uses Telegram as its immediate testing interface. You need to register a new bot with BotFather to obtain a bot token.

### Steps to obtain:
1. Open the Telegram app on your phone or desktop.
2. Search for **[@BotFather](https://t.me/BotFather)** (the official bot creation bot, look for the blue verification checkmark).
3. Start a conversation with BotFather and send the command:
   ```text
   /newbot
   ```
4. Follow the prompts:
   - Choose a display name for your bot (e.g., `Wolt Pizza Assistant`).
   - Choose a unique username for your bot ending in `bot` (e.g., `WoltPizzaCafeBot`).
5. BotFather will reply with a success message containing your **HTTP API Token**.
   - E.g., `1234567890:ABCdefGhIJKlmNoPQRsTUVwxyZ`
6. Paste it into the `.env` file as:
   ```env
   TELEGRAM_BOT_TOKEN=1234567890:ABCdefGhIJKlmNoPQRsTUVwxyZ
   ```

---

## 🚀 What to do next

Once all three values are added to your [.env](file:///c:/Users/Heshan/Desktop/Wolt%20AI/.env) file:
1. **Sync Database Schema:**
   ```bash
   npm run db:push
   ```
2. **Ingest Documents:**
   ```bash
   npm run ingest
   ```
3. **Verify Everything (Integration Tests):**
   ```bash
   npm run test:embeddings
   npm run test:ai
   ```
4. **Run the Agent Bot:**
   ```bash
   npm run dev
   ```
