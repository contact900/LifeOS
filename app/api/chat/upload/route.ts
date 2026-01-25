import { createClient } from '@/lib/supabase/server'
import { createClient as createStorageClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { saveMemory, MemoryCategory } from '@/lib/rag/vector-search'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
      )
    }

    let extractedText = ''

    // Extract text based on file type
    const fileType = file.type || file.name.split('.').pop()?.toLowerCase()

    if (fileType?.includes('text') || fileType === 'txt' || fileType === 'md') {
      // Plain text files
      extractedText = await file.text()
    } else if (fileType === 'json') {
      // JSON files
      const jsonText = await file.text()
      try {
        const json = JSON.parse(jsonText)
        extractedText = JSON.stringify(json, null, 2)
      } catch {
        extractedText = jsonText
      }
    } else if (fileType === 'csv') {
      // CSV files
      extractedText = await file.text()
    } else if (
      fileType?.includes('pdf') ||
      fileType?.includes('doc') ||
      fileType?.includes('docx')
    ) {
      // For PDF and DOCX, try to read as text first
      // Note: For better PDF/DOCX extraction, you may want to use a library like pdf-parse or mammoth
      try {
        extractedText = await file.text()
        // If the text extraction doesn't work well, inform the user
        if (!extractedText || extractedText.length < 10) {
          extractedText = `[File: ${file.name}]\n\nNote: This file format (${fileType}) may require manual text extraction. The file has been uploaded but text extraction was limited.`
        }
      } catch (error) {
        console.error('Error reading document:', error)
        extractedText = `[File: ${file.name}]\n\nCould not extract text from this file format. Please copy and paste the content manually.`
      }
    } else if (
      fileType?.includes('image') ||
      fileType === 'png' ||
      fileType === 'jpg' ||
      fileType === 'jpeg'
    ) {
      // Use OpenAI Vision API for images
      try {
        const imageBuffer = await file.arrayBuffer()
        const base64Image = Buffer.from(imageBuffer).toString('base64')
        const dataUrl = `data:${file.type};base64,${base64Image}`

        const response = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Extract all text and describe the content of this image in detail. Include any text, numbers, charts, graphs, or other information visible.',
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: dataUrl,
                  },
                },
              ],
            },
          ],
          max_tokens: 1000,
        })

        extractedText =
          response.choices[0]?.message?.content ||
          'Could not extract text from image'
      } catch (error) {
        console.error('Error processing image:', error)
        extractedText = `Image file: ${file.name} (could not extract text)`
      }
    } else {
      // Fallback: try to read as text
      try {
        extractedText = await file.text()
      } catch {
        extractedText = `File: ${file.name} (content could not be extracted)`
      }
    }

    if (!extractedText.trim()) {
      return NextResponse.json(
        { error: 'Could not extract text from file' },
        { status: 400 }
      )
    }

    // Upload file to Supabase Storage for reference
    const storageClient = createStorageClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const timestamp = Date.now()
    const filePath = `chat-files/${user.id}/${timestamp}-${file.name}`

    const fileBuffer = await file.arrayBuffer()
    const { error: uploadError } = await storageClient.storage
      .from('recordings') // Reuse recordings bucket or create a new one
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Error uploading file to storage:', uploadError)
      // Continue even if upload fails - we still have the extracted text
    }

    // Categorize and save as memory
    // Use OpenAI to categorize the content
    let category: MemoryCategory = 'general'
    try {
      const categoryResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content:
              'Categorize the following content as: finance, work, health, or general. Respond with only one word.',
          },
          {
            role: 'user',
            content: `File: ${file.name}\n\nContent preview: ${extractedText.substring(0, 500)}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 10,
      })

      const categoryText =
        categoryResponse.choices[0]?.message?.content?.toLowerCase().trim() ||
        'general'
      if (
        ['finance', 'work', 'health', 'general'].includes(categoryText)
      ) {
        category = categoryText as MemoryCategory
      }
    } catch (error) {
      console.error('Error categorizing file:', error)
    }

    // Save file content as memory
    const fileContentForMemory = `[File: ${file.name}]\n${extractedText}`
    
    // Chunk if too long
    const maxChunkLength = 1000
    if (fileContentForMemory.length > maxChunkLength) {
      const chunks: string[] = []
      let currentChunk = ''
      const sentences = fileContentForMemory.split(/[.!?]\s+/)

      for (const sentence of sentences) {
        if (currentChunk.length + sentence.length > maxChunkLength) {
          chunks.push(currentChunk)
          currentChunk = sentence
        } else {
          currentChunk += (currentChunk ? '. ' : '') + sentence
        }
      }
      if (currentChunk) {
        chunks.push(currentChunk)
      }

      // Save each chunk
      for (const chunk of chunks) {
        await saveMemory(user.id, chunk, category, 'note').catch((err) => {
          console.error('Error saving memory chunk:', err)
        })
      }
    } else {
      await saveMemory(user.id, fileContentForMemory, category, 'note').catch(
        (err) => {
          console.error('Error saving memory:', err)
        }
      )
    }

    return NextResponse.json({
      success: true,
      text: extractedText,
      category,
      filePath: uploadError ? null : filePath,
    })
  } catch (error) {
    console.error('File upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
