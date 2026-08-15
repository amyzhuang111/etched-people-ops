-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'LEAVE', 'TERMINATED');

-- CreateEnum
CREATE TYPE "SiteType" AS ENUM ('HQ', 'FACTORY', 'DATA_CENTER', 'LAB', 'OFFICE', 'OTHER');

-- CreateEnum
CREATE TYPE "CapabilityCategory" AS ENUM ('CHIP', 'ARCHITECTURE', 'PLATFORM', 'SOFTWARE', 'PRODUCTION', 'SUPPLY_CHAIN', 'OPERATIONS', 'TALENT', 'GTM', 'FINANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('P0', 'P1', 'P2', 'P3');

-- CreateEnum
CREATE TYPE "ScarcityLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'EXTREME');

-- CreateEnum
CREATE TYPE "ProficiencyLevel" AS ENUM ('WORKING', 'ADVANCED', 'EXPERT');

-- CreateEnum
CREATE TYPE "MilestoneCategory" AS ENUM ('SILICON', 'RACK', 'SOFTWARE', 'PRODUCTION', 'CUSTOMER', 'INFRASTRUCTURE', 'SCALE');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('NOT_STARTED', 'ON_TRACK', 'AT_RISK', 'BLOCKED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "RequisitionStatus" AS ENUM ('DRAFT', 'APPROVED', 'OPEN', 'PAUSED', 'FILLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ApplicationSource" AS ENUM ('SOURCED', 'REFERRAL', 'INBOUND', 'AGENCY', 'EVENT', 'OTHER');

-- CreateEnum
CREATE TYPE "ApplicationStage" AS ENUM ('PROSPECT', 'CONTACTED', 'SCREEN', 'TECHNICAL', 'ONSITE', 'EXECUTIVE', 'OFFER', 'HIRED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('ACTIVE', 'REJECTED', 'WITHDRAWN', 'HIRED');

-- CreateEnum
CREATE TYPE "InterviewType" AS ENUM ('RECRUITER', 'TECHNICAL', 'SYSTEM_DESIGN', 'ONSITE', 'EXECUTIVE', 'OTHER');

-- CreateEnum
CREATE TYPE "InterviewRecommendation" AS ENUM ('STRONG_YES', 'YES', 'MIXED', 'NO', 'STRONG_NO');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'WITHDRAWN', 'EXPIRED');

-- CreateEnum
CREATE TYPE "OfferRiskType" AS ENUM ('AGING', 'COMPETING_OFFER', 'RESPONSE_DELAY', 'START_DATE_DELAY', 'MANUAL_FLAG', 'OTHER');

-- CreateEnum
CREATE TYPE "RiskSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "HmSlaType" AS ENUM ('FEEDBACK_OVERDUE', 'DECISION_OVERDUE', 'INTERVIEW_SCHEDULING_DELAY', 'OFFER_APPROVAL_DELAY', 'REQ_KICKOFF_DELAY');

-- CreateEnum
CREATE TYPE "SourceSystem" AS ENUM ('ASHBY', 'HRIS', 'GOOGLE_SHEETS', 'NOTION', 'MANUAL', 'DEMO');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('RUNNING', 'SUCCESS', 'PARTIAL', 'FAILED');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('CRITICAL_SEARCH', 'PIPELINE_STALL', 'OFFER_RISK', 'RECRUITER_OVERLOAD', 'HIRING_MANAGER_SLA', 'PLAN_GAP', 'MILESTONE_RISK', 'DATA_STALE', 'SYNC_FAILURE');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MODERATE', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'HEAD_OF_TALENT', 'TALENT_OPS', 'RECRUITER', 'HIRING_MANAGER', 'FUNCTION_LEADER', 'EXECUTIVE', 'VIEWER');

-- CreateTable
CREATE TABLE "Function" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "leaderEmployeeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Function_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Site" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "siteType" "SiteType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "employeeNumber" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "functionId" TEXT NOT NULL,
    "siteId" TEXT,
    "jobTitle" TEXT NOT NULL,
    "jobLevel" TEXT,
    "hireDate" TIMESTAMP(3) NOT NULL,
    "terminationDate" TIMESTAMP(3),
    "managerEmployeeId" TEXT,
    "sourceSystem" "SourceSystem" NOT NULL DEFAULT 'DEMO',
    "externalId" TEXT,
    "sourceUpdatedAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Capability" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "functionId" TEXT,
    "category" "CapabilityCategory" NOT NULL,
    "criticality" "Priority" NOT NULL,
    "scarcityLevel" "ScarcityLevel" NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Capability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeCapability" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "capabilityId" TEXT NOT NULL,
    "proficiency" "ProficiencyLevel" NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeCapability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "MilestoneCategory" NOT NULL,
    "targetDate" TIMESTAMP(3) NOT NULL,
    "status" "MilestoneStatus" NOT NULL DEFAULT 'ON_TRACK',
    "priority" "Priority" NOT NULL,
    "ownerEmployeeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MilestoneCapabilityRequirement" (
    "id" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "capabilityId" TEXT NOT NULL,
    "requiredHeadcount" INTEGER NOT NULL,
    "minimumHeadcount" INTEGER NOT NULL,
    "importanceWeight" DOUBLE PRECISION NOT NULL,
    "requiredProficiency" "ProficiencyLevel",
    "targetDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MilestoneCapabilityRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkforcePlanVersion" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkforcePlanVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkforcePlan" (
    "id" TEXT NOT NULL,
    "planVersionId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "functionId" TEXT,
    "capabilityId" TEXT,
    "siteId" TEXT,
    "plannedHeadcount" INTEGER NOT NULL,
    "approvedHeadcount" INTEGER NOT NULL,
    "budgetedHeadcount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkforcePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Requisition" (
    "id" TEXT NOT NULL,
    "reqNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "functionId" TEXT NOT NULL,
    "capabilityId" TEXT NOT NULL,
    "siteId" TEXT,
    "employmentType" TEXT NOT NULL DEFAULT 'FULL_TIME',
    "priority" "Priority" NOT NULL,
    "status" "RequisitionStatus" NOT NULL DEFAULT 'OPEN',
    "openings" INTEGER NOT NULL,
    "openedAt" TIMESTAMP(3),
    "targetFillDate" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "hiringManagerEmployeeId" TEXT,
    "recruiterEmployeeId" TEXT,
    "milestoneId" TEXT,
    "roleScarcity" "ScarcityLevel" NOT NULL,
    "sourceSystem" "SourceSystem" NOT NULL DEFAULT 'DEMO',
    "externalId" TEXT,
    "sourceUpdatedAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Requisition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Candidate" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "currentCompany" TEXT,
    "currentTitle" TEXT,
    "location" TEXT,
    "sourceSystem" "SourceSystem" NOT NULL DEFAULT 'DEMO',
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Candidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "requisitionId" TEXT NOT NULL,
    "source" "ApplicationSource" NOT NULL,
    "currentStage" "ApplicationStage" NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'ACTIVE',
    "enteredPipelineAt" TIMESTAMP(3) NOT NULL,
    "lastStageChangedAt" TIMESTAMP(3) NOT NULL,
    "qualityScore" DOUBLE PRECISION,
    "technicalScore" DOUBLE PRECISION,
    "sourceSystem" "SourceSystem" NOT NULL DEFAULT 'DEMO',
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationStageEvent" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "fromStage" "ApplicationStage",
    "toStage" "ApplicationStage" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "actorEmployeeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationStageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interview" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "type" "InterviewType" NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "score" DOUBLE PRECISION,
    "recommendation" "InterviewRecommendation",
    "feedbackSubmittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Interview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "offeredAt" TIMESTAMP(3) NOT NULL,
    "status" "OfferStatus" NOT NULL DEFAULT 'PENDING',
    "respondedAt" TIMESTAMP(3),
    "expectedStartDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfferRiskEvent" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "riskType" "OfferRiskType" NOT NULL,
    "severity" "RiskSeverity" NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "detailsJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfferRiskEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hire" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "requisitionId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "employeeId" TEXT,
    "offerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Hire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecruiterCapacityPlan" (
    "id" TEXT NOT NULL,
    "recruiterEmployeeId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "targetWeightedReqLoad" DOUBLE PRECISION NOT NULL,
    "targetP0ReqLoad" DOUBLE PRECISION NOT NULL,
    "targetScreensPerWeek" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecruiterCapacityPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HiringManagerSlaEvent" (
    "id" TEXT NOT NULL,
    "hiringManagerEmployeeId" TEXT NOT NULL,
    "requisitionId" TEXT,
    "applicationId" TEXT,
    "type" "HmSlaType" NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "durationHours" DOUBLE PRECISION,
    "severity" "RiskSeverity" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HiringManagerSlaEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationSyncRun" (
    "id" TEXT NOT NULL,
    "sourceSystem" "SourceSystem" NOT NULL,
    "entityType" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "status" "SyncStatus" NOT NULL DEFAULT 'RUNNING',
    "recordsRead" INTEGER NOT NULL DEFAULT 0,
    "recordsCreated" INTEGER NOT NULL DEFAULT 0,
    "recordsUpdated" INTEGER NOT NULL DEFAULT 0,
    "recordsFailed" INTEGER NOT NULL DEFAULT 0,
    "errorSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntegrationSyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "type" "AlertType" NOT NULL,
    "severity" "RiskSeverity" NOT NULL,
    "message" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "dedupeKey" TEXT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scenario" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "assumptionsJson" JSONB NOT NULL,
    "resultsJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Scenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkforceSnapshot" (
    "id" TEXT NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL,
    "functionId" TEXT,
    "capabilityId" TEXT,
    "siteId" TEXT,
    "headcount" INTEGER NOT NULL,
    "plannedHeadcount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkforceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecruitingSnapshot" (
    "id" TEXT NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL,
    "openRoles" INTEGER NOT NULL,
    "activeCandidates" INTEGER NOT NULL,
    "offersOutstanding" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecruitingSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MilestoneCoverageSnapshot" (
    "id" TEXT NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "currentCoverage" DOUBLE PRECISION NOT NULL,
    "forecastCoverage" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MilestoneCoverageSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecruiterCapacitySnapshot" (
    "id" TEXT NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL,
    "recruiterEmployeeId" TEXT NOT NULL,
    "weightedLoad" DOUBLE PRECISION NOT NULL,
    "capacityTarget" DOUBLE PRECISION NOT NULL,
    "utilization" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecruiterCapacitySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Function_name_key" ON "Function"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Function_slug_key" ON "Function"("slug");

-- CreateIndex
CREATE INDEX "Function_slug_idx" ON "Function"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_employeeNumber_key" ON "Employee"("employeeNumber");

-- CreateIndex
CREATE INDEX "Employee_status_idx" ON "Employee"("status");

-- CreateIndex
CREATE INDEX "Employee_functionId_idx" ON "Employee"("functionId");

-- CreateIndex
CREATE INDEX "Employee_hireDate_idx" ON "Employee"("hireDate");

-- CreateIndex
CREATE INDEX "Capability_functionId_idx" ON "Capability"("functionId");

-- CreateIndex
CREATE INDEX "EmployeeCapability_employeeId_idx" ON "EmployeeCapability"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeCapability_capabilityId_idx" ON "EmployeeCapability"("capabilityId");

-- CreateIndex
CREATE INDEX "Milestone_targetDate_idx" ON "Milestone"("targetDate");

-- CreateIndex
CREATE INDEX "Milestone_status_idx" ON "Milestone"("status");

-- CreateIndex
CREATE INDEX "MilestoneCapabilityRequirement_milestoneId_idx" ON "MilestoneCapabilityRequirement"("milestoneId");

-- CreateIndex
CREATE INDEX "MilestoneCapabilityRequirement_capabilityId_idx" ON "MilestoneCapabilityRequirement"("capabilityId");

-- CreateIndex
CREATE INDEX "WorkforcePlan_planVersionId_idx" ON "WorkforcePlan"("planVersionId");

-- CreateIndex
CREATE INDEX "WorkforcePlan_functionId_idx" ON "WorkforcePlan"("functionId");

-- CreateIndex
CREATE UNIQUE INDEX "Requisition_reqNumber_key" ON "Requisition"("reqNumber");

-- CreateIndex
CREATE INDEX "Requisition_status_idx" ON "Requisition"("status");

-- CreateIndex
CREATE INDEX "Requisition_priority_idx" ON "Requisition"("priority");

-- CreateIndex
CREATE INDEX "Requisition_capabilityId_idx" ON "Requisition"("capabilityId");

-- CreateIndex
CREATE INDEX "Requisition_recruiterEmployeeId_idx" ON "Requisition"("recruiterEmployeeId");

-- CreateIndex
CREATE INDEX "Requisition_hiringManagerEmployeeId_idx" ON "Requisition"("hiringManagerEmployeeId");

-- CreateIndex
CREATE INDEX "Requisition_openedAt_idx" ON "Requisition"("openedAt");

-- CreateIndex
CREATE INDEX "Requisition_milestoneId_idx" ON "Requisition"("milestoneId");

-- CreateIndex
CREATE INDEX "Application_requisitionId_idx" ON "Application"("requisitionId");

-- CreateIndex
CREATE INDEX "Application_candidateId_idx" ON "Application"("candidateId");

-- CreateIndex
CREATE INDEX "Application_currentStage_idx" ON "Application"("currentStage");

-- CreateIndex
CREATE INDEX "Application_status_idx" ON "Application"("status");

-- CreateIndex
CREATE INDEX "ApplicationStageEvent_applicationId_idx" ON "ApplicationStageEvent"("applicationId");

-- CreateIndex
CREATE INDEX "ApplicationStageEvent_occurredAt_idx" ON "ApplicationStageEvent"("occurredAt");

-- CreateIndex
CREATE INDEX "Interview_applicationId_idx" ON "Interview"("applicationId");

-- CreateIndex
CREATE INDEX "Interview_completedAt_idx" ON "Interview"("completedAt");

-- CreateIndex
CREATE INDEX "Offer_status_idx" ON "Offer"("status");

-- CreateIndex
CREATE INDEX "Offer_offeredAt_idx" ON "Offer"("offeredAt");

-- CreateIndex
CREATE INDEX "Offer_expectedStartDate_idx" ON "Offer"("expectedStartDate");

-- CreateIndex
CREATE UNIQUE INDEX "Hire_applicationId_key" ON "Hire"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "Hire_offerId_key" ON "Hire"("offerId");

-- CreateIndex
CREATE INDEX "Hire_startDate_idx" ON "Hire"("startDate");

-- CreateIndex
CREATE INDEX "Hire_requisitionId_idx" ON "Hire"("requisitionId");

-- CreateIndex
CREATE INDEX "RecruiterCapacityPlan_recruiterEmployeeId_idx" ON "RecruiterCapacityPlan"("recruiterEmployeeId");

-- CreateIndex
CREATE INDEX "RecruiterCapacityPlan_periodStart_periodEnd_idx" ON "RecruiterCapacityPlan"("periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "HiringManagerSlaEvent_hiringManagerEmployeeId_idx" ON "HiringManagerSlaEvent"("hiringManagerEmployeeId");

-- CreateIndex
CREATE INDEX "HiringManagerSlaEvent_type_idx" ON "HiringManagerSlaEvent"("type");

-- CreateIndex
CREATE INDEX "IntegrationSyncRun_sourceSystem_entityType_idx" ON "IntegrationSyncRun"("sourceSystem", "entityType");

-- CreateIndex
CREATE INDEX "IntegrationSyncRun_completedAt_idx" ON "IntegrationSyncRun"("completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Alert_dedupeKey_key" ON "Alert"("dedupeKey");

-- CreateIndex
CREATE INDEX "Alert_type_idx" ON "Alert"("type");

-- CreateIndex
CREATE INDEX "Alert_isRead_idx" ON "Alert"("isRead");

-- CreateIndex
CREATE INDEX "Alert_createdAt_idx" ON "Alert"("createdAt");

-- CreateIndex
CREATE INDEX "WorkforceSnapshot_snapshotDate_idx" ON "WorkforceSnapshot"("snapshotDate");

-- CreateIndex
CREATE INDEX "RecruitingSnapshot_snapshotDate_idx" ON "RecruitingSnapshot"("snapshotDate");

-- CreateIndex
CREATE INDEX "MilestoneCoverageSnapshot_snapshotDate_idx" ON "MilestoneCoverageSnapshot"("snapshotDate");

-- CreateIndex
CREATE INDEX "MilestoneCoverageSnapshot_milestoneId_idx" ON "MilestoneCoverageSnapshot"("milestoneId");

-- CreateIndex
CREATE INDEX "RecruiterCapacitySnapshot_snapshotDate_idx" ON "RecruiterCapacitySnapshot"("snapshotDate");

-- CreateIndex
CREATE INDEX "RecruiterCapacitySnapshot_recruiterEmployeeId_idx" ON "RecruiterCapacitySnapshot"("recruiterEmployeeId");

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_functionId_fkey" FOREIGN KEY ("functionId") REFERENCES "Function"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Capability" ADD CONSTRAINT "Capability_functionId_fkey" FOREIGN KEY ("functionId") REFERENCES "Function"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeCapability" ADD CONSTRAINT "EmployeeCapability_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeCapability" ADD CONSTRAINT "EmployeeCapability_capabilityId_fkey" FOREIGN KEY ("capabilityId") REFERENCES "Capability"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilestoneCapabilityRequirement" ADD CONSTRAINT "MilestoneCapabilityRequirement_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilestoneCapabilityRequirement" ADD CONSTRAINT "MilestoneCapabilityRequirement_capabilityId_fkey" FOREIGN KEY ("capabilityId") REFERENCES "Capability"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkforcePlan" ADD CONSTRAINT "WorkforcePlan_planVersionId_fkey" FOREIGN KEY ("planVersionId") REFERENCES "WorkforcePlanVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requisition" ADD CONSTRAINT "Requisition_functionId_fkey" FOREIGN KEY ("functionId") REFERENCES "Function"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requisition" ADD CONSTRAINT "Requisition_capabilityId_fkey" FOREIGN KEY ("capabilityId") REFERENCES "Capability"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requisition" ADD CONSTRAINT "Requisition_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requisition" ADD CONSTRAINT "Requisition_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "Requisition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationStageEvent" ADD CONSTRAINT "ApplicationStageEvent_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferRiskEvent" ADD CONSTRAINT "OfferRiskEvent_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hire" ADD CONSTRAINT "Hire_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hire" ADD CONSTRAINT "Hire_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "Requisition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hire" ADD CONSTRAINT "Hire_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hire" ADD CONSTRAINT "Hire_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
