# LifeOS - Personal AI Chief of Staff

A Next.js application that serves as your personal AI assistant, helping you manage memories, notes, recordings, and stay organized using AI-powered features with advanced memory retrieval.

![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o-purple)

## ✨ Features

- **🤖 AI Chat Interface**: Interactive chat with AI assistant powered by OpenAI GPT-4o with LangGraph multi-agent system
- **🧠 Memory System**: Save and recall memories using vector embeddings (OpenAI text-embedding-3-small) with cross-category search
- **📝 Rich Text Notes**: Create and manage notes with Tiptap rich text editor
- **🎤 Voice Recordings**: Record, transcribe, and analyze audio recordings with AI-powered summaries
- **📎 File Attachments**: Attach PDFs, images, documents, and more to chat for AI analysis
- **🔍 Smart Search**: AI can access and search through your notes, recordings, and past conversations
- **👥 Admin Dashboard**: Comprehensive admin interface to manage all your data (memories, notes, recordings)
- **🎯 Expert Routing**: Intelligent routing to specialized experts (Finance, Work, Health, General) based on context

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Shadcn/UI components
- **Icons**: Lucide React
- **Database**: Supabase (PostgreSQL + pgvector)
- **AI**: OpenAI GPT-4o via Vercel AI SDK
- **Embeddings**: OpenAI text-embedding-3-small
- **Multi-Agent**: LangGraph for expert routing
- **Rich Text**: Tiptap editor for notes
- **Storage**: Supabase Storage for file uploads

## 📋 Prerequisites

1. Node.js 18+ installed
2. Docker Desktop (for local Supabase development)
3. A Supabase account and project (or use local Supabase)
4. An OpenAI API key ([Get one here](https://platform.openai.com/api-keys))

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/contact900/LifeOS.git
cd LifeOS
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Supabase

#### Option A: Local Supabase (Recommended for Development)

1. **Start Supabase locally:**
   ```bash
   npx supabase start
   ```

2. **Run migrations:**
   ```bash
   npx supabase migration up
   ```

3. **Get your local credentials:**
   ```bash
   npx supabase status
   ```

4. **Set up storage buckets:**
   - Open Supabase Studio: `http://localhost:54323`
   - Go to Storage and create these buckets:
     - `chat_uploads` (public)
     - `recordings` (public)

#### Option B: Remote Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Run the migration file: `supabase/migrations/001_initial_schema.sql`
3. Create storage buckets: `chat_uploads` and `recordings`

### 4. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase (use values from `npx supabase status` for local)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key
```

### 5. Run the Development Server

```bash
npm run dev
```

### 6. Open Your Browser

Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
LifeOS/
├── app/
│   ├── (auth)/              # Authentication pages
│   ├── admin/                # Admin dashboard
│   ├── api/
│   │   ├── admin/           # Admin API routes
│   │   ├── chat/            # Chat API with LangGraph agents
│   │   ├── notes/           # Notes CRUD operations
│   │   └── recordings/      # Recording management
│   ├── notes/               # Notes page
│   ├── recordings/          # Recordings page
│   └── page.tsx             # Main chat interface
├── components/
│   ├── admin/               # Admin dashboard components
│   ├── chat/                # Chat interface components
│   ├── notes/               # Notes editor (Tiptap)
│   ├── recorder/            # Audio recorder component
│   └── ui/                  # Shadcn/UI components
├── lib/
│   ├── agents/              # LangGraph multi-agent system
│   │   ├── experts/         # Expert agents (Finance, Work, Health, General)
│   │   ├── tools/           # Search tools for notes/recordings
│   │   ├── graph.ts         # Agent workflow graph
│   │   └── router.ts       # Intent routing
│   ├── rag/                 # Vector search and memory management
│   └── supabase/            # Supabase client utilities
├── supabase/
│   └── migrations/          # Database migrations
└── package.json
```

## 🧠 Memory System

The memory system uses vector embeddings to store and retrieve:
- **Chat conversations**: All user messages and AI responses
- **Notes content**: Extracted text from your notes
- **Recording summaries**: AI-generated summaries from recordings

Memories are categorized and searchable across:
- Finance
- Work
- Health
- General

The AI can search across all categories when you ask about past conversations.

## 🤖 Multi-Agent System

LifeOS uses LangGraph to route your queries to specialized expert agents:

- **Finance Expert**: Budgeting, investments, expenses, financial planning
- **Work Expert**: Career, projects, meetings, professional development
- **Health Expert**: Fitness, nutrition, wellness, mental health
- **General Expert**: General questions and casual conversation

Each expert has access to:
- Relevant memories from their category
- Your notes (searched by relevance)
- Your recordings (searched by transcript/summary)

## 📝 Features in Detail

### Chat Interface
- Real-time streaming responses
- File attachment support (PDF, images, documents, CSV, JSON)
- Conversation history with memory retrieval
- Cross-category memory search

### Notes
- Rich text editor with formatting (bold, italic, headings, lists)
- Full-text search
- Automatic saving
- AI can access and reference your notes

### Recordings
- Browser-based audio recording
- Automatic transcription via OpenAI Whisper
- AI-powered summarization
- Searchable transcripts

### Admin Dashboard
- View all memories, notes, and recordings
- Search and filter functionality
- Export data
- Delete records

## 🔧 Development

### Running Migrations

```bash
# Local Supabase
npx supabase migration up

# Remote Supabase
# Run the SQL from supabase/migrations/001_initial_schema.sql in your Supabase SQL editor
```

### Database Schema

Key tables:
- `memories`: Vector embeddings for chat/notes/recordings
- `notes`: Rich text notes with Tiptap JSON
- `recordings`: Audio recordings with transcripts and summaries

See `supabase/migrations/001_initial_schema.sql` for full schema.

### Environment Variables

Required:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`

## 📚 Documentation

- [Supabase Setup Guide](./SUPABASE_SETUP.md) - Detailed Supabase configuration
- Database migrations in `supabase/migrations/`

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is private and proprietary.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [Shadcn/UI](https://ui.shadcn.com/)
- AI powered by [OpenAI](https://openai.com/)
- Database by [Supabase](https://supabase.com/)
