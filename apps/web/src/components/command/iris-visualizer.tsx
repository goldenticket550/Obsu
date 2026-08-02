import styles from "./iris-visualizer.module.css";
import {
  deriveIrisVisualizerView,
  type IrisVisualizerPhase,
} from "./iris-visualizer-state";

const BAR_WEIGHTS = [0.36, 0.58, 0.82, 0.48, 1, 0.66, 0.9, 0.54, 0.74, 0.42] as const;

export function IrisVisualizer({
  phase,
  amplitude,
}: {
  phase: IrisVisualizerPhase;
  amplitude: number | null;
}) {
  const view = deriveIrisVisualizerView(phase, amplitude);
  return (
    <div
      className={styles.root}
      data-phase={phase}
      data-has-signal={view.hasSignal ? "true" : "false"}
      style={{ ["--visualizer-level" as string]: String(view.level) }}
    >
      <div className={styles.line} aria-hidden="true">
        {BAR_WEIGHTS.map((weight, index) => (
          <span
            key={`${index}-${weight}`}
            style={{ ["--bar-weight" as string]: String(weight) }}
          />
        ))}
      </div>
      <p className={styles.label} aria-live="polite">{view.label}</p>
      <p className={styles.detail}>{view.detail}</p>
    </div>
  );
}
