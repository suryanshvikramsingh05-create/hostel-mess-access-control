export type MealType = "breakfast" | "lunch" | "snacks" | "dinner";

// Enforced in Asia/Kolkata regardless of server timezone (the app DB runs
// in UTC on Render). All windows are same-day, inclusive of both ends.
const MEAL_TIMEZONE = "Asia/Kolkata";

interface MealWindow {
  startMinutes: number; // minutes since midnight, IST
  endMinutes: number;
  label: string;
}

export const MEAL_WINDOWS: Record<MealType, MealWindow> = {
  breakfast: { startMinutes: 8 * 60, endMinutes: 9 * 60 + 30, label: "8:00 – 9:30 AM" },
  lunch: { startMinutes: 12 * 60 + 30, endMinutes: 14 * 60 + 30, label: "12:30 – 2:30 PM" },
  snacks: { startMinutes: 17 * 60 + 30, endMinutes: 18 * 60 + 30, label: "5:30 – 6:30 PM" },
  dinner: { startMinutes: 20 * 60, endMinutes: 21 * 60 + 30, label: "8:00 – 9:30 PM" },
};

function minutesOfDayInTimezone(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0") % 24;
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

export function isMealWindowOpen(mealType: MealType, at: Date = new Date()): boolean {
  return getMealAvailability(mealType, at) === "open";
}

export function mealWindowLabel(mealType: MealType): string {
  return MEAL_WINDOWS[mealType].label;
}

export const MEAL_SEQUENCE: MealType[] = ["breakfast", "lunch", "snacks", "dinner"];

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  snacks: "Snacks",
  dinner: "Dinner",
};

// Time-only availability of a meal window, independent of whether the
// resident has already used their token for it today.
export type MealAvailability = "upcoming" | "open" | "expired";

export function getMealAvailability(mealType: MealType, at: Date = new Date()): MealAvailability {
  const minutes = minutesOfDayInTimezone(at, MEAL_TIMEZONE);
  const window = MEAL_WINDOWS[mealType];
  if (minutes < window.startMinutes) return "upcoming";
  if (minutes > window.endMinutes) return "expired";
  return "open";
}

// Combines the time-only availability above with whether the resident has
// already consumed today's token for that meal, so the UI can show a single
// authoritative Used / Available / Expired / Upcoming state per meal instead
// of a generic "N of 4 used" counter that keeps counting expired meals as
// still-available slots.
export type MealStatus = "used" | "available" | "expired" | "upcoming";

export interface MealStatusEntry {
  mealType: MealType;
  label: string;
  window: string;
  status: MealStatus;
}

export function buildMealStatuses(
  usedMealTypes: Iterable<MealType>,
  at: Date = new Date()
): MealStatusEntry[] {
  const used = new Set(usedMealTypes);
  return MEAL_SEQUENCE.map((mealType) => {
    const status: MealStatus = used.has(mealType)
      ? "used"
      : getMealAvailability(mealType, at) === "open"
        ? "available"
        : getMealAvailability(mealType, at) === "expired"
          ? "expired"
          : "upcoming";
    return { mealType, label: MEAL_LABELS[mealType], window: MEAL_WINDOWS[mealType].label, status };
  });
}
