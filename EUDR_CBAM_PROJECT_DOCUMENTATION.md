# CarbonTrace AI Website Bible

## 1. Document Purpose

This document is the master A-to-Z product and website specification for CarbonTrace AI, a role-based compliance platform for Indian MSMEs dealing with:

- CBAM: Carbon Border Adjustment Mechanism
- EUDR: European Union Deforestation Regulation

This document is intended to be detailed enough for:

- product planning,
- UI and UX design,
- frontend implementation,
- backend implementation,
- investor or judge walkthroughs,
- internal team handoff.

It describes the full target-state website and application, including every major role, page, form, module, workflow, status, entity, output artifact, and backend interaction that should exist in the final platform.

This document uses:

- the three provided Word documents as the authoritative target-state product source,
- the local repo at `C:\Users\pincu\Downloads\aerce_core-compliance-engine` as the current MVP reference.

Important framing:

- Anything verified in the repo is labeled as current MVP or current implementation.
- Anything drawn from the source documents but not yet present in the repo is labeled as target-state or planned.
- This document does not claim that the full platform already exists in code.

## 2. Product Vision and Business Context

### 2.1 Product Name

Primary product name:

- CarbonTrace AI

Internal or project references that may also appear:

- EUDR Compliance & Reporting Platform
- CBAM-EUDR Compliance Platform
- CarbonTrace AI for MSME Exporters

### 2.2 Core Problem

Indian MSMEs exporting to the EU increasingly need structured sustainability data, but most do not maintain that data in regulator-ready form.

The main operational pain points are:

- invoice and utility data is fragmented,
- geolocation and land traceability data is missing or inconsistent,
- reporting formats are hard for MSMEs to produce manually,
- verifiers require traceability from every result back to evidence,
- importers need ready-to-use data packages and not raw spreadsheets,
- missing or weak data can trigger default values or risk flags that hurt competitiveness.

### 2.3 Product Promise

CarbonTrace AI helps exporters create audit-ready, structured, downloadable compliance packages by reusing data they already have:

- invoices,
- bills,
- accounting records,
- GPS coordinates,
- supplier declarations,
- production records,
- shipment metadata.

### 2.4 Strategic Value

The platform should help users:

- lower compliance cost,
- improve reporting speed,
- reduce manual spreadsheet work,
- increase data trust,
- support external verification,
- improve importer confidence,
- preserve EU market access.

### 2.5 Target Users

Primary users:

- Exporters
- Verifiers
- Importers
- Admins

Secondary stakeholders:

- EU buyers
- External auditors
- Industry bodies
- Compliance consultants
- Government or program partners

### 2.6 Target Segments

Priority segments include:

- Steel exporters
- Aluminium exporters
- Cement producers
- Fertilizer producers
- Coffee supply chains
- Rubber supply chains
- Oilseed and soy-linked supply chains
- Timber-linked supply chains
- Cattle or leather-linked supply chains
- Downstream manufacturers whose materials may trigger EUDR or CBAM exposure

### 2.7 Business Model Inputs That Influence the Website

The website should be ready to support:

- subscription plans,
- pay-per-report usage,
- pilot onboarding,
- importer-sponsored adoption,
- verifier partnerships,
- government or scheme-supported programs,
- premium modules like advanced analytics or expanded satellite checks.

## 3. Source of Truth and Current State

### 3.1 Authoritative Target-State Sources

The following documents define the intended end-state platform:

- `C:\Users\pincu\Downloads\Project Overview_ AI-Driven Compliance Platform for CBAM_EUDR.docx`
- `C:\Users\pincu\Downloads\Target MSME Segments and Value Chains.docx`
- `C:\Users\pincu\Downloads\Key Data Requirements and Templates.docx`

### 3.2 Current MVP Grounding from the Repo

Verified in the current codebase:

- React 19 + Vite frontend
- Flask backend
- Google Earth Engine integration
- local storage persistence for some records
- Firebase initialization
- OCR upload component
- map components
- compliance report viewer
- TRACES-style XML export mock
- single-app demo-style flow instead of full role-based workspaces

Key confirmed files:

- [App.tsx](C:/Users/pincu/Downloads/aerce_core-compliance-engine/App.tsx)
- [backend/server.py](C:/Users/pincu/Downloads/aerce_core-compliance-engine/backend/server.py)
- [backend/gee_analysis.py](C:/Users/pincu/Downloads/aerce_core-compliance-engine/backend/gee_analysis.py)
- [services/gee_proxy.ts](C:/Users/pincu/Downloads/aerce_core-compliance-engine/services/gee_proxy.ts)
- [services/firebase.ts](C:/Users/pincu/Downloads/aerce_core-compliance-engine/services/firebase.ts)
- [services/db.ts](C:/Users/pincu/Downloads/aerce_core-compliance-engine/services/db.ts)
- [components/Dashboard/ShipmentForm.tsx](C:/Users/pincu/Downloads/aerce_core-compliance-engine/components/Dashboard/ShipmentForm.tsx)
- [components/ReportView.tsx](C:/Users/pincu/Downloads/aerce_core-compliance-engine/components/ReportView.tsx)
- [components/Output/TRACESGenerator.tsx](C:/Users/pincu/Downloads/aerce_core-compliance-engine/components/Output/TRACESGenerator.tsx)

### 3.3 What the MVP Is Not Yet

The current repo is not yet:

- a full role-based exporter-verifier-importer-admin system,
- a production-grade persistence layer for all platform entities,
- a complete CBAM reporting engine,
- a complete multi-page operational website matching the source documents.

## 4. Website Goals

The full website/app should support six major outcomes:

1. Acquire and onboard exporters.
2. Capture business, facility, supplier, and land plot data.
3. Convert documents and field data into structured compliance records.
4. Run CBAM and EUDR-related analysis workflows.
5. Support verification and importer retrieval.
6. Deliver final reports and export-ready artifacts.

## 5. Role Model and Permission Framework

### 5.1 Roles

Core roles:

- Exporter
- Verifier
- Importer
- Admin

Optional future roles:

- Compliance manager
- Data entry operator
- External auditor viewer
- Government or partner program manager

### 5.2 Permission Principles

Permission model should include:

- module-level permission,
- record-level permission,
- action-level permission,
- state-based restriction.

Examples:

- An Exporter can edit a shipment before verification request submission.
- A Verifier can comment on a submitted case but cannot alter original exporter source data.
- An Importer can download approved outputs but cannot modify upstream evidence.
- An Admin can assign roles and manage policy settings.

### 5.3 Permission Matrix

