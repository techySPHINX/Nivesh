# Sprint-Wise Ticket Plan

Document owner: ML Services Program Management
Document date: 2026-03-17
Parent executive plan: ML_SERVICES_EXECUTIVE_PLAN.md
Linked checklist: ML_SERVICES_EXECUTION_CHECKLIST.md
Linked roadmap: ML_SERVICES_REMEDIATION_ROADMAP.md

Ticket prefix: MLS
Priority model: C0 critical, C1 high, C2 medium

## Sprint 1 - Critical Path Recovery

Sprint objective: make training orchestration and build pipeline operational.

### MLS-001 (C0) Align intent DAG dataset contract

- Type: Engineering
- Owner role: ML Engineer
- Depends on: none
- Scope:
  - Update intent DAG required columns to match training dataset schema.
  - Validate data checks and XCom outputs.
- Definition of done:
  - Intent DAG validation step passes with real dataset.
- Acceptance evidence:
  - DAG dry-run log and task success snapshot.

### MLS-002 (C0) Align intent DAG trainer invocation

- Type: Engineering
- Owner role: ML Engineer
- Depends on: MLS-001
- Scope:
  - Align DAG call with actual trainer function signature and return shape.
- Definition of done:
  - Training task executes without invocation mismatch.
- Acceptance evidence:
  - Airflow task logs, function signature diff.

### MLS-003 (C0) Align credit DAG schema and target contract

- Type: Engineering
- Owner role: ML Engineer
- Depends on: none
- Scope:
  - Reconcile expected columns in credit DAG with actual credit dataset.
  - Align target field naming to model training expectations.
- Definition of done:
  - Credit validation and feature steps pass against dataset.
- Acceptance evidence:
  - DAG dry-run log and dataset contract note.

### MLS-004 (C0) Align credit DAG trainer interface

- Type: Engineering
- Owner role: ML Engineer
- Depends on: MLS-003
- Scope:
  - Provide callable training interface compatible with DAG path.
- Definition of done:
  - Credit train task executes and records run metadata.
- Acceptance evidence:
  - Task logs and MLflow run reference.

### MLS-005 (C0) Fix model-server container build wiring

- Type: Engineering
- Owner role: Platform Engineer
- Depends on: none
- Scope:
  - Correct docker-compose dockerfile reference.
  - Correct Dockerfile requirement source to existing dependency file.
- Definition of done:
  - Local and CI model-server image build succeeds.
- Acceptance evidence:
  - Build logs and CI run URL.

### Sprint 1 Exit Gate

- MLS-001 to MLS-005 complete
- No unresolved C0 defect in training or build path

## Sprint 2 - Security and Contract Governance

Sprint objective: secure operational surfaces and enforce stricter API contracts.

### MLS-006 (C1) Apply auth policy to operational endpoints

- Type: Engineering
- Owner role: ML Engineer
- Depends on: MLS-005
- Scope:
  - Add API key and rate limiting to monitoring and admin routes.
  - Apply equivalent controls to drift router endpoints.
- Definition of done:
  - Unauthorized access rejected on protected operational endpoints.
- Acceptance evidence:
  - Endpoint matrix and negative auth tests.

### MLS-007 (C1) Correct readiness and liveness probes

- Type: Engineering
- Owner role: Platform Engineer
- Depends on: MLS-006
- Scope:
  - Update Kubernetes and Helm probe paths to readiness and liveness endpoints.
- Definition of done:
  - Probe behavior validated under dependency-ready and dependency-failed states.
- Acceptance evidence:
  - Manifest diffs and runtime probe verification logs.

### MLS-008 (C1) Align environment contract templates

- Type: Engineering
- Owner role: Backend Engineer
- Depends on: MLS-006
- Scope:
  - Update backend and ml-services env examples with required ML integration variables.
- Definition of done:
  - Environment examples match implementation contract.
- Acceptance evidence:
  - Updated env examples and review sign-off.

### MLS-009 (C1) Replace weak payload dictionaries with explicit models

