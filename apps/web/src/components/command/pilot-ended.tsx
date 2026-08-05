export function PilotEndedNotice() {
  return (
    <section
      role="status"
      className="rounded-2xl border border-state-warning/40 bg-surface-panel/90 px-5 py-4"
      aria-labelledby="pilot-ended-heading"
    >
      <h2 id="pilot-ended-heading" className="text-sm font-semibold text-state-warning-strong">
        Pilot ended — workspace is read-only
      </h2>
      <p className="mt-1 text-sm text-content-secondary">
        Your rides and business history are safe. Contact Obsidian to extend or reactivate access.
      </p>
    </section>
  );
}
