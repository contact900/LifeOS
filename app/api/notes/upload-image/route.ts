import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { createClient as createStorageClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      )
    }

    const supabase = await createClient()
    
    let user
    try {
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError) {
        return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
      }

      user = authUser
    } catch (authErr: any) {
      if (authErr?.name === 'AbortError') {
        return NextResponse.json({ error: 'Request aborted' }, { status: 499 })
      }
      return NextResponse.json({ error: 'Authentication error' }, { status: 401 })
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      )
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size must be less than 5MB' },
        { status: 400 }
      )
    }

    // Upload to Supabase Storage
    // Use service role key if available, otherwise use anon key
    const storageKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!storageKey) {
      return NextResponse.json(
        { error: 'Storage configuration missing' },
        { status: 500 }
      )
    }

    const storageClient = createStorageClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      storageKey
    )

    const timestamp = Date.now()
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/${timestamp}.${fileExt}`
    const filePath = `note-images/${fileName}`

    // Convert file to array buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Try to upload to 'notes' bucket, fallback to 'recordings' if notes doesn't exist
    let bucketName = 'notes'
    let { data, error } = await storageClient.storage
      .from(bucketName)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      })

    // If notes bucket doesn't exist, try recordings bucket
    if (error && error.message?.includes('not found')) {
      bucketName = 'recordings'
      const altPath = `note-images/${fileName}`
      const result = await storageClient.storage
        .from(bucketName)
        .upload(altPath, buffer, {
          contentType: file.type,
          upsert: false,
        })
      data = result.data
      error = result.error
    }

    if (error) {
      console.error('Error uploading image:', error)
      return NextResponse.json(
        { error: 'Failed to upload image. Please ensure a storage bucket exists.' },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = storageClient.storage
      .from(bucketName)
      .getPublicUrl(data.path)

    return NextResponse.json({
      url: urlData.publicUrl,
      path: data.path,
    })
  } catch (error) {
    console.error('Image upload API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
