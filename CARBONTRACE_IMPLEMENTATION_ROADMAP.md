# CarbonTrace AI Implementation Roadmap

## 1. Purpose

This document is the execution roadmap for turning the current `aerce_core-compliance-engine` repository into the full CarbonTrace AI platform described in [EUDR_CBAM_PROJECT_DOCUMENTATION.md](C:/Users/pincu/Downloads/aerce_core-compliance-engine/EUDR_CBAM_PROJECT_DOCUMENTATION.md).

This roadmap is implementation-focused. It explains:

- what to build first,
- how the system should evolve phase by phase,
- how frontend and backend responsibilities should be separated,
- what data contracts must exist,
- what dependencies each module has,
- what “done” means for each phase,
- how to test and de-risk delivery.

It assumes the team will continue using:

- React 19 + Vite for the frontend
- Flask + Python for the backend
- Google Earth Engine for geospatial analysis
- Firebase Auth as the initial authentication provider

## 2. Current Starting Point

The current repo already contains useful MVP building blocks:

- a React/Vite frontend
- a Flask backend
- Google Earth Engine analysis logic
- a shipment-style input form
- a compliance report view
- OCR upload concepts
- local storage persistence helpers
- a TRACES-style XML export mock

What it does not yet contain:

- real routing and nested app structure
- role-based shells
- persistent multi-entity data model
- exporter/verifier/importer/admin workspaces
- full EUDR workflow lifecycle
- full CBAM emissions engine
- verification lifecycle
- importer downloads center
- admin controls and governance

## 3. Delivery Strategy

### 3.1 Guiding Principle

Build the platform in dependency order, not in visual order.

That means:

1. foundation before features
2. exporter workflow before verifier and importer
3. EUDR first before CBAM deepening if a faster demonstrable compliance flow is needed
4. data contracts before page polish
5. persistence and auditability before analytics

### 3.2 Delivery Phases

This roadmap uses 9 phases:

- Phase 0: Foundation and repo restructure
- Phase 1: Auth, organizations, and role access
- Phase 2: Exporter core records and workflows
- Phase 3: EUDR land, map, and risk engine
- Phase 4: CBAM emissions pipeline
- Phase 5: Verification workspace
- Phase 6: Importer workspace and downloads
- Phase 7: Admin, reference data, and governance
- Phase 8: Hardening, observability, and production readiness

### 3.3 Build Order Recommendation

Recommended strict order:

1. Shared types and routing foundation
2. Authentication and role shell
3. Exporter master data
4. Exporter uploads and shipment creation
5. EUDR workflow
6. Verification flow
7. Importer retrieval
8. CBAM deep calculations and template maturity
9. Admin controls and hardening

## 4. Architecture Target

### 4.1 Frontend Target Architecture

Recommended frontend structure:

- `src/app`
- `src/app/routes`
- `src/app/providers`
- `src/modules/exporter`
- `src/modules/verifier`
- `src/modules/importer`
- `src/modules/admin`
- `src/modules/shared`
- `src/components/ui`
- `src/lib/api`
- `src/lib/types`
- `src/lib/utils`

Responsibilities:

- `src/app`: app bootstrap, providers, top-level route tree
- `src/modules/*`: role-specific pages, forms, loaders, tables, workflows
- `src/components/ui`: reusable visual and interaction primitives
- `src/lib/api`: typed fetch clients and request helpers
- `src/lib/types`: shared interfaces and enums
- `src/lib/utils`: formatting, validation helpers, constants

### 4.2 Backend Target Architecture

Recommended backend structure:

- `backend/server.py` or `backend/app.py`
- `backend/routes`
- `backend/services`
- `backend/models`
- `backend/schemas`
- `backend/integrations/gee`
- `backend/integrations/ocr`
- `backend/utils`

Responsibilities:

- `routes`: HTTP endpoints
- `services`: business logic
- `models`: persistence models and record mapping
- `schemas`: request and response validation
- `integrations/gee`: Earth Engine adapter and helpers
- `integrations/ocr`: OCR adapter and extraction orchestration
- `utils`: shared helpers, logging, config parsing

### 4.3 Persistence Direction

Current state:

- localStorage is used for some data

Target:

- persistent backend-managed storage for core entities
- local-only state limited to drafts, caches, and optimistic UI

Core persisted entities:

- users
- organizations
- company profiles
- facilities
- installations
- suppliers
- plots
- documents
- extracted document records
- production batches
- shipments
- verification cases
- audit log entries
- notifications
- generated reports

## 5. Shared Contracts to Define First

Before major feature work, define stable shared contracts for:

- `User`
- `Organization`
- `Role`
- `CompanyProfile`
- `Supplier`
- `Facility`
- `Installation`
- `PlotGeometry`
- `Document`
- `ExtractedDocumentRecord`
- `ProductionBatch`
- `Shipment`
- `VerificationCase`
- `AuditLogEntry`
- `CBAMReport`
- `EUDRReport`
- `ComplianceReport`
- `Notification`

Each contract should include:

- primary ID
- ownership information
- timestamps
- workflow status
- versioning considerations if mutable
- source relationships

Why this comes first:

- page design depends on these shapes
- API responses depend on them
- table columns and form fields depend on them
- verification and audit logic depends on them

## 6. Phase 0: Foundation and Repo Restructure

### 6.1 Goal

Replace the current single-app tab-based composition with a scalable route-based application shell.

### 6.2 Work Items

- Add `react-router-dom`
- Create top-level route tree
- Add app shell with role-aware sidebar and top bar
- Move `App.tsx` away from feature logic and into shell composition
- Introduce `AuthProvider`
- Introduce `RoleGuard`
- Introduce `ErrorBoundary`
- Introduce consistent loading and empty states
- Build reusable UI primitives:
  - cards
  - section headers
  - status badges
  - form shell
  - table shell
  - drawers
  - modals
  - alerts
  - tabs

### 6.3 Deliverables

- top-level app route tree
- role-aware layout system
- placeholder dashboards for all four roles
- no direct dependency on the current manual tab-switching state in `App.tsx`

### 6.4 Dependencies

- none

### 6.5 Done Criteria

- the app opens to routed screens
- auth guards and role guards exist
- shared shell is in place
- all future work can be added as routed modules

### 6.6 Testing

- opening a protected route without auth redirects to login
- opening an unauthorized role route shows unauthorized page
- app shell renders correctly on desktop and mobile widths

## 7. Phase 1: Authentication, Organizations, and Role-Based Access

### 7.1 Goal

Make the app usable as a real multi-role system.

### 7.2 Work Items

- build login screen
- build signup screen
- build forgot password flow
- implement session restore
- implement logout
- map user to one role
- create organization onboarding flow
- add admin invite-user flow

### 7.3 Required Pages

- `/login`
- `/signup`
- `/forgot-password`
- `/app/exporter/dashboard`
- `/app/verifier/dashboard`
- `/app/importer/dashboard`
- `/app/admin/dashboard`

### 7.4 Backend/API Needs

- `POST /api/auth/login`
- `POST /api/auth/signup`
- `POST /api/auth/logout`
- `GET /api/auth/session`
- `POST /api/admin/users/invite`
- `PATCH /api/admin/users/:id/role`
- `GET /api/admin/organizations`

### 7.5 Data Requirements

Minimum persisted records:

- user
- organization
- role assignment
- invite status

### 7.6 UX Requirements

- redirect by role after login
- persistent top bar profile control
- unread notifications placeholder in shell
- onboarding prompt if organization incomplete

### 7.7 Done Criteria

- users can authenticate
- role-based dashboards open
- admin can view orgs and users
- unauthorized access is blocked

### 7.8 Testing

- login success
- login failure
- session survives refresh
- logout clears session
- wrong role route blocked

## 8. Phase 2: Exporter Core Workflow

### 8.1 Goal

Build the exporter workspace because all downstream compliance workflows depend on exporter data completeness.

### 8.2 Build Order Inside Exporter

Recommended sequence:

1. Company profile
2. Facilities
3. Installations
4. Suppliers
5. Plots
6. Uploads
7. Extraction review
8. Production batches
9. Shipments

### 8.3 Company Profile Module

Pages:

- `/app/exporter/profile`

Features:

- legal entity form
- GST capture
- Udyam capture
- EORI capture
- contact records
- export products
- destination markets
- address set

Important validations:

- required identity fields
- email format
- phone format
- duplicate identifier prevention within org context if needed

Done means:

- exporter can complete profile
- profile completion feeds dashboard indicators

### 8.4 Facilities Module

Pages:

- `/app/exporter/facilities`

Features:

- create facility
- edit facility
- list facility
- archive facility

Critical fields:

- name
- type
- address
- coordinates if available
- products handled
- active status

### 8.5 Installations Module

Pages:

- `/app/exporter/installations`

Features:

- create installation
- link to facility
- define process type
- define fuel and power scope
- define covered CBAM products

Why important:

- installation is the accounting boundary for CBAM

### 8.6 Suppliers Module

Pages:

- `/app/exporter/suppliers`

Features:

