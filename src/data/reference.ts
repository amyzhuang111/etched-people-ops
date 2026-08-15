/**
 * Static reference/config data: org taxonomy and tool configuration that
 * doesn't belong in a database row (function list, team names, sourcing
 * channels, forecast defaults, conversion-rate targets). Every measured
 * number lives in Postgres and is served through /api/bootstrap
 * (src/lib/server-data.ts) instead.
 *
 * Safe to import directly in client components — no PRNG, no dependency on
 * the seed generator in prisma/seed.ts.
 */
import type { FunctionName, ForecastAssumptions, SourceChannel } from "@/types";

export const FUNCTIONS: FunctionName[] = [
  "ASIC",
  "Architecture",
  "Platform",
  "Software",
  "Production",
  "GTM",
  "Operations",
  "Finance",
  "People",
  "Other",
];

export const TEAMS_BY_FUNCTION: Record<FunctionName, string[]> = {
  ASIC: ["Physical Design", "Verification", "DFT", "RTL", "Interface IP"],
  Architecture: ["Memory Systems", "Compute Architecture", "Interconnect", "Performance"],
  Platform: ["Electrical", "SI/PI", "Hardware Systems", "Systems Validation"],
  Software: ["Inference Runtime", "Compilers", "Performance", "Firmware", "Supercomputing"],
  Production: ["Supply Chain", "Manufacturing", "Quality", "Test"],
  GTM: ["Partnerships & Sales", "Solutions Engineering"],
  Operations: ["Business Operations", "IT & Workplace"],
  Finance: ["FP&A", "Accounting"],
  People: ["Talent Acquisition", "People Programs"],
  Other: ["General & Administrative"],
};

export const SOURCE_CHANNELS: SourceChannel[] = [
  "Employee Referral",
  "Outbound",
  "Inbound",
  "Agency",
  "University",
  "Executive Search",
];

export const DEFAULT_ASSUMPTIONS: ForecastAssumptions = {
  offerAcceptanceRate: 0.72,
  acceptedToStartRate: 0.94,
  monthlyRegrettableAttrition: 0.006,
  onsiteToOfferRate: 0.3,
};

export const FUNNEL_TARGETS: Record<string, number> = {
  "Sourced → Screen": 25,
  "Screen → Technical": 50,
  "Technical → Onsite": 42,
  "Onsite → Offer": 35,
  "Offer → Accept": 80,
};

/** Company target — a policy/goal, not a measurement, so it stays config. */
export const TIME_TO_FILL_TARGET_DAYS = 35;
