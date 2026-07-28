export async function rephraseInsightsWithGemini(
  insightsText: string[],
  lang: string
): Promise<string | null> {
  if (!insightsText || insightsText.length === 0) return null;

  try {
    const res = await fetch('/api/gemini/rephrase', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ insightsText, lang }),
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    return data.rephrased || null;
  } catch (err) {
    console.warn('Gemini rephrase unavailable, falling back to local insights.', err);
    return null;
  }
}
