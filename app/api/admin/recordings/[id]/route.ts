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

    // Get recording to delete file from storage
    const { data: recording } = await supabase
      .from('recordings')
      .select('file_path')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    // Delete from storage if exists
    if (recording?.file_path) {
      await supabase.storage
        .from('recordings')
        .remove([recording.file_path])
    }

    // Delete from database
    const { error } = await supabase
      .from('recordings')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete recording error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
