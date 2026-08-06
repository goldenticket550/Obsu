"use client";

import { useState } from "react";
import Link from "next/link";
import { formatUsd } from "@/lib/money";
import type { Service } from "@/lib/types/beauty";
import {
  filterServicesByCategory,
  SERVICE_MENU_FILTERS,
  serviceCategoryLabel,
  type ServiceMenuFilter,
} from "./service-categories";
import styles from "@/app/beauty/services/services.module.css";

export function ServiceMenu({ services }: { services: Service[] }) {
  const [activeFilter, setActiveFilter] = useState<ServiceMenuFilter>("all");
  const visibleServices = filterServicesByCategory(services, activeFilter);

  return (
    <>
      <div className={styles.filters} role="group" aria-label="Filter services by category">
        {SERVICE_MENU_FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            className={styles.filter}
            aria-pressed={activeFilter === filter.value}
            onClick={() => setActiveFilter(filter.value)}
          >
            {filter.label}
          </button>
        ))}
      </div>
      {visibleServices.length ? (
        <ul className={styles.grid} aria-live="polite">
          {visibleServices.map((service) => (
            <li key={service.id}>
              <Link href={`/beauty/services/${service.id}/edit`} className={styles.card}>
                <div className={styles.cardCopy}>
                  <p className={styles.category}>{serviceCategoryLabel(service.category)}</p>
                  <p className={styles.name}>{service.name}</p>
                  <p className={styles.meta}>{service.duration_minutes} min</p>
                  {service.description ? <p className={styles.description}>{service.description}</p> : null}
                  {!service.active ? <span className={styles.inactive}>Inactive</span> : null}
                </div>
                <p className={styles.price}>{formatUsd(service.price_cents)}</p>
              </Link>
            </li>
          ))}
        </ul>
      ) : <p className={styles.empty}>No services in this category.</p>}
    </>
  );
}
