
import { VoiceOption } from './types';

export const VOICE_OPTIONS: VoiceOption[] = [
  { id: 'Enceladus', name: 'Enceladus', gender: 'Neutral', description: 'Deep, atmospheric, and highly resonant.', style: 'Mysterious' },
  { id: 'Aoede', name: 'Aoede', gender: 'Female', description: 'Melodic, ethereal, and song-like cadence.', style: 'Lyric' },
  { id: 'Autonoe', name: 'Autonoe', gender: 'Female', description: 'Classic, measured, and perfect for narration.', style: 'Narrative' },
  { id: 'Callirrhoe', name: 'Callirrhoe', gender: 'Female', description: 'Dynamic, rhythmic, and full of life.', style: 'Vibrant' },
  { id: 'Erinome', name: 'Erinome', gender: 'Female', description: 'Intense, dramatic, and emotionally heavy.', style: 'Dramatic' },
  { id: 'Kore', name: 'Kore', gender: 'Female', description: 'Bright, energetic, and clear.', style: 'Cheerful' },
  { id: 'Puck', name: 'Puck', gender: 'Male', description: 'Youthful, friendly, and approachable.', style: 'Casual' },
  { id: 'Charon', name: 'Charon', gender: 'Male', description: 'Deep, authoritative, and professional.', style: 'Formal' },
  { id: 'Fenrir', name: 'Fenrir', gender: 'Male', description: 'Warm, resonant, and calm.', style: 'Serene' },
  { id: 'Zephyr', name: 'Zephyr', gender: 'Female', description: 'Soft, airy, and sophisticated.', style: 'Gentle' },
];

export const SAMPLE_RATE = 24000;
export const MAX_TEXT_LENGTH = 2000;
