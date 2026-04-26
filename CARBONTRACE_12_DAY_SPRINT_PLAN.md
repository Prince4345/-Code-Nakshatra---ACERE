# CarbonTrace AI 12-Day Sprint Plan

## 1. Purpose

This document is the practical 12-day execution plan for building a demo-ready MVP of CarbonTrace AI from the current `aerce_core-compliance-engine` repository.

This is not a full production roadmap. It is a deadline-driven sprint plan designed to maximize the chance of having a strong, coherent, end-to-end demo by **April 14, 2026**.

The goal is to build a convincing MVP where:

- an exporter logs in,
- completes company setup,
- adds suppliers and plots,
- runs real EUDR analysis,
- uploads evidence,
- creates a shipment,
- generates a compliance report,
- submits for verification,
- a verifier reviews and approves,
- an importer downloads the final package.

## 2. What This 12-Day MVP Must Achieve

### 2.1 Core Demo Promise

The product should convincingly show:

- real land-traceability intake,
- real EUDR analysis using the Flask + Google Earth Engine backend,
- role-based user experiences,
- evidence-linked shipment workflow,
- visible review and handoff flow.

### 2.2 MVP Scope

In scope:

- authentication
- role-based routing
- exporter dashboard
- company profile
- suppliers
- plots and land data
- EUDR analysis
- uploads
- shipments
- report page
- verifier review
- importer download flow

Out of scope for this sprint:

- full admin system
- advanced CBAM factor engine
- enterprise governance
- deep OCR automation
- advanced notifications
- production-grade hardening
- full multi-org management

### 2.3 MVP Positioning

For this sprint:

- EUDR is the real technical backbone
- verification is visible and functional
- importer handoff is functional
- CBAM is represented structurally, not deeply computed

## 3. Non-Negotiable Rules for the 12 Days

### 3.1 Scope Discipline

Do not build:

- features not visible in the final demo
- deep admin tooling
- advanced analytics
- perfect architecture at the cost of flow completion

### 3.2 Demo First

Every day should improve the final demo path.

The demo path is:

1. login
2. exporter dashboard
3. company profile
4. supplier create
5. plot create
6. EUDR analysis
7. document upload
8. shipment create
9. report generate
10. verifier review
11. importer download

### 3.3 Real vs Simulated

Make these real:

- auth
- role routing
- plot creation
- EUDR analysis
- shipment workflow
- verification state change
- importer download

Allow these to be simplified:

- OCR
- CBAM calculation depth
- admin tooling
- notification system
- audit sophistication

## 4. Technical Decisions for the Sprint

### 4.1 Frontend

Use:

- React 19
- Vite
- React Router
- current CSS direction unless cleanup is needed
- Leaflet / React Leaflet for map work

### 4.2 Backend

Use:

- Flask
- current `backend/server.py`
- current `backend/gee_analysis.py`

### 4.3 Auth

Use:

- Firebase Auth

Fastest acceptable role model:

- store user role in a lightweight app record or profile mapping
- avoid building a full role-management console now

### 4.4 Data Persistence

Preferred for sprint speed:

- use lightweight persistent storage for key entities if practical
- if backend persistence slows delivery, use reliable local persistence for demo-critical data, but keep the interface abstracted

Demo-critical persisted entities:

- company profile
- suppliers
- plots
- uploads metadata
- shipments
- verification cases

### 4.5 Reuse Strategy

Reuse and evolve:

- current report view
- current TRACES export idea
- current map concept
- current OCR upload concept if it fits cleanly
- current GEE proxy pattern

## 5. Daily Execution Plan

## Day 1: App Foundation

### Objective

Replace the tab-based app flow with a routed multi-role shell.

### Build

- install and configure `react-router-dom`
- create route tree
- create `AuthLayout`
- create `DashboardLayout`
- create role route groups:
  - exporter
  - verifier
  - importer
- create placeholder dashboard pages
- move old tab logic out of `App.tsx`
- create shared shell primitives:
  - sidebar
  - page header
  - stat card
  - empty state
  - loading state
  - status badge

### Deliverables

- `/login`
- `/app/exporter/dashboard`
- `/app/verifier/dashboard`
- `/app/importer/dashboard`

### Risks

- routing refactor can break the current app if mixed with old logic

### Mitigation

- stabilize the route shell first
- only then move feature screens

### End-of-Day Success

- app opens with route-based structure
- all 3 role dashboards render as placeholders

## Day 2: Auth and Role Routing

### Objective

Make the app feel like a real platform instead of a static demo.

### Build

- login page
- signup page
- forgot password page
- Firebase auth session provider
- route guard
- role guard
- post-login redirect by role
- unauthorized page

### Deliverables

- working auth pages
- protected role routes
- persistent session restore

### Risks

- role metadata source may be unclear

### Mitigation

- use a simple role mapping approach for sprint speed

### End-of-Day Success

- exporter, verifier, importer can each log in and land in the right dashboard