| Module / Action | Exporter | Verifier | Importer | Admin |
|---|---|---|---|---|
| View own dashboard | Yes | Yes | Yes | Yes |
| Manage company profile | Yes | No | Limited | Yes |
| Manage suppliers | Yes | Read | Read | Yes |
| Manage plots | Yes | Read | Read | Yes |
| Upload documents | Yes | No | No | Yes |
| Review extracted fields | Yes | Read | No | Yes |
| Create facilities | Yes | Read | No | Yes |
| Create shipments | Yes | Read | Read | Yes |
| Request verification | Yes | No | No | Yes |
| Verify shipment/case | No | Yes | No | Yes |
| Approve or reject case | No | Yes | No | Yes |
| Download exporter outputs | Yes | Limited | Yes | Yes |
| View audit logs | Limited | Yes | Limited | Yes |
| Manage users | No | No | No | Yes |
| Configure templates | No | No | No | Yes |

### 5.4 Workflow-State Restrictions

Rules:

- Draft records are editable by exporter and admin.
- Submitted-for-review records are locked for structural edits by exporter unless returned.
- Returned-for-clarification records become editable again for exporter.
- Approved records become versioned and download-enabled.
- Archived records are read-only except for admin audit operations.

## 6. Site Map and Information Architecture

### 6.1 Public Pages

Public website routes should include:

- `/`
- `/features`
- `/solutions`
- `/industries`
- `/pricing`
- `/about`
- `/resources`
- `/help`
- `/contact`
- `/login`
- `/signup`
- `/forgot-password`

### 6.2 Authenticated Areas

Authenticated app root:

- `/app`

Role entry points:

- `/app/exporter`
- `/app/verifier`
- `/app/importer`
- `/app/admin`

### 6.3 Exporter Route Tree

Recommended exporter route structure:

- `/app/exporter/dashboard`
- `/app/exporter/onboarding`
- `/app/exporter/profile`
- `/app/exporter/facilities`
- `/app/exporter/installations`
- `/app/exporter/suppliers`
- `/app/exporter/plots`
- `/app/exporter/plots/new`
- `/app/exporter/plots/:plotId`
- `/app/exporter/uploads`
- `/app/exporter/uploads/:uploadId`
- `/app/exporter/extraction-review`
- `/app/exporter/production`
- `/app/exporter/shipments`
- `/app/exporter/shipments/new`
- `/app/exporter/shipments/:shipmentId`
- `/app/exporter/verification`
- `/app/exporter/reports`
- `/app/exporter/reports/:reportId`
- `/app/exporter/audit-trail`
- `/app/exporter/notifications`
- `/app/exporter/settings`

### 6.4 Verifier Route Tree

- `/app/verifier/dashboard`
- `/app/verifier/queue`
- `/app/verifier/cases/:caseId`
- `/app/verifier/documents/:documentId`
- `/app/verifier/audit-trail`
- `/app/verifier/notifications`
- `/app/verifier/settings`

### 6.5 Importer Route Tree

- `/app/importer/dashboard`
- `/app/importer/suppliers`
- `/app/importer/shipments`
- `/app/importer/shipments/:shipmentId`
- `/app/importer/downloads`
- `/app/importer/notifications`
- `/app/importer/settings`

### 6.6 Admin Route Tree

- `/app/admin/dashboard`
- `/app/admin/users`
- `/app/admin/organizations`
- `/app/admin/roles`
- `/app/admin/reference-data`
- `/app/admin/templates`
- `/app/admin/system-audit`
- `/app/admin/notifications`
- `/app/admin/settings`

### 6.7 Shared Utility Routes

- `/app/document-viewer/:documentId`
- `/app/map-viewer/:plotId`
- `/app/report-viewer/:reportId`
- `/app/not-found`

## 7. Global Application Shell

### 7.1 Layout Areas

Authenticated screens should use a common shell with:

- top navigation,
- left sidebar,
- page title row,
- breadcrumb area,
- alert and status ribbon,
- main content canvas,
- optional right-side context drawer,
- footer or help drawer.

### 7.2 Top Navigation

Top bar should include:

- logo,
- current organization name,
- current role badge,
- quick search,
- notification bell,
- help button,
- profile dropdown.

### 7.3 Sidebar Rules

Sidebar should:

- show role-specific modules only,
- show completion indicators for onboarding flows,
- keep verification and reports pinned for quick access,
- allow collapsing on smaller screens.

### 7.4 Global Search

Search should support:

- shipment ID,
- invoice ID,
- supplier name,
- plot ID,
- document name,
- report ID,
- user name for admin.

### 7.5 Global Notifications

Notification center should group by:

- action required,
- upcoming deadline,
- system alert,
- success confirmation,
- verification update.

## 8. Public Website Specification

### 8.1 Landing Page

Route:

- `/`

Purpose:

- explain the product,
- build trust,
- convert visitors into signups or demos.

Sections:

- hero section
- regulatory problem summary
- product value proposition
- how it works
- supported regulations
- target industries
- exporter, verifier, importer benefits
- screenshots or mock workflow
- trust and compliance evidence
- CTA section
- footer

Primary actions:

- `Request Demo`
- `Start Free Trial`
- `Login`
- `View Features`

### 8.2 Features Page

Route:

- `/features`

Sections:

- document ingestion
- OCR extraction
- ERP integration
- geo-mapping
- EUDR screening
- emissions calculations
- verification workflow
- importer export packages
- dashboards and notifications

### 8.3 Solutions Page

Route:

- `/solutions`

Sections:

- exporters
- verifiers
- importers
- program partners

### 8.4 Industries Page

Route:

- `/industries`

Sections:

- steel
- aluminium
- cement
- fertilizer
- coffee
- rubber
- oilseeds
- timber
- leather

### 8.5 Pricing Page

Route:

- `/pricing`

Sections:

- plan tiers
- feature comparison
- optional add-ons
- pilot options
- enterprise or importer-sponsored model

### 8.6 Resource and Help Pages

Routes:

- `/resources`
- `/help`

Content should include:

- what is CBAM,
- what is EUDR,
- how to gather data,
- how to upload documents,
- how to draw plots,
- how verification works,
- what files importers can download,
- FAQs,
- sample templates.

### 8.7 Contact Page

Route:

- `/contact`

Fields:

- name
- company
- email
- phone
- role
- industry
- message

## 9. Authentication Pages

### 9.1 Login

Route:

- `/login`

Fields:

- email
- password

Actions:

- `Login`
- `Continue with Google` if enabled
- `Forgot password`
- `Create account`

States:

- idle
- loading
- invalid credentials
- locked account
- success redirect by role

### 9.2 Signup

Route:

- `/signup`

Fields:

- full name
- business email
- phone
- company name
- role selection
- password
- confirm password
- consent checkbox

### 9.3 Forgot Password

Route:

- `/forgot-password`

Fields:

- email

States:

- email sent
- user not found
- retry

## 10. Exporter Workspace Specification

### 10.1 Exporter Dashboard

Route:

- `/app/exporter/dashboard`

Purpose:

- give exporter a complete overview of compliance readiness.

Cards:

- profile completion
- number of suppliers
- plots mapped
- pending uploads
- extraction review pending
- shipments in draft
- shipments awaiting verification
- approved shipments
- upcoming CBAM deadlines
- upcoming EUDR actions

Widgets:

- compliance score summary
- recent activity
- alerts
- quick actions
- shipment trend chart

