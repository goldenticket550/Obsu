import Link from "next/link";
import styles from "./beauty-ui.module.css";

export const beautyPage = styles.page;
export const beautyInput = styles.input;
export const beautyForm = styles.form;
export const beautyFormSpaced = styles.formSpaced;
export const beautyGridTwo = styles.gridTwo;
export const beautyGridThree = styles.gridThree;
export const beautyCheckbox = styles.checkboxLabel;
export const beautyAddOn = styles.addOn;
export const beautyLegend = styles.legend;
export const beautyHint = styles.hint;
export const beautyPrimaryButton = styles.primaryButton;
export const beautyDangerButton = styles.dangerButton;
export const beautyPanelTitle = styles.panelTitle;
export const beautyMuted = styles.muted;
export const beautyEmpty = styles.empty;
export const beautyList = styles.list;
export const beautyListItem = styles.listItem;

export function BeautyHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className={styles.header}>
      <div className={styles.headerCopy}>
        <p className={styles.eyebrow}>Obsidian Beauty</p>
        <h1 className={styles.title}>{title}</h1>
      </div>
      {action}
    </div>
  );
}

export function BeautyLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className={`${styles.link} min-h-[44px]`}>{children}</Link>;
}

export function BeautyPanel({
  children,
  className = "",
  flush = false,
  tone = "cream",
}: {
  children: React.ReactNode;
  className?: string;
  flush?: boolean;
  tone?: "cream" | "dark";
}) {
  return <section className={`${styles.panel} ${tone === "dark" ? styles.panelDark : ""} ${flush ? styles.panelFlush : ""} ${className}`}>{children}</section>;
}

export function BeautyField({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className={styles.field}><span className={styles.fieldLabel}>{label}</span>{children}</label>;
}

export function BeautyError({ message }: { message?: string }) {
  return message ? <p role="alert" className={styles.error}>{message}</p> : null;
}