- supplier CRUD
- supplier type
- commodity mapping
- origin region
- linkage to plots and shipments

### 8.7 Plots Module

Pages:

- `/app/exporter/plots`
- `/app/exporter/plots/new`
- `/app/exporter/plots/:plotId`

Features:

- create via point
- create via polygon
- upload GeoJSON
- draw on map
- paste coordinates
- link plot to supplier and commodity
- map preview
- area calculation

Validation:

- WGS84 coordinates
- 6-decimal precision target
- valid polygon ring
- valid GeoJSON parsing
- non-empty geometry

### 8.8 Uploads Module

Pages:

- `/app/exporter/uploads`
- `/app/exporter/uploads/:uploadId`

Features:

- upload files
- classify document type
- view file preview
- link documents to records
- processing status tracking

Supported types:

- fuel invoice
- electricity bill
- purchase order
- shipment document
- supplier declaration
- land record
- production log

### 8.9 Extraction Review Module

Pages:

- `/app/exporter/extraction-review`

Features:

- view OCR text
- view extracted structured fields
- edit extracted values
- approve extraction
- reject low-confidence extraction

### 8.10 Production Module

Pages:

- `/app/exporter/production`

Features:

- batch CRUD
- quantity capture
- product linkage
- facility linkage
- installation linkage
- evidence linkage

### 8.11 Shipments Module

Pages:

- `/app/exporter/shipments`
- `/app/exporter/shipments/new`
- `/app/exporter/shipments/:shipmentId`

Features:

- shipment CRUD
- invoice and product info
- HS code
- destination country
- supplier linkage
- plot linkage
- facility or installation linkage
- readiness checks
- draft vs ready state

Readiness rules:

- EUDR-covered shipment requires at least one linked plot
- CBAM-covered shipment requires installation/facility coverage
- shipment submission blocked if required evidence missing

### 8.12 Done Criteria

- exporter can fully onboard
- create all foundational records
- upload evidence
- review extracted data
- create shipment tied to traceability records

### 8.13 Testing

- create and edit all exporter entities
- plot creation works for point and polygon
- upload flow stores files and statuses
- shipment creation blocked when required upstream data missing

## 9. Phase 3: EUDR Compliance Engine and Map Experience

### 9.1 Goal

Turn land data into a complete EUDR-ready workflow.

### 9.2 Backend Services to Build

- geometry validation service
- Earth Engine service
- Hansen `lossyear` analysis adapter
- analysis persistence layer
- analysis history service
- failure logging
- fallback mode labeling

### 9.3 Preserve Current Verified Logic

Current verified rule:

- `lossyear > 20` means post-December 31, 2020 forest loss

### 9.4 Expand the Current Logic

Add:

- total plot area calculation
- deforested area after cutoff
- affected percentage
- target-state risk level:
  - `LOW`
  - `MEDIUM`
  - `HIGH`
- result timestamp
- dataset metadata
- history per plot

### 9.5 UI Work

Add to plot detail:

- live map view
- geometry summary
- latest result card
- analysis history list
- rerun analysis action
- download GeoJSON action

Add to shipment detail:

- EUDR completeness card
- plot list
- risk rollup
- evidence summary

### 9.6 API Needs

- `POST /api/plots/:plotId/analyze`
- `GET /api/plots/:plotId/analysis-history`
- `GET /api/shipments/:shipmentId/eudr-summary`

### 9.7 Edge Cases

- malformed geometry
- empty polygon
- coordinate order problems
- zero area
- GEE timeout
- fallback heuristic result
- plot linked to approved shipment and then edited

### 9.8 Done Criteria

- plot analysis runs from UI
- result persists
- analysis history retained
- shipment reflects EUDR completeness and risk
- verifier can later inspect results

### 9.9 Testing

- valid polygon analysis
- invalid GeoJSON rejection
- timeout handling
- risk category generation
- result versioning after geometry change

## 10. Phase 4: CBAM Data Pipeline and Emissions Engine

### 10.1 Goal

Turn the current report concept into a traceable CBAM emissions workflow.

### 10.2 Data Pipeline Components

Build:

- document normalization for fuel and power evidence
- structured line item storage
- installation linkage
- batch linkage
- product linkage
- factor lookup tables
- shipment allocation logic

### 10.3 Minimum Supported Inputs

Start with:

- diesel
- electricity
- gas

Then expand later:

- coal
- furnace oil
- LPG
- process-specific emissions inputs

### 10.4 Core Engine Requirements

Must support:

- scope 1 emissions
- scope 2 emissions
- evidence linkage
- actual vs default distinction
- installation-level accounting
- shipment-level rollup