Quick actions:

- `Complete Profile`
- `Add Supplier`
- `Upload Document`
- `Add Plot`
- `Create Shipment`
- `Request Verification`
- `Generate Report`

### 10.2 Exporter Onboarding Page

Route:

- `/app/exporter/onboarding`

Purpose:

- guide new exporters through mandatory setup.

Onboarding steps:

1. Create company profile
2. Add facility or installation
3. Add supplier
4. Add plot or location
5. Upload first document
6. Review extracted fields
7. Create first shipment
8. Request first verification

Completion logic:

- each step shows `Not Started`, `In Progress`, or `Complete`
- user cannot mark complete manually unless required records exist

### 10.3 Company Profile Page

Route:

- `/app/exporter/profile`

Purpose:

- store operator identity and compliance identity data.

Sections:

- legal business details
- registration identifiers
- primary compliance contacts
- export products
- countries of operation
- factory and office addresses
- importer-facing identity fields

Buttons:

- `Save Draft`
- `Submit Profile`
- `Edit`
- `Add Contact`

Main form fields:

| Field | Type | Required | Example | Validation |
|---|---|---|---|---|
| Legal Entity Name | Text | Yes | AgroNova Exports Pvt Ltd | 2-150 chars |
| Trade Name | Text | No | AgroNova | 2-100 chars |
| GST Number | Text | Yes | 06ABCDE1234F1Z5 | GST format |
| Udyam Number | Text | No | UDYAM-HR-01-0000001 | Alphanumeric |
| EORI Number | Text | Conditional | INEORI00012345 | Required for importer-facing DDS where available |
| PAN | Text | No | ABCDE1234F | PAN pattern |
| Registered Address | Textarea | Yes | Full address | 10-500 chars |
| Country | Select | Yes | India | ISO country list |
| State | Select | Yes | Haryana | controlled list |
| Contact Name | Text | Yes | Prince Gahlyan | 2-100 chars |
| Contact Email | Email | Yes | ops@agronova.in | valid email |
| Contact Phone | Text | Yes | +91XXXXXXXXXX | phone format |
| Export Commodities | Multi-select | Yes | Coffee, Rubber | at least 1 |
| EU Destination Countries | Multi-select | No | Germany, France | EU list |

### 10.4 Facilities Page

Route:

- `/app/exporter/facilities`

Purpose:

- manage plants, warehouses, and operational sites.

Table columns:

- Facility ID
- Facility Name
- Facility Type
- Address
- State
- Products Handled
- Status
- Linked Installations
- Last Updated

Actions:

- `Add Facility`
- `Import Facilities`
- `View`
- `Edit`
- `Archive`

Facility modal fields:

- facility name
- facility code
- facility type
- address
- latitude
- longitude
- operational start date
- products handled
- ownership type
- active status

### 10.5 Installations Page

Route:

- `/app/exporter/installations`

Purpose:

- define installation-level carbon accounting boundaries.

Fields:

- installation name
- linked facility
- production process type
- fuel sources used
- electricity sources
- covered CBAM products
- operational boundary notes

### 10.6 Suppliers Page

Route:

- `/app/exporter/suppliers`

Purpose:

- manage upstream traceability records.

Table columns:

- Supplier ID
- Supplier Name
- Supplier Type
- Commodity
- State / Region
- Number of Linked Plots
- Number of Linked Shipments
- Verification State
- Last Updated

Filters:

- commodity
- state
- supplier type
- verification status

Supplier form fields:

| Field | Type | Required | Notes |
|---|---|---|---|
| Supplier Name | Text | Yes | legal or trade name |
| Supplier Type | Select | Yes | farmer, aggregator, intermediary, trader |
| Commodity | Select | Yes | controlled commodity list |
| Country | Select | Yes | default India |
| State / Region | Text | Yes | free text or controlled list |
| Village / Locality | Text | No | optional |
| Contact Person | Text | No | optional |
| Phone | Text | No | optional |
| Email | Email | No | optional |
| Linked Exporter Contract Ref | Text | No | optional |
| Verification Badge | System | No | set by workflow |

### 10.7 Plots Page

Route:

- `/app/exporter/plots`

Purpose:

- manage land traceability units for EUDR.

Views:

- table view
- map view
- supplier grouped view

Table columns:

- Plot ID
- Plot Name
- Supplier
- Commodity
- Geometry Type
- Area
- Country of Production
- EUDR Risk
- Last Analysis Date
- Status

Actions:

- `Add Plot`
- `Upload GeoJSON`
- `Capture GPS`
- `Draw on Map`
- `Run Analysis`
- `View Result`

### 10.8 New Plot Page

Route:

- `/app/exporter/plots/new`

Geometry modes:

- point input
- polygon drawing
- GeoJSON upload
- coordinate list paste

Required fields:

- plot name
- supplier
- commodity
- country of production
- geometry input mode

Conditional fields:

- latitude and longitude for point
- coordinate array for polygon
- file upload for GeoJSON
- date captured
- collector name

Validation rules:

- GeoJSON must parse correctly
- coordinates must be valid WGS84 latitude and longitude
- precision target should support at least 6 decimal places
- polygon must close correctly if direct coordinates are used

### 10.9 Plot Detail Page

Route:

- `/app/exporter/plots/:plotId`

Sections:

- plot metadata
- supplier linkage
- map viewer
- analysis history
- latest EUDR result
- evidence attached
- linked shipments

Buttons:

- `Edit Plot`
- `Re-run Analysis`
- `Download GeoJSON`
- `Link to Shipment`

### 10.10 Uploads Page

Route:

- `/app/exporter/uploads`

Purpose:

- central evidence intake hub.

Accepted file types:

- PDF
- JPG
- JPEG
- PNG
- CSV
- XLSX

Upload methods:

- drag and drop
- file picker
- mobile capture
- bulk upload

Table columns:

- Upload ID
- File Name
- Document Type
- Source Entity
- Uploaded By
- Upload Date
- Extraction Status
- Linked Record
- Review Status

Filters:

- document type
- extraction status
- supplier
- shipment
- date range

### 10.11 Upload Detail Page

Route:

- `/app/exporter/uploads/:uploadId`

Sections:

- file preview
- extracted text
- extracted fields
- field confidence
- manual corrections
- linked entities
- audit events

Buttons:

- `Approve Extraction`
- `Edit Fields`
- `Link Document`
- `Reprocess`
- `Delete` if still draft and permitted

### 10.12 Extraction Review Page

Route:

- `/app/exporter/extraction-review`

Purpose:

- resolve OCR or AI extracted fields.

Screen layout:

- document preview left
- extracted fields right
- confidence highlights
- issue list bottom

Review actions:

- accept all
- edit single field
- mark unreadable
- request manual review
- save and continue

### 10.13 Production Page

Route:

- `/app/exporter/production`

Purpose:

- map source inputs and operational data to product batches.

Key objects:

- production batch
- facility
- installation
- input documents
- output products

Table columns:

