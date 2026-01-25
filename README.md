# LifeOS - Personal AI Chief of Staff

A Next.js application that serves as your personal AI assistant, helping you manage tasks, recall memories, and stay organized using AI-powered features.

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)

## ✨ Features

- **🤖 AI Chat Interface**: Interactive chat with AI assistant powered by Google Gemini 2.5 Flash
- **🧠 Memory System**: Save and recall memories using vector embeddings (text-embedding-004)
- **✅ Task Management**: Create, list, and manage tasks with domain organization
- **🎤 Multi-Modal Input**:
  - Text input
  - Voice input (Web Speech API)
  - Vision mode (image upload and analysis)
  - CSV dropzone (for future P&L parsing)

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **Database**: Supabase (PostgreSQL + pgvector)
- **AI**: Vercel AI SDK with Google Gemini 2.5 Flash
- **Embeddings**: Google text-embedding-004

## 📋 Prerequisites

1. Node.js 18+ installed
2. A Supabase account and project
3. A Google AI API key ([Get one here](https://aistudio.google.com/apikey))

## 🚀 Quick Start

### 1. Clone the Repository

git clone https://github.com/contact900/LifeOS.git
cd LifeOS/life-os
