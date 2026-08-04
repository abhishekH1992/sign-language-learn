import OpenAI from 'openai'

export type QuizFeedbackInput = {
  lessonName: string
  maoriName?: string | null
  score: number
  maxScore: number
  wrongTips: string[]
}

export type PracticeFeedbackInput = {
  lessonName: string
  maoriName?: string | null
  score: number
  signalCodes: string[]
}

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null
  return new OpenAI({ apiKey })
}

export function fallbackQuizFeedback(input: QuizFeedbackInput): string {
  if (input.score === input.maxScore) {
    return `Great work on “${input.lessonName}”${input.maoriName ? ` (${input.maoriName})` : ''}. You answered every question correctly. Review the video once more to lock in the handshape, then move to the next lesson when ready.`
  }

  const tipBit = input.wrongTips.length
    ? ` Focus next on: ${input.wrongTips.slice(0, 2).join(' ')}`
    : ' Rewatch the lesson video and try the quiz again — retakes are unlimited.'

  return `You scored ${input.score}/${input.maxScore} on “${input.lessonName}”.${tipBit}`
}

export function fallbackPracticeFeedback(input: PracticeFeedbackInput): string {
  const signals = input.signalCodes.length
    ? input.signalCodes
        .map((code) => {
          if (code === 'hand_not_in_frame') return 'Keep your hand fully visible in the camera frame.'
          if (code === 'low_confidence') return 'Hold the handshape steady for a moment so we can read it clearly.'
          if (code === 'shape_mismatch') return 'Compare your fingers to the lesson drawing and adjust the handshape.'
          return code.replaceAll('_', ' ')
        })
        .join(' ')
    : 'Nice clarity — keep practising the movement slowly.'

  return `Practice score ${Math.round(input.score)}% for “${input.lessonName}”. ${signals}`
}

export async function generateQuizFeedback(input: QuizFeedbackInput): Promise<{
  feedback: string
  usedOpenAI: boolean
  fallback: string
}> {
  const fallback = fallbackQuizFeedback(input)
  const client = getClient()
  if (!client) {
    return { feedback: fallback, usedOpenAI: false, fallback }
  }

  try {
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.6,
      max_tokens: 180,
      messages: [
        {
          role: 'system',
          content:
            'You coach NZSL learners. Reply in 2–3 short sentences of clear English. Be encouraging and specific. Never mention audio or listening. Do not use markdown.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            lesson: input.lessonName,
            maori: input.maoriName,
            score: `${input.score}/${input.maxScore}`,
            tipsFromWrongAnswers: input.wrongTips,
          }),
        },
      ],
    })

    const text = completion.choices[0]?.message?.content?.trim()
    if (!text) return { feedback: fallback, usedOpenAI: false, fallback }
    return { feedback: text, usedOpenAI: true, fallback }
  } catch {
    return { feedback: fallback, usedOpenAI: false, fallback }
  }
}

export async function generatePracticeFeedback(input: PracticeFeedbackInput): Promise<{
  feedback: string
  usedOpenAI: boolean
  fallback: string
}> {
  const fallback = fallbackPracticeFeedback(input)
  const client = getClient()
  if (!client) {
    console.info('[NZSL practice] openai_skipped', {
      reason: 'OPENAI_API_KEY missing',
      using: 'local_fallback',
      input,
      fallback,
    })
    return { feedback: fallback, usedOpenAI: false, fallback }
  }

  try {
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.6,
      max_tokens: 160,
      messages: [
        {
          role: 'system',
          content:
            'You coach NZSL practice using structured camera signals (not video). Reply in 2 short sentences. Visual, encouraging, no audio references, no markdown.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            lesson: input.lessonName,
            maori: input.maoriName,
            scorePercent: Math.round(input.score),
            signalCodes: input.signalCodes,
          }),
        },
      ],
    })

    const text = completion.choices[0]?.message?.content?.trim()
    if (!text) {
      console.info('[NZSL practice] openai_empty_response', { input, using: 'local_fallback' })
      return { feedback: fallback, usedOpenAI: false, fallback }
    }
    console.info('[NZSL practice] openai_feedback', {
      input,
      feedback: text,
      basis: 'OpenAI rephrased score + signalCodes into coaching text (no video sent)',
    })
    return { feedback: text, usedOpenAI: true, fallback }
  } catch (error) {
    console.info('[NZSL practice] openai_error', {
      error: error instanceof Error ? error.message : String(error),
      using: 'local_fallback',
      input,
    })
    return { feedback: fallback, usedOpenAI: false, fallback }
  }
}
