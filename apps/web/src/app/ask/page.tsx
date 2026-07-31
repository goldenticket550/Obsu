import { ObsidianIntelligence } from "@/components/command/obsidian-intelligence";
import { TopBar } from "@/components/form";
import { SectionLabel } from "@/components/dashboard";

/**
 * Ask OBSIDIAN page (M7). Protected by middleware. The chat island calls the
 * server action, which runs the Claude tool-use loop against this org's data.
 */
export default function AskPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-16 pt-6">
      <TopBar title="Ask OBSIDIAN" backHref="/" />
      <section className="mt-8">
        <SectionLabel>Ask OBSIDIAN</SectionLabel>
        <p className="text-sm text-content-secondary">
          Ask about revenue, expenses, trips, and customers. Answers come
          straight from your records.
        </p>
        <ObsidianIntelligence />
      </section>
    </main>
  );
}
