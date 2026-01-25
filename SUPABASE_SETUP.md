# Supabase Setup Instructions

## 1. Database Migration

Run the migration file to set up the database schema:

```bash
supabase migration up
```

Or apply the migration manually through the Supabase dashboard SQL editor:
- Copy the contents of `supabase/migrations/001_initial_schema.sql`
- Paste into the SQL editor in your Supabase project
- Execute the migration

## 2. Storage Bucket Setup

Create a storage bucket for recordings:

1. Go to Storage in your Supabase dashboard
2. Create a new bucket named `recordings`
3. Set it to **Public** (or configure RLS policies as needed)
4. Add RLS policies:
   - Users can upload files to their own folder: `recordings/{user_id}/*`
   - Users can read files from their own folder

## 3. Environment Variables

Make sure your `.env.local` file contains:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
OPENAI_API_KEY=your_openai_api_key
```

## 4. Enable pgvector Extension

The migration should enable pgvector, but if needed:
- Go to Database → Extensions in Supabase dashboard
- Enable the `vector` extension

## 5. Test the Setup

1. Start the development server: `npm run dev`
2. Navigate to `/login` and create an account
3. Test the chat, notes, and recordings features
