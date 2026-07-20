import { describe, expect, it } from "vitest";
import { expensesByCategoryCents, totalExpensesCents } from "./expenses";
import { makeExpense } from "./__factories";

describe("expenses", () => {
  it("totals all expenses (linked and standalone)", () => {
    const expenses = [
      makeExpense({ amount_cents: 1800, category: "gas" }),
      makeExpense({ amount_cents: 750, category: "tolls", trip_id: "t1" }),
    ];
    expect(totalExpensesCents(expenses)).toBe(2550);
  });

  it("returns 0 for empty input", () => {
    expect(totalExpensesCents([])).toBe(0);
  });

  it("groups by category; every category present, 0 by default", () => {
    const byCat = expensesByCategoryCents([
      makeExpense({ amount_cents: 1800, category: "gas" }),
      makeExpense({ amount_cents: 200, category: "gas" }),
      makeExpense({ amount_cents: 750, category: "tolls" }),
    ]);
    expect(byCat.gas).toBe(2000);
    expect(byCat.tolls).toBe(750);
    expect(byCat.maintenance).toBe(0);
    expect(byCat.parking).toBe(0);
  });

  it("keeps a non-round amount exact ($7.50 toll = 750 cents)", () => {
    const byCat = expensesByCategoryCents([
      makeExpense({ amount_cents: 750, category: "tolls" }),
    ]);
    expect(byCat.tolls).toBe(750);
  });
});
