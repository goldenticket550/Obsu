"use client";

import { useState, useTransition } from "react";
import { askAction } from "@/app/ask/actions";

const EXAMPLES = [
  "How much did I make this month?",
  "Who's my top customer?",
  "How much did I spend on gas this month?",
  "How many trips did I do this month?",
];

/**
 * Ask OBSIDIAN chat island (M7). Client component: submits a question to the
 * server action and renders the answer. No business logic here — it only calls
 * the action and displays the result.
 */
export function AskObsidian() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(q: string) {
    const trimmed = q.trim();
    if (!trimmed || pending) return;
    setError(null);
    startTransition(async () => {
      const res = await askAction(trimmed);
      if (res.error) {
        setError(res.error);
        setAnswer(null);
      } else {
        setAnswer(res.answer ?? "");
        setError(null);
      }
    });
  }

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(question);
        }}
        className="flex items-center gap-2 rounded-xl border border-obsidian-line bg-obsidian-black/50 p-2"
      >
        {/* A real label, visually hidden but present for screen readers. */}
        <label htmlFor="ask-obsidian-question" className="sr-only">
          Ask a question about your business
        </label>
        <input
          id="ask-obsidian-question"
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask anything about your business…"
          className="min-h-[44px] flex-1 bg-transparent px-3 py-2 text-sm text-obsidian-platinum placeholder:text-obsidian-muted focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending || !question.trim()}
          className="min-h-[44px] rounded-lg bg-obsidian-blue px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-obsidian-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Thinking…" : "Ask"}
        </button>
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            disabled={pending}
            onClick={() => {
              setQuestion(ex);
              run(ex);
            }}
            className="rounded-lg border border-obsidian-line px-3 py-1.5 text-xs text-obsidian-silver transition-colors hover:border-obsidian-cyan hover:text-obsidian-platinum disabled:opacity-50"
          >
            {ex}
          </button>
        ))}
      </div>

      {/* Announces the result to screen readers when it arrives. Always in the
          DOM so assistive tech is already observing it; polite so it never
          interrupts. */}
      <div aria-live="polite" aria-atomic="true">
        {pending ? <p className="sr-only">Thinking…</p> : null}

        {error ? (
          <p className="mt-4 rounded-lg border border-obsidian-negative/40 bg-obsidian-negative/10 px-4 py-3 text-sm text-obsidian-negative">
            {error}
          </p>
        ) : null}

        {answer !== null && !error ? (
          <div className="mt-4 rounded-xl border border-obsidian-line bg-obsidian-black/50 p-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-obsidian-platinum">
              {answer}
            </p>
          </div>
        ) : null}
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-obsidian-muted">
        OBSIDIAN answers only from your verified business data — every figure
        comes from a tool that queries your records. It never guesses numbers.
      </p>
    </div>
  );
}
