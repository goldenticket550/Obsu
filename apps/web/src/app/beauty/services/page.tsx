import Link from "next/link";
import { listServices } from "@/lib/db/beauty";
import { formatUsd } from "@/lib/money";
import { BeautyHeader, BeautyLink } from "@/components/beauty/beauty-ui";
import styles from "./services.module.css";

export const dynamic = "force-dynamic";
export default async function Services() {
  const services = await listServices();
  return (
    <main className="mx-auto max-w-4xl px-5 pb-20 pt-6">
      <BeautyHeader title="Services" action={<BeautyLink href="/beauty/services/new">Add service</BeautyLink>} />
      {services.length ? (
        <ul className={styles.grid}>
          {services.map((service) => (
            <li key={service.id}>
              <Link href={`/beauty/services/${service.id}/edit`} className={styles.card}>
                <div>
                  <p className={styles.name}>{service.name}</p>
                  <p className={styles.meta}>{service.category.replaceAll("_", " ")} · {service.duration_minutes} min</p>
                  {service.description ? <p className={styles.description}>{service.description}</p> : null}
                  {!service.active ? <span className={styles.inactive}>Inactive</span> : null}
                </div>
                <p className={styles.price}>{formatUsd(service.price_cents)}</p>
              </Link>
            </li>
          ))}
        </ul>
      ) : <p className={styles.empty}>No services yet.</p>}
    </main>
  );
}