- Type: Engineering
- Owner role: ML Engineer
- Depends on: MLS-006
- Scope:
  - Introduce strict request and response models for critical endpoints.
- Definition of done:
  - Contract tests validate strict schema behavior.
- Acceptance evidence:
  - Schema diff and test output.

### MLS-010 (C1) Integrate data validation boundary checks

- Type: Engineering
- Owner role: ML Engineer
- Depends on: MLS-009
- Scope:
  - Integrate data_validation rules into inference and retraining input paths.
- Definition of done:
  - Invalid payload and invalid data inputs fail at boundary with expected error.
- Acceptance evidence:
  - Failure-mode test suite and logs.

### MLS-011 (C2) Add OpenAPI contract governance in CI

- Type: Engineering
- Owner role: Platform Engineer
- Depends on: MLS-009
- Scope:
  - Generate OpenAPI artifact and enforce change review guard.
- Definition of done:
  - CI fails on unreviewed contract drift.
- Acceptance evidence:
  - CI workflow update and sample drift failure run.

### Sprint 2 Exit Gate

- MLS-006 to MLS-011 complete
- Security and contract governance baseline signed off

## Sprint 3 - Retraining Control Plane and Release Convergence

Sprint objective: complete retraining trigger model, harden integration tests, and finalize release readiness.

### MLS-012 (C1) Implement manual retraining endpoint

- Type: Engineering
- Owner role: ML Engineer
- Depends on: MLS-010
- Scope:
  - Add authenticated manual retrain endpoint with audit metadata capture.
- Definition of done:
  - Operators can trigger and trace retraining securely.
- Acceptance evidence:
  - API tests and operation runbook excerpt.

### MLS-013 (C1) Connect drift alerts to controlled retraining trigger flow

- Type: Engineering
- Owner role: ML Engineer
- Depends on: MLS-012
- Scope:
  - Introduce policy thresholds, cooldown, and safe trigger orchestration.
- Definition of done:
  - Drift-to-retrain flow passes controlled simulation tests.
- Acceptance evidence:
  - End-to-end test report and policy config artifact.

### MLS-014 (C1) Replace simulated drift input with production data source adapter

- Type: Engineering
- Owner role: Data Engineer
- Depends on: MLS-013
- Scope:
  - Integrate production data retrieval path for drift checks.
- Definition of done:
  - Drift pipeline uses production-aligned data source and passes validation checks.
- Acceptance evidence:
  - Data adapter logs and validation report.

### MLS-015 (C1) Add backend ML integration tests

- Type: Engineering
- Owner role: Backend Engineer
- Depends on: MLS-008, MLS-009
- Scope:
  - Test ml-categorization integration path with ML_SERVICE_URL, API key, and fallback behavior.
- Definition of done:
  - Backend integration tests pass in CI.
- Acceptance evidence:
  - CI run and test report.

### MLS-016 (C1) Tighten permissive test assertions

- Type: Engineering
- Owner role: QA Engineer
- Depends on: MLS-009, MLS-015
- Scope:
  - Replace permissive status checks with strict contract expectations.
- Definition of done:
  - Contract and integration suites are strict and stable.
- Acceptance evidence:
  - Test diff and full suite run output.

### MLS-017 (C2) Documentation convergence and release pack

- Type: Documentation
- Owner role: Tech Writer or Engineering Owner
- Depends on: MLS-008, MLS-011, MLS-016
- Scope:
  - Resolve endpoint naming drift.
  - Publish final contract and operational runbook references.
- Definition of done:
  - Docs are implementation-aligned and reviewed.
- Acceptance evidence:
  - Documentation change set and reviewer approvals.

### Sprint 3 Exit Gate

- MLS-012 to MLS-017 complete
- All release readiness checks in execution checklist passed
- Stakeholder Go decision recorded

## Delivery Tracking Template

For each ticket, capture:

- Ticket ID:
- Status:
- Owner:
- Planned date:
- Actual completion date:
- Evidence link:
- Risks or blockers:
