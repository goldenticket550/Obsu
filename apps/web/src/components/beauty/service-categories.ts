import type { Service, ServiceCategory } from "@/lib/types/beauty";

export type ServiceMenuFilter = "all" | "lash_set" | "lash_fill" | "brow" | "lip_filler" | "other_addons";

export const SERVICE_MENU_FILTERS: ReadonlyArray<{ value: ServiceMenuFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "lash_set", label: "Lash Sets" },
  { value: "lash_fill", label: "Fills" },
  { value: "brow", label: "Brows" },
  { value: "lip_filler", label: "Lip Filler" },
  { value: "other_addons", label: "Other / Add-ons" },
];

const OTHER_CATEGORIES: ReadonlyArray<ServiceCategory> = ["bottom_lash", "cleansing", "removal", "other"];
const SERVICE_CATEGORY_LABELS: Record<ServiceCategory, string> = {
  lash_set: "Lash Sets",
  lash_fill: "Fills",
  bottom_lash: "Bottom Lashes",
  cleansing: "Cleansing",
  removal: "Removal",
  brow: "Brows",
  lip_filler: "Lip Filler",
  other: "Other",
};

export function filterServicesByCategory(services: Service[], filter: ServiceMenuFilter): Service[] {
  if (filter === "all") return services;
  if (filter === "other_addons") return services.filter((service) => OTHER_CATEGORIES.includes(service.category));
  return services.filter((service) => service.category === filter);
}

export function serviceCategoryLabel(category: ServiceCategory): string {
  return SERVICE_CATEGORY_LABELS[category];
}
