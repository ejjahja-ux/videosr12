import { GoogleGenAI, Modality } from "@google/genai";

export const getAI = () => {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
};

export async function generateVideo(
  prompt: string,
  startImageBase64: string,
  endImageBase64: string
) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not found in environment");
  
  const ai = new GoogleGenAI({ apiKey });
  
  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt: prompt,
    image: {
      imageBytes: startImageBase64.split(',')[1],
      mimeType: 'image/png',
    },
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      lastFrame: {
        imageBytes: endImageBase64.split(',')[1],
        mimeType: 'image/png',
      },
      aspectRatio: '16:9'
    }
  });

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) throw new Error("Video generation failed");

  const response = await fetch(downloadLink, {
    method: 'GET',
    headers: {
      'x-goog-api-key': apiKey,
    },
  });

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

export async function generateVideoKie(
  prompt: string,
  startImageBase64: string,
  endImageBase64: string
) {
  const response = await fetch('/api/generate-video', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      start_image: startImageBase64,
      end_image: endImageBase64,
      model: 'veo-3'
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Kie video generation failed");

  // Assuming Kie returns a URL or base64. Adjust based on actual Kie API response.
  // If it returns a URL:
  if (data.video_url) return data.video_url;
  // If it returns base64:
  if (data.video_base64) {
    const blob = await fetch(`data:video/mp4;base64,${data.video_base64}`).then(r => r.blob());
    return URL.createObjectURL(blob);
  }
  
  throw new Error("No video data returned from Kie");
}

export async function generateTTS(text: string) {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Say clearly and professionally: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (base64Audio) {
    const audioBlob = await fetch(`data:audio/mp3;base64,${base64Audio}`).then(r => r.blob());
    return URL.createObjectURL(audioBlob);
  }
  throw new Error("TTS generation failed");
}
