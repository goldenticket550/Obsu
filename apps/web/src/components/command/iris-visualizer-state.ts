export type IrisVisualizerPhase =
  | "unavailable"
  | "idle"
  | "listening"
  | "speaking"
  | "thinking"
  | "processing"
  | "alert"
  | "offline"
  | "error";

export interface IrisVisualizerView {
  label: string;
  detail: string;
  level: number;
  hasSignal: boolean;
}

export function deriveIrisVisualizerView(
  phase: IrisVisualizerPhase,
  amplitude: number | null,
): IrisVisualizerView {
  const hasSignal = amplitude !== null && Number.isFinite(amplitude);
  const level = hasSignal ? Math.max(0, Math.min(1, amplitude)) : 0;
  switch (phase) {
    case "unavailable":
      return { label: "Voice not enabled", detail: "Typing is available now. Voice can connect here when it is enabled.", level, hasSignal };
    case "idle":
      return { label: "Voice ready", detail: "Start voice input when you are ready.", level, hasSignal };
    case "listening":
      return { label: "Listening", detail: "Voice input is active.", level, hasSignal };
    case "speaking":
      return { label: "Speaking", detail: "Playing the verified answer.", level, hasSignal };
    case "thinking":
      return { label: "Thinking", detail: "Working from your verified business data.", level, hasSignal };
    case "processing":
      return { label: "Processing audio", detail: "Preparing the captured request.", level, hasSignal };
    case "alert":
      return { label: "Attention required", detail: "Open Action Required to review the real items.", level, hasSignal };
    case "offline":
      return { label: "Offline", detail: "Reconnect to use voice. Typing remains available for review.", level: 0, hasSignal: false };
    case "error":
      return { label: "Voice unavailable", detail: "Voice input could not continue. Typing is still available.", level, hasSignal };
    default: {
      const exhaustive: never = phase;
      return exhaustive;
    }
  }
}
