import type Anthropic from "@anthropic-ai/sdk";
import { beautyMonthRevenueCents, fillsDueClients, upcomingAppointments } from "@/lib/business/beauty/intel";
import { getBeautyProfile, listAppointments, listBeautyClients, listServices } from "@/lib/db/beauty";
import { formatUsd } from "@/lib/money";

export const BEAUTY_TOOL_DEFS: Anthropic.Tool[] = [
  { name: "get_revenue_summary", description: "Completed beauty appointment revenue for the current business-local month.", input_schema: { type: "object", properties: {}, required: [] } },
  { name: "get_appointments_summary", description: "Booked upcoming appointments from this beauty workspace.", input_schema: { type: "object", properties: {}, required: [] } },
  { name: "get_service_menu", description: "Active services with exact recorded prices and durations.", input_schema: { type: "object", properties: {}, required: [] } },
  { name: "get_fills_due_clients", description: "Repeat lash clients whose last completed set or fill was more than 21 business-local calendar days ago.", input_schema: { type: "object", properties: {}, required: [] } },
  { name: "get_client_history", description: "Recorded appointment history for one exact client name.", input_schema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] } },
];
const money = (cents: number) => ({ cents, usd: formatUsd(cents) });

export async function executeBeautyTool(name: string, input: unknown): Promise<unknown> {
  const args = (input ?? {}) as Record<string, unknown>;
  const now = new Date();
  if (name === "get_revenue_summary") {
    const [appointments, profile] = await Promise.all([listAppointments(), getBeautyProfile()]);
    return { period: "current_month", timezone: profile.timezone, revenue: money(beautyMonthRevenueCents(appointments, now, profile.timezone)) };
  }
  if (name === "get_appointments_summary") {
    const appointments = upcomingAppointments(await listAppointments(), now);
    return { count: appointments.length, appointments: appointments.map((appointment) => ({ starts_at: appointment.starts_at, client: appointment.client?.name ?? null, services: appointment.appointment_services?.map((line) => line.name) ?? [], total: money(appointment.price_cents) })) };
  }
  if (name === "get_service_menu") {
    const services = await listServices();
    return { services: services.filter((service) => service.active).map((service) => ({ name: service.name, category: service.category, duration_minutes: service.duration_minutes, price: money(service.price_cents), deposit: service.deposit_cents == null ? null : money(service.deposit_cents) })) };
  }
  if (name === "get_fills_due_clients") {
    const [clients, appointments, profile] = await Promise.all([listBeautyClients(), listAppointments(), getBeautyProfile()]);
    return { clients: fillsDueClients(clients, appointments, now, 21, profile.timezone).map((item) => ({ name: item.customer.name, days_since: item.daysSince, last_service_at: item.lastServiceAt })) };
  }
  if (name === "get_client_history") {
    const query = String(args.name ?? "").trim().toLowerCase();
    if (!query) return { error: "A client name is required." };
    const [clients, appointments] = await Promise.all([listBeautyClients(), listAppointments()]);
    const matches = clients.filter((client) => client.name.toLowerCase() === query);
    if (matches.length !== 1) return { found: false, matches: matches.map((client) => client.name) };
    const client = matches[0]!;
    return { found: true, client: client.name, appointments: appointments.filter((appointment) => appointment.client_id === client.id).map((appointment) => ({ starts_at: appointment.starts_at, status: appointment.status, services: appointment.appointment_services?.map((line) => line.name) ?? [], total: money(appointment.price_cents) })) };
  }
  return { error: "Unknown beauty tool." };
}
