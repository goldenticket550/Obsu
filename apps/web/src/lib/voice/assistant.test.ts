import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { classifyIntent, intentCopy } from "./intent";
import { handleTranscript, type OrchestratorDeps } from "./orchestrator";
import {
  clearProposalStore,
  rememberProposal,
  takeProposal,
} from "./proposal-store";
import { mayRetryAutomatically, presentSpeech } from "./speech-outcome";
import { transcribe } from "./transcribe-client";
import { mayHoldMicrophone, shouldReleaseMicrophone, showsRecordingIndicator } from "./mic-lifecycle";
import { buildProposal, type ProposalAction } from "@/lib/business/proposal";
import { ORB_KINDS, transition, type OrbState } from "@/lib/business/orb";

const NOW = new Date("2026-07-29T18:00:00Z");
const SRC = join(process.cwd(), "src");

const RIDE_ACTION: ProposalAction = {
  kind: "create_trip",
  customerName: "Ashley",
  tripDate: "2026-07-29",
  tripType: "airport",
  status: "completed",
  revenueCents: 24000,
  pickup: null,
  dropoff: null,
  paymentMethod: null,
  costs: { gasCents: null, tollsCents: null, otherCents: null, otherLabel: null },
};

function deps(over: Partial<OrchestratorDeps> = {}): OrchestratorDeps {
  return {
    ask: async () => ({ answer: "You made $1,240 this week." }),
    parseRide: async () => RIDE_ACTION,
    now: NOW,
    newProposalId: () => "prop-1",
    ...over,
  };
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return entry.isFile() && /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

/* ================================================================== */
/* Part 2 — the transcript is a seam                                   */
/* ================================================================== */

describe("the orchestrator does not know where the words came from", () => {
  it("takes a string and nothing else — there is no source parameter", async () => {
    const spoken = await handleTranscript("How much did I make?", deps());
    const typedIn = await handleTranscript("How much did I make?", deps());
    expect(spoken).toEqual(typedIn);
  });

  /**
   * Part 2's central claim, checked structurally rather than by comment: the
   * orchestrator cannot reach the microphone or the executor, because it does
   * not import them.
   */
  it("imports neither the capture modules nor the executor", () => {
    const text = readFileSync(join(SRC, "lib", "voice", "orchestrator.ts"), "utf8");
    expect(text).not.toContain("audio-capture");
    expect(text).not.toContain("mic-permission");
    expect(text).not.toContain("browser-audio");
    expect(text).not.toContain("execute-proposal");
    expect(text).not.toContain("executeProposal");
  });

  it("answers a question without proposing anything", async () => {
    const turn = await handleTranscript("How much did I make this week?", deps());
    expect(turn).toEqual({ kind: "answer", text: "You made $1,240 this week." });
  });

  it("turns a logging request into a PROPOSAL, never a write", async () => {
    const turn = await handleTranscript("Log an airport ride for Ashley, $240", deps());
    expect(turn.kind).toBe("proposal");
    if (turn.kind !== "proposal") throw new Error("expected a proposal");
    expect(turn.proposal.status).toBe("pending");
    expect(turn.proposal.requiresConfirmation).toBe(true);
    // The words shown are generated from the fields that would execute.
    expect(turn.proposal.humanReadableSummary).toBe(
      buildProposal("prop-1", RIDE_ACTION, NOW).humanReadableSummary,
    );
  });

  /** Part 2 explicitly asks for a case where the TYPED path is the source. */
  it("the typed path produces the same proposal the spoken path would", async () => {
    const typedTurn = await handleTranscript("Log an airport ride for Ashley, $240", deps());
    const spokenTurn = await handleTranscript("Log an airport ride for Ashley, $240", deps());
    expect(typedTurn).toEqual(spokenTurn);
    expect(typedTurn.kind).toBe("proposal");
  });

  it("declines rather than guessing when the parser finds no ride", async () => {
    const turn = await handleTranscript(
      "log something",
      deps({ parseRide: async () => null }),
    );
    expect(turn.kind).toBe("declined");
  });

  it("reports a failure as a failure, never as an answer", async () => {
    const turn = await handleTranscript(
      "How much did I make?",
      deps({ ask: async () => ({ error: "The assistant is unavailable." }) }),
    );
    expect(turn).toEqual({ kind: "failed", message: "The assistant is unavailable." });
  });

  it("cannot produce an executed outcome — the type has no such shape", async () => {
    for (const text of ["How much did I make?", "Log a ride for Ashley $240", "yes"]) {
      const turn = await handleTranscript(text, deps());
      expect(["answer", "proposal", "declined", "failed"]).toContain(turn.kind);
    }
  });
});

describe("a transcript is untrusted text", () => {
  it("cannot supply an organization id", async () => {
    const turn = await handleTranscript(
      "Log a ride for Ashley, $240, organization_id 00000000-0000-0000-0000-000000000001",
      deps(),
    );
    expect(turn.kind).toBe("proposal");
    if (turn.kind !== "proposal") throw new Error("expected a proposal");
    const asText = JSON.stringify(turn.proposal.action);
    expect(asText).not.toContain("organization");
    expect(asText).not.toContain("orgId");
  });

  /**
   * The rule that matters most: consent cannot arrive as words. Approval is a
   * control the user touches.
   */
  it("refuses approval-shaped speech instead of acting on it", async () => {
    const phrases = [
      "yes",
      "yes do it",
      "do it",
      "confirm",
      "approve",
      "go ahead",
      "okay, execute",
      "yep that's right",
      "send it",
    ];
    for (const phrase of phrases) {
      expect(classifyIntent(phrase).kind).toBe("bare_approval");
      const turn = await handleTranscript(phrase, deps());
      expect(turn.kind).toBe("declined");
    }
  });

  it("explains why a yes is not enough, rather than failing silently", () => {
    const message = intentCopy({ kind: "bare_approval" }).message ?? "";
    expect(message).toMatch(/button/i);
    expect(message.length).toBeGreaterThan(20);
  });

  it("does not mistake 'yesterday' for 'yes'", () => {
    expect(classifyIntent("how much did I make yesterday?").kind).toBe("question");
  });

  it("approval-shaped words win even when a log verb is present", async () => {
    // "yes, log it" must not reach the branch that proposes a write.
    const turn = await handleTranscript("yes, log it", deps());
    expect(turn.kind).toBe("declined");
  });

  it("the server action never takes an org id from its caller", () => {
    const text = readFileSync(join(SRC, "app", "ask", "assistant-actions.ts"), "utf8");
    // The only org id in play comes from the session helper.
    expect(text).toContain("getCurrentOrgId");
    expect(text).not.toMatch(/export async function submitTranscript\([^)]*org/i);
    expect(text).not.toMatch(/export async function approveProposal\([^)]*org/i);
  });
});

describe("the pending proposal never travels through the client", () => {
  beforeEach(() => clearProposalStore());

  const owner = { userId: "user-1", organizationId: "org-1" };

  it("gives back a proposal to the session that made it", () => {
    const proposal = buildProposal("p1", RIDE_ACTION, NOW);
    rememberProposal(proposal, owner, NOW);
    expect(takeProposal("p1", owner, NOW)?.proposalId).toBe("p1");
  });

  it("refuses another user, and another org, alike", () => {
    rememberProposal(buildProposal("p1", RIDE_ACTION, NOW), owner, NOW);
    expect(takeProposal("p1", { ...owner, userId: "someone-else" }, NOW)).toBeNull();

    rememberProposal(buildProposal("p2", RIDE_ACTION, NOW), owner, NOW);
    expect(
      takeProposal("p2", { ...owner, organizationId: "org-2" }, NOW),
    ).toBeNull();
  });

  it("is answerable exactly once", () => {
    rememberProposal(buildProposal("p1", RIDE_ACTION, NOW), owner, NOW);
    expect(takeProposal("p1", owner, NOW)).not.toBeNull();
    expect(takeProposal("p1", owner, NOW)).toBeNull();
  });

  it("expires, and an expired proposal is indistinguishable from an absent one", () => {
    rememberProposal(buildProposal("p1", RIDE_ACTION, NOW), owner, NOW);
    const later = new Date(NOW.getTime() + 6 * 60_000);
    expect(takeProposal("p1", owner, later)).toBeNull();
    expect(takeProposal("never-existed", owner, later)).toBeNull();
  });

  it("the approval action accepts an id, not an action", () => {
    const text = readFileSync(join(SRC, "app", "ask", "assistant-actions.ts"), "utf8");
    expect(text).toMatch(/approveProposal\(\s*proposalId: string/);
    // The executed proposal is looked up server-side.
    expect(text).toContain("takeProposal");
  });
});

/* ================================================================== */
/* Part 3 — the browser/server line                                    */
/* ================================================================== */

describe("no provider secret can reach the browser", () => {
  const PROVIDER_SECRETS = [
    "ELEVENLABS_API_KEY",
    "ANTHROPIC_API_KEY",
    "OPENAI_API_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ];
  const PROVIDER_HOSTS = ["api.elevenlabs.io", "api.anthropic.com", "api.openai.com"];

  function clientFiles(): string[] {
    return sourceFiles(SRC).filter((file) => {
      if (/\.test\.tsx?$/.test(file)) return false;
      const text = readFileSync(file, "utf8");
      // The directive must be the first thing in the file to take effect.
      return /^\s*["']use client["']/.test(text);
    });
  }

  it("finds client components to check (the guard is not vacuous)", () => {
    expect(clientFiles().length).toBeGreaterThan(3);
  });

  it("no client component names a provider key", () => {
    const offenders: string[] = [];
    for (const file of clientFiles()) {
      const text = readFileSync(file, "utf8");
      for (const secret of PROVIDER_SECRETS) {
        if (text.includes(secret)) offenders.push(`${file} → ${secret}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("no client component calls a provider directly", () => {
    const offenders: string[] = [];
    for (const file of clientFiles()) {
      const text = readFileSync(file, "utf8");
      for (const host of PROVIDER_HOSTS) {
        if (text.includes(host)) offenders.push(`${file} → ${host}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  /**
   * NEXT_PUBLIC_ is compiled into the browser bundle. A provider key behind one
   * is a published key, whatever it is named.
   */
  it("no NEXT_PUBLIC_ name looks like a provider credential", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(SRC)) {
      if (/\.test\.tsx?$/.test(file)) continue;
      const text = readFileSync(file, "utf8");
      for (const match of text.matchAll(/NEXT_PUBLIC_[A-Z0-9_]+/g)) {
        const name = match[0];
        if (/(KEY|SECRET|TOKEN|PASSWORD|CREDENTIAL)/.test(name)) {
          // The Supabase anon key is a public, RLS-scoped identifier by design;
          // it is not a provider secret and is meant to ship to the browser.
          if (name === "NEXT_PUBLIC_SUPABASE_ANON_KEY") continue;
          offenders.push(`${file} → ${name}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("the provider module is server-only and reads the key from the server env", () => {
    const text = readFileSync(join(SRC, "lib", "voice", "elevenlabs.ts"), "utf8");
    expect(text).not.toMatch(/^\s*["']use client["']/);
    expect(text).toContain("process.env.ELEVENLABS_API_KEY");
  });

  it("the transcription client posts to our own route, never to a provider", () => {
    const text = readFileSync(join(SRC, "lib", "voice", "transcribe-client.ts"), "utf8");
    expect(text).toContain("/api/voice/transcribe");
    for (const host of PROVIDER_HOSTS) expect(text).not.toContain(host);
  });

  /**
   * A route that forwards an arbitrary URL or arbitrary headers to a provider
   * is a key, one level of indirection away.
   */
  it("no voice route forwards a caller-supplied destination", () => {
    for (const route of ["speak", "transcribe"]) {
      const text = readFileSync(
        join(SRC, "app", "api", "voice", route, "route.ts"),
        "utf8",
      );
      expect(text).not.toMatch(/form\.get\(["']url["']\)/);
      expect(text).not.toMatch(/body\.url/);
      expect(text).not.toMatch(/req\.headers\.get\(["']authorization["']\)/i);
    }
  });

  it("captured audio is never written to disk", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(SRC)) {
      if (/\.test\.tsx?$/.test(file)) continue;
      const text = readFileSync(file, "utf8");
      if (/writeFile|createWriteStream|os\.tmpdir/.test(text)) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });
});

/* ================================================================== */
/* Part 4 — degrade honestly                                           */
/* ================================================================== */

describe("a missing voice is not a failed answer", () => {
  it("always shows the text, whatever happened to the audio", () => {
    for (const attempt of [
      { kind: "spoke" } as const,
      { kind: "cancelled" } as const,
      { kind: "unavailable", reason: "no plan" } as const,
    ]) {
      const presentation = presentSpeech(attempt);
      expect(presentation.showsText).toBe(true);
      // The answer arrived. Nothing about speech makes the turn a failure.
      expect(presentation.turnFailed).toBe(false);
    }
  });

  it("explains a missing voice without implying the answer failed", () => {
    const note = presentSpeech({ kind: "unavailable", reason: "402" }).note ?? "";
    expect(note).toMatch(/answered/i);
    expect(note).not.toMatch(/error|failed|couldn't answer/i);
  });

  it("says nothing when the user stopped it themselves", () => {
    expect(presentSpeech({ kind: "cancelled" }).note).toBeNull();
  });

  it("never retries a paid provider automatically", async () => {
    expect(mayRetryAutomatically()).toBe(false);

    const fetchMock = vi.fn(async () => ({
      ok: false,
      json: async () => ({ error: "provider down" }),
    })) as unknown as typeof fetch;

    const result = await transcribe(new Blob(["fake-audio"], { type: "audio/webm" }), { fetch: fetchMock });
    expect(result.kind).toBe("failed");
    // Exactly one attempt. A retry loop here spends the owner's money.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("invokes the browser fetch with the global receiver", async () => {
    const fetchMock = vi.fn(function (this: unknown) {
      expect(this).toBe(globalThis);
      return Promise.resolve({
        ok: true,
        json: async () => ({ text: "hello" }),
      });
    }) as unknown as typeof fetch;

    const result = await transcribe(new Blob(["fake-audio"], { type: "audio/webm" }), {
      fetch: fetchMock,
    });
    expect(result).toEqual({ kind: "transcribed", text: "hello" });
  });
  it("reports a network failure and waits, rather than retrying", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;

    const result = await transcribe(new Blob(["fake-audio"], { type: "audio/webm" }), { fetch: fetchMock });
    expect(result.kind).toBe("failed");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("an empty transcript is 'no speech', not a failure", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ text: "   " }),
    })) as unknown as typeof fetch;

    const result = await transcribe(new Blob(["fake-audio"], { type: "audio/webm" }), { fetch: fetchMock });
    expect(result.kind).toBe("no_speech");
  });
});

/* ================================================================== */
/* Part 5 — the microphone contract                                    */
/* ================================================================== */

describe("the microphone contract", () => {
  it("only 'listening' may hold an open microphone", () => {
    const samples: Record<OrbState["kind"], OrbState> = {
      idle: { kind: "idle" },
      requesting_permission: { kind: "requesting_permission" },
      listening: { kind: "listening", level: 0.4 },
      transcribing: { kind: "transcribing" },
      thinking: { kind: "thinking", transcript: "t" },
      speaking: { kind: "speaking", level: 0.2 },
      action_proposed: {
        kind: "action_proposed",
        proposal: buildProposal("p", RIDE_ACTION, NOW),
      },
      executing: { kind: "executing", proposal: buildProposal("p", RIDE_ACTION, NOW) },
      success: { kind: "success" },
      warning: { kind: "warning", message: "w" },
      error: { kind: "error", message: "e" },
      offline: { kind: "offline" },
    };

    for (const kind of ORB_KINDS) {
      const state = samples[kind];
      expect(mayHoldMicrophone(state)).toBe(kind === "listening");
      expect(shouldReleaseMicrophone(state)).toBe(kind !== "listening");
    }
  });

  /** The two everyone forgets. Named individually so they cannot be lost. */
  it("requires release on error and on offline specifically", () => {
    expect(shouldReleaseMicrophone({ kind: "error", message: "boom" })).toBe(true);
    expect(shouldReleaseMicrophone({ kind: "offline" })).toBe(true);
  });

  it("a failure while listening lands in a state that must release", () => {
    const listening: OrbState = { kind: "listening", level: 0.5 };
    expect(shouldReleaseMicrophone(transition(listening, { type: "failed", message: "x" }))).toBe(true);
    expect(shouldReleaseMicrophone(transition(listening, { type: "went_offline" }))).toBe(true);
    expect(shouldReleaseMicrophone(transition(listening, { type: "cancelled" }))).toBe(true);
  });

  it("the indicator is derived from state, not a parallel flag", () => {
    expect(showsRecordingIndicator({ kind: "listening", level: 0 })).toBe(true);
    expect(showsRecordingIndicator({ kind: "thinking", transcript: "" })).toBe(false);

    const component = readFileSync(join(SRC, "components", "obsidian-voice.tsx"), "utf8");
    expect(component).toContain("showsRecordingIndicator");
    // Comments stripped: the rule is about code. The doc comment above the
    // component names `isRecording` precisely to say it does not exist.
    const code = component
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/[^\n]*/g, "");
    // No second source of truth for "am I recording".
    expect(code).not.toMatch(/\bisRecording\b/);
    expect(code).not.toMatch(/useState\(\s*false\s*\)/);
  });

  it("the component releases on unmount and routes every release through one path", () => {
    const text = readFileSync(join(SRC, "components", "obsidian-voice.tsx"), "utf8");
    // One release function...
    expect(text.match(/const releaseMic = useCallback/g)).toHaveLength(1);
    // ...called from the unmount cleanup...
    const cleanup = text.slice(text.indexOf("return () => {"));
    expect(cleanup).toContain("releaseMic()");
    // ...and from every state change that must not hold a microphone.
    expect(text).toContain("if (shouldReleaseMicrophone(next)) releaseMic();");
  });

  it("opens only from a user gesture — there is no other path to a stream", () => {
    const text = readFileSync(join(SRC, "components", "obsidian-voice.tsx"), "utf8");
    expect(text).toContain("userGesture()");
    // The gesture is minted inside the handler, never in an effect.
    const effects = text.match(/useEffect\([\s\S]*?\}, \[[^\]]*\]\);/g) ?? [];
    for (const effect of effects) {
      expect(effect).not.toContain("userGesture");
      expect(effect).not.toContain("startCapture");
    }
  });

  it("has no wake word and no ambient listening anywhere", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(SRC)) {
      if (/\.test\.tsx?$/.test(file)) continue;
      const text = readFileSync(file, "utf8");
      if (/SpeechRecognition|webkitSpeechRecognition|wakeWord|wake_word|hotword/.test(text)) {
        offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });
});

/* ================================================================== */
/* Part 1 — the legacy alias is gone                                   */
/* ================================================================== */

describe("exactly one shape describes orb state", () => {
  it("the legacy OrbState alias and its normalization boundary are gone", () => {
    const orb = readFileSync(join(SRC, "components", "obsidian-orb.tsx"), "utf8");
    expect(orb).not.toContain("export type OrbState");
    expect(orb).not.toContain("legacyToState");
    expect(orb).not.toContain("OrbMachineState");
  });

  it("no source file imports OrbState from the component", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(SRC)) {
      const text = readFileSync(file, "utf8");
      if (/import\s*\{[^}]*OrbState[^}]*\}\s*from\s*["']@\/components\/obsidian-orb["']/.test(text)) {
        offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("the orb takes only the union — no level prop remains", () => {
    const orb = readFileSync(join(SRC, "components", "obsidian-orb.tsx"), "utf8");
    expect(orb).toContain("state: OrbState;");
    expect(orb).not.toMatch(/level\?: number/);
  });
});
