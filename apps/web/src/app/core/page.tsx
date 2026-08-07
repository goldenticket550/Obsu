import Link from "next/link";
import { notFound } from "next/navigation";
import { CommandCenterScene } from "@/components/command/command-center-scene";
import { EclipseIris } from "@/components/command/eclipse-iris";
import {
  SkylineAtmosphere,
  SkylineMain,
  SkylinePanel,
} from "@/components/command/skyline-shell";
import { loadCoreConsole } from "@/lib/db/core-read";
import type { CorePortfolioOrganization } from "@/lib/types/core";
import styles from "./core.module.css";

export const dynamic = "force-dynamic";

function divisionLabel(vertical: string): string {
  if (vertical === "rides") return "Rides";
  if (vertical === "beauty") return "Beauty";
  return vertical;
}

function accessLabel(org: CorePortfolioOrganization): string {
  if (org.status === "pilot") {
    return org.is_active ? "Pilot active" : "Pilot ended";
  }
  if (!org.is_active) return org.status;
  return "Active";
}

function dateLabel(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default async function CorePage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const data = await loadCoreConsole(searchParams.page);
  if (!data) notFound();

  const divisions = new Map<string, CorePortfolioOrganization[]>();
  for (const org of data.portfolio) {
    const current = divisions.get(org.vertical) ?? [];
    current.push(org);
    divisions.set(org.vertical, current);
  }
  const totalPages = Math.max(1, Math.ceil(data.feedbackTotal / data.feedbackPageSize));

  return (
    <CommandCenterScene
      hasAttention={data.feedbackTotal > 0}
      routeState="empty"
      primaryColor="#E8B04B"
      secondaryColor="#37E8FF"
    >
      <SkylineAtmosphere />
      <SkylineMain>
        <main className={styles.page}>
          <header className={styles.header}>
            <p className={styles.eyebrow}>OBSIDIAN Core</p>
            <h1>Cross-company overview</h1>
            <p>Read-only command view across the connected platform.</p>
          </header>

          <section className={styles.orb} aria-labelledby="core-orb-heading">
            <div>
              <p className={styles.kicker}>System overview</p>
              <h2 id="core-orb-heading">Eclipse Iris</h2>
              <p>Display-only portfolio signal. Voice, tools, and actions are disabled.</p>
            </div>
            <EclipseIris visual="ready" focused={false} amplitude={0} size={220} />
          </section>

          <div className={styles.grid}>
            <SkylinePanel labelledBy="portfolio-heading" className={styles.portfolioPanel}>
              <div className={styles.panelHeader}>
                <div>
                  <p className={styles.kicker}>Portfolio</p>
                  <h2 id="portfolio-heading">Divisions and organizations</h2>
                </div>
                <span>{data.portfolio.length} connected</span>
              </div>
              <div className={styles.divisions}>
                {[...divisions.entries()].map(([vertical, organizations]) => (
                  <article className={styles.division} key={vertical}>
                    <h3>{divisionLabel(vertical)}</h3>
                    <ul>
                      {organizations.map((org) => (
                        <li key={org.organization_id}>
                          <div>
                            <strong>{org.display_name ?? org.organization_name}</strong>
                            <span>{org.plan.replaceAll("_", " ")}</span>
                          </div>
                          <div className={styles.status} data-active={org.is_active}>
                            {accessLabel(org)}
                            {org.status === "pilot" && org.pilot_ends_at ? (
                              <small>ends {dateLabel(org.pilot_ends_at)}</small>
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
                <article className={styles.division}>
                  <h3>Trader</h3>
                  <p className={styles.notReporting}>
                    Registered division — not yet reporting (integrates in Milestone 2).
                  </p>
                </article>
              </div>
            </SkylinePanel>

            <SkylinePanel labelledBy="feedback-heading" className={styles.feedbackPanel}>
              <div className={styles.panelHeader}>
                <div>
                  <p className={styles.kicker}>Needs You</p>
                  <h2 id="feedback-heading">Open pilot feedback</h2>
                </div>
                <span>{data.feedbackTotal} open</span>
              </div>
              {data.feedback.length === 0 ? (
                <p className={styles.empty}>No open feedback.</p>
              ) : (
                <ol className={styles.feedbackList}>
                  {data.feedback.map((item) => (
                    <li key={item.feedback_id}>
                      <div className={styles.tags}>
                        <span>{divisionLabel(item.division)}</span>
                        <span>{item.organization_name}</span>
                        <span>{item.category.replaceAll("_", " ")}</span>
                        <span>{item.priority ?? "normal"}</span>
                      </div>
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                      <small>{dateLabel(item.created_at)}</small>
                    </li>
                  ))}
                </ol>
              )}
              {totalPages > 1 ? (
                <nav className={styles.pagination} aria-label="Feedback pages">
                  {data.feedbackPage > 1 ? (
                    <Link href={`/core?page=${data.feedbackPage - 1}`}>Previous</Link>
                  ) : <span />}
                  <span>Page {data.feedbackPage} of {totalPages}</span>
                  {data.feedbackPage < totalPages ? (
                    <Link href={`/core?page=${data.feedbackPage + 1}`}>Next</Link>
                  ) : <span />}
                </nav>
              ) : null}
            </SkylinePanel>

            <SkylinePanel labelledBy="activity-heading" className={styles.activityPanel}>
              <div className={styles.panelHeader}>
                <div>
                  <p className={styles.kicker}>Activity pulse</p>
                  <h2 id="activity-heading">Last seven days</h2>
                </div>
              </div>
              {data.activityCounts.length === 0 ? (
                <p className={styles.empty}>No activity reported in this window.</p>
              ) : (
                <ul className={styles.counts}>
                  {data.activityCounts.map((item) => (
                    <li key={`${item.organization_id}-${item.event_name}`}>
                      <div>
                        <strong>{item.organization_name}</strong>
                        <span>{item.event_name.replaceAll("_", " ")}</span>
                      </div>
                      <b>{item.event_count}</b>
                    </li>
                  ))}
                </ul>
              )}
              <h3 className={styles.recentHeading}>Recent notable events</h3>
              {data.notableActivity.length === 0 ? (
                <p className={styles.empty}>No notable events reported.</p>
              ) : (
                <ul className={styles.notable}>
                  {data.notableActivity.map((item) => (
                    <li key={item.event_id}>
                      <span>{item.event_name.replaceAll("_", " ")}</span>
                      <strong>{item.organization_name}</strong>
                      <small>{dateLabel(item.created_at)}</small>
                    </li>
                  ))}
                </ul>
              )}
            </SkylinePanel>
          </div>
        </main>
      </SkylineMain>
    </CommandCenterScene>
  );
}
