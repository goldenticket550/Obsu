import { redirect } from "next/navigation";

/**
 * M11 — the OBSIDIAN voice interface. Protected by middleware. The orb + voice
 * flow live in the client component; answers route through the existing M7
 * askAction, so nothing is fabricated.
 */
export default function ObsidianPage() {
  redirect("/");
}
