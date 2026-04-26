# Dormitory System

This project uses Next.js + Express and stores application data in MongoDB.

## Prerequisites

- Node.js 20+
- A remote MongoDB instance (MongoDB Atlas recommended)

## Environment Setup

Create or edit `.env.local` in the project root:

```env
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=dormitory

# Optional AI settings
# OPENAI_API_KEY=your-openai-api-key-here
# OPENAI_BASE_URL=https://api.openai.com/v1
# AI_MODEL=gpt-4o-mini
```

Notes:
- `MONGODB_URI` should point to your remote cluster.
- `MONGODB_DB` controls which database this app uses. If omitted, it defaults to `dormitory`.
- The server will auto-create required indexes on startup.

## Install Dependencies

```bash
npm install
```

## Seed Demo Data

```bash
npm run seed
```

## Run Development Server

```bash
npm run dev
```

The app runs on http://localhost:3000.

## Tests

```bash
npm test
```

Integration tests use `mongodb-memory-server` and do not require your remote database.
