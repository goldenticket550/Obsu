import type Anthropic from "@anthropic-ai/sdk";
import { listTrips } from "@/lib/db/trips";
import { listExpenses } from "@/lib/db/expenses";
import { listCustomers } from "@/lib/db/customers";
import {
  INACTIVE_THRESHOLD_DAYS,
  averageTripValueCents,
  currentMonthRange,
  customerLifetimeRevenueCents,
  customerTripCount,
  estimatedOperatingProfitCents,
  expensesByCategoryCents,
  filterByDateRange,
  inactiveCustomers,
  todayInNewYork,
  topCustomers,
  totalExpensesCents,
  totalRevenueCents,
  tripCount,
} from "@/lib/business";
import { formatUsd } from "@/lib/money";
import { labelize } from "@/lib/enums";
import type { Expense, Trip } from "@/lib/types";

/**
 * Read-only (permission Level 1) tools for Ask OBSIDIAN. Each fetches THIS
 * org's data through the RLS-enforced server client and computes with the pure
 * M5 business functions — no math is done inline. Money is returned both as
 * integer cents and pre-formatted USD so Claude never has to convert.
 */

type Period = "this_month" | "last_month" | "all_time";
const PERIODS: Period[] = ["this_month", "last_month", "all_time"];

function readPeriod(value: unknown): Period {
  return typeof value === "string" && (PERIODS as string[]).includes(value)
    ? (value as Period)
    : "this_month";
}

/** Start/end (YYYY-MM-DD) for a period in America/New_York; null = all time. */
function periodRange(period: Period): { start: string; end: string } | null {
  if (period === "all_time") return null;
  const thisMonth = currentMonthRange();
  if (period === "this_month") return thisMonth;
  // last_month: step to the last day of the previous month, then range that.
  const d = new Date(`${thisMonth.start}T12:00:00Z`);
  d.setUTCDate(0);
  return currentMonthRange(d);
}

function inPeriod<T extends Trip | Expense>(
  items: T[],
  dateField: keyof T,
  period: Period,
): T[] {
  const range = periodRange(period);
  return range
    ? filterByDateRange(items, dateField, range.start, range.end)
    : items;
}

const money = (cents: number) => ({ cents, usd: formatUsd(cents) });

// --- Tool definitions (explicit input schemas) -----------------------------

const PERIOD_PROP = {
  type: "string",
  enum: PERIODS,
  description: "Time window: this_month, last_month, or all_time.",
} as const;

export const TOOL_DEFS: Anthropic.Tool[] = [
  {
    name: "get_business_performance",
    description:
      "Overall performance for a period: revenue, recorded expenses, estimated operating profit, completed trip count, and average trip value.",
    input_schema: {
      type: "object",
      properties: { period: PERIOD_PROP },
      required: ["period"],
    },
  },
  {
    name: "get_revenue_summary",
    description: "Total revenue (completed trips only) for a period.",
    input_schema: {
      type: "object",
      properties: { period: PERIOD_PROP },
      required: ["period"],
    },
  },
  {
    name: "get_expense_summary",
    description:
      "Total expenses for a period, optionally broken down by category (e.g. how much on gas).",
    input_schema: {
      type: "object",
      properties: {
        period: PERIOD_PROP,
        by_category: {
          type: "boolean",
          description: "If true, include a per-category breakdown.",
        },
      },
      required: ["period"],
    },
  },
  {
    name: "get_trip_summary",
    description: "Completed trip count and average fare for a period.",
    input_schema: {
      type: "object",
      properties: { period: PERIOD_PROP },
      required: ["period"],
    },
  },
  {
    name: "get_top_customers",
    description:
      "Top customers ranked by all-time lifetime revenue, with trip counts.",
    input_schema: {
      type: "object",
      properties: {
        limit: {
          type: "integer",
          description: "How many customers to return (1-10). Default 3.",
        },
      },
      required: [],
    },
  },
  {
    name: "get_customer_history",
    description:
      "A single customer's history by name (case-insensitive): lifetime revenue, trip count, and recent trips.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "The customer's name." },
      },
      required: ["name"],
    },
  },
  {
    name: "get_inactive_customers",
    description:
      "Repeat customers (2+ completed trips) who haven't ridden recently — answers 'who hasn't booked recently?'. Returns name, days since last trip, trip count, and lifetime revenue.",
    input_schema: {
      type: "object",
      properties: {
        days: {
          type: "integer",
          description: "Inactivity threshold in days (default 30).",
        },
      },
      required: [],
    },
  },
];

