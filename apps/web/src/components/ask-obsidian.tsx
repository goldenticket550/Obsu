"use client";

import { useState, useTransition } from "react";
import { ProposalCard } from "@/components/proposal-card";
import type { Proposal } from "@/lib/business/proposal";
import {
  approveProposal,
  rejectProposal,
  submitTranscript,
} from "@/app/ask/assistant-actions";

const EXAMPLES = [
  "How much did I make this month?",
  "Who's my top customer?",
  "How much did I spend on gas this month?",
  "Log an airport ride for Ashley, $240",
];

/**
 * V2 Part 2 — the dashboard's assistant box.
 *
 * This is the PRIMARY text path, not a debug affordance. It sends a transcript
 * to the same orchestrator the spoken path uses, through the same server
 * action, with the same argument — a string. Nothing downstream can tell
 * whether these words were typed or spoken, which is what makes the whole
 * pipeline (transcript → intent → typed proposal → approval → executor →
 * logged outcome) runnable with no microphone involved.
 *
 * Approval is a CONTROL. It lives on the card below, it is reached only by
 * clicking, and the only thing it sends is a proposal id — the action itself
 * never travels through this component, so nothing here can alter what runs.
 */
export function AskObsidian() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(text: string) {
    const trimmed = text.trim();
    if (!trimmed || pending) return;
    setError(null);
    setNotice(null);
    setProposal(null);
    setAnswer(null);

    startTransition(async () => {
      const turn = await submitTranscript(trimmed);
      switch (turn.kind) {
        case "answer":
          setAnswer(turn.text);
          break;
        case "proposal":
          // NOTHING has been written. This only offers the decision.
          setProposal(turn.proposal);
          break;
        case "declined":
          setNotice(turn.message);
          break;
        case "failed":
          setError(turn.message);
          break;
      }
    });
  }

  function approve(proposalId: string) {
    startTransition(async () => {
      const result = await approveProposal(proposalId);
      setProposal(null);
      const detail = result.detail ?? result.label;
      // A log that did not record is disclosed, never hidden.
      setNotice(result.logged ? detail : `${detail} (not recorded in the log)`);
    });
  }

  function reject(proposalId: string) {
    startTransition(async () => {
      await rejectProposal(proposalId);
      setProposal(null);
      setNotice("Discarded — nothing was changed.");
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
          Ask a question about your business, or describe a ride to record
        </label>
        <input
          id="ask-obsidian-question"
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask anything, or describe a ride to log…"
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

        {proposal ? (
          <div className="mt-4">
            <ProposalCard
              proposal={proposal}
              busy={pending}
              onApprove={approve}
              onReject={reject}
            />
          </div>
        ) : null}

        {notice ? (
          <p className="mt-4 rounded-lg border border-obsidian-line bg-obsidian-black/50 px-4 py-3 text-sm text-obsidian-silver">
            {notice}
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
        Anything that would change your records is shown for your approval first.
      </p>
    </div>
  );
}
