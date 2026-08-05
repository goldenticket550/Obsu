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

export function resolveBusinessBranding(
  organizationName: string | null | undefined,
  profile: BusinessProfileBranding | null | undefined,
) {
  return {
    displayName: clean(profile?.display_name) ?? clean(organizationName),
    workspaceLabel: clean(profile?.workspace_label),
    vehicleDescription: clean(profile?.vehicle_description),
    primaryColor: clean(profile?.primary_color),
    secondaryColor: clean(profile?.secondary_color),
  };
}