- Batch ID
- Facility
- Installation
- Product
- Production Period
- Quantity Produced
- Fuel Records Linked
- Electricity Records Linked
- Status

### 10.14 Shipments Page

Route:

- `/app/exporter/shipments`

Purpose:

- manage shipment records and compliance readiness.

Table columns:

- Shipment ID
- Invoice ID
- Product
- HS Code
- Destination Country
- Quantity
- CBAM Status
- EUDR Status
- Overall Risk
- Verification Status
- Last Updated

Actions:

- `Create Shipment`
- `Edit Shipment`
- `Request Verification`
- `Generate Report`
- `Download Package`

### 10.15 New Shipment Page

Route:

- `/app/exporter/shipments/new`

The current MVP already contains a simpler shipment declaration form with fields like:

- invoice ID
- product category
- origin state
- destination country
- weight
- direct emissions data notes
- additional notes

Target-state shipment fields should expand to:

| Field | Type | Required | Example |
|---|---|---|---|
| Shipment ID | System | Yes | SHP-2026-0001 |
| Invoice ID | Text | Yes | INV-2026-001 |
| Product Name | Text | Yes | Coffee Beans Grade A |
| Product Category | Select | Yes | EUDR Coffee |
| HS Code | Text | Yes | 090111 |
| Destination Country | Select | Yes | Germany |
| Destination Importer | Search Select | No | Berlin Green Imports GmbH |
| Quantity | Decimal | Yes | 25000 |
| Unit | Select | Yes | kg |
| Country of Production | Select | Yes | India |
| Linked Suppliers | Multi-select | Yes | supplier references |
| Linked Plots | Multi-select | Conditional | required for EUDR-covered shipment |
| Linked Production Batch | Search Select | No | batch reference |
| Linked Facility | Search Select | No | facility reference |
| Shipment Date | Date | Yes | 2026-04-02 |
| Port of Export | Text | No | Nhava Sheva |
| CBAM Covered | Toggle | Yes | true or false |
| EUDR Covered | Toggle | Yes | true or false |
| Notes | Textarea | No | free text |

### 10.16 Shipment Detail Page

Route:

- `/app/exporter/shipments/:shipmentId`

Sections:

- identity summary
- linked documents
- linked facilities and batches
- linked suppliers and plots
- CBAM panel
- EUDR panel
- verification panel
- download panel
- audit trail

Buttons:

- `Edit`
- `Submit for Verification`
- `Withdraw Submission`
- `Generate CBAM Output`
- `Generate EUDR DDS`
- `Download Full Package`

### 10.17 Verification Request Page

Route:

- `/app/exporter/verification`

Purpose:

- show verification queue from exporter side.

States:

- not submitted
- submitted
- under review
- clarification requested
- approved
- rejected

### 10.18 Reports Page

Route:

- `/app/exporter/reports`

Purpose:

- central view for all generated outputs.

Table columns:

- Report ID
- Shipment ID
- Report Type
- Version
- Generated Date
- Approval Status
- Download Availability

Report types:

- CBAM declaration
- EUDR DDS
- GeoJSON export
- audit summary
- importer package

### 10.19 Audit Trail Page

Route:

- `/app/exporter/audit-trail`

Purpose:

- give exporter transparency into how data and decisions were formed.

Table columns:

- Timestamp
- Actor
- Entity Type
- Entity ID
- Action
- Before / After Summary
- Source Link

### 10.20 Exporter Notifications Page

Route:

- `/app/exporter/notifications`

Notification types:

- missing required field
- document extraction complete
- verification requested
- clarification requested
- report ready
- deadline approaching
- backend analysis failed

### 10.21 Exporter Settings Page

Route:

- `/app/exporter/settings`

Tabs:

- profile settings
- notification preferences
- organization defaults
- API / integration settings
- security

## 11. Verifier Workspace Specification

### 11.1 Verifier Dashboard

Route:

- `/app/verifier/dashboard`

Cards:

- cases assigned
- cases awaiting review
- clarification requests pending
- approvals today
- rejections today
- overdue cases

Widgets:

- queue summary
- risk distribution
- recent activity
- flagged anomalies

### 11.2 Verification Queue Page

Route:

- `/app/verifier/queue`

Table columns:

- Case ID
- Exporter
- Shipment ID
- Commodity
- Destination Country
- Submission Date
- CBAM Risk Flag
- EUDR Risk Flag
- Priority
- SLA Status

Filters:

- exporter
- commodity
- destination country
- risk level
- due date
- status

### 11.3 Case Detail Page

Route:

- `/app/verifier/cases/:caseId`

Purpose:

- perform evidence review and decision making.

Layout:

- header summary
- left evidence viewer
- center calculated outputs and linked data
- right review actions and comments
- bottom timeline

Sections:

- shipment summary
- source document list
- extracted field comparison
- CBAM calculation basis
- EUDR plot summary
- plot risk evidence
- comments thread
- decision history

Actions:

- `Approve`
- `Reject`
- `Request Clarification`
- `Flag Anomaly`
- `Download Evidence Bundle`

### 11.4 Verifier Document Viewer

Route:

- `/app/verifier/documents/:documentId`

Purpose:

- side-by-side document and extracted fields review.

View requirements:

- original image or PDF
- extracted text
- extracted field list
- confidence markers
- linked shipment or batch

### 11.5 Verifier Audit Trail

Route:

- `/app/verifier/audit-trail`

Purpose:

- show review actions and defensible evidence chain.

Must log:

- who reviewed what,
- when,
- what decision was made,
- what comments were added,
- what fields or outputs were disputed.

### 11.6 Verifier Notifications

Route:

- `/app/verifier/notifications`

Examples:

- new case assigned
- exporter responded
- system anomaly flagged
- case nearing SLA breach

## 12. Importer Workspace Specification

### 12.1 Importer Dashboard

Route:

- `/app/importer/dashboard`

Cards:

- suppliers onboarded
- shipments ready
- shipments awaiting supplier action
- approved compliance packages
- pending downloads

Widgets:

- supplier readiness table
- destination country breakdown
- compliance status trend

### 12.2 Suppliers Page

Route:

- `/app/importer/suppliers`

Table columns:

- Supplier / Exporter Name
- Country
- Commodities
- Last Submission
- Approved Shipments
- Pending Shipments
- Readiness Badge

### 12.3 Shipments Page

Route:

- `/app/importer/shipments`

Table columns:

- Shipment ID
- Exporter
- Product
- HS Code
- Quantity
- Destination
- CBAM Status
- EUDR Status
- Package Status
- Download Actions

### 12.4 Importer Shipment Detail Page

Route:

- `/app/importer/shipments/:shipmentId`

Sections:

- shipment summary
- exporter details
- CBAM output preview
- EUDR DDS preview
- downloadable files
- approval source
- audit metadata

Buttons:

- `Download CBAM File`
- `Download DDS`
- `Download GeoJSON`
- `Download Full Package`

### 12.5 Downloads Page

Route:

