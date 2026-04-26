# CarbonTrace Final Browser & Device QA

## Live Endpoints
- Frontend: `https://acere4345.web.app`
- Backend: `https://carbontrace-gee-backend-450480666281.asia-south1.run.app`
- Health: `https://carbontrace-gee-backend-450480666281.asia-south1.run.app/api/health`

## Browser Matrix
- Chrome latest on Windows 11
- Edge latest on Windows 11
- Firefox latest on Windows 11
- Chrome latest on Android
- Safari latest on iPhone
- Safari latest on iPad

## Screen Matrix
- 1440px desktop
- 1280px laptop
- 1024px tablet landscape
- 820px tablet portrait
- 430px mobile large
- 390px mobile standard
- 360px mobile compact

## Exporter Core Flow
- Sign up and log in as exporter.
- Verify dashboard loads without console errors.
- Open company profile and save edits.
- Create and edit a supplier.
- Open plots workspace and verify Google Maps loads with zoom controls.
- Create one point plot and one polygon plot.
- Download GeoJSON from a saved plot.
- Run EUDR analysis and confirm status, timestamp, and source render.
- Upload a land record without choosing a type and verify category auto-detects.
- Verify extraction runs automatically after upload.
- Open extraction review and confirm structured fields are present.
- Download evidence PDF from uploads and extraction review.
- Create a shipment and link suppliers, plots, documents, facilities, installations, and batches.
- Confirm readiness rules block incomplete shipment submission.
- Submit a ready shipment for verification.
- Download JSON, TRACES XML, DDS JSON, CBAM CSV, package, and PDF from shipment/report screens.

## Verifier Flow
- Log in as verifier.
- Open queue and verify table renders on desktop and mobile widths.
- Open a submitted shipment.
- Verify suppliers, plots, documents, installations, batches, extractions, and audit sections all render.
- Download PDF, DDS JSON, and CBAM CSV from the review case.
- Request clarification with reviewer notes.
- Reopen and approve a shipment.
- Confirm approved shipment status pill and report state update correctly.

## Importer Flow
- Log in as importer.
- Confirm approved packages appear in readiness and shipments.
- Open an approved shipment.
- Verify plots, facilities, installations, documents, batches, and audit highlights render cleanly.
- Download PDF, JSON, TRACES XML, DDS JSON, CBAM CSV, full package, and plot GeoJSON.

## Dense-Screen UX Checks
- Verify tables remain readable at 1024px and below.
- Confirm action buttons wrap instead of overflowing.
- Check long invoice IDs, file names, and notes do not break cards.
- Confirm status pills remain visible on verifier/importer detail screens.
- Verify hero sections do not dominate the page on mobile.

## Upload & OCR Edge Cases
- Upload PDF, PNG, and JPG files.
- Upload a document with no notes and confirm type still infers from filename/text.
- Upload an unsupported or low-text file and confirm warnings display.
- Verify extraction review can be saved even when fields are manually corrected.

## Map & Geospatial Edge Cases
- Zoom in and out repeatedly.
- Pan the map and add a point.
- Create a polygon with at least 4 vertices.
- Drag the point marker after placement.
- Undo the last polygon point.
- Remove a polygon vertex from the draft list.
- Refresh the page and confirm saved plots still render.

## Notifications & Email
- Confirm in-app notifications increment on upload, extraction, submission, review, and approval.
- Open a notification and confirm it marks as read.
- Trigger a shipment approval and confirm email delivery.

## Compliance Output Hardening Checks
- Approve a shipment and verify it is locked from exporter mutation.
- Re-download outputs after approval and confirm snapshot-backed data is used.
- Validate DDS JSON includes operator, shipment, suppliers, and plots.
- Validate TRACES XML includes invoice, operator, and plot nodes.
- Validate CBAM CSV includes emissions totals and installation references.

## Regression Watch List
- Firestore permission errors on demo or seeded data writes
- Timestamp parsing errors from Firestore objects
- Broken preview links for seeded demo documents
- Map render failures when API key restrictions change
- PDF export failures caused by missing report fields
- Review and importer detail pages becoming unreadable on smaller screens
