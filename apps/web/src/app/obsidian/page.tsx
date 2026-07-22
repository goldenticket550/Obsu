import { ObsidianVoice } from "@/components/obsidian-voice";
import { TopBar } from "@/components/form";

/**
 * M11 — the OBSIDIAN voice interface. Protected by middleware. The orb + voice
 * flow live in the client component; answers route through the existing M7
 * askAction, so nothing is fabricated.
 */
export default function ObsidianPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-5 pb-16 pt-6">
      <TopBar title="OBSIDIAN" backHref="/" />
      <section className="mt-8 flex flex-1 flex-col items-center justify-center">
        <ObsidianVoice />
      </section>
    </main>
  );
}