- `/app/importer/downloads`

Purpose:

- track all packaged artifacts.

Package types:

- XML
- CSV
- XLSX
- PDF summary
- GeoJSON
- ZIP evidence bundle

## 13. Admin Workspace Specification

### 13.1 Admin Dashboard

Route:

- `/app/admin/dashboard`

Cards:

- active organizations
- active users
- exporters onboarded
- pending verifier queue
- failed analyses
- documents processed

### 13.2 Users Page

Route:

- `/app/admin/users`

Table columns:

- User ID
- Name
- Email
- Role
- Organization
- Status
- Last Login
- MFA Status

Actions:

- `Invite User`
- `Deactivate`
- `Reset Access`
- `Change Role`

### 13.3 Organizations Page

Route:

- `/app/admin/organizations`

Fields:

- organization name
- organization type
- industry
- subscription plan
- status
- primary admin

### 13.4 Roles Page

Route:

- `/app/admin/roles`

Purpose:

- manage permission templates.

### 13.5 Reference Data Page

Route:

- `/app/admin/reference-data`

Reference objects:

- product categories
- HS code mapping
- fuel types
- grid factors
- country lists
- risk rules
- template versions

### 13.6 Templates Page

Route:

- `/app/admin/templates`

Purpose:

- manage export templates and help templates.

### 13.7 System Audit Page

Route:

- `/app/admin/system-audit`

Purpose:

- monitor all sensitive actions platform-wide.

## 14. Component Library and Reusable Patterns

### 14.1 Required Reusable Components

The platform should include standardized versions of:

- dashboard stat card
- KPI strip
- status badge
- entity summary card
- searchable table
- map canvas
- timeline
- document preview panel
- extraction field editor
- file uploader
- modal dialog
- slide-over drawer
- tabs
- accordion
- notification item
- inline validation message
- empty state panel
- success banner
- warning banner
- error banner
- export action card

### 14.2 Status Badges

Core badge families:

- compliance status
- workflow status
- verification status
- extraction status
- notification severity

### 14.3 Table Behavior

All major data tables should support:

- search
- filter
- sort
- pagination
- empty state
- export current view
- row click to open detail

### 14.4 Document Viewer

Document viewer should support:

- image and PDF rendering
- zoom
- pan
- rotate
- side-by-side extracted data
- source entity links

### 14.5 Map Component

Map module should support:

- point display
- polygon display
- GeoJSON overlay
- risk layer overlay
- plot boundaries
- supplier cluster markers
- selection and highlight

## 15. Forms, Modals, and Validation Framework

### 15.1 Form Rules

Every form in the platform should specify:

- required fields,
- optional fields,
- type validation,
- business validation,
- state-based editability,
- autosave or save-draft behavior,
- success and error feedback.

### 15.2 Standard Field Types

Allowed field types:

- text
- textarea
- number
- decimal
- currency
- date
- datetime
- email
- phone
- select
- multi-select
- checkbox
- toggle
- radio
- file upload
- search-select
- coordinate input
- JSON or GeoJSON upload

### 15.3 Standard Modal Types

Common modals:

- create record
- edit record
- confirm delete
- confirm submit
- request clarification
- approve case
- reject case
- rerun analysis
- download package

### 15.4 Standard Validation Messages

Examples:

- `This field is required.`
- `Enter a valid email address.`
- `Upload a valid GeoJSON file.`
- `Latitude must be between -90 and 90.`
- `Longitude must be between -180 and 180.`
- `At least one linked supplier is required.`
- `This shipment requires at least one verified plot before submission.`

## 16. Data Model and Field Catalog

### 16.1 User

| Field | Type | Required | Description |
|---|---|---|---|
| userId | string | Yes | system unique ID |
| fullName | string | Yes | user display name |
| email | string | Yes | login email |
| phone | string | No | contact number |
| role | enum | Yes | exporter, verifier, importer, admin |
| organizationId | string | Yes | linked organization |
| status | enum | Yes | invited, active, suspended, deactivated |
| lastLoginAt | datetime | No | last login timestamp |
| createdAt | datetime | Yes | audit creation time |

### 16.2 Organization

| Field | Type | Required | Description |
|---|---|---|---|
| organizationId | string | Yes | unique organization ID |
| name | string | Yes | organization name |
| organizationType | enum | Yes | exporter, importer, verifier firm, admin org |
| industry | string | No | industry segment |
| country | string | Yes | main country |
| plan | enum | No | subscription plan |
| status | enum | Yes | active, paused, archived |

### 16.3 CompanyProfile

| Field | Type | Required | Description |
|---|---|---|---|
| companyProfileId | string | Yes | unique profile ID |
| organizationId | string | Yes | linked org |
| legalEntityName | string | Yes | legal name |
| tradeName | string | No | brand name |
| gstNumber | string | Yes | GST registration |
| udyamNumber | string | No | Udyam registration |
| eoriNumber | string | No | EORI identifier |
| registeredAddress | string | Yes | full address |
| contactName | string | Yes | compliance owner |
| contactEmail | string | Yes | compliance email |
| contactPhone | string | Yes | compliance phone |

### 16.4 Supplier

| Field | Type | Required | Description |
|---|---|---|---|
| supplierId | string | Yes | unique supplier ID |
| organizationId | string | Yes | owning exporter org |
| name | string | Yes | supplier name |
| type | enum | Yes | farmer, aggregator, intermediary, trader |
| commodity | string | Yes | supplied commodity |
| country | string | Yes | origin country |
| region | string | Yes | origin state or region |
| contactName | string | No | supplier contact |
| verificationStatus | enum | Yes | unverified, pending, verified |

### 16.5 Facility

| Field | Type | Required | Description |
|---|---|---|---|
| facilityId | string | Yes | unique facility ID |
| organizationId | string | Yes | owning exporter |
| name | string | Yes | facility name |
| type | enum | Yes | plant, warehouse, office, aggregation center |
| address | string | Yes | address |
| latitude | number | No | geolocation |
| longitude | number | No | geolocation |
| status | enum | Yes | active, inactive, archived |

### 16.6 Installation

| Field | Type | Required | Description |
|---|---|---|---|
| installationId | string | Yes | installation unique ID |
| facilityId | string | Yes | linked facility |
| name | string | Yes | installation name |
| processType | string | Yes | process description |
| fuelTypes | array | No | linked fuels |
| electricitySource | string | No | source description |
| cbamCoveredProducts | array | No | CBAM covered products |

### 16.7 PlotGeometry

| Field | Type | Required | Description |
|---|---|---|---|
| plotId | string | Yes | unique plot ID |
| supplierId | string | Yes | linked supplier |
| plotName | string | Yes | plot display name |
| commodity | string | Yes | plot commodity |
| countryOfProduction | string | Yes | country |
| geometryType | enum | Yes | point, polygon, geojson |
| geometry | object | Yes | coordinate data |
| areaHectares | number | No | computed or user-entered |
| precisionLevel | string | No | precision metadata |
| capturedAt | datetime | No | capture time |
| capturedBy | string | No | collector name |
| latestRiskStatus | enum | No | low, medium, high, unknown |

