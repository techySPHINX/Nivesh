# Nivesh ML Services Remediation Roadmap

Document owner: Platform Architecture and ML Engineering
Document date: 2026-03-17
Scope: ml-services primary, backend integration touchpoints secondary
Status: Draft for execution approval

Execution package links:

- Executive plan: ML_SERVICES_EXECUTIVE_PLAN.md
- Execution checklist: ML_SERVICES_EXECUTION_CHECKLIST.md
- Sprint ticket plan: SPRINT_WISE_TICKET_PLAN.md

## 1) Executive Summary

This roadmap converts the completed engineering audit into an execution plan that restores reliability, security, and integration integrity across ml-services and its backend consumers.

Priority order is:

1. Restore broken training and deployment paths (Critical)
2. Close security and runtime hardening gaps (Major)
3. Establish contract governance and retraining control plane maturity (Major)
4. Strengthen test and release governance to prevent recurrence (Major and Minor)

## 2) Audit-Derived Problem Statement

### Critical Findings

- Airflow DAG to trainer interface mismatches break scheduled training for intent and credit risk
- Credit and intent training DAG schemas drift from actual dataset fields
- Container build path mismatches prevent stable image build for model-server

### Major Findings

- Inconsistent authentication coverage on monitoring and admin surfaces
- Readiness and liveness probes are mapped to shallow health checks
- Drift monitor produces advisory recommendations but does not complete an operational retraining trigger loop
- Environment contract drift between backend integration expectations and example environment files
- Weakly typed request contracts in key prediction flows, with validation modules not integrated into execution paths
- Documentation drift for endpoint paths and integration usage
- Test assertions are too permissive for contract-grade confidence

### Minor Findings

- OpenAPI exists at runtime but lacks explicit versioned artifact governance in CI
- Example environment templates include legacy or mismatched entries

## 3) Architecture Principles for Remediation

1. Contract first: endpoint shape, auth requirements, and response semantics are explicit and versioned.
2. Secure by default: every non-health operational surface is authenticated and rate-limited.
3. Operable by design: readiness, liveness, and startup semantics reflect real dependency states.
4. Reproducible ML lifecycle: training runs are deterministic, traceable, and promotable.
5. Controlled change: docs, code, tests, and deployment manifests move together.
6. Evidence over assumptions: every phase closes with measurable acceptance gates.

## 4) Target Outcomes

- Scheduled retraining pipelines run without schema or interface failures.
- Model-server images build and deploy consistently across local, CI, and Kubernetes.
- Operational endpoints are protected consistently with API key and rate limiting policy.
- Probes reflect actual service readiness and reduce false healthy routing.
- Drift monitoring can trigger an actionable retraining path (manual and policy-driven automation).
- Backend and ml-services environment and endpoint contracts are synchronized.
- CI blocks regressions with stricter contract and integration checks.

## 5) Workstreams

### Workstream A: Training Orchestration Reliability

Goal: Restore DAG-to-training compatibility and data schema alignment.

### Workstream B: Build and Deployment Integrity

Goal: Ensure compose and Docker artifacts are internally consistent and runnable.

### Workstream C: Security and Runtime Hardening

Goal: Apply consistent auth controls and probe semantics to runtime surfaces.

### Workstream D: Contract and Data Governance

Goal: Replace weak payload schemas with explicit models and enforce validation boundaries.

### Workstream E: Retraining Control Plane

Goal: Complete schedule + drift + manual retraining trigger capability.

### Workstream F: Integration and Release Governance

Goal: Align backend contracts, tests, docs, and CI quality gates.

## 6) Phased Delivery Plan

## Phase 0 - Stabilize Critical Paths (Week 1)

Objectives:

- Repair intent DAG schema and train function invocation mismatches.
- Repair credit DAG schema assumptions and trainer invocation interface.
- Resolve Docker compose and Dockerfile path/dependency mismatches.

Deliverables:

- Passing DAG dry-runs for intent and credit retraining.
- Successful model-server image build in local and CI environments.

Exit criteria:

- No runtime exceptions in DAG training invocation path.
- Build artifacts generated from canonical Docker definitions.

## Phase 1 - Security and Runtime Hardening (Week 2 to Week 3)

Objectives:

