# ML Services Execution Checklist

Document owner: ML Services Engineering
Document date: 2026-03-17
Linked strategy document: ML_SERVICES_REMEDIATION_ROADMAP.md
Linked executive plan: ML_SERVICES_EXECUTIVE_PLAN.md
Linked sprint plan: SPRINT_WISE_TICKET_PLAN.md
Execution mode: Principal architect governance with weekly phase gates

## How to Use This Checklist

1. Assign owner and target date for every item before execution starts.
2. Mark each item done only when objective evidence is captured.
3. Do not close a phase until all mandatory gate criteria are satisfied.
4. Record deviations and approved exceptions in the notes section.

Legend:

- Priority: C0 (Critical), C1 (High), C2 (Medium)
- Status: [ ] Not started, [x] Complete

## A) Program Governance and Pre-Flight

- [ ] Confirm execution owner matrix across ML, Platform, Backend, QA, SRE
- [ ] Finalize sprint mapping for Phase 0 to Phase 4
- [ ] Open tracking board with each task ID mapped to engineering ticket
- [ ] Define release branch strategy and rollback approach
- [ ] Confirm non-production validation environment availability

Evidence links:

- Owner matrix:
- Tracking board:
- Release and rollback plan:

## B) Phase 0 - Critical Path Stabilization (Week 1)

### B1. Intent DAG Reliability (C0)

- [ ] Align intent DAG required columns with real dataset fields
- [ ] Align intent DAG trainer invocation with actual train function signature
- [ ] Validate XCom outputs for accuracy and f1 mapping
- [ ] Execute DAG dry-run and record logs

Evidence:

- DAG run ID:
- Dry-run log:

### B2. Credit DAG Reliability (C0)

- [ ] Align credit DAG required columns with actual training dataset schema
- [ ] Align target label naming across DAG and model training logic
- [ ] Expose or adapt trainer interface to support DAG invocation contract
- [ ] Execute DAG dry-run and record logs

Evidence:

- DAG run ID:
- Dry-run log:

### B3. Build and Container Integrity (C0)

- [ ] Fix docker-compose model-server dockerfile path reference
- [ ] Fix Dockerfile dependency file reference to existing requirements source
- [ ] Validate local build success
- [ ] Validate CI build success

Evidence:

- Local build output:
- CI build run:

### Phase 0 Gate (Mandatory)

- [ ] Intent retraining DAG runs without interface/schema failure
- [ ] Credit retraining DAG runs without interface/schema failure
- [ ] model-server image builds successfully in local and CI

Gate approver:

- [ ] Principal architect sign-off

## C) Phase 1 - Security and Runtime Hardening (Week 2 to Week 3)

### C1. Endpoint Security Consistency (C1)

- [ ] Inventory all model-server endpoints by auth requirement
- [ ] Apply API key and rate-limit dependency to non-health operational endpoints
- [ ] Apply equivalent protection to drift monitoring router endpoints
- [ ] Validate authorized and unauthorized behavior with test cases

Evidence:

- Endpoint security matrix:
- Test report:

### C2. Probe Semantics Correction (C1)

- [ ] Update Kubernetes deployment readiness path to readiness endpoint
- [ ] Update Kubernetes deployment liveness path to liveness endpoint
- [ ] Update Helm template probe paths consistently
- [ ] Validate behavior under dependency failure simulation

Evidence:

- K8s manifest diff:
- Helm template diff:
- Probe behavior test log:

### C3. Environment Contract Alignment (C1)

- [ ] Add ML_SERVICE_URL and ML_API_KEY to backend environment example
- [ ] Add ML_API_KEYS or equivalent policy variable to ml-services environment example
- [ ] Update integration docs with canonical auth and endpoint settings

Evidence:

- Updated env examples:
- Docs updates:

### Phase 1 Gate (Mandatory)

- [ ] All non-health operational endpoints reject missing or invalid auth
- [ ] Probe configuration uses correct readiness and liveness paths
- [ ] Backend and ml-services env examples are contract-complete

Gate approver:

- [ ] Principal architect sign-off

## D) Phase 2 - Contract and Validation Governance (Week 4 to Week 5)

### D1. Strict API Schema Enforcement (C1)

- [ ] Replace weak dictionary payload contracts with explicit request models
- [ ] Replace weak response payload contracts where ambiguity exists
- [ ] Add field constraints and validation messages for invalid requests

Evidence:

