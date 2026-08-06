export interface BusinessProfileBranding {
  display_name?: string | null;
  workspace_label?: string | null;
  vehicle_description?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
}

function clean(value: string | null | undefined): string | null {
  const text = value?.trim();
  return text ? text : null;
}

const SAFE_HEX = /^#[0-9a-f]{6}$/i;

export function safeWorkspaceColor(
  value: string | null | undefined,
  fallback: string,
): string {
  const candidate = clean(value);
  return candidate && SAFE_HEX.test(candidate) ? candidate.toUpperCase() : fallback;
}

export function resolveBusinessBranding(
  organizationName: string | null | undefined,
  profile: BusinessProfileBranding | null | undefined,
) {
  return {
    displayName: clean(profile?.display_name) ?? clean(organizationName),
    workspaceLabel: clean(profile?.workspace_label),
    vehicleDescription: clean(profile?.vehicle_description),
    primaryColor: safeWorkspaceColor(profile?.primary_color, "#E8B04B"),
    secondaryColor: safeWorkspaceColor(profile?.secondary_color, "#37E8FF"),
  };
}
