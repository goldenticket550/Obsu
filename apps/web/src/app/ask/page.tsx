import { headers } from "next/headers";
import { ObsidianIntelligence } from "@/components/command/obsidian-intelligence";
import { TopBar } from "@/components/form";
import { SectionLabel } from "@/components/dashboard";

export default function AskPage() {
  const beauty = headers().get("x-obsidian-vertical") === "beauty";
  return <main className="mx-auto w-full max-w-2xl px-5 pb-16 pt-6"><TopBar title="Ask OBSIDIAN" backHref={beauty ? "/beauty" : "/"} /><section className="mt-8"><SectionLabel>Ask OBSIDIAN</SectionLabel><p className="text-sm text-content-secondary">{beauty ? "Ask about revenue, appointments, services, fills due, and client history." : "Ask about revenue, expenses, trips, and customers."} Answers come straight from your records.</p><ObsidianIntelligence /></section></main>;
}
