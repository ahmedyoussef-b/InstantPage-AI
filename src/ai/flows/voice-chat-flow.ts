
'use server';
/**
 * @fileOverview A Genkit flow for voice-enabled chat interaction, converting text input to an AI text response and an audio response.
 *
 * - voiceChatInteraction - A function that handles the voice-enabled chat process.
 * - VoiceChatInput - The input type for the voiceChatInteraction function.
 * - VoiceChatOutput - The return type for the voiceChatInteraction function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import wav from 'wav';

const VoiceChatInputSchema = z.object({
  query: z.string().describe('The user\'s spoken query as text.')
});
export type VoiceChatInput = z.infer<typeof VoiceChatInputSchema>;

const VoiceChatOutputSchema = z.object({
  text: z.string().describe('The AI\'s textual response.'),
  audio: z.string().describe('The AI\'s audio response as a base64 encoded WAV data URI.')
});
export type VoiceChatOutput = z.infer<typeof VoiceChatOutputSchema>;

export async function voiceChatInteraction(input: VoiceChatInput): Promise<VoiceChatOutput> {
  return voiceChatFlow(input);
}

const voiceChatFlow = ai.defineFlow(
  {
    name: 'voiceChatFlow',
    inputSchema: VoiceChatInputSchema,
    outputSchema: VoiceChatOutputSchema
  },
  async (input) => {
    // 1. Get text response from the main LLM
    const { output: textOutput } = await ai.generate({
      model: ai.model('googleai/gemini-2.5-flash'),
      prompt: input.query
    });

    const aiTextResponse = textOutput!;

    // 2. Convert text response to speech
    const { media } = await ai.generate({
      model: googleAI.model('gemini-2.5-flash-preview-tts'),
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Algenib' }
          }
        }
      },
      prompt: aiTextResponse
    });

    if (!media) {
      throw new Error('No audio media returned from TTS model.');
    }

    // Convert PCM audio from base64 data URI to WAV format
    const audioBuffer = Buffer.from(
      media.url.substring(media.url.indexOf(',') + 1),
      'base64'
    );
    const wavAudioBase64 = await toWav(audioBuffer);

    return {
      text: aiTextResponse,
      audio: 'data:audio/wav;base64,' + wavAudioBase64
    };
  }
);

/**
 * Converts PCM audio data to WAV format.
 * @param pcmData The PCM audio data as a Buffer.
 * @param channels Number of audio channels (default: 1).
 * @param rate Sample rate in Hz (default: 24000).
 * @param sampleWidth Sample width in bytes (default: 2 for 16-bit).
 * @returns A Promise that resolves to the base64 encoded WAV data.
 */
async function toWav(
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8
    });

    let bufs: any[] = [];
    writer.on('error', reject);
    writer.on('data', function (d) {
      bufs.push(d);
    });
    writer.on('end', function () {
      resolve(Buffer.concat(bufs).toString('base64'));
    });

    writer.write(pcmData);
    writer.end();
  });
}