### 16.8 Document

| Field | Type | Required | Description |
|---|---|---|---|
| documentId | string | Yes | unique document ID |
| organizationId | string | Yes | owner |
| fileName | string | Yes | original file name |
| mimeType | string | Yes | content type |
| documentType | enum | Yes | fuel_invoice, power_bill, purchase_order, shipment_doc, plot_record |
| uploadedBy | string | Yes | user ID |
| uploadedAt | datetime | Yes | upload time |
| storagePath | string | Yes | file storage reference |
| extractionStatus | enum | Yes | pending, processing, complete, failed, reviewed |

### 16.9 ExtractedDocumentRecord

| Field | Type | Required | Description |
|---|---|---|---|
| extractionId | string | Yes | unique extraction ID |
| documentId | string | Yes | linked document |
| rawText | string | No | OCR text |
| structuredFields | object | No | parsed fields |
| confidenceScores | object | No | field confidence values |
| reviewedBy | string | No | reviewer |
| reviewedAt | datetime | No | review time |
| reviewStatus | enum | Yes | unreviewed, accepted, edited, rejected |

### 16.10 ProductionBatch

| Field | Type | Required | Description |
|---|---|---|---|
| batchId | string | Yes | unique batch ID |
| facilityId | string | Yes | linked facility |
| installationId | string | No | linked installation |
| product | string | Yes | produced item |
| quantity | number | Yes | amount produced |
| unit | string | Yes | unit |
| productionStartDate | date | No | start date |
| productionEndDate | date | No | end date |
| linkedDocumentIds | array | No | evidence |

### 16.11 Shipment

| Field | Type | Required | Description |
|---|---|---|---|
| shipmentId | string | Yes | unique shipment ID |
| invoiceId | string | Yes | invoice reference |
| organizationId | string | Yes | exporter org |
| productName | string | Yes | product description |
| productCategory | string | Yes | category |
| hsCode | string | Yes | HS code |
| quantity | number | Yes | amount |
| unit | string | Yes | unit |
| destinationCountry | string | Yes | EU destination |
| shipmentDate | date | Yes | shipment date |
| linkedSupplierIds | array | Yes | suppliers |
| linkedPlotIds | array | Conditional | required for EUDR-covered |
| linkedBatchId | string | No | production link |
| verificationStatus | enum | Yes | draft, submitted, under_review, clarification, approved, rejected |

### 16.12 VerificationCase

| Field | Type | Required | Description |
|---|---|---|---|
| caseId | string | Yes | unique case ID |
| shipmentId | string | Yes | linked shipment |
| assignedVerifierId | string | No | assigned verifier |
| status | enum | Yes | new, assigned, under_review, clarification_requested, approved, rejected |
| priority | enum | No | low, medium, high |
| submittedAt | datetime | Yes | submission time |
| decidedAt | datetime | No | final decision time |
| decisionSummary | string | No | final comment |

### 16.13 AuditLogEntry

| Field | Type | Required | Description |
|---|---|---|---|
| auditId | string | Yes | unique log ID |
| actorId | string | Yes | user or system actor |
| entityType | string | Yes | record type |
| entityId | string | Yes | record identifier |
| action | string | Yes | created, edited, approved, etc. |
| beforeValue | object | No | old state snapshot |
| afterValue | object | No | new state snapshot |
| sourceDocumentId | string | No | linked document |
| timestamp | datetime | Yes | event time |

### 16.14 CBAMReport

| Field | Type | Required | Description |
|---|---|---|---|
| cbamReportId | string | Yes | report ID |
| shipmentId | string | Yes | linked shipment |
| status | enum | Yes | compliant, non_compliant, risk, not_applicable |
| scope1Emissions | number | No | tCO2e |
| scope2Emissions | number | No | tCO2e |
| totalEmbeddedEmissions | number | No | total tCO2e |
| defaultValueTriggered | boolean | Yes | fallback used or not |
| sourceDocumentIds | array | No | evidence links |
| generatedAt | datetime | Yes | generation time |

### 16.15 EUDRReport

| Field | Type | Required | Description |
|---|---|---|---|
| eudrReportId | string | Yes | report ID |
| shipmentId | string | Yes | linked shipment |
| status | enum | Yes | compliant, non_compliant, risk, not_applicable |
| geolocationProvided | boolean | Yes | coordinates present |
| cutoffVerified | boolean | Yes | cutoff check complete |
| riskLevel | enum | No | low, medium, high |
| deforestedAreaM2 | number | No | detected post-cutoff loss |
| geojsonArtifactPath | string | No | export path |
| generatedAt | datetime | Yes | generation time |

### 16.16 Notification

| Field | Type | Required | Description |
|---|---|---|---|
| notificationId | string | Yes | unique ID |
| userId | string | Yes | recipient |
| type | enum | Yes | info, warning, error, success, task |
| title | string | Yes | short label |
| body | string | Yes | full message |
| relatedEntityType | string | No | linked object type |
| relatedEntityId | string | No | linked object ID |
| readStatus | enum | Yes | unread, read, archived |
| createdAt | datetime | Yes | event time |

## 17. Status and Lifecycle Catalog

### 17.1 Document Statuses

- `UPLOADED`
- `PROCESSING`
- `EXTRACTION_COMPLETE`
- `EXTRACTION_FAILED`
- `REVIEW_PENDING`
- `REVIEW_ACCEPTED`
- `REVIEW_EDITED`
- `ARCHIVED`

### 17.2 Plot Statuses

- `DRAFT`
- `READY_FOR_ANALYSIS`
- `ANALYSIS_RUNNING`
- `ANALYZED`
- `REQUIRES_FIX`
- `LINKED_TO_SHIPMENT`
- `ARCHIVED`

### 17.3 Shipment Statuses

- `DRAFT`
- `DATA_INCOMPLETE`
- `READY_FOR_SUBMISSION`
- `SUBMITTED_FOR_VERIFICATION`
- `UNDER_REVIEW`
- `CLARIFICATION_REQUESTED`
- `APPROVED`
- `REJECTED`
- `ARCHIVED`

### 17.4 Verification Statuses

- `NEW`
- `ASSIGNED`
- `UNDER_REVIEW`
- `AWAITING_EXPORTER_RESPONSE`
- `APPROVED`
- `REJECTED`
- `CLOSED`

### 17.5 Compliance Statuses

- `COMPLIANT`
- `NON_COMPLIANT`
- `RISK`
- `NOT_APPLICABLE`

### 17.6 Notification Statuses

- `UNREAD`
- `READ`
- `ARCHIVED`

### 17.7 Onboarding Statuses

- `NOT_STARTED`
- `IN_PROGRESS`
- `COMPLETE`

## 18. EUDR Engine Specification

### 18.1 Purpose

The EUDR engine determines whether land associated with a shipment shows post-cutoff deforestation risk and whether the shipment has complete geolocation evidence.

