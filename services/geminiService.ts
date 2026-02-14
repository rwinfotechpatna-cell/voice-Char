
import { GoogleGenAI, Modality } from "@google/genai";
import { VoiceName } from "../types";

export class GeminiTTSService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  /**
   * Enhances text to encourage natural pauses.
   * Replaces multiple spaces with punctuation that the model interprets as pauses.
   */
  private processText(text: string): string {
    // Replace 3 or more spaces with a long pause cue
    let processed = text.replace(/ {3,}/g, '... ... ');
    // Replace 2 spaces with a short pause cue
    processed = processed.replace(/ {2}/g, ', ');
    return processed;
  }

  async generateSpeech(text: string, voiceName: VoiceName): Promise<string> {
    try {
      const refinedText = this.processText(text);
      // Instruction for depth and natural human feel
      const instruction = `Speak with deep resonance, high emotional depth, and a natural human-like cadence. Pay close attention to punctuation and whitespace for timing: ${refinedText}`;

      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: instruction }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
        throw new Error("No audio data received from Gemini API.");
      }
      return base64Audio;
    } catch (error) {
      console.error("Gemini TTS Error:", error);
      throw error;
    }
  }

  async generateConversation(
    text: string,
    speaker1: { name: string; voice: VoiceName },
    speaker2: { name: string; voice: VoiceName }
  ): Promise<string> {
    try {
      const refinedText = this.processText(text);
      const prompt = `TTS the following conversation between ${speaker1.name} and ${speaker2.name}. 
      Use maximum vocal depth and natural human prosody. 
      Respect every space and pause for a realistic human experience:
      
      ${refinedText}`;
      
      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            multiSpeakerVoiceConfig: {
              speakerVoiceConfigs: [
                {
                  speaker: speaker1.name,
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: speaker1.voice }
                  }
                },
                {
                  speaker: speaker2.name,
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: speaker2.voice }
                  }
                }
              ]
            }
          }
        }
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
        throw new Error("No audio data received from Gemini API.");
      }
      return base64Audio;
    } catch (error) {
      console.error("Gemini Multi-Speaker Error:", error);
      throw error;
    }
  }
}
