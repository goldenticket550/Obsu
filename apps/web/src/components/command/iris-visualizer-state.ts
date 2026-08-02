export type IrisVisualizerPhase =
  | "unavailable"
  | "idle"
  | "listening"
  | "processing"
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
    case "processing":
      return { label: "Processing audio", detail: "Preparing the captured request.", level, hasSignal };
    case "error":
      return { label: "Voice unavailable", detail: "Voice input could not continue. Typing is still available.", level, hasSignal };
    default: {
      const exhaustive: never = phase;
      return exhaustive;
    }
  }
}