### 18.2 Supported Inputs

Supported geometry inputs:

- single point
- polygon boundary
- uploaded GeoJSON
- coordinate list pasted manually

Supporting metadata:

- supplier
- commodity
- country of production
- plot name
- capture date
- collector identity
- shipment linkage

### 18.3 Precision and Coordinate Standards

Target-state rules:

- coordinates should be stored in WGS84
- coordinate precision target should be at least 6 decimal places
- uploaded geometry should be normalized before analysis
- invalid coordinate values should block submission

### 18.4 Geometry Validation Rules

Validation must check:

- geometry type is recognized
- latitudes and longitudes are valid
- polygon rings are well-formed
- GeoJSON parses without error
- geometry is not empty
- area can be calculated when polygon is present

### 18.5 Analysis Lifecycle

Recommended lifecycle:

1. User submits or updates plot geometry.
2. System validates geometry.
3. System queues EUDR analysis.
4. Backend runs geospatial screening.
5. Result is stored with timestamp and source dataset metadata.
6. Plot detail and shipment detail show result.
7. User may re-run analysis if plot changes.

### 18.6 Dataset Logic

Target-state logic is based on:

- Google Earth Engine
- UMD Hansen Global Forest Change dataset

Specific band:

- `lossyear`

Interpretation:

- `0` means no forest loss
- `1` through `19` represent 2001 to 2019
- `20` represents 2020
- `lossyear > 20` represents loss in 2021 or later

Compliance meaning:

- post-December 31, 2020 loss is considered risk-triggering

### 18.7 Area Comparison

Target-state analysis outputs:

- total plot area
- deforested area after cutoff
- percent of affected area
- risk category
- notes or anomalies

### 18.8 Target-State Risk Categories

Suggested interpretation:

- `LOW`: no post-cutoff loss detected
- `MEDIUM`: limited post-cutoff loss or incomplete evidence requiring review
- `HIGH`: meaningful post-cutoff loss or serious traceability gap

### 18.9 Evidence Shown to Users

Plot and shipment screens should show:

- geometry summary
- map rendering
- analysis timestamp
- data source name
- deforested area
- risk label
- explanation text
- downloadable GeoJSON

### 18.10 Failure Modes

Expected failure cases:

- invalid GeoJSON
- malformed polygon
- missing coordinates
- GEE unavailable
- GEE timeout
- unsupported geometry
- missing supplier linkage
- missing country of production

### 18.11 Current MVP EUDR Behavior

Confirmed current behavior in the repo:

- backend endpoint exists at `/api/analyze-geometry`
- backend uses Google Earth Engine
- current `backend/gee_analysis.py` uses Hansen `lossyear`
- current code checks `lossyear > 20`
- current result is binary `COMPLIANT` or `NON_COMPLIANT`
- current logic flags non-compliance if detected recent loss exceeds 1000 square meters
- frontend has an offline heuristic fallback in `services/gee_proxy.ts`

## 19. CBAM Engine Specification

### 19.1 Purpose

The CBAM engine converts operational and documentary evidence into installation-level emissions records suitable for exporter reporting and importer handoff.

### 19.2 Required Inputs

Inputs should include:

- fuel invoices
- electricity bills
- purchase orders
- production logs
- product batch records
- installation definitions
- shipment records
- optional ERP or Tally integration data

### 19.3 Processing Stages

1. Collect source documents or ERP records.
2. Extract structured fields.
3. Categorize fuel, power, and process data.
4. Associate data to installation and batch.
5. Compute scope 1 and scope 2 emissions.
6. Consolidate per shipment or reporting unit.
7. Generate declaration-ready output.

### 19.4 Field Extraction Targets

Common extracted fields:

- supplier name
- invoice number
- invoice date
- fuel type
- fuel quantity
- electricity kWh
- production quantity
- product code
- facility name
- batch number

### 19.5 Calculation Requirements

Target-state logic should support:

- multiple energy sources
- direct emissions
- indirect emissions
- shipment or batch allocation
- calculation method labeling
- evidence traceability for every final figure

### 19.6 Output Expectations

CBAM outputs should include:

- product description
- HS code
- quantity
- installation identifier
- scope 1 emissions
- scope 2 emissions
- total embedded emissions
- method used
- verifier sign-off placeholder

### 19.7 Grid Factor and Reference Data

System should maintain configurable reference data for:

- grid emission factor
- fuel conversion factors
- product mappings
- reporting templates

### 19.8 Current MVP CBAM Behavior

The repo currently demonstrates adjacent features, not the full engine:

- shipment form intake
- report object with CBAM and EUDR sections
- report viewer
- local save flow
- TRACES-style export mock

Not yet fully implemented in the repo:

- formal installation-level CBAM calculator
- full EU communication template export
- backend service for actual emissions computation
- persistent, auditable emissions ledger

## 20. Document Ingestion and OCR Workflow

### 20.1 Upload Sources

Uploads supported by the target website:

- invoices
- electricity bills
- fuel bills
- purchase orders
- shipment records
- supplier declarations
- farm or land records
- images captured on mobile

### 20.2 OCR Pipeline

Pipeline stages:

- upload received
- OCR executed
- raw text extracted
- structured fields proposed
- confidence calculated
- user review required if confidence low
- approved extraction linked to records

### 20.3 Review UI Requirements

The UI should show:

- original document
- OCR text
- extracted field table
- confidence indicator
- editable value
- accepted value
- source location if available

### 20.4 Document-to-Record Linking

Documents should be linkable to:

- supplier
- facility
- installation
- production batch
- shipment
- verification case

## 21. Verification Workflow

### 21.1 End-to-End Flow

1. Exporter prepares shipment and linked evidence.
2. Exporter requests verification.
3. System creates verification case.
4. Verifier reviews documents and outputs.
5. Verifier either approves, rejects, or requests clarification.
6. Exporter resolves requested issues.
7. Verifier closes case.
8. Approved records become downloadable for importer.

### 21.2 Clarification Flow

Clarification event should include:

- issue title
- issue description
- entity linked
- due date
- requester
- response required

### 21.3 Approval Flow

Approval should record:

- approving verifier
- approval timestamp
- comments
- approved version number

### 21.4 Rejection Flow

Rejection should require:

- reason category
- free-text explanation
- affected entity
- recommended corrective action

## 22. Importer Retrieval and Export Workflow

### 22.1 Importer Goal

Importer should be able to:

- identify ready suppliers,
- review shipment-level status,
- download final artifacts,
- avoid re-entering data manually.

### 22.2 Downloadable Outputs

Importer-facing outputs:

- CBAM-ready CSV or XLSX
- EUDR DDS data package
- GeoJSON plot file
- XML package where required
- evidence summary PDF
- ZIP bundle with all shipment evidence references

### 22.3 Handover Rules

Only approved or final-version outputs should be downloadable by importers unless admin policy allows otherwise.

## 23. Notifications, Alerts, and Communication Events

### 23.1 Event Triggers