- Enforce auth and rate-limit dependencies on monitoring and admin endpoints.
- Align Kubernetes and Helm probe paths with readiness and liveness semantics.
- Align env templates with backend and ml-services integration contracts.

Deliverables:

- Unified endpoint security matrix.
- Updated deployment manifests and successful probe behavior validation.
- Updated backend and ml-services example env files.

Exit criteria:

- Unauthorized requests to protected operational endpoints are rejected.
- Readiness fails when dependencies are unavailable; liveness remains lightweight.

## Phase 2 - Contract and Validation Governance (Week 4 to Week 5)

Objectives:

- Replace generic payload dictionaries with strict request and response models.
- Integrate data_validation checks into inference and retraining boundaries.
- Introduce OpenAPI artifact generation and contract drift checks in CI.

Deliverables:

- Typed schemas for anomaly and credit request payloads.
- Validation policy enforcement for malformed payloads.
- Versioned OpenAPI output committed or attached in CI.

Exit criteria:

- Contract tests fail fast on schema drift.
- Ambiguous payload acceptance paths removed.

## Phase 3 - Retraining Control Plane Completion (Week 6 to Week 7)

Objectives:

- Add authenticated manual retrain endpoint(s) for operational control.
- Connect drift signals to operationally safe retraining trigger workflow.
- Replace simulated production drift input with real data source connectors.

Deliverables:

- Manual retrain API and runbook.
- Drift-trigger policy configuration with guardrails.
- Real production data extraction path for drift checks.

Exit criteria:

- Retrain can be triggered manually with traceable audit metadata.
- Drift alerts can trigger a controlled retraining action path.

## Phase 4 - Quality Gate and Documentation Convergence (Week 8)

Objectives:

- Tighten permissive tests to contract-strict assertions.
- Add backend integration tests for ml-categorization path.
- Remove endpoint and config drift in documentation.

Deliverables:

- Updated test suite with strict response expectations.
- Backend integration tests for ML_SERVICE_URL and ML_API_KEY usage.
- Documentation parity pack for endpoint paths and auth requirements.

Exit criteria:

- CI fails on contract regressions.
- No known documentation contradictions for ML endpoint usage.

## 7) Milestones and Governance Gates

Milestone M1: Critical path recovered (end of Week 1)

- DAG reliability restored for intent and credit
- model-server build path corrected

Milestone M2: Runtime and security baseline achieved (end of Week 3)

- Operational endpoint auth consistency complete
- probe semantics aligned in deployment manifests

Milestone M3: Contract discipline established (end of Week 5)

- strict schemas and validation integrated
- OpenAPI contract governance in CI

Milestone M4: Control plane and release discipline complete (end of Week 8)

- retraining trigger triad complete
- docs and tests synchronized with implementation

## 8) Roles and Ownership Model

- Principal Architect: phase gate approvals, cross-workstream dependency arbitration
- ML Services Lead: Workstreams A, D, E technical delivery
- Platform and DevOps Lead: Workstream B and probe/deploy reliability
- Backend Lead: Workstream F integration and consumer contract alignment
- QA and SRE: acceptance evidence, non-functional checks, release readiness

## 9) Risks and Mitigations

Risk: Tight schema enforcement may break existing loose clients.
Mitigation: introduce compatibility window with explicit deprecation schedule and integration tests.

Risk: Drift-trigger automation can produce retraining noise.
Mitigation: policy thresholds, cool-down windows, and approval gates before production promotion.

Risk: Security hardening may impact observability tooling.
Mitigation: service-to-service API keys and monitoring credential rollout plan.

Risk: Multi-repo contract alignment delays release.
Mitigation: shared contract checklist and single change window for env and docs updates.

## 10) Success Metrics

- 100 percent success in scheduled intent and credit retraining DAG executions for two consecutive cycles.
- 0 unresolved model-server image build failures in CI for four consecutive runs.
- 100 percent of non-health operational endpoints protected by auth policy.
- 0 probe-related false healthy incidents after readiness/liveness correction.
- 0 undocumented endpoint path discrepancies between docs and runtime routes.
- Contract tests and integration tests pass with strict assertions in mainline CI.

## 11) Approval and Next Decision

Decision requested:

- Approve roadmap phases and gate criteria.
- Authorize execution starting with Phase 0 critical path stabilization.
