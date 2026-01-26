import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface TagSuggestion {
  name: string
  color: string
  confidence: number
  reasoning: string
}

/**
 * Suggest tags for content using AI
 */
export async function suggestTags(
  userId: string,
  content: string,
  resourceType: 'note' | 'recording' | 'task',
  existingTagNames: string[] = []
): Promise<TagSuggestion[]> {
  try {
    // Get user's existing tags to avoid duplicates and maintain consistency
    const supabase = await createClient()
    const { data: existingTags } = await supabase
      .from('tags')
      .select('name, color')
      .eq('user_id', userId)

    const existingTagList = existingTags?.map((t) => t.name).join(', ') || 'none'

    const systemPrompt = `You are a tag suggestion assistant. Analyze the content and suggest 3-5 relevant tags.

Rules:
1. Suggest tags that are concise (1-2 words)
2. Use lowercase for tag names
3. Avoid duplicates with existing tags: ${existingTagList}
4. Suggest tags that would help organize and find this content later
5. Consider the context: ${resourceType}
6. Assign colors from this palette: #3b82f6 (blue), #ef4444 (red), #10b981 (green), #f59e0b (amber), #8b5cf6 (purple), #ec4899 (pink), #06b6d4 (cyan), #84cc16 (lime), #f97316 (orange), #6366f1 (indigo)

Respond in JSON format:
{
  "suggestions": [
    {
      "name": "tag-name",
      "color": "#3b82f6",
      "confidence": 0.9,
      "reasoning": "Brief explanation"
    }
  ]
}`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Suggest tags for this ${resourceType}:\n\n${content.substring(0, 2000)}`,
        },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    })

    const result = JSON.parse(response.choices[0]?.message?.content || '{}')
    return result.suggestions || []
  } catch (error) {
    console.error('Error suggesting tags:', error)
    return []
  }
}

/**
 * Get or create a tag (returns existing tag if found, creates new one if not)
 */
export async function getOrCreateTag(
  userId: string,
  tagName: string,
  color: string
): Promise<string | null> {
  const supabase = await createClient()

  // Check if tag already exists
  const { data: existingTag } = await supabase
    .from('tags')
    .select('id')
    .eq('user_id', userId)
    .eq('name', tagName.toLowerCase())
    .single()

  if (existingTag) {
    return existingTag.id
  }

  // Create new tag
  const { data: newTag, error } = await supabase
    .from('tags')
    .insert({
      user_id: userId,
      name: tagName.toLowerCase(),
      color,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Error creating tag:', error)
    return null
  }

  return newTag.id
}
