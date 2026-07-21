/**
 * OBSIDIAN RIDES — business engine (M5).
 * Deterministic, pure calculation functions over already-fetched data. No DB
 * access and no clock inside the calcs (the one clock-aware helper,
 * currentMonthRange, is isolated in date-range.ts). Money is integer cents in
 * and out. Wired into the dashboard in M6, not here.
 */
export * from "./revenue";
export * from "./expenses";
export * from "./profit";
export * from "./trip-rates";
export * from "./customers";
export * from "./customer-intel";
export * from "./date-range";