### 10.5 UI Work

Add:

- installation detail page
- batch detail page
- shipment CBAM panel
- report preview page
- emissions line-item review screen if needed

### 10.6 APIs

- `POST /api/cbam/line-items`
- `POST /api/shipments/:shipmentId/generate-cbam`
- `GET /api/shipments/:shipmentId/cbam-summary`
- `GET /api/reference/grid-factors`
- `GET /api/reference/emission-factors`

### 10.7 Done Criteria

- exporter can generate shipment-level CBAM summary
- result distinguishes actual vs default or estimated values
- evidence-linked emissions data visible in UI

### 10.8 Testing

- line items map to installation
- emissions total correctly
- missing source triggers default flag
- report can render structured CBAM output

## 11. Phase 5: Verification Workspace

### 11.1 Goal

Introduce human review and decision-making.

### 11.2 Core Workflow

1. exporter submits shipment for review
2. case created
3. verifier opens queue
4. verifier reviews shipment, documents, EUDR, and CBAM
5. verifier approves, rejects, or requests clarification
6. exporter responds if needed
7. verifier closes case

### 11.3 Features

- verification queue
- case assignment
- comments thread
- clarification request
- approve action
- reject action
- immutable decision log
- evidence bundle download

### 11.4 Pages

- `/app/verifier/dashboard`
- `/app/verifier/queue`
- `/app/verifier/cases/:caseId`
- `/app/verifier/documents/:documentId`
- `/app/verifier/audit-trail`

### 11.5 Status Model

- `NEW`
- `ASSIGNED`
- `UNDER_REVIEW`
- `AWAITING_EXPORTER_RESPONSE`
- `APPROVED`
- `REJECTED`
- `CLOSED`

### 11.6 Rules

- approved versions are locked
- clarification creates response event history
- decision stores reviewer identity and timestamp
- verifier can never silently edit exporter source evidence

### 11.7 Done Criteria

- exporter can submit cases
- verifier can review and decide
- audit log records every decision event
- approved shipment becomes importer-visible

### 11.8 Testing

- submit case
- assign case
- request clarification
- exporter reply
- approve and reject paths
- approved version lock behavior

## 12. Phase 6: Importer Workspace and Download Center

### 12.1 Goal

Make outputs usable by the downstream importer without manual reconstruction.

### 12.2 Core Features

- importer dashboard
- supplier readiness list
- shipment list
- shipment detail
- download center
- package versioning

### 12.3 Output Package Types

- CBAM-ready CSV
- CBAM-ready XLSX
- EUDR DDS-ready payload
- GeoJSON
- XML where needed
- summary PDF
- ZIP bundle with linked files

### 12.4 Pages

- `/app/importer/dashboard`
- `/app/importer/suppliers`
- `/app/importer/shipments`
- `/app/importer/shipments/:shipmentId`
- `/app/importer/downloads`

### 12.5 Rules

- only approved packages are visible
- package version is explicit
- regenerated package increments version
- package includes exporter identity and review metadata

### 12.6 Done Criteria

- importer can inspect readiness
- importer can download approved outputs
- outputs are grouped into usable packages

### 12.7 Testing

- approved shipment appears
- package download works
- version updates after regeneration

## 13. Phase 7: Admin Controls and Governance

### 13.1 Goal

Make the platform administrable without code edits.

### 13.2 Features

- admin dashboard
- user management
- organization management
- role assignment
- reference data manager
- template manager
- system audit viewer
- platform-level notifications policy

### 13.3 Pages

- `/app/admin/dashboard`
- `/app/admin/users`
- `/app/admin/organizations`
- `/app/admin/roles`
- `/app/admin/reference-data`
- `/app/admin/templates`
- `/app/admin/system-audit`

### 13.4 Reference Data to Manage

- product categories
- HS mappings
- fuel types
- grid factors
- emissions factors
- template versions
- notification rules

### 13.5 Done Criteria

- admin can manage users and orgs
- admin can update reference data
- system-level audit events visible

### 13.6 Testing

- invite user
- suspend user
- update factor table
- inspect audit logs

## 14. Phase 8: Hardening and Production Readiness

### 14.1 Goal

Make the platform secure, stable, and deployable.

### 14.2 Required Engineering Work

- server-side validation on all endpoints
- structured logging
- monitoring hooks
- retry strategy for OCR and GEE jobs
- background job processing if load demands it
- rate limiting
- secret management
- storage policy and retention policy
- versioned output generation
- test seed data
- demo accounts
- mobile responsiveness
- accessibility review

### 14.3 Operational Readiness

