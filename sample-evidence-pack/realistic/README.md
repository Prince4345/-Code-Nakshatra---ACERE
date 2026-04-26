# Realistic OCR Evidence Pack

Use this folder when you want documents that feel like real exporter evidence instead of simple demo cards.

The files are fictional training samples, but they include real-world-style invoice layouts, bill tables, GST-style identifiers, signatures, stamps, shipment references, CBAM fields, EUDR fields, and importer handoff details.

## Upload Order

1. `pdf/01-msedcl-electricity-bill.pdf`
2. `pdf/02-bpcl-diesel-tax-invoice.pdf`
3. `pdf/03-commercial-invoice-coffee-export.pdf`
4. `pdf/04-eu-purchase-order.pdf`
5. `pdf/05-supplier-origin-declaration.pdf`
6. `pdf/06-land-record-extract.pdf`
7. `pdf/07-production-batch-log.pdf`
8. `pdf/08-bill-of-lading-packing-list.pdf`

Keep document type as `Auto-detect` while uploading. Then compare the detected fields against `data/expected-extraction-results.json`.

For plot testing, use `data/eudr-hassan-cluster-boundary.geojson`.

All names, numbers, and references are fictional and for testing only.
