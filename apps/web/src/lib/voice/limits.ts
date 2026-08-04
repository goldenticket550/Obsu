export const MAX_VOICE_AUDIO_BYTES = 8 * 1024 * 1024;
export const MULTIPART_OVERHEAD_ALLOWANCE_BYTES = 64 * 1024;
export const MAX_VOICE_MULTIPART_BYTES = MAX_VOICE_AUDIO_BYTES + MULTIPART_OVERHEAD_ALLOWANCE_BYTES;
export const MAX_TTS_TEXT_CHARACTERS = 2_000;
export const VOICE_PROVIDER_TIMEOUT_MS = 25_000;

export const SUPPORTED_VOICE_AUDIO_TYPES = new Set([
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
]);

export function normalizedAudioType(type: string): string {
  return type.toLowerCase().split(";", 1)[0]?.trim() ?? "";
}

export function isSupportedVoiceAudio(type: string): boolean {
  return SUPPORTED_VOICE_AUDIO_TYPES.has(normalizedAudioType(type));
}