- health endpoints
- failure dashboards
- backup/export strategy
- audit retention rules
- timeout handling
- graceful degraded mode for GEE failure

### 14.4 Done Criteria

- common failures are recoverable
- logs explain what failed and where
- app is stable on realistic data volumes
- outputs are versioned and auditable

## 15. Cross-Phase Dependencies

### 15.1 Critical Dependency Chain

- routing must exist before role pages
- auth must exist before real workspaces
- exporter entities must exist before shipments
- plots must exist before EUDR summaries
- facilities/installations must exist before serious CBAM output
- verification depends on shipment readiness and report generation
- importer depends on approved verification state
- admin maturity depends on stable entity models

### 15.2 Parallelizable Work

Work that can be parallelized once contracts are stable:

- shared UI library
- backend route scaffolding
- exporter table screens
- admin screens
- report formatting
- docs/help content

## 16. Data Flow Overview

### 16.1 Exporter-to-Importer Data Flow

1. exporter creates profile and master records
2. exporter uploads evidence
3. system extracts document fields
4. exporter reviews extracted values
5. exporter creates shipment and links plots/facilities/batches
6. EUDR and CBAM summaries are generated
7. exporter submits for verification
8. verifier reviews and decides
9. approved version generates importer package
10. importer downloads final output package

### 16.2 Audit Flow

Every sensitive action should create an audit event:

- create
- edit
- submit
- rerun analysis
- approve extraction
- request clarification
- approve case
- reject case
- generate report
- download package if needed for traceability

## 17. Major Risks and Mitigations

### 17.1 Risk: Building UI Before Stable Data Model

Mitigation:

- lock shared contracts before large page implementation

### 17.2 Risk: CBAM Logic Bloats Too Early

Mitigation:

- start with diesel, electricity, and gas only
- add more factors later

### 17.3 Risk: GEE Instability Blocks Delivery

Mitigation:

- keep fallback labeling explicit
- persist failed states cleanly
- retry asynchronously where needed

### 17.4 Risk: Overbuilding Admin Too Early

Mitigation:

- delay advanced admin until user-facing workflows work

### 17.5 Risk: Weak Auditability

Mitigation:

- add audit events from the first persisted entity work

## 18. Suggested Milestone Breakdown

### Milestone A

- Phase 0 complete
- Phase 1 complete

Outcome:

- real app shell and auth exist

### Milestone B

- Phase 2 complete

Outcome:

- exporter can create the full base dataset

### Milestone C

- Phase 3 complete

Outcome:

- EUDR workflow is demonstrable end to end

### Milestone D

- Phase 4 and Phase 5 complete

Outcome:

- exporter + verifier compliance loop works

### Milestone E

- Phase 6 and Phase 7 complete

Outcome:

- platform is operational across all roles

### Milestone F

- Phase 8 complete

Outcome:

- platform is ready for production pilots

## 19. Test Strategy

### 19.1 Unit Tests

Focus on:

- validation helpers
- geometry validators
- emissions calculations
- readiness rule functions
- status transition rules

### 19.2 Integration Tests

Focus on:

- auth session flow
- plot analysis endpoints
- shipment submission flow
- verification decision flow
- package generation flow

### 19.3 UI Tests

Focus on:

- route guards
- form validation
- table filtering
- upload and extraction review
- map interactions

### 19.4 Manual Acceptance Tests

Must verify:

- exporter onboarding to shipment
- EUDR plot analysis visibility
- CBAM summary generation
- verifier review cycle
- importer download cycle
- admin factor update

## 20. Success Definition

The project is successfully completed when:

- the app is role-based and routed
- exporter can build a shipment from source data
- EUDR compliance results are visible and persisted
- CBAM summary is evidence-linked
- verifier can approve or reject
- importer can download final packages
- admin can manage users and reference data
- auditability exists across the workflow

## 21. Recommended Immediate Next Build Sequence

If implementation starts now, build in this exact order:

1. route shell and role guards
2. auth provider and role-based dashboard placeholders
3. shared types package or central type definitions
4. exporter profile, facilities, suppliers, plots
5. uploads and extraction review
6. shipments
7. EUDR plot analysis integration
8. verification queue and case detail
9. importer downloads
10. CBAM enrichment
11. admin controls
12. hardening

## 22. Relationship to the Website Bible

Use this document together with:

- [EUDR_CBAM_PROJECT_DOCUMENTATION.md](C:/Users/pincu/Downloads/aerce_core-compliance-engine/EUDR_CBAM_PROJECT_DOCUMENTATION.md)

Recommended usage:

- website bible = what the system should contain
- implementation roadmap = how to build it in the right order
