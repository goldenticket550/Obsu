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
    <div className="mt-8">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(question);
        }}
        className="flex items-center gap-2 rounded-xl border border-obsidian-line bg-obsidian-graphite p-2 shadow-panel"
      >
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask anything about your business…"
          className="flex-1 bg-transparent px-3 py-2 text-sm text-obsidian-platinum placeholder:text-obsidian-muted focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending || !question.trim()}
          className="rounded-lg bg-obsidian-platinum px-4 py-2 text-sm font-semibold text-obsidian-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
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

      {error ? (
        <p className="mt-4 rounded-lg border border-obsidian-negative/40 bg-obsidian-negative/10 px-4 py-3 text-sm text-obsidian-negative">
          {error}
        </p>
      ) : null}

      {answer !== null && !error ? (
        <div className="mt-4 rounded-xl border border-obsidian-line bg-obsidian-graphite p-5 shadow-panel">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-obsidian-platinum">
            {answer}
          </p>
        </div>
      ) : null}

      <p className="mt-4 text-xs text-obsidian-muted">
        OBSIDIAN answers only from your verified business data — every figure
        comes from a tool that queries your records. It never guesses numbers.
      </p>
    </div>
  );
}
