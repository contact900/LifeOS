import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'

/**
 * Email reminder service using Resend
 * Sends email notifications when reminders are due
 */

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { reminderId, reminderTitle, reminderDescription, dueDate } = body

    // Get user email
    const { data: userData } = await supabase.auth.getUser()
    const userEmail = userData?.user?.email

    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email not found' },
        { status: 400 }
      )
    }

    // Send email notification using Resend
    const RESEND_API_KEY = process.env.RESEND_API_KEY
    if (!RESEND_API_KEY) {
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      )
    }

    const resend = new Resend(RESEND_API_KEY)
    
    await resend.emails.send({
      from: 'LifeOS <onboarding@resend.dev>',
      to: userEmail,
      subject: `Reminder: ${reminderTitle}`,
      html: `
        <h2>Reminder: ${reminderTitle}</h2>
        ${reminderDescription ? `<p>${reminderDescription}</p>` : ''}
        <p><strong>Due:</strong> ${new Date(dueDate).toLocaleString()}</p>
      `,
    })

    return NextResponse.json({
      success: true,
      message: 'Email reminder sent successfully',
    })
  } catch (error) {
    console.error('Email reminder API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
