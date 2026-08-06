export interface LocalDateTimeParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

const DATE_TIME_FORMATTERS = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  const existing = DATE_TIME_FORMATTERS.get(timeZone);
  if (existing) return existing;
  const created = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  DATE_TIME_FORMATTERS.set(timeZone, created);
  return created;
}

export function assertValidTimeZone(timeZone: string): void {
  try {
    formatter(timeZone).format(new Date(0));
  } catch {
    throw new Error("The business timezone is invalid.");
  }
}

export function localDateTimeParts(
  date: Date,
  timeZone: string,
): LocalDateTimeParts {
  if (!Number.isFinite(date.getTime())) throw new Error("The date is invalid.");
  assertValidTimeZone(timeZone);
  const parts = formatter(timeZone).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
  };
}

export function parseDateTimeLocal(value: string): LocalDateTimeParts {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) throw new Error("Enter a valid appointment date and time.");
  const parts = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
  };
  const canonical = new Date(Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
  ));
  if (
    canonical.getUTCFullYear() !== parts.year ||
    canonical.getUTCMonth() + 1 !== parts.month ||
    canonical.getUTCDate() !== parts.day ||
    canonical.getUTCHours() !== parts.hour ||
    canonical.getUTCMinutes() !== parts.minute
  ) {
    throw new Error("Enter a valid appointment date and time.");
  }
  return parts;
}

function sameParts(a: LocalDateTimeParts, b: LocalDateTimeParts): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day &&
    a.hour === b.hour && a.minute === b.minute;
}

export function zonedDateTimeToUtc(value: string, timeZone: string): Date {
  const desired = parseDateTimeLocal(value);
  assertValidTimeZone(timeZone);
  const desiredEpoch = Date.UTC(
    desired.year,
    desired.month - 1,
    desired.day,
    desired.hour,
    desired.minute,
  );
  let guess = desiredEpoch;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const actual = localDateTimeParts(new Date(guess), timeZone);
    if (sameParts(actual, desired)) return new Date(guess);
    const actualEpoch = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
    );
    guess += desiredEpoch - actualEpoch;
  }

  if (sameParts(localDateTimeParts(new Date(guess), timeZone), desired)) {
    return new Date(guess);
  }
  throw new Error(
    "That local time does not exist in the business timezone because of daylight saving time.",
  );
}

export function formatDateTimeLocal(date: Date, timeZone: string): string {
  const parts = localDateTimeParts(date, timeZone);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
}

export function localDateKey(date: Date, timeZone: string): string {
  const parts = localDateTimeParts(date, timeZone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}
