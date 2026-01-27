# LifeOS - Personal AI Chief of Staff

A Next.js application that serves as your personal AI assistant, helping you manage memories, notes, recordings, tasks, goals, events, and stay organized using AI-powered features with advanced memory retrieval.

![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o-purple)

## ✨ Features

### Core Features
- **🤖 AI Chat Interface**: Interactive chat with AI assistant powered by OpenAI GPT-4o with LangGraph multi-agent system
- **🧠 Memory System**: Save and recall memories using vector embeddings (OpenAI text-embedding-3-small) with cross-category search
- **📝 Rich Text Notes**: Advanced note editor with code blocks, tables, images, links, and embeds
- **🎤 Voice Recordings**: Record, transcribe, and analyze audio recordings with AI-powered summaries
- **📎 File Attachments**: Attach PDFs, images, documents, and more to chat for AI analysis
- **🔍 Global Search**: Search across all notes, recordings, memories, tasks, goals, and events with advanced filters
- **🏷️ Tags & Organization**: Color-coded tags for notes, recordings, and tasks with tag-based filtering
- **✅ Task Management**: Create, organize, and track tasks with status, priority, categories, and due dates
- **📋 Templates**: Pre-built and custom templates for notes and recordings with quick creation
- **👥 Admin Dashboard**: Comprehensive admin interface to manage all your data
- **🎯 Expert Routing**: Intelligent routing to specialized experts (Finance, Work, Health, General) based on context

### New Features
- **⭐ Favorites & Bookmarks**: Star and pin important notes, recordings, tasks, and goals for quick access
- **📊 AI Insights & Analytics**: Weekly/monthly summaries, pattern recognition, and productivity insights
- **⌨️ Keyboard Shortcuts**: Power user features with comprehensive keyboard shortcuts and cheatsheet (⌘? / Ctrl+?)
- **🔗 Third-Party Integrations**: Connect Gmail, Outlook, Google Calendar, and Slack via OAuth 2.0
- **🎯 Goals & Milestones**: Set and track goals with milestones and progress tracking
- **⏰ Reminders**: Create reminders with notifications and email alerts
- **📅 Calendar & Events**: Manage events and calendar integration
- **📦 Batch Operations**: Bulk delete, tag, and export for notes and recordings
- **🖼️ Rich Media**: Upload and embed images, videos, and other media in notes

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Shadcn/UI components
- **Icons**: Lucide React
- **Database**: Supabase (PostgreSQL + pgvector)
- **AI**: OpenAI GPT-4o via Vercel AI SDK
- **Embeddings**: OpenAI text-embedding-3-small
- **Multi-Agent**: LangGraph for expert routing
- **Rich Text**: Tiptap editor with extensions (code blocks, tables, images, links, embeds)
- **Storage**: Supabase Storage for file uploads
- **OAuth**: OAuth 2.0 for third-party integrations

## 📋 Prerequisites

