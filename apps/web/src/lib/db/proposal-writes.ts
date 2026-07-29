import { createSupabaseServerClient } from "./supabase-server";
import { findOrCreateCustomerByName } from "./customers";
import { createTripWithCosts } from "./trips";
import type { ProposalWrites } from "@/lib/business/execute-proposal";

/**
 * V3.1 — the production allowlist: the only five writes an approved proposal
 * can reach. Every one is RLS-scoped, and organization_id is passed in from the
 * executor's session-derived context — never from the proposal.
 *
 * `createTrip` calls the SAME createTripWithCosts the ride form calls. That is
 * the point of this file existing: before it, "create a trip" had two
 * definitions, and the executor's dropped the linked cost rows, overstating
 * profit by exactly the gas and tolls it silently discarded.
 */
export function createProposalWrites(organizationId: string): ProposalWrites {
  return {
    async createTrip(action) {
      const supabase = createSupabaseServerClient();
      const customerId = action.customerName
        ? await findOrCreateCustomerByName(action.customerName)
        : null;

      return createTripWithCosts(supabase, {
        organizationId,
        customerId,
        tripRow: {
          trip_date: action.tripDate,
          trip_type: action.tripType,
          status: action.status,
          pickup_location: action.pickup,
          dropoff_location: action.dropoff,
          payment_method: action.paymentMethod,
          // Same convention as the form: 0 means "no price set", which is only
          // reachable for a scheduled ride (validateAction requires an amount
          // to log a completed one).
          revenue_cents: action.revenueCents ?? 0,
        },
        tripDate: action.tripDate,
        costs: {
          gasCents: action.costs.gasCents,
          tollsCents: action.costs.tollsCents,
          otherCents: action.costs.otherCents,
          otherLabel: action.costs.otherLabel,
        },
      });
    },

    async updateTrip(action) {
      const supabase = createSupabaseServerClient();
      const patch: Record<string, unknown> = {};
      const { changes } = action;
      if (changes.pickup !== undefined) patch.pickup_location = changes.pickup;
      if (changes.dropoff !== undefined) patch.dropoff_location = changes.dropoff;
      if (changes.tripType !== undefined) patch.trip_type = changes.tripType;
      if (changes.passengerCount !== undefined) {
        patch.passenger_count = changes.passengerCount;
      }
      if (changes.notes !== undefined) patch.notes = changes.notes;

      const { error } = await supabase
        .from("trips")
        .update(patch)
        .eq("id", action.tripId);
      if (error) throw error;
    },

    async completeTrip(action) {
      const supabase = createSupabaseServerClient();
      const { error } = await supabase
        .from("trips")
        .update({ status: "completed", revenue_cents: action.revenueCents })
        .eq("id", action.tripId);
      if (error) throw error;
    },

    async cancelTrip(action) {
      const supabase = createSupabaseServerClient();
      const { error } = await supabase
        .from("trips")
        .update({ status: "canceled" })
        .eq("id", action.tripId);
      if (error) throw error;
    },

    async recordPayment(action) {
      const supabase = createSupabaseServerClient();
      // Only the amount received. The fare is untouched — recording a payment
      // is not a re-price, and the proposal model has no way to express one.
      const { error } = await supabase
        .from("trips")
        .update({ amount_paid_cents: action.amountPaidCents })
        .eq("id", action.tripId);
      if (error) throw error;
    },
  };
}