Notifications should trigger on:

- signup complete
- onboarding incomplete
- profile missing field
- extraction failed
- extraction ready for review
- plot analysis complete
- shipment missing plot
- shipment missing document
- verification submitted
- clarification requested
- verification approved
- verification rejected
- report ready
- deadline approaching

### 23.2 Notification Channels

Target-state channels:

- in-app notification
- email notification
- optional SMS or WhatsApp in future

### 23.3 Severity Levels

- info
- success
- warning
- critical

## 24. Report and Output Specifications

### 24.1 Report Center Outputs

The platform should generate:

- CBAM report
- EUDR DDS package
- GeoJSON plot export
- audit summary
- importer package
- dashboard PDF snapshot if needed

### 24.2 Shipment Compliance Summary Contract

Shipment summary should include:

- shipment identity
- exporter identity
- product and HS code
- destination
- CBAM section
- EUDR section
- overall risk
- evidence completeness
- verification status
- generation timestamp

### 24.3 EUDR DDS-Ready Contract

Required target-state fields:

- operator identity
- exporter identity
- EORI if applicable
- HS code
- product description
- quantity
- country of production
- supplier declaration summary
- plot geolocation references
- compliance declarations

### 24.4 CBAM Declaration-Ready Contract

Required target-state fields:

- installation identifier
- product description
- HS code
- quantity
- direct emissions
- indirect emissions
- total emissions
- calculation methodology
- reporting period
- evidence references

### 24.5 Verifier Decision Contract

Decision record should contain:

- case ID
- shipment ID
- decision status
- reviewer identity
- review timestamp
- comments
- linked issue IDs
- version approved or rejected

### 24.6 Current MVP Output Grounding

Confirmed current repo behavior:

- report object already includes `cbam`, `eudr`, and `overall_shipment_risk`
- report viewer shows shipment identity, status, exceptions, raw JSON, and exposure level
- TRACES generator creates a mock XML export

## 25. API and Backend Interaction Specification

### 25.1 Authentication APIs

Target interfaces:

- `POST /api/auth/login`
- `POST /api/auth/signup`
- `POST /api/auth/logout`
- `POST /api/auth/forgot-password`
- `GET /api/auth/session`

### 25.2 Company and Master Data APIs

- `GET /api/company-profile`
- `PUT /api/company-profile`
- `GET /api/facilities`
- `POST /api/facilities`
- `GET /api/installations`
- `POST /api/installations`
- `GET /api/suppliers`
- `POST /api/suppliers`

### 25.3 Plot and EUDR APIs

- `GET /api/plots`
- `POST /api/plots`
- `GET /api/plots/:plotId`
- `POST /api/plots/:plotId/analyze`
- `GET /api/plots/:plotId/analysis-history`

Current MVP endpoint:

- `POST /api/analyze-geometry`

### 25.4 Document APIs

- `POST /api/uploads`
- `GET /api/uploads`
- `GET /api/uploads/:uploadId`
- `POST /api/uploads/:uploadId/reprocess`
- `PUT /api/uploads/:uploadId/extraction-review`

### 25.5 Shipment APIs

- `GET /api/shipments`
- `POST /api/shipments`
- `GET /api/shipments/:shipmentId`
- `PUT /api/shipments/:shipmentId`
- `POST /api/shipments/:shipmentId/submit-for-verification`

### 25.6 Verification APIs

- `GET /api/verification/cases`
- `GET /api/verification/cases/:caseId`
- `POST /api/verification/cases/:caseId/approve`
- `POST /api/verification/cases/:caseId/reject`
- `POST /api/verification/cases/:caseId/request-clarification`

### 25.7 Reports and Exports APIs

- `GET /api/reports`
- `POST /api/shipments/:shipmentId/generate-cbam`
- `POST /api/shipments/:shipmentId/generate-eudr`
- `GET /api/reports/:reportId/download`
- `GET /api/shipments/:shipmentId/download-package`

### 25.8 Notifications APIs

- `GET /api/notifications`
- `POST /api/notifications/:notificationId/read`
- `POST /api/notifications/mark-all-read`

## 26. Current MVP vs Target-State Matrix

| Capability | Current MVP | Target-State |
|---|---|---|
| Single app shell | Yes | Evolve into full role-based shell |
| Exporter workflow | Partial | Full multi-module workflow |
| Verifier workspace | No | Required |
| Importer workspace | No | Required |
| Admin workspace | No | Required |
| Shipment form | Basic | Full shipment management |
| OCR upload | Partial | Full extraction workflow |
| Local storage persistence | Yes | Replace or augment with full backend persistence |
| Firebase init | Yes | Expand to full auth/data usage as intended |
| GEE backend | Yes | Harden and enrich |
| EUDR binary result | Yes | Expand to full risk and evidence model |
| CBAM report engine | Partial | Full installation-level engine |
| TRACES export mock | Yes | Formal importer/export artifact system |

## 27. MVP-Derived UI and Data References

### 27.1 Current App Tabs

Current `App.tsx` demonstrates these demo tabs:

- dashboard
- map
- mobile field agent
- report

These should be treated as concept seeds for:

- exporter dashboard,
- plot map module,
- mobile capture workflow,
- report center.

### 27.2 Current Report Shape

The current `types.ts` includes:

- `ComplianceStatus`
- `RiskLevel`
- `CBAMReport`
- `EUDRReport`
- `ComplianceReport`

These should be preserved conceptually and expanded into the target-state data contracts.

## 28. Implementation Priorities

### 28.1 Phase 1

- auth and role shell
- exporter onboarding
- company, supplier, plot, upload, shipment basics
- EUDR analysis integration

### 28.2 Phase 2

- extraction review
- production and facility mapping
- verification queue
- report generation improvements

### 28.3 Phase 3

- importer workspace
- admin controls
- full CBAM engine
- advanced notifications

### 28.4 Phase 4

- ERP integration
- richer analytics
- mobile sync improvements
- advanced partner workflows

## 29. Acceptance Criteria for the Final Website

The final website should be considered complete when:

- every role has a dedicated workspace,
- every required page exists and is navigable,
- exporters can move from onboarding to downloadable outputs,
- verifiers can review and decide on cases,
- importers can retrieve final artifacts,
- admins can manage users and reference data,
- EUDR plot analysis is visible and linked to shipments,
- CBAM reporting data is traceable to source records,
- audit trails exist across sensitive actions,
- statuses and notifications support the full workflow.

## 30. Final Notes for Implementation Teams

This website must not be implemented as a generic dashboard only. It should feel like a compliance operating system with:

- structured step-by-step onboarding,
- evidence-first workflows,
- role-based clarity,
- regulator-aware outputs,
- strong auditability,
- clear status communication.

The current repo is a useful MVP foundation, especially for:

- report concepts,
- GEE backend concepts,
- map interaction concepts,
- OCR upload concepts,
- export mock concepts.

However, the final website described in this document is much broader and should be built as a full product platform rather than an expanded demo.
