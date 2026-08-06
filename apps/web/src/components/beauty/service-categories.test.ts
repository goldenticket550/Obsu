import { describe, expect, it } from "vitest";
import type { Service, ServiceCategory } from "@/lib/types/beauty";
import { filterServicesByCategory, serviceCategoryLabel } from "./service-categories";

function service(id: string, category: ServiceCategory): Service {
  return {
    id,
    organization_id: "org-1",
    name: id,
    category,
    duration_minutes: 60,
    price_cents: 10_000,
    active: true,
    created_at: "2026-08-06T00:00:00.000Z",
  };
}

const menu = [
  service("set", "lash_set"),
  service("fill", "lash_fill"),
  service("brows", "brow"),
  service("lips", "lip_filler"),
  service("bottom", "bottom_lash"),
  service("bath", "cleansing"),
  service("removal", "removal"),
  service("other", "other"),
];

describe("Beauty service presentation filters", () => {
  it("keeps All non-destructive and filters the named menu categories", () => {
    expect(filterServicesByCategory(menu, "all")).toEqual(menu);
    expect(filterServicesByCategory(menu, "lash_set").map((item) => item.id)).toEqual(["set"]);
    expect(filterServicesByCategory(menu, "lash_fill").map((item) => item.id)).toEqual(["fill"]);
    expect(filterServicesByCategory(menu, "brow").map((item) => item.id)).toEqual(["brows"]);
    expect(filterServicesByCategory(menu, "lip_filler").map((item) => item.id)).toEqual(["lips"]);
  });

  it("keeps every less-common service accessible through Other / Add-ons", () => {
    expect(filterServicesByCategory(menu, "other_addons").map((item) => item.id)).toEqual(["bottom", "bath", "removal", "other"]);
  });

  it("provides stable human-readable category labels", () => {
    expect(serviceCategoryLabel("lash_set")).toBe("Lash Sets");
    expect(serviceCategoryLabel("bottom_lash")).toBe("Bottom Lashes");
    expect(serviceCategoryLabel("lip_filler")).toBe("Lip Filler");
  });
});
