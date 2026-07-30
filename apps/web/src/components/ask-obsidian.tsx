"use client";

import { useEffect, useState, useTransition } from "react";
import { ProposalCard } from "@/components/proposal-card";
import type { Proposal } from "@/lib/business/proposal";
import {
  SIGN_OUT_EVENT,
  appendRedacted,
  clearConversation,
  type ConversationTurn,
} from "@/lib/conversation";
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
  const [proposal, setProposal] = useState<Proposal | null>(null);
  // The conversation is the ONLY record of what was said. Answers, notices and
  // errors all live here as turns; keeping a separate `answer` beside it would
  // be two values answering "what did OBSIDIAN last say".
  const [history, setHistory] = useState<ConversationTurn[]>([]);
  const [pending, startTransition] = useTransition();

  /**
   * Sign-out drops the conversation immediately. Unmount clears it too — the
   * redirect would do that anyway — but the explicit listener is what makes it
   * a guarantee rather than a side effect of routing.
   */
  useEffect(() => {
    const onSignOut = () => {
      setHistory(clearConversation());
      setProposal(null);
    };
    window.addEventListener(SIGN_OUT_EVENT, onSignOut);
    return () => {
      window.removeEventListener(SIGN_OUT_EVENT, onSignOut);
      setHistory(clearConversation());
    };
  }, []);

  /** Records a turn, bounded and credential-redacted. */
  function remember(turn: ConversationTurn) {
    setHistory((current) => appendRedacted(current, turn));
  }

  function run(text: string) {
    const trimmed = text.trim();
    if (!trimmed || pending) return;
    setProposal(null);
    remember({ role: "user", text: trimmed });

    startTransition(async () => {
      const turn = await submitTranscript(trimmed);
      switch (turn.kind) {
        case "answer":
          remember({ role: "assistant", text: turn.text });
          break;
        case "proposal":
          // NOTHING has been written. This only offers the decision.
          setProposal(turn.proposal);
          remember({ role: "proposal", summary: turn.proposal.humanReadableSummary });
          break;
        case "declined":
          remember({ role: "assistant", text: turn.message });
          break;
        case "failed":
          remember({ role: "error", text: turn.message });
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
      const text = result.logged ? detail : `${detail} (not recorded in the log)`;
      remember({ role: "outcome", text, ok: result.ok });
    });
  }

  function reject(proposalId: string) {
    startTransition(async () => {
      await rejectProposal(proposalId);
      setProposal(null);
      remember({ role: "outcome", text: "Discarded — nothing was changed.", ok: true });
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

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            disabled={pending}
            onClick={() => {
              setQuestion(ex);
              run(ex);
            }}
            className="rounded-lg border border-line px-3 py-1.5 text-xs text-content-secondary transition-colors hover:border-accent-soft hover:text-content-primary disabled:opacity-50"
          >
            {ex}
          </button>
        ))}
        {history.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              setHistory(clearConversation());
              setProposal(null);
            }}
            className="ml-auto rounded-lg px-3 py-1.5 text-xs text-content-muted underline-offset-2 transition-colors hover:text-content-secondary hover:underline"
          >
            Clear conversation
          </button>
        ) : null}
      </div>

      {/* Announces the result to screen readers when it arrives. Always in the
          DOM so assistive tech is already observing it; polite so it never
          interrupts. */}
      <div aria-live="polite" aria-atomic="true">
        {pending ? <p className="sr-only">Thinking…</p> : null}

        {/* The conversation. Bounded to MAX_TURNS and cleared on sign-out —
            these lines name real customers. Each role is labelled as well as
            styled, so the distinction survives without colour. */}
        {history.length > 0 ? (
          <ol className="mt-4 space-y-2">
            {history.map((turn, index) => (
              <li
                key={`${turn.role}-${index}`}
                className="rounded-lg border border-line bg-surface-base/50 px-4 py-3"
              >
                <p className="text-[11px] uppercase tracking-wide text-content-muted">
                  {turn.role === "user"
                    ? "You"
                    : turn.role === "proposal"
                      ? "Proposed — not yet done"
                      : turn.role === "outcome"
                        ? turn.ok
                          ? "Done"
                          : "Not done"
                        : turn.role === "error"
                          ? "Problem"
                          : "OBSIDIAN"}
                </p>
                <p
                  className={`mt-1 whitespace-pre-wrap text-sm leading-relaxed ${
                    turn.role === "error"
                      ? "text-state-danger"
                      : "text-content-primary"
                  }`}
                >
                  {turn.role === "proposal" ? turn.summary : turn.text}
                </p>
              </li>
            ))}
          </ol>
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

      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-content-muted">
        OBSIDIAN answers only from your verified business data — every figure
        comes from a tool that queries your records. It never guesses numbers.
        Anything that would change your records is shown for your approval first.
      </p>
    </div>
  );
}
