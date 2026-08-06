import type { CSSProperties } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { safeWorkspaceColor } from "@/lib/business/business-profile";
import { getBeautyProfile } from "@/lib/db/beauty";
import styles from "./beauty-layout.module.css";

export default async function BeautyLayout({ children }: { children: React.ReactNode }) {
  if (headers().get("x-obsidian-vertical") !== "beauty") redirect("/");
  const profile = await getBeautyProfile();
  const primary = safeWorkspaceColor(profile.primary_color, "#D6AD60");
  const secondary = safeWorkspaceColor(profile.secondary_color, "#F3E6D0");
  const style = {
    "--beauty-primary": primary,
    "--beauty-secondary": secondary,
    "--beauty-border": `${primary}42`,
  } as CSSProperties;
  return <div className={styles.scope} style={style}>{children}</div>;
}