## Day 3: Exporter Dashboard and Company Profile

### Objective

Create the exporter’s real starting point.

### Build

- exporter dashboard with progress cards
- company profile page
- form state and save behavior
- dashboard progress widgets:
  - profile completion
  - supplier count
  - plot count
  - upload count
  - shipment count
  - verification pending

### Required Profile Fields

- legal entity name
- trade name
- GST
- Udyam
- EORI
- registered address
- contact name
- contact email
- contact phone
- export commodities
- EU destination countries

### End-of-Day Success

- exporter can complete company profile
- dashboard reflects completion status

## Day 4: Suppliers Module

### Objective

Build the supplier source registry.

### Build

- suppliers list page
- add supplier form
- edit supplier form
- simple archive/delete if time permits
- list filters:
  - commodity
  - supplier type
  - region

### Required Supplier Fields

- supplier name
- supplier type
- commodity
- country
- region

### End-of-Day Success

- exporter can create and manage suppliers
- supplier data can be selected in plots and shipments

## Day 5: Plots Module

### Objective

Build land-traceability intake.

### Build

- plots list page
- new plot page
- plot detail page
- map integration
- point input mode
- polygon input mode
- GeoJSON upload
- supplier linkage
- commodity linkage
- geometry preview

### Validation Rules

- coordinates valid
- GeoJSON valid
- geometry non-empty
- supplier selected
- commodity selected

### Minimum Acceptance

At least 2 working creation paths:

- GeoJSON upload
- point or polygon map input

### End-of-Day Success

- exporter can create plots and view them on a map

## Day 6: EUDR Backend Integration

### Objective

Make EUDR the strongest real feature in the MVP.

### Build

- connect plot detail page to Flask backend
- trigger `/api/analyze-geometry`
- render result card on plot detail
- persist result to plot record
- show:
  - status
  - deforested area
  - source dataset
  - analysis timestamp

### Optional Stretch

If time permits:

- derive a simple risk label from current backend output

### Must Not Happen

- do not delay this day trying to build perfect proportional risk logic

### End-of-Day Success

- plot analysis works from UI
- a real GEE-backed result is visible
- failure state is shown clearly if backend fails

## Day 7: Uploads Module

### Objective

Give exporters a place to submit evidence.

### Build

- uploads page
- file upload component
- uploaded file list
- upload detail page
- document type tagging
- notes field
- basic image/PDF preview if feasible

### Required Manual Categories

- fuel invoice
- electricity bill
- shipment document
- supplier declaration
- land record

### Simplification Rule

- if OCR slows delivery, keep upload + classification + notes only

### End-of-Day Success

- exporter can upload and classify evidence files

## Day 8: Shipment Module

### Objective

Create the central business workflow object.

### Build

- shipments list page
- new shipment page
- shipment detail page
- link shipment to:
  - supplier(s)
  - plot(s)
  - uploaded document(s)
  - product
  - HS code
  - destination country
  - quantity

### Readiness Rules

- EUDR-covered shipment requires at least one linked plot
- shipment requires at least one supplier
- shipment requires at least one uploaded supporting document

### CBAM MVP Fields

Add structured but simple fields for:

- product category
- quantity
- energy/emissions notes
- destination

### End-of-Day Success

- exporter can create a shipment with real traceability links

## Day 9: Reports and Exporter Summary

### Objective

Turn shipment data into demo-quality outputs.

### Build

- reports page
- shipment compliance summary page
- improve current `ReportView`
- include:
  - shipment identity
  - EUDR status
  - CBAM placeholder section
  - overall risk
  - exceptions
  - raw structured data view

### Downloads

- JSON export
- XML export using current TRACES generator idea
- GeoJSON download when plot exists

### End-of-Day Success

- exporter can view and download a polished compliance package

## Day 10: Verifier MVP

### Objective

Make review visible and functional.

### Build

- verifier dashboard
- verification queue
- case detail page
- basic review screen showing:
  - shipment summary
  - plot result
  - uploaded documents
  - notes/comments
  - approve
  - reject
  - request clarification

### Minimum Status Model

- `SUBMITTED`
- `UNDER_REVIEW`
- `CLARIFICATION_REQUESTED`
- `APPROVED`
- `REJECTED`

### End-of-Day Success

- verifier can review a submitted shipment and change state

## Day 11: Importer MVP

### Objective

Close the loop with a real handoff view.

### Build

- importer dashboard
- approved shipments list
- importer shipment detail page
- download center for:
  - XML
  - JSON
  - GeoJSON
  - summary package

### Rules

- importer sees approved shipments only
- importer cannot edit anything

### End-of-Day Success

- importer can retrieve approved shipment packages

## Day 12: Polish and Demo Stabilization

### Objective

Make the product presentable and reliable.

### Build and Fix

- loading states
- empty states
- error states
- better wording and labels
- mobile responsiveness
- seed demo data
- happy-path rehearsal
- fallback handling when GEE fails
- visual cleanup

