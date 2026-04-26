# CarbonTrace AI Sample Evidence Pack

Use these files to test upload classification, OCR extraction, shipment linking, CBAM fields, EUDR evidence, and report generation.

## Recommended Upload Order

1. `pdf/01-electricity-bill-pune-plant.pdf` as `Auto-detect`
2. `pdf/02-diesel-fuel-invoice-eaf.pdf` as `Auto-detect`
3. `pdf/03-commercial-invoice-coffee-eudr.pdf` as `Auto-detect`
4. `pdf/04-purchase-order-netherlands-buyer.pdf` as `Auto-detect`
5. `pdf/05-supplier-declaration-coffee.pdf` as `Auto-detect`
6. `pdf/06-land-record-hassan-cluster.pdf` as `Auto-detect`
7. `pdf/07-production-log-steel-batch.pdf` as `Auto-detect`
8. `pdf/08-packing-list-and-bill-of-lading.pdf` as `Auto-detect`

## Extra Data Files

- `data/09-cbam-installation-activity.csv` can be used for CBAM-style installation and batch activity checks.
- `data/10-eudr-plot-boundary.geojson` can be uploaded or copied into the plot GeoJSON flow.
- `data/11-expected-extraction-results.json` shows the expected category and key fields for each sample.

## Demo Story Covered

- EUDR coffee shipment from Karnataka to Germany.
- Supplier declaration and land record with survey and coordinate fields.
- GeoJSON plot boundary for the same coffee plot.
- CBAM-style steel shipment evidence with electricity, diesel, and production batch data.
- Importer-ready shipment documents with invoice, purchase order, packing list, and bill of lading.

These are fictional but realistic sample records, created only for CarbonTrace AI testing.
