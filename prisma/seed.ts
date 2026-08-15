/**
 * Deterministic seed for the Etched Talent Command Center relational model.
 *
 * Everything generated here is illustrative demo data for a portfolio
 * project — never real Etched personnel, hiring, or candidate data. Only
 * San Jose HQ (+ Taiwan factory, San Jose data center) and six functions
 * with a named public VP (ASIC, Architecture, Platform, Software,
 * Production, Finance) are verified against etched.com; GTM, Operations,
 * People, and Other are illustrative additions. The capability taxonomy,
 * employees, requisitions, candidates, and pipeline history are entirely
 * fictional, engineered to reconcile with the illustrative targets in the
 * backend spec (430 HC, +58 YTD, 27 open seats, 39 expected starts, ~72%
 * offer acceptance, ~41d median TTF, ~78%/84% critical talent coverage).
 */
import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

// ---------------------------------------------------------------------------
// Deterministic PRNG (mulberry32) — fixed seed, reproducible every run.
// ---------------------------------------------------------------------------
function mulberry32(seed: number) {
  let a = seed;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(19740411);
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
const int = (min: number, max: number) => Math.floor(min + rand() * (max - min + 1));
const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const TODAY = new Date("2026-08-14T00:00:00Z");
function daysAgo(days: number): Date {
  const d = new Date(TODAY);
  d.setUTCDate(d.getUTCDate() - days);
  return d;
}
function daysFromNow(days: number): Date {
  const d = new Date(TODAY);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------
const FUNCTIONS = [
  { name: "ASIC", slug: "asic", target: 105 },
  { name: "Architecture", slug: "architecture", target: 45 },
  { name: "Platform", slug: "platform", target: 55 },
  { name: "Software", slug: "software", target: 70 },
  { name: "Production", slug: "production", target: 65 },
  { name: "People", slug: "people", target: 20 },
  { name: "GTM", slug: "gtm", target: 18 },
  { name: "Operations", slug: "operations", target: 22 },
  { name: "Finance", slug: "finance", target: 15 },
  { name: "Other", slug: "other", target: 15 },
] as const;
// Sum = 430

const PLANNED_HC: Record<string, number> = {
  asic: 114,
  architecture: 49,
  platform: 60,
  software: 76,
  production: 71,
  people: 22,
  gtm: 20,
  operations: 24,
  finance: 16,
  other: 15,
};
// Sum = 467

const ROLE_TITLES: Record<string, string[]> = {
  asic: ["RTL Design Engineer", "Physical Design Engineer", "Design Verification Engineer", "DFT Engineer", "ASIC Design Engineer"],
  architecture: ["ASIC Architect", "Inference Software Engineer", "Performance Modeling Engineer"],
  platform: ["Electrical Engineer", "SI/PI Engineer", "Hardware Systems Engineer"],
  software: ["Supercomputing Engineer", "Firmware Engineer", "Performance Profiling Engineer", "Inference Runtime Engineer", "Systems Software Engineer"],
  production: ["Manufacturing Test Engineer", "Mechanical DFM Engineer", "Product Quality Engineer", "Quality Engineer", "Manufacturing Operations Program Manager", "Global Supply Manager", "Contract Manufacturing Manager", "Demand Planner", "SMT Engineer", "Test Technical Program Manager"],
  people: ["Technical Recruiter", "Technical Recruiter - Supercomputing / ML", "Talent Ops", "Recruiter - G&A / GTM"],
  gtm: ["Partner Manager", "Account Executive", "Solutions Engineer"],
  operations: ["Business Operations Analyst", "IT Systems Administrator", "Workplace Manager"],
  finance: ["FP&A Analyst", "Staff Accountant", "Controller"],
  other: ["Executive Assistant", "Legal Counsel", "Office Manager"],
};

// ---------------------------------------------------------------------------
// Capabilities — function -> [{name, category, criticality, scarcity}]
// ---------------------------------------------------------------------------
interface CapSeed {
  name: string;
  functionSlug: string;
  category:
    | "CHIP" | "ARCHITECTURE" | "PLATFORM" | "SOFTWARE" | "PRODUCTION"
    | "SUPPLY_CHAIN" | "OPERATIONS" | "TALENT" | "GTM" | "FINANCE" | "OTHER";
  criticality: "P0" | "P1" | "P2" | "P3";
  scarcity: "LOW" | "MEDIUM" | "HIGH" | "EXTREME";
}

const CAPABILITIES: CapSeed[] = [
  { name: "RTL Design", functionSlug: "asic", category: "CHIP", criticality: "P1", scarcity: "MEDIUM" },
  { name: "Physical Design", functionSlug: "asic", category: "CHIP", criticality: "P0", scarcity: "HIGH" },
  { name: "Design Verification", functionSlug: "asic", category: "CHIP", criticality: "P1", scarcity: "HIGH" },
  { name: "DFT", functionSlug: "asic", category: "CHIP", criticality: "P1", scarcity: "MEDIUM" },
  { name: "Inference Architecture", functionSlug: "architecture", category: "ARCHITECTURE", criticality: "P0", scarcity: "EXTREME" },
  { name: "Performance Modeling", functionSlug: "architecture", category: "ARCHITECTURE", criticality: "P1", scarcity: "HIGH" },
  { name: "Memory Systems", functionSlug: "architecture", category: "ARCHITECTURE", criticality: "P0", scarcity: "EXTREME" },
  { name: "Interconnect", functionSlug: "architecture", category: "ARCHITECTURE", criticality: "P1", scarcity: "HIGH" },
  { name: "Advanced Packaging", functionSlug: "asic", category: "CHIP", criticality: "P2", scarcity: "MEDIUM" },
  { name: "Electrical Systems", functionSlug: "platform", category: "PLATFORM", criticality: "P1", scarcity: "MEDIUM" },
  { name: "Power Delivery", functionSlug: "platform", category: "PLATFORM", criticality: "P1", scarcity: "MEDIUM" },
  { name: "SI/PI", functionSlug: "platform", category: "PLATFORM", criticality: "P0", scarcity: "HIGH" },
  { name: "Thermal Systems", functionSlug: "platform", category: "PLATFORM", criticality: "P2", scarcity: "MEDIUM" },
  { name: "Mechanical Systems", functionSlug: "platform", category: "PLATFORM", criticality: "P2", scarcity: "LOW" },
  { name: "Firmware", functionSlug: "software", category: "SOFTWARE", criticality: "P1", scarcity: "MEDIUM" },
  { name: "Inference Runtime", functionSlug: "software", category: "SOFTWARE", criticality: "P1", scarcity: "HIGH" },
  { name: "Performance Profiling", functionSlug: "software", category: "SOFTWARE", criticality: "P2", scarcity: "MEDIUM" },
  { name: "Supercomputing", functionSlug: "software", category: "SOFTWARE", criticality: "P0", scarcity: "EXTREME" },
  { name: "Networking", functionSlug: "software", category: "SOFTWARE", criticality: "P2", scarcity: "MEDIUM" },
  { name: "Kernel / Compiler Optimization", functionSlug: "software", category: "SOFTWARE", criticality: "P1", scarcity: "HIGH" },
  { name: "Product Test", functionSlug: "production", category: "PRODUCTION", criticality: "P1", scarcity: "MEDIUM" },
  { name: "Manufacturing Test", functionSlug: "production", category: "PRODUCTION", criticality: "P0", scarcity: "HIGH" },
  { name: "SMT", functionSlug: "production", category: "PRODUCTION", criticality: "P2", scarcity: "MEDIUM" },
  { name: "DFM", functionSlug: "production", category: "PRODUCTION", criticality: "P1", scarcity: "MEDIUM" },
  { name: "Product Quality", functionSlug: "production", category: "PRODUCTION", criticality: "P1", scarcity: "MEDIUM" },
  { name: "Reliability", functionSlug: "production", category: "PRODUCTION", criticality: "P2", scarcity: "LOW" },
  { name: "Demand Planning", functionSlug: "production", category: "SUPPLY_CHAIN", criticality: "P1", scarcity: "MEDIUM" },
  { name: "Contract Manufacturing", functionSlug: "production", category: "SUPPLY_CHAIN", criticality: "P2", scarcity: "MEDIUM" },
  { name: "Global Supply Management", functionSlug: "production", category: "SUPPLY_CHAIN", criticality: "P1", scarcity: "MEDIUM" },
  { name: "Mechanical Supply", functionSlug: "production", category: "SUPPLY_CHAIN", criticality: "P2", scarcity: "LOW" },
  { name: "Interconnect Supply", functionSlug: "production", category: "SUPPLY_CHAIN", criticality: "P2", scarcity: "LOW" },
  { name: "Technical Recruiting", functionSlug: "people", category: "TALENT", criticality: "P1", scarcity: "MEDIUM" },
  { name: "Talent Operations", functionSlug: "people", category: "TALENT", criticality: "P2", scarcity: "LOW" },
  { name: "Partnerships & Sales", functionSlug: "gtm", category: "GTM", criticality: "P2", scarcity: "LOW" },
  { name: "Business Operations", functionSlug: "operations", category: "OPERATIONS", criticality: "P2", scarcity: "LOW" },
  { name: "FP&A", functionSlug: "finance", category: "FINANCE", criticality: "P2", scarcity: "LOW" },
  { name: "General & Administrative", functionSlug: "other", category: "OTHER", criticality: "P3", scarcity: "LOW" },
];

// ---------------------------------------------------------------------------
// Sites
// ---------------------------------------------------------------------------
const SITES = [
  { name: "San Jose HQ", city: "San Jose", region: "California", country: "USA", siteType: "HQ" as const },
  { name: "San Jose Engineering Lab", city: "San Jose", region: "California", country: "USA", siteType: "LAB" as const },
  { name: "Taiwan Production Site", city: "Hsinchu", region: "Hsinchu", country: "Taiwan", siteType: "FACTORY" as const },
  { name: "Inference Data Center", city: "San Jose", region: "California", country: "USA", siteType: "DATA_CENTER" as const },
];

// ---------------------------------------------------------------------------
// Milestones
// ---------------------------------------------------------------------------
const MILESTONES = [
  {
    name: "Production Ramp",
    description: "Illustrative — scale manufacturing throughput for the next silicon revision.",
    category: "PRODUCTION" as const,
    targetDateDays: 75,
    priority: "P0" as const,
    requirements: [
      { capability: "Manufacturing Test", required: 14, minimum: 10, weight: 1.0 },
      { capability: "Product Quality", required: 10, minimum: 7, weight: 0.8 },
      { capability: "Contract Manufacturing", required: 8, minimum: 5, weight: 0.7 },
      { capability: "Global Supply Management", required: 9, minimum: 6, weight: 0.9 },
      { capability: "Demand Planning", required: 7, minimum: 5, weight: 0.7 },
      { capability: "DFM", required: 8, minimum: 5, weight: 0.8 },
      { capability: "SMT", required: 6, minimum: 4, weight: 0.6 },
    ],
  },
  {
    name: "Rack Validation",
    description: "Illustrative — validate rack-scale electrical, thermal, and firmware integration.",
    category: "RACK" as const,
    targetDateDays: 60,
    priority: "P0" as const,
    requirements: [
      { capability: "Electrical Systems", required: 16, minimum: 12, weight: 0.9 },
      { capability: "SI/PI", required: 10, minimum: 7, weight: 1.0 },
      { capability: "Thermal Systems", required: 8, minimum: 5, weight: 0.6 },
      { capability: "Firmware", required: 10, minimum: 7, weight: 0.8 },
      { capability: "Supercomputing", required: 9, minimum: 6, weight: 1.0 },
      { capability: "Product Test", required: 8, minimum: 5, weight: 0.7 },
    ],
  },
  {
    name: "Inference Runtime Readiness",
    description: "Illustrative — inference runtime performance and reliability for launch.",
    category: "SOFTWARE" as const,
    targetDateDays: 45,
    priority: "P0" as const,
    requirements: [
      { capability: "Inference Runtime", required: 14, minimum: 10, weight: 1.0 },
      { capability: "Kernel / Compiler Optimization", required: 10, minimum: 7, weight: 0.9 },
      { capability: "Performance Profiling", required: 7, minimum: 5, weight: 0.6 },
      { capability: "Inference Architecture", required: 8, minimum: 6, weight: 0.9 },
    ],
  },
  {
    name: "Gigawatt Scale-Out",
    description: "Illustrative — long-horizon capacity scale-out program.",
    category: "SCALE" as const,
    targetDateDays: 180,
    priority: "P1" as const,
    requirements: [
      { capability: "Memory Systems", required: 10, minimum: 6, weight: 1.0 },
      { capability: "Interconnect", required: 8, minimum: 5, weight: 0.8 },
      { capability: "Global Supply Management", required: 9, minimum: 6, weight: 0.7 },
      { capability: "Networking", required: 6, minimum: 4, weight: 0.6 },
    ],
  },
  {
    name: "Silicon Validation",
    description: "Illustrative — next-generation silicon bring-up and validation.",
    category: "SILICON" as const,
    targetDateDays: 30,
    priority: "P1" as const,
    requirements: [
      { capability: "Design Verification", required: 20, minimum: 15, weight: 0.9 },
      { capability: "Physical Design", required: 24, minimum: 18, weight: 1.0 },
      { capability: "DFT", required: 12, minimum: 9, weight: 0.7 },
      { capability: "RTL Design", required: 18, minimum: 13, weight: 0.8 },
    ],
  },
];

// ---------------------------------------------------------------------------
// Critical searches (hero requisitions) — from spec §61
// ---------------------------------------------------------------------------
const HERO_REQS = [
  { reqNumber: "REQ-1001", title: "Physical Design Engineer", capability: "Physical Design", functionSlug: "asic", priority: "P0" as const, openings: 4, daysOpen: 58, pipelineHealth: "WEAK" as const, milestone: "Production Ramp", scarcity: "HIGH" as const },
  { reqNumber: "REQ-1002", title: "SI/PI Engineer", capability: "SI/PI", functionSlug: "platform", priority: "P0" as const, openings: 3, daysOpen: 47, pipelineHealth: "MODERATE" as const, milestone: "Rack Validation", scarcity: "HIGH" as const },
  { reqNumber: "REQ-1003", title: "Manufacturing Test Engineer", capability: "Manufacturing Test", functionSlug: "production", priority: "P0" as const, openings: 4, daysOpen: 44, pipelineHealth: "MODERATE" as const, milestone: "Production Ramp", scarcity: "HIGH" as const },
  { reqNumber: "REQ-1004", title: "Supercomputing Engineer", capability: "Supercomputing", functionSlug: "software", priority: "P0" as const, openings: 3, daysOpen: 46, pipelineHealth: "WEAK" as const, milestone: "Rack Validation", scarcity: "EXTREME" as const },
  { reqNumber: "REQ-1005", title: "Design Verification Engineer", capability: "Design Verification", functionSlug: "asic", priority: "P1" as const, openings: 4, daysOpen: 39, pipelineHealth: "STRONG" as const, milestone: "Silicon Validation", scarcity: "HIGH" as const },
  // daysOpen stretched past the 90D/YTD windows (see windowDays() in
  // src/lib/filters.tsx) so the Time Range filter shows genuinely
  // different counts at every bucket, not just 30D vs everything else.
  { reqNumber: "REQ-1006", title: "Electrical Engineer", capability: "Electrical Systems", functionSlug: "platform", priority: "P1" as const, openings: 2, daysOpen: 260, pipelineHealth: "MODERATE" as const, milestone: "Rack Validation", scarcity: "MEDIUM" as const },
  { reqNumber: "REQ-1007", title: "Demand Planner", capability: "Demand Planning", functionSlug: "production", priority: "P1" as const, openings: 2, daysOpen: 130, pipelineHealth: "WEAK" as const, milestone: "Production Ramp", scarcity: "MEDIUM" as const },
  { reqNumber: "REQ-1008", title: "Inference Runtime Engineer", capability: "Inference Runtime", functionSlug: "software", priority: "P1" as const, openings: 3, daysOpen: 41, pipelineHealth: "MODERATE" as const, milestone: "Inference Runtime Readiness", scarcity: "HIGH" as const },
  // Filler open req to reach exactly 27 remaining open seats.
  { reqNumber: "REQ-1009", title: "Business Operations Analyst", capability: "Business Operations", functionSlug: "operations", priority: "P2" as const, openings: 2, daysOpen: 18, pipelineHealth: "STRONG" as const, milestone: null, scarcity: "LOW" as const },
];
// Sum of openings = 4+3+4+3+4+2+2+3+2 = 27

async function main() {
  console.log("Clearing existing data...");
  await db.recruiterCapacitySnapshot.deleteMany();
  await db.milestoneCoverageSnapshot.deleteMany();
  await db.recruitingSnapshot.deleteMany();
  await db.workforceSnapshot.deleteMany();
  await db.alert.deleteMany();
  await db.scenario.deleteMany();
  await db.integrationSyncRun.deleteMany();
  await db.hiringManagerSlaEvent.deleteMany();
  await db.recruiterCapacityPlan.deleteMany();
  await db.hire.deleteMany();
  await db.offerRiskEvent.deleteMany();
  await db.offer.deleteMany();
  await db.interview.deleteMany();
  await db.applicationStageEvent.deleteMany();
  await db.application.deleteMany();
  await db.candidate.deleteMany();
  await db.requisition.deleteMany();
  await db.workforcePlan.deleteMany();
  await db.workforcePlanVersion.deleteMany();
  await db.milestoneCapabilityRequirement.deleteMany();
  await db.milestone.deleteMany();
  await db.employeeCapability.deleteMany();
  await db.employee.deleteMany();
  await db.capability.deleteMany();
  await db.site.deleteMany();
  await db.function.deleteMany();

  // -------------------------------------------------------------------------
  console.log("Seeding functions...");
  const functionRows = new Map<string, string>();
  for (const f of FUNCTIONS) {
    const row = await db.function.create({ data: { name: f.name, slug: f.slug } });
    functionRows.set(f.slug, row.id);
  }

  console.log("Seeding sites...");
  const siteRows = await Promise.all(SITES.map((s) => db.site.create({ data: s })));
  const [hqSite, labSite, factorySite, dcSite] = siteRows;

  console.log("Seeding capabilities...");
  const capabilityRows = new Map<string, { id: string; functionSlug: string }>();
  for (const c of CAPABILITIES) {
    const row = await db.capability.create({
      data: {
        name: c.name,
        functionId: functionRows.get(c.functionSlug)!,
        category: c.category,
        criticality: c.criticality,
        scarcityLevel: c.scarcity,
      },
    });
    capabilityRows.set(c.name, { id: row.id, functionSlug: c.functionSlug });
  }

  // -------------------------------------------------------------------------
  console.log("Seeding employees...");
  const FIRST_NAMES = ["Maya", "Alex", "Jordan", "Sarah", "Ken", "Priya", "Marcus", "Devon", "Sofia", "Grace", "Owen", "Elena", "Nadia", "Ben", "Lena", "Aiden", "Simone", "Rafael", "Hana", "Tobias", "Wen", "Diego", "Amara", "Felix", "Ivy", "Noah", "Lucia", "Theo", "Zara", "Caleb", "Mei", "Anders", "Priyanka", "Omar", "Ines", "Kai", "Renata", "Jonas", "Yuki", "Leo", "Chloe", "Victor", "Nina", "Samuel", "Freya"];
  const LAST_NAMES = ["Chen", "Kim", "Lee", "Patel", "Wu", "Ramachandran", "Wei", "Achar", "Leon", "Halvorsen", "Park", "Vasquez", "Farouk", "Okafor", "Ortiz", "Cho", "Beaumont", "Nunez", "Suzuki", "Reinholt", "Ito", "Alvarez", "Nwosu", "Bianchi", "Novak", "Okonkwo", "Fischer", "Delgado", "Haddad", "Moreau", "Tanaka", "Bergstrom", "Rao", "Costa", "Nakamura", "Ivanova", "Weiss", "Sato", "Reyes"];

  const employeeIdsByFunction = new Map<string, string[]>();
  const recruiterIds: string[] = [];
  const hiringManagerIdsByFunction = new Map<string, string[]>();
  let empCounter = 1000;

  for (const f of FUNCTIONS) {
    const ids: string[] = [];
    const capsForFn = CAPABILITIES.filter((c) => c.functionSlug === f.slug);
    for (let i = 0; i < f.target; i++) {
      const isRecent = i < Math.round(f.target * (58 / 430)); // proportionally spread the +58 YTD hires
      const hireDate = isRecent ? daysAgo(int(0, 225)) : daysAgo(int(226, 1400));
      const site = f.slug === "production" && rand() < 0.35 ? factorySite : rand() < 0.05 ? dcSite : rand() < 0.1 ? labSite : hqSite;
      const isManager = i < Math.min(3, Math.ceil(f.target * 0.04));
      const jobLevel = isManager ? pick(["M2", "M3", "Director"]) : pick(["IC2", "IC3", "IC4", "IC5"]);
      const titles = ROLE_TITLES[f.slug];
      const jobTitle = isManager ? `${pick(titles)} Manager` : pick(titles);

      const emp = await db.employee.create({
        data: {
          employeeNumber: `E-${empCounter++}`,
          firstName: pick(FIRST_NAMES),
          lastName: pick(LAST_NAMES),
          status: "ACTIVE",
          functionId: functionRows.get(f.slug)!,
          siteId: site.id,
          jobTitle,
          jobLevel,
          hireDate,
          sourceSystem: "DEMO",
        },
      });
      ids.push(emp.id);

      if (f.slug === "people" && recruiterIds.length < 8 && rand() < 0.6) {
        recruiterIds.push(emp.id);
      }
      if (isManager) {
        const list = hiringManagerIdsByFunction.get(f.slug) ?? [];
        list.push(emp.id);
        hiringManagerIdsByFunction.set(f.slug, list);
      }

      if (capsForFn.length > 0) {
        const primaryCap = pick(capsForFn);
        await db.employeeCapability.create({
          data: {
            employeeId: emp.id,
            capabilityId: capabilityRows.get(primaryCap.name)!.id,
            proficiency: pick(["WORKING", "WORKING", "ADVANCED", "ADVANCED", "EXPERT"]),
            isPrimary: true,
            effectiveFrom: hireDate,
          },
        });
        if (rand() < 0.25) {
          const secondaryCap = pick(capsForFn);
          await db.employeeCapability.create({
            data: {
              employeeId: emp.id,
              capabilityId: capabilityRows.get(secondaryCap.name)!.id,
              proficiency: pick(["WORKING", "ADVANCED"]),
              isPrimary: false,
              effectiveFrom: hireDate,
            },
          });
        }
      }
    }
    employeeIdsByFunction.set(f.slug, ids);
  }

  // A handful of terminated employees — realism + edge cases, doesn't affect ACTIVE headcount.
  for (let i = 0; i < 5; i++) {
    const f = pick(FUNCTIONS);
    await db.employee.create({
      data: {
        employeeNumber: `E-${empCounter++}`,
        firstName: pick(FIRST_NAMES),
        lastName: pick(LAST_NAMES),
        status: "TERMINATED",
        functionId: functionRows.get(f.slug)!,
        siteId: hqSite.id,
        jobTitle: pick(ROLE_TITLES[f.slug]),
        jobLevel: "IC3",
        hireDate: daysAgo(int(400, 1200)),
        terminationDate: daysAgo(int(10, 300)),
        sourceSystem: "DEMO",
      },
    });
  }

  // Ensure exactly 8 recruiters even if the random pass under-shot.
  while (recruiterIds.length < 8) {
    const peopleIds = employeeIdsByFunction.get("people")!;
    const candidate = peopleIds[recruiterIds.length % peopleIds.length];
    if (!recruiterIds.includes(candidate)) recruiterIds.push(candidate);
    else break;
  }

  console.log(`Seeded ${empCounter - 1000} employees, ${recruiterIds.length} recruiters.`);

  // -------------------------------------------------------------------------
  console.log("Seeding milestones...");
  const milestoneRows = new Map<string, string>();
  for (const m of MILESTONES) {
    const row = await db.milestone.create({
      data: {
        name: m.name,
        description: m.description,
        category: m.category,
        targetDate: daysFromNow(m.targetDateDays),
        status: m.priority === "P0" ? "AT_RISK" : "ON_TRACK",
        priority: m.priority,
      },
    });
    milestoneRows.set(m.name, row.id);
    for (const r of m.requirements) {
      await db.milestoneCapabilityRequirement.create({
        data: {
          milestoneId: row.id,
          capabilityId: capabilityRows.get(r.capability)!.id,
          requiredHeadcount: r.required,
          minimumHeadcount: r.minimum,
          importanceWeight: r.weight,
          targetDate: daysFromNow(m.targetDateDays),
        },
      });
    }
  }

  // -------------------------------------------------------------------------
  console.log("Seeding workforce plan...");
  const planVersion = await db.workforcePlanVersion.create({
    data: { name: "FY26 Plan", effectiveDate: daysAgo(225), status: "ACTIVE" },
  });
  for (const f of FUNCTIONS) {
    await db.workforcePlan.create({
      data: {
        planVersionId: planVersion.id,
        periodStart: daysAgo(225),
        periodEnd: daysFromNow(140),
        functionId: functionRows.get(f.slug)!,
        plannedHeadcount: PLANNED_HC[f.slug],
        approvedHeadcount: PLANNED_HC[f.slug],
      },
    });
  }

  // -------------------------------------------------------------------------
  console.log("Seeding requisitions (hero + historical)...");
  const requisitionRows: {
    id: string;
    reqNumber: string;
    functionSlug: string;
    capabilityName: string;
    priority: "P0" | "P1" | "P2" | "P3";
    openings: number;
    status: "OPEN" | "FILLED" | "PAUSED" | "CANCELLED";
    openedAt: Date;
    recruiterId: string;
    hiringManagerId: string;
    ttf?: number;
    closedAt?: Date;
  }[] = [];

  function pickHiringManager(fnSlug: string): string {
    const list = hiringManagerIdsByFunction.get(fnSlug) ?? hiringManagerIdsByFunction.get("asic")!;
    return pick(list);
  }

  for (const h of HERO_REQS) {
    const recruiterId = pick(recruiterIds);
    const hmId = pickHiringManager(h.functionSlug);
    const row = await db.requisition.create({
      data: {
        reqNumber: h.reqNumber,
        title: h.title,
        functionId: functionRows.get(h.functionSlug)!,
        capabilityId: capabilityRows.get(h.capability)!.id,
        siteId: h.functionSlug === "production" ? factorySite.id : hqSite.id,
        priority: h.priority,
        status: "OPEN",
        openings: h.openings,
        openedAt: daysAgo(h.daysOpen),
        hiringManagerEmployeeId: hmId,
        recruiterEmployeeId: recruiterId,
        milestoneId: h.milestone ? milestoneRows.get(h.milestone)! : null,
        roleScarcity: h.scarcity,
        sourceSystem: "DEMO",
      },
    });
    requisitionRows.push({
      id: row.id,
      reqNumber: row.reqNumber,
      functionSlug: h.functionSlug,
      capabilityName: h.capability,
      priority: h.priority,
      openings: h.openings,
      status: "OPEN",
      openedAt: row.openedAt!,
      recruiterId,
      hiringManagerId: hmId,
    });
  }

  // Historical FILLED requisitions — provide time-to-fill + hire volume.
  // Target median (acceptedAt - openedAt) ~= 41 days. openedAt is placed
  // exactly `ttf` days before "today minus a small recency offset" so the
  // application-generation step below can reproduce that exact gap.
  const FILLED_TTF_DAYS = [28, 33, 35, 38, 39, 40, 41, 41, 42, 43, 45, 48, 51, 55, 60];
  let filledCounter = 2000;
  for (const ttf of FILLED_TTF_DAYS) {
    const f = pick(FUNCTIONS.filter((x) => !["people", "gtm", "finance", "other"].includes(x.slug)));
    const capsForFn = CAPABILITIES.filter((c) => c.functionSlug === f.slug);
    const cap = pick(capsForFn);
    const recency = int(3, 45); // how long ago this req actually closed
    const openedAt = daysAgo(ttf + recency);
    const closedAt = daysAgo(recency);
    const recruiterId = pick(recruiterIds);
    const hmId = pickHiringManager(f.slug);
    const row = await db.requisition.create({
      data: {
        reqNumber: `REQ-${filledCounter++}`,
        title: pick(ROLE_TITLES[f.slug]),
        functionId: functionRows.get(f.slug)!,
        capabilityId: capabilityRows.get(cap.name)!.id,
        siteId: f.slug === "production" ? factorySite.id : hqSite.id,
        priority: pick(["P1", "P1", "P2"]),
        status: "FILLED",
        openings: 1,
        openedAt,
        closedAt,
        hiringManagerEmployeeId: hmId,
        recruiterEmployeeId: recruiterId,
        roleScarcity: cap.scarcity,
        sourceSystem: "DEMO",
      },
    });
    requisitionRows.push({
      id: row.id,
      reqNumber: row.reqNumber,
      functionSlug: f.slug,
      capabilityName: cap.name,
      priority: row.priority,
      openings: 1,
      status: "FILLED",
      openedAt,
      recruiterId,
      hiringManagerId: hmId,
      ttf,
      closedAt,
    });
  }

  // A couple PAUSED / CANCELLED reqs — edge cases, excluded from "open seats".
  for (const status of ["PAUSED", "CANCELLED"] as const) {
    const f = pick(FUNCTIONS);
    const capsForFn = CAPABILITIES.filter((c) => c.functionSlug === f.slug);
    if (capsForFn.length === 0) continue;
    const cap = pick(capsForFn);
    await db.requisition.create({
      data: {
        reqNumber: `REQ-${filledCounter++}`,
        title: pick(ROLE_TITLES[f.slug]),
        functionId: functionRows.get(f.slug)!,
        capabilityId: capabilityRows.get(cap.name)!.id,
        priority: "P2",
        status,
        openings: 2,
        openedAt: daysAgo(int(20, 90)),
        closedAt: status === "CANCELLED" ? daysAgo(int(1, 15)) : null,
        recruiterEmployeeId: pick(recruiterIds),
        roleScarcity: cap.scarcity,
        sourceSystem: "DEMO",
      },
    });
  }

  console.log(`Seeded ${requisitionRows.length} requisitions with candidate pipelines (${HERO_REQS.length} open hero + ${FILLED_TTF_DAYS.length} filled).`);

  // -------------------------------------------------------------------------
  console.log("Seeding candidates, applications, stage history, interviews, offers, hires...");
  const CAND_FIRST = ["Jordan", "Sarah", "Ken", "Casey", "Morgan", "Taylor", "Riley", "Avery", "Quinn", "Skyler", "Reese", "Emerson", "Dakota", "Rowan", "Sage", "Micah", "Elliot", "Blair", "Jesse", "Drew"];
  const CAND_LAST = ["Lee", "Patel", "Wu", "Brooks", "Reyes", "Kwan", "Osei", "Larsen", "Mbeki", "Voss", "Hale", "Dutta", "Zheng", "Kovac", "Amara", "Solis", "Berg", "Nakata", "Franco", "Ude"];
  const COMPANIES = ["Frontier Silicon", "Meridian Compute", "Nova Semiconductor", "Cascade Systems", "Vantage AI", "Ledgerline Labs", "Northbridge Chips", "Solstice Robotics", "Anchorpoint Data", "Keystone Foundry", "Independent", "Graduate — Stanford", "Graduate — CMU", "Graduate — Berkeley"];
  const SOURCES: Array<"SOURCED" | "REFERRAL" | "INBOUND" | "AGENCY" | "EVENT" | "OTHER"> = ["SOURCED", "REFERRAL", "INBOUND", "AGENCY", "EVENT", "OTHER"];

  const STAGE_ORDER = ["PROSPECT", "CONTACTED", "SCREEN", "TECHNICAL", "ONSITE", "EXECUTIVE", "OFFER", "HIRED"] as const;
  type Stage = (typeof STAGE_ORDER)[number];
  type ApplicationStageType = Stage;

  function stageTimeline(finalStage: Stage, endDate: Date): { stage: Stage; date: Date }[] {
    const finalIdx = STAGE_ORDER.indexOf(finalStage);
    const timeline: { stage: Stage; date: Date }[] = [];
    let cursor = new Date(endDate);
    for (let i = finalIdx; i >= 0; i--) {
      timeline.unshift({ stage: STAGE_ORDER[i], date: new Date(cursor) });
      cursor = new Date(cursor.getTime() - int(2, 8) * 86_400_000);
    }
    return timeline;
  }

  let candCounter = 3000;
  let acceptedOfferCount = 0;
  let declinedOfferCount = 0;
  const TARGET_ACCEPTED_NOT_STARTED = 39; // "Expected Starts" within next 30 days

  // Active pipeline against OPEN hero reqs — funnel-shaped distribution.
  // A minority of early-stage candidates are seeded as long-since-sourced
  // (100-300 days ago) so the Time Range filter's 90D/YTD/12M buckets
  // genuinely diverge instead of all converging on the same ~2-month
  // window — a stalled early-funnel candidate is realistic; a 300-day-old
  // unresponded offer is not, so aging is only applied at SCREEN/TECHNICAL.
  const openReqs = requisitionRows.filter((r) => r.status === "OPEN");
  for (const req of openReqs) {
    const pipelineSize = int(3, 7);
    for (let i = 0; i < pipelineSize; i++) {
      const roll = rand();
      const stage: ApplicationStageType =
        roll < 0.35 ? "SCREEN" : roll < 0.6 ? "TECHNICAL" : roll < 0.82 ? "ONSITE" : roll < 0.94 ? "EXECUTIVE" : "OFFER";
      const canAge = stage === "SCREEN" || stage === "TECHNICAL";
      const agedDaysAgo = canAge && rand() < 0.35 ? pick([int(95, 140), int(180, 260), int(270, 340)]) : undefined;
      await createApplication(req, stage, false, false, undefined, undefined, agedDaysAgo);
    }
  }

  // 39 candidates with ACCEPTED offers, expected to start within the next 30 days (not yet Hire records).
  for (let i = 0; i < TARGET_ACCEPTED_NOT_STARTED; i++) {
    const req = pick(openReqs.length > 0 ? openReqs : requisitionRows);
    await createApplication(req, "OFFER", true);
  }

  // Declined offers, sized so accepted / (accepted + declined) lands on the
  // spec's ~72% target: 54 accepted (39 expected-start + 15 historical
  // hires) / (54 + 21 declined) = 72.0%.
  const TARGET_DECLINED = 21;
  for (let i = 0; i < TARGET_DECLINED; i++) {
    const req = pick(requisitionRows);
    await createApplication(req, "OFFER", false, false, undefined, "DECLINED");
  }

  // Historical FILLED reqs each get exactly one HIRED application (drives median TTF).
  const filledReqs = requisitionRows.filter((r) => r.status === "FILLED");
  for (const req of filledReqs) {
    await createApplication(req, "HIRED", false, true);
  }

  // A modest number of rejected/withdrawn applications for funnel realism.
  for (let i = 0; i < 40; i++) {
    const req = pick(requisitionRows);
    const roll = rand();
    const stage: ApplicationStageType = roll < 0.5 ? "SCREEN" : roll < 0.8 ? "TECHNICAL" : "ONSITE";
    await createApplication(req, stage, false, false, rand() < 0.7 ? "REJECTED" : "WITHDRAWN");
  }

  async function createApplication(
    req: (typeof requisitionRows)[number],
    finalStage: Stage,
    acceptedNotStarted: boolean,
    isHistoricalHire = false,
    forceStatus?: "REJECTED" | "WITHDRAWN",
    forceOfferStatus?: "DECLINED",
    // Overrides the default "entered pipeline within the last 3 weeks"
    // window with a specific days-ago value — used for a subset of the
    // active pipeline so 90D/YTD/12M Time Range buckets genuinely differ
    // instead of all converging on the same ~2-month-old dataset.
    agedDaysAgo?: number,
  ) {
    const candidate = await db.candidate.create({
      data: {
        firstName: pick(CAND_FIRST),
        lastName: pick(CAND_LAST),
        currentCompany: pick(COMPANIES),
        currentTitle: pick(ROLE_TITLES[req.functionSlug] ?? ["Engineer"]),
        location: pick(["San Jose, CA", "Remote — US", "Hsinchu, Taiwan"]),
        sourceSystem: "DEMO",
        externalId: `cand-${candCounter}`,
      },
    });
    candCounter++;

    const source = pick(SOURCES);
    let endDate: Date;
    if (isHistoricalHire) {
      // req.closedAt - req.openedAt was constructed to equal the target
      // time-to-fill exactly — anchor the HIRED-stage date there so
      // acceptedAt - openedAt reproduces it (± a few days of stage lag).
      endDate = req.closedAt ?? new Date(req.openedAt.getTime() + int(28, 60) * 86_400_000);
    } else if (acceptedNotStarted) {
      endDate = daysAgo(int(3, 20));
    } else if (agedDaysAgo !== undefined) {
      endDate = daysAgo(agedDaysAgo);
    } else {
      endDate = daysAgo(int(0, 20));
    }

    const timeline = stageTimeline(finalStage, endDate);
    const status: "ACTIVE" | "REJECTED" | "WITHDRAWN" | "HIRED" =
      forceStatus ?? (finalStage === "HIRED" ? "HIRED" : "ACTIVE");

    const application = await db.application.create({
      data: {
        candidateId: candidate.id,
        requisitionId: req.id,
        source,
        currentStage: forceStatus ?? finalStage,
        status,
        enteredPipelineAt: timeline[0].date,
        lastStageChangedAt: timeline[timeline.length - 1].date,
        qualityScore: Math.round((2.8 + rand() * 2.2) * 10) / 10,
        technicalScore: Math.round((2.5 + rand() * 2.5) * 10) / 10,
        sourceSystem: "DEMO",
      },
    });

    let fromStage: Stage | null = null;
    for (const t of timeline) {
      await db.applicationStageEvent.create({
        data: {
          applicationId: application.id,
          fromStage: fromStage,
          toStage: forceStatus && t.stage === timeline[timeline.length - 1].stage ? forceStatus : t.stage,
          occurredAt: t.date,
          reason: forceStatus && t.stage === timeline[timeline.length - 1].stage ? pick(["Not a fit", "Lost to competing offer", "Withdrew — accepted elsewhere"]) : null,
        },
      });
      fromStage = t.stage;
    }

    // Interviews for every stage from SCREEN onward that was actually reached.
    const interviewStages = timeline.filter((t) => ["SCREEN", "TECHNICAL", "ONSITE", "EXECUTIVE"].includes(t.stage));
    for (const t of interviewStages) {
      const typeMap: Record<string, "RECRUITER" | "TECHNICAL" | "SYSTEM_DESIGN" | "ONSITE" | "EXECUTIVE"> = {
        SCREEN: "RECRUITER",
        TECHNICAL: "TECHNICAL",
        ONSITE: "ONSITE",
        EXECUTIVE: "EXECUTIVE",
      };
      const completedAt = t.date;
      const hasFeedback = rand() < 0.88;
      await db.interview.create({
        data: {
          applicationId: application.id,
          type: typeMap[t.stage],
          scheduledAt: completedAt,
          completedAt,
          score: Math.round((2.5 + rand() * 2.5) * 10) / 10,
          recommendation: pick(["STRONG_YES", "YES", "YES", "MIXED", "NO"]),
          feedbackSubmittedAt: hasFeedback
            ? new Date(completedAt.getTime() + int(2, 60) * 3_600_000)
            : null,
        },
      });
    }

    // Offers for OFFER/HIRED-stage applications.
    if (finalStage === "OFFER" || finalStage === "HIRED") {
      const offeredAt = timeline.find((t) => t.stage === "OFFER")?.date ?? endDate;
      let offerStatus: "PENDING" | "ACCEPTED" | "DECLINED" | "WITHDRAWN" | "EXPIRED";
      let expectedStartDate: Date | null = null;
      let respondedAt: Date | null = null;

      let hireStartDate: Date | null = null;
      if (finalStage === "HIRED" || acceptedNotStarted) {
        offerStatus = "ACCEPTED";
        respondedAt = new Date(offeredAt.getTime() + int(1, 6) * 86_400_000);
        if (acceptedNotStarted) {
          expectedStartDate = daysFromNow(int(2, 29));
        } else {
          // Historical hire: expectedStartDate = the real start date, so it
          // never coincidentally lands in the "next 30 days" window used to
          // count *future* expected starts (the join on Hire already
          // excludes these, but this keeps the raw date honest too).
          hireStartDate = new Date(respondedAt.getTime() + int(10, 21) * 86_400_000);
          expectedStartDate = hireStartDate;
        }
        acceptedOfferCount++;
      } else if (forceOfferStatus === "DECLINED") {
        offerStatus = "DECLINED";
        respondedAt = new Date(offeredAt.getTime() + int(1, 6) * 86_400_000);
        declinedOfferCount++;
      } else {
        const roll = rand();
        if (roll < 0.6) {
          offerStatus = "PENDING";
        } else if (roll < 0.85) {
          offerStatus = "DECLINED";
          respondedAt = new Date(offeredAt.getTime() + int(1, 6) * 86_400_000);
          declinedOfferCount++;
        } else {
          offerStatus = "EXPIRED";
        }
      }

      const offer = await db.offer.create({
        data: {
          applicationId: application.id,
          offeredAt,
          status: offerStatus,
          respondedAt,
          expectedStartDate,
        },
      });

      if (offerStatus === "PENDING" && rand() < 0.3) {
        await db.offerRiskEvent.create({
          data: {
            offerId: offer.id,
            riskType: pick(["AGING", "RESPONSE_DELAY", "COMPETING_OFFER"]),
            severity: pick(["MEDIUM", "HIGH"]),
            detectedAt: daysAgo(int(0, 5)),
          },
        });
      }

      if (isHistoricalHire && finalStage === "HIRED") {
        await db.hire.create({
          data: {
            applicationId: application.id,
            requisitionId: req.id,
            candidateId: candidate.id,
            acceptedAt: respondedAt!,
            startDate: hireStartDate ?? new Date(respondedAt!.getTime() + int(10, 21) * 86_400_000),
            offerId: offer.id,
          },
        });
      }
    }
  }

  console.log(`Offers: ${acceptedOfferCount} accepted, ${declinedOfferCount} declined (~${Math.round((acceptedOfferCount / (acceptedOfferCount + declinedOfferCount)) * 100)}% acceptance).`);

  // -------------------------------------------------------------------------
  console.log("Seeding recruiter capacity plans...");
  for (const recruiterId of recruiterIds) {
    await db.recruiterCapacityPlan.create({
      data: {
        recruiterEmployeeId: recruiterId,
        periodStart: daysAgo(90),
        periodEnd: daysFromNow(0),
        targetWeightedReqLoad: 16,
        targetP0ReqLoad: 6,
        targetScreensPerWeek: 10,
      },
    });
  }

  console.log("Seeding hiring-manager SLA events...");
  const allHmIds = Array.from(hiringManagerIdsByFunction.values()).flat();
  for (let i = 0; i < 10; i++) {
    await db.hiringManagerSlaEvent.create({
      data: {
        hiringManagerEmployeeId: pick(allHmIds),
        type: pick(["FEEDBACK_OVERDUE", "DECISION_OVERDUE", "INTERVIEW_SCHEDULING_DELAY", "OFFER_APPROVAL_DELAY"]),
        detectedAt: daysAgo(int(0, 10)),
        resolvedAt: rand() < 0.4 ? daysAgo(int(0, 5)) : null,
        durationHours: int(6, 96),
        severity: pick(["LOW", "MEDIUM", "HIGH"]),
      },
    });
  }

  console.log("Seeding integration sync runs...");
  for (let i = 0; i < 5; i++) {
    const startedAt = daysAgo(i);
    await db.integrationSyncRun.create({
      data: {
        sourceSystem: "DEMO",
        entityType: pick(["requisitions", "candidates", "applications", "interviews", "offers"]),
        startedAt,
        completedAt: new Date(startedAt.getTime() + int(5, 60) * 1000),
        status: "SUCCESS",
        recordsRead: int(50, 400),
        recordsCreated: int(0, 20),
        recordsUpdated: int(10, 100),
        recordsFailed: 0,
      },
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