### Mandatory Demo Rehearsal

Run this script end to end:

1. login as exporter
2. complete profile
3. add supplier
4. add plot
5. run EUDR check
6. upload documents
7. create shipment
8. submit for verification
9. login as verifier and approve
10. login as importer and download package

### End-of-Day Success

- one clean happy-path demo works with no dead pages

## 6. Daily Priority Rules

If a day slips:

- protect the next day’s dependency work first
- never spend half a day polishing a page that is not in the demo flow

Priority order for cutting scope:

1. cut advanced styling
2. cut advanced OCR
3. cut admin
4. cut advanced CBAM
5. cut non-essential table filters
6. never cut EUDR integration
7. never cut shipment flow
8. never cut verifier/importer visibility

## 7. Minimum Data Contracts for the Sprint

Implement only the minimum shared contracts needed:

- `User`
- `Role`
- `CompanyProfile`
- `Supplier`
- `PlotGeometry`
- `Document`
- `Shipment`
- `VerificationCase`
- `EUDRReport`
- `ComplianceReport`

Recommended minimum fields:

### User

- `id`
- `email`
- `displayName`
- `role`

### CompanyProfile

- `id`
- `legalEntityName`
- `tradeName`
- `gst`
- `udyam`
- `eori`
- `address`
- `contactName`
- `contactEmail`
- `contactPhone`

### Supplier

- `id`
- `name`
- `type`
- `commodity`
- `country`
- `region`

### PlotGeometry

- `id`
- `name`
- `supplierId`
- `commodity`
- `geometryType`
- `geometry`
- `analysisResult`

### Document

- `id`
- `fileName`
- `documentType`
- `notes`
- `linkedShipmentId`

### Shipment

- `id`
- `invoiceId`
- `product`
- `hsCode`
- `destinationCountry`
- `quantity`
- `supplierIds`
- `plotIds`
- `documentIds`
- `status`

### VerificationCase

- `id`
- `shipmentId`
- `status`
- `reviewerNotes`
- `decision`

## 8. Minimum Routes for the Sprint

- `/login`
- `/signup`
- `/forgot-password`
- `/app/exporter/dashboard`
- `/app/exporter/profile`
- `/app/exporter/suppliers`
- `/app/exporter/plots`
- `/app/exporter/plots/new`
- `/app/exporter/plots/:plotId`
- `/app/exporter/uploads`
- `/app/exporter/shipments`
- `/app/exporter/shipments/new`
- `/app/exporter/shipments/:shipmentId`
- `/app/exporter/reports`
- `/app/verifier/dashboard`
- `/app/verifier/queue`
- `/app/verifier/cases/:caseId`
- `/app/importer/dashboard`
- `/app/importer/shipments`
- `/app/importer/shipments/:shipmentId`

## 9. Minimum APIs for the Sprint

Use or build only what is needed for the demo:

- auth/session endpoints or Firebase-backed session bridge
- `POST /api/analyze-geometry`
- supplier CRUD
- plot CRUD
- upload metadata CRUD
- shipment CRUD
- verification status update endpoint
- package/report retrieval endpoint

## 10. Testing Strategy

### 10.1 Every-Day Test Rule

At the end of each day, retest the final demo path from the beginning up to the farthest completed step.

### 10.2 Critical End-to-End Scenarios

- exporter login works
- exporter profile saves
- supplier create/edit works
- plot create via GeoJSON works
- plot create via map input works
- plot analysis returns backend result
- upload flow stores file metadata
- shipment creation blocks missing required links
- shipment report renders
- verifier can approve or reject
- importer only sees approved shipments
- importer downloads package

### 10.3 High-Risk Checks

- backend unavailable during EUDR analysis
- invalid GeoJSON upload
- broken role guard
- broken plot-to-shipment linkage
- report generation with incomplete optional CBAM fields

## 11. Demo Acceptance Criteria

The MVP is successful on April 14, 2026 if:

- the app has one clean role-based flow
- EUDR is real and clearly visible
- Exporter, Verifier, and Importer are all visible
- there are no dead links in the demo path
- the report and download step feels credible
- the UI looks intentional and connected, not like isolated prototype screens

## 12. Emergency Scope-Cut Plan

If the sprint falls behind by Day 8 or later, cut in this order:

1. advanced upload preview
2. OCR review depth
3. extra table filters
4. importer dashboard richness
5. verifier comment sophistication
6. CBAM detail depth

Never cut:

- auth
- exporter flow
- plot creation
- EUDR integration
- shipment flow
- verifier decision
- importer download

## 13. Best Final Demo Narrative

The best final demo story is:

"CarbonTrace AI helps an Indian MSME exporter prepare EU compliance-ready evidence. The exporter enters business and supply data, maps land provenance, runs a real EUDR deforestation check using Earth Engine, links evidence to a shipment, sends it for verification, and then hands a downloadable package to the importer."

That is achievable in 12 days if scope stays disciplined.