// --- Executors -------------------------------------------------------------

export async function executeTool(
  name: string,
  input: unknown,
): Promise<unknown> {
  const args = (input ?? {}) as Record<string, unknown>;

  switch (name) {
    case "get_business_performance": {
      const period = readPeriod(args.period);
      const [trips, expenses] = await Promise.all([listTrips(), listExpenses()]);
      const t = inPeriod(trips, "trip_date", period);
      const e = inPeriod(expenses, "expense_date", period);
      return {
        period,
        revenue: money(totalRevenueCents(t)),
        recorded_expenses: money(totalExpensesCents(e)),
        estimated_operating_profit: money(
          estimatedOperatingProfitCents(t, e),
        ),
        completed_trip_count: tripCount(t),
        average_trip_value: money(averageTripValueCents(t)),
      };
    }

    case "get_revenue_summary": {
      const period = readPeriod(args.period);
      const trips = await listTrips();
      const t = inPeriod(trips, "trip_date", period);
      return { period, total_revenue: money(totalRevenueCents(t)) };
    }

    case "get_expense_summary": {
      const period = readPeriod(args.period);
      const expenses = await listExpenses();
      const e = inPeriod(expenses, "expense_date", period);
      const result: Record<string, unknown> = {
        period,
        total_expenses: money(totalExpensesCents(e)),
      };
      if (args.by_category === true) {
        const byCat = expensesByCategoryCents(e);
        result.by_category = Object.entries(byCat)
          .filter(([, cents]) => cents > 0)
          .map(([category, cents]) => ({
            category: labelize(category),
            ...money(cents),
          }));
      }
      return result;
    }

    case "get_trip_summary": {
      const period = readPeriod(args.period);
      const trips = await listTrips();
      const t = inPeriod(trips, "trip_date", period);
      return {
        period,
        completed_trip_count: tripCount(t),
        average_fare: money(averageTripValueCents(t)),
      };
    }

    case "get_top_customers": {
      const rawLimit = Number(args.limit);
      const limit = Number.isFinite(rawLimit)
        ? Math.min(10, Math.max(1, Math.trunc(rawLimit)))
        : 3;
      const [trips, customers] = await Promise.all([
        listTrips(),
        listCustomers(),
      ]);
      const ranked = topCustomers(trips, customers, limit)
        .filter((r) => r.revenueCents > 0)
        .map((r) => ({
          name: r.customer.name,
          lifetime_revenue: money(r.revenueCents),
          trip_count: r.tripCount,
        }));
      return { customers: ranked };
    }

    case "get_customer_history": {
      const query = String(args.name ?? "").trim();
      if (!query) return { found: false, reason: "No name provided." };
      const [trips, customers] = await Promise.all([
        listTrips(),
        listCustomers(),
      ]);
      const lower = query.toLowerCase();
      const customer =
        customers.find((c) => c.name.toLowerCase() === lower) ??
        customers.find((c) => c.name.toLowerCase().includes(lower));
      if (!customer) {
        return { found: false, query, reason: "No matching customer." };
      }
      const theirs = trips
        .filter((t) => t.customer_id === customer.id && t.status === "completed")
        .slice(0, 20)
        .map((t) => ({
          date: t.trip_date,
          route: `${t.pickup_location ?? "?"} -> ${t.dropoff_location ?? "?"}`,
          fare: money(t.revenue_cents),
        }));
      return {
        found: true,
        name: customer.name,
        lifetime_revenue: money(customerLifetimeRevenueCents(trips, customer.id)),
        completed_trip_count: customerTripCount(trips, customer.id),
        recent_trips: theirs,
      };
    }

    case "get_inactive_customers": {
      const rawDays = Number(args.days);
      const days =
        Number.isFinite(rawDays) && rawDays > 0
          ? Math.trunc(rawDays)
          : INACTIVE_THRESHOLD_DAYS;
      const [trips, customers] = await Promise.all([
        listTrips(),
        listCustomers(),
      ]);
      const flagged = inactiveCustomers(
        trips,
        customers,
        days,
        todayInNewYork(),
      );
      return {
        threshold_days: days,
        inactive_customers: flagged.map((c) => ({
          name: c.name,
          days_since_last_trip: c.daysSinceLastTrip,
          last_trip_date: c.lastTripDate,
          trip_count: c.tripCount,
          lifetime_revenue: money(c.lifetimeRevenueCents),
        })),
      };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}