1. Node.js 18+ installed
2. Docker Desktop (for local Supabase development)
3. A Supabase account and project (or use local Supabase)
4. An OpenAI API key ([Get one here](https://platform.openai.com/api-keys))
5. (Optional) OAuth credentials for integrations:
   - Google OAuth (for Gmail, Google Calendar)
   - Microsoft OAuth (for Outlook)
   - Slack OAuth (for Slack)

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
     - `notes` (public, for note images)

#### Option B: Remote Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Run all migration files in order from `supabase/migrations/`
3. Create storage buckets: `chat_uploads`, `recordings`, and `notes`

### 4. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase (use values from `npx supabase status` for local)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# OAuth Integrations (Optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
MICROSOFT_CLIENT_ID=your_microsoft_client_id
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret
SLACK_CLIENT_ID=your_slack_client_id
SLACK_CLIENT_SECRET=your_slack_client_secret
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
│   │   ├── events/           # Events CRUD operations
│   │   ├── favorites/        # Favorites/bookmarks API
│   │   ├── goals/            # Goals and milestones API
│   │   ├── insights/         # AI insights and analytics API
│   │   ├── integrations/     # Third-party integrations API
│   │   ├── notes/            # Notes CRUD and bulk operations
│   │   ├── recordings/       # Recording management and bulk operations
│   │   ├── reminders/        # Reminders API
│   │   ├── tasks/            # Task management API
│   │   ├── tags/             # Tags API
│   │   ├── templates/        # Templates API
│   │   └── search/           # Global search API
│   ├── calendar/             # Calendar and events page
│   ├── favorites/            # Favorites/bookmarks page
│   ├── goals/                # Goals page
│   ├── insights/             # AI insights page
│   ├── integrations/         # Integrations page
│   ├── notes/                # Notes page
│   ├── recordings/           # Recordings page
│   ├── reminders/            # Reminders page
│   ├── tasks/                # Tasks page
│   └── page.tsx              # Main chat interface
├── components/
│   ├── admin/                # Admin dashboard components
│   ├── batch-operations/     # Batch operations UI
│   ├── calendar/             # Calendar components
│   ├── chat/                 # Chat interface components
│   ├── favorites/            # Favorites components
│   ├── notes/                # Notes editor (Tiptap)
│   ├── recorder/             # Audio recorder component
│   ├── reminders/            # Reminder components
│   ├── search/               # Global search component
│   ├── shortcuts/            # Keyboard shortcuts cheatsheet
│   ├── sidebar/              # Sidebar components
│   ├── tags/                 # Tag management components
│   ├── templates/            # Template components
│   └── ui/                   # Shadcn/UI components
├── lib/
│   ├── agents/               # LangGraph multi-agent system
│   │   ├── experts/          # Expert agents (Finance, Work, Health, General)
│   │   ├── tools/            # Search tools for all content types
│   │   ├── graph.ts          # Agent workflow graph
│   │   └── router.ts        # Intent routing
│   ├── hooks/                # Custom React hooks (keyboard shortcuts)
│   ├── notifications/        # Browser notifications
│   ├── rag/                  # Vector search and memory management
│   ├── supabase/             # Supabase client utilities
│   └── tiptap/               # Custom Tiptap extensions
├── supabase/
│   └── migrations/           # Database migrations
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
- Your tasks (for task management and reminders)
- Your goals (for goal tracking and planning)
- Your events (for calendar and scheduling)
- Tag suggestions (AI can suggest tags for your content)

## 📝 Features in Detail

### Chat Interface
- Real-time streaming responses
- File attachment support (PDF, images, documents, CSV, JSON)
- Conversation history with memory retrieval
- Cross-category memory search

### Notes
- **Rich text editor** with full formatting capabilities:
  - Text formatting (bold, italic, headings, lists, blockquotes)
  - Code blocks with syntax highlighting
  - Tables with resizable columns
  - Image upload and embedding
  - Links and embeds (YouTube, Vimeo, etc.)
- Full-text search
- Automatic saving
- Tag support with color coding
- Template support for quick creation
- Batch operations (bulk delete, tag, export)
- Favorites/bookmarks with pinning
- AI can access and reference your notes

### Recordings
- Browser-based audio recording
- Automatic transcription via OpenAI Whisper
- AI-powered summarization
- Searchable transcripts
- Tag support with color coding
- Template support for structured recordings
- Batch operations (bulk delete, tag, export)
- Favorites/bookmarks

### Tasks
- Create and manage tasks with status (todo, in_progress, done)
- Priority levels (low, medium, high)
- Categories (finance, work, health, general)
- Due dates with overdue indicators
- Tag support for organization
- Filter by status, category, priority, and tags

### Goals & Milestones
- Create and track goals with milestones
- Progress tracking and visualization
- Due dates and completion status
- Categories and tags
- AI-powered goal insights

### Reminders
- Create reminders with custom schedules
- Browser notifications
- Email reminders (optional)
- Recurring reminders support
- Integration with tasks and events

### Calendar & Events
- Create and manage events
- Calendar view with month/week/day views
- Event details and notes
- Link events to notes and recordings
- Integration with Google Calendar (via integrations)

### Favorites & Bookmarks
- Star important items (notes, recordings, tasks, goals, events)
- Pin items to keep them at the top
- Quick access sidebar
- Dedicated favorites page with filtering
- Visual indicators for starred and pinned items

### AI Insights & Analytics
- **Weekly Summaries**: AI-generated weekly summaries of your activity
- **Monthly Summaries**: Comprehensive monthly overviews
- **Pattern Recognition**: Identify patterns in your notes, recordings, and tasks
- **Productivity Insights**: Track productivity metrics and trends
- Visual charts and analytics

### Keyboard Shortcuts
- **Navigation**: Quick access to all pages (⌘1-9 / Ctrl+1-9)
- **Global Search**: ⌘K / Ctrl+K
- **Shortcuts Cheatsheet**: ⌘? / Ctrl+?
- **Page-specific shortcuts**: 
  - Notes: ⌘N for new note, ⌘S to save
  - Power user shortcuts throughout the app

### Third-Party Integrations
- **Gmail**: Sync emails and extract information
- **Outlook**: Connect Microsoft Outlook account
- **Google Calendar**: Sync calendar events
- **Slack**: Connect Slack workspace
- OAuth 2.0 authentication
- Manual sync and auto-sync options
- Integration status and management

### Batch Operations
- **Bulk Delete**: Delete multiple items at once
- **Bulk Tag**: Add tags to multiple items
- **Bulk Export**: Export selected items as JSON
- Available for notes and recordings
- Selection UI with checkboxes
- Confirmation dialogs for destructive actions

### Tags & Organization
- Color-coded tags for notes, recordings, and tasks
- Tag-based filtering across all content types
- Custom tag colors from predefined palette
- AI can suggest relevant tags
- Tag management in admin dashboard

### Global Search
- Search across notes, recordings, memories, tasks, goals, and events
- Filter by type, category, tags, and date range
- Quick access via search icon in header (⌘K / Ctrl+K)
- Real-time search results with previews

### Templates
- Pre-built system templates (Meeting Notes, Journal Entry, Project Planning, Daily Standup, etc.)
- Custom template creation for notes and recordings
- Quick template buttons for fast creation
- Template management in admin dashboard
- Note templates with rich text structure
- Recording templates with instructions

### Admin Dashboard
- View all memories, notes, recordings, tasks, goals, events, tags, and templates
- Search and filter functionality
- Export data to CSV
- Delete records
- Manage tags and templates
- Comprehensive data management

## 🔧 Development

### Running Migrations

```bash
# Local Supabase
npx supabase migration up

# Remote Supabase
# Run the SQL migrations in order:
# 1. supabase/migrations/001_initial_schema.sql
# 2. supabase/migrations/002_add_tasks.sql
# 3. supabase/migrations/003_add_tags.sql
# 4. supabase/migrations/004_add_templates.sql
# 5. supabase/migrations/005_add_reminders.sql
# 6. supabase/migrations/006_add_events.sql
# 7. supabase/migrations/007_add_goals.sql
# 8. supabase/migrations/008_add_integrations.sql
# 9. supabase/migrations/009_add_insights.sql
# 10. supabase/migrations/010_add_favorites.sql
```

### Database Schema

Key tables:
- `memories`: Vector embeddings for chat/notes/recordings
- `notes`: Rich text notes with Tiptap JSON
- `recordings`: Audio recordings with transcripts and summaries
- `tasks`: Task management with status, priority, category, and due dates
- `goals`: Goals with milestones and progress tracking
- `events`: Calendar events with details and links
- `reminders`: Reminders with schedules and notifications
- `tags`: User-defined tags with color coding
- `notes_tags`, `recordings_tags`, `tasks_tags`: Junction tables for tag associations
- `templates`: System and user-created templates for notes and recordings
- `integrations`: Third-party OAuth integrations
- `favorites`: Starred and pinned items
- `insights`: AI-generated insights and summaries
- `insight_patterns`: Pattern recognition data
- `productivity_metrics`: Productivity tracking metrics

Migration files:
- `001_initial_schema.sql`: Core tables (memories, notes, recordings)
- `002_add_tasks.sql`: Task management system
- `003_add_tags.sql`: Tags and organization system
- `004_add_templates.sql`: Templates system
- `005_add_reminders.sql`: Reminders system
- `006_add_events.sql`: Calendar and events system
- `007_add_goals.sql`: Goals and milestones system
- `008_add_integrations.sql`: Third-party integrations
- `009_add_insights.sql`: AI insights and analytics
- `010_add_favorites.sql`: Favorites and bookmarks

### Environment Variables

Required:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`

Optional (for integrations):
- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`
- `MICROSOFT_CLIENT_ID` & `MICROSOFT_CLIENT_SECRET`
- `SLACK_CLIENT_ID` & `SLACK_CLIENT_SECRET`

## 📚 Documentation

- [Supabase Setup Guide](./SUPABASE_SETUP.md) - Detailed Supabase configuration
- Database migrations in `supabase/migrations/`

## 🎯 Usage Tips

### Keyboard Shortcuts
- Press `⌘?` or `Ctrl+?` to view all available keyboard shortcuts
- Use `⌘K` or `Ctrl+K` for quick global search
- Navigate pages with `⌘1-9` or `Ctrl+1-9`

### Batch Operations
1. Select items using checkboxes
2. Use the batch operations bar that appears
3. Choose your action (delete, tag, export)

### Favorites
- Click the star icon to favorite items
- Click the pin icon (after favoriting) to pin items
- Access favorites via the Favorites page or sidebar

### Rich Text Notes
- Use the toolbar for formatting
- Insert code blocks with the code button
- Add tables with the table button
- Upload images or paste image URLs
- Embed videos with the embed button

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is private and proprietary.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [Shadcn/UI](https://ui.shadcn.com/)
- AI powered by [OpenAI](https://openai.com/)
- Database by [Supabase](https://supabase.com/)
- Rich text editing with [Tiptap](https://tiptap.dev/)