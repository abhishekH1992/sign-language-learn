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
    : ' Rewatch the lesson video and try the quiz again.'

  return `You scored ${input.score}/${input.maxScore} on “${input.lessonName}”.${tipBit}`
}

export function describeSignalCode(code: string): string {
  if (code === 'hand_not_in_frame') {
    return 'Keep your hands fully visible in the camera frame.'
  }
  if (code === 'need_both_hands') {
    return 'NZSL fingerspelling uses two hands — bring your second hand into view.'
  }
  if (code === 'waiting_for_hand') {
    return 'Show your hands to the camera to start scoring.'
  }
  if (code === 'low_confidence') {
    return 'Hold the handshape steady for a moment so we can read it clearly.'
  }
  if (code === 'shape_close') {
    return 'You are close — fine-tune finger positions to match the lesson drawing.'
  }
  if (code === 'shape_mismatch') {
    return 'Compare your fingers to the lesson drawing and adjust the handshape.'
  }
  if (code === 'stable_hand') {
    return 'Nice clear handshape — keep practising slowly.'
  }
  return code.replaceAll('_', ' ')
}

/** Short plain-language reason for the current live score. */
export function basicScoreReason(
  signalCodes: string[],
  basisReason?: string | null,
): string {
  if (signalCodes.length) {
    return [...new Set(signalCodes.map(describeSignalCode))].slice(0, 2).join(' ')
  }
  if (basisReason?.trim()) return basisReason.trim()
  return 'Show your hands to the camera to start scoring.'
}

export function fallbackPracticeFeedback(input: PracticeFeedbackInput): string {
  const signals = input.signalCodes.length
    ? input.signalCodes.map(describeSignalCode).join(' ')
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
  // Temporarily skip OpenAI for practice feedback.
  return { feedback: fallback, usedOpenAI: false, fallback }

  // const client = getClient()
  // if (!client) {
  //   return { feedback: fallback, usedOpenAI: false, fallback }
  // }
  //
  // try {
  //   const completion = await client.chat.completions.create({
  //     model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  //     temperature: 0.6,
  //     max_tokens: 160,
  //     messages: [
  //       {
  //         role: 'system',
  //         content:
  //           'You coach NZSL practice using structured camera signals (not video). Reply in 2 short sentences. Visual, encouraging, no audio references, no markdown.',
  //       },
  //       {
  //         role: 'user',
  //         content: JSON.stringify({
  //           lesson: input.lessonName,
  //           maori: input.maoriName,
  //           scorePercent: Math.round(input.score),
  //           signalCodes: input.signalCodes,
  //         }),
  //       },
  //     ],
  //   })
  //
  //   const text = completion.choices[0]?.message?.content?.trim()
  //   if (!text) {
  //     return { feedback: fallback, usedOpenAI: false, fallback }
  //   }
  //   return { feedback: text, usedOpenAI: true, fallback }
  // } catch {
  //   return { feedback: fallback, usedOpenAI: false, fallback }
  // }
}
