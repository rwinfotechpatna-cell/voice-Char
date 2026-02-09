
export type VoiceName = 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr' | 'Enceladus' | 'Aoede' | 'Autonoe' | 'Callirrhoe' | 'Erinome';

export interface VoiceOption {
  id: VoiceName;
  name: string;
  description: string;
  gender: 'Male' | 'Female' | 'Neutral';
  style: string;
}

export interface SpeakerConfig {
  id: string;
  name: string;
  voice: VoiceName;
}

export interface SpeechHistoryItem {
  id: string;
  text: string;
  voice: string; // Can be a voice name or "Multi-Speaker"
  timestamp: number;
  audioData: string; // Base64 PCM data
}

export interface GenerationSettings {
  voice: VoiceName;
  mode: 'simple' | 'script';
  speed: number;
}