- Schema diff:
- Contract test run:

### D2. Validation Layer Integration (C1)

- [ ] Integrate data_validation checks into inference input boundary
- [ ] Integrate validation checks into retraining data ingestion path
- [ ] Add failure-mode tests for malformed payloads and training data

Evidence:

- Validation integration points:
- Failure-mode tests:

### D3. OpenAPI Governance in CI (C2)

- [ ] Generate OpenAPI artifact in CI pipeline
- [ ] Add contract drift check policy
- [ ] Fail CI on unreviewed contract changes

Evidence:

- CI workflow update:
- Sample contract report:

### Phase 2 Gate (Mandatory)

- [ ] Typed contracts enforced on critical endpoints
- [ ] Validation checks active for inference and training boundaries
- [ ] CI contract governance gate enabled

Gate approver:

- [ ] Principal architect sign-off

## E) Phase 3 - Retraining Control Plane Completion (Week 6 to Week 7)

### E1. Manual Retraining Control (C1)

- [ ] Add authenticated manual retraining endpoint(s)
- [ ] Capture audit metadata for each retraining trigger
- [ ] Add operator runbook for manual invocation and rollback

Evidence:

- API spec and endpoint test:
- Runbook:

### E2. Drift to Retraining Path (C1)

- [ ] Define policy thresholds and cool-down windows
- [ ] Connect drift alert path to controlled retraining trigger flow
- [ ] Add safety guardrails for repeated trigger suppression

Evidence:

- Trigger policy config:
- End-to-end scenario test:

### E3. Production Drift Data Source (C1)

- [ ] Replace simulated drift data path with production source adapter
- [ ] Validate data quality and schema checks on collected drift samples
- [ ] Verify drift outputs against known baseline snapshots

Evidence:

- Data source integration:
- Drift validation report:

### Phase 3 Gate (Mandatory)

- [ ] Manual retraining is operational and authenticated
- [ ] Drift-trigger workflow is implemented with guardrails
- [ ] Drift checks use real production-aligned data

Gate approver:

- [ ] Principal architect sign-off

## F) Phase 4 - Quality, Integration, and Documentation Convergence (Week 8)

### F1. Test Hardening (C1)

- [ ] Replace permissive status assertions with strict expected outcomes
- [ ] Add endpoint auth test coverage for operational routes
- [ ] Add contract regression tests for payload schema boundaries

Evidence:

- Test diff:
- Test run report:

### F2. Backend Integration Assurance (C1)

- [ ] Add backend integration tests for ml-categorization service path
- [ ] Validate fallback behavior and API key propagation
- [ ] Validate endpoint path compatibility between backend and ml-services

Evidence:

- Integration test run:
- Endpoint compatibility report:

### F3. Documentation Parity (C2)

- [ ] Correct endpoint naming drift in docs and examples
- [ ] Ensure env setup docs match implementation requirements
- [ ] Publish final API contract references and operational runbooks

Evidence:

- Docs change set:
- Published references:

### Phase 4 Gate (Mandatory)

- [ ] Strict test suite passes in CI
- [ ] Backend integration checks pass
- [ ] Documentation and implementation are aligned

Gate approver:

- [ ] Principal architect sign-off

## G) Cross-Phase Non-Functional Controls

- [ ] Performance baseline recorded before changes
- [ ] Performance regression threshold defined and monitored
- [ ] Security review completed for auth and rate-limit changes
- [ ] Observability dashboards updated for new endpoints and retraining events
- [ ] Incident response and rollback drills executed at least once

Evidence:

- Performance report:
- Security review:
- Observability update:
- Drill report:

## H) Final Release Readiness Checklist

- [ ] All phase gates approved
- [ ] No open C0 or C1 defects
- [ ] CI pipeline green on required jobs
- [ ] Deployment manifests validated in target environment
- [ ] Stakeholder sign-off captured (ML Lead, Platform Lead, Backend Lead, QA, SRE)

Release decision:

- [ ] Go
- [ ] No-go

Decision notes:


## I) Post-Release Validation (First 7 Days)

- [ ] Verify no failed scheduled retraining runs
- [ ] Verify no unauthorized access attempts are accepted
- [ ] Verify probe behavior during one controlled dependency disruption test
- [ ] Verify no endpoint contract mismatch incidents from backend clients
- [ ] Verify drift monitoring and retraining controls produce expected telemetry

Post-release owner:

Post-release report link:
