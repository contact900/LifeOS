import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get recording to find file path
    const { data: recording } = await supabase
      .from('recordings')
      .select('file_path')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    // Delete from database
    const { error: dbError } = await supabase
      .from('recordings')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id)

    if (dbError) {
      console.error('Error deleting recording:', dbError)
      return NextResponse.json(
        { error: 'Failed to delete recording' },
        { status: 500 }
      )
    }

    // Delete file from storage if exists
    if (recording?.file_path) {
      const { error: storageError } = await supabase.storage
        .from('recordings')
        .remove([recording.file_path])

      if (storageError) {
        console.error('Error deleting file from storage:', storageError)
        // Don't fail the request if storage deletion fails
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Recordings API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
