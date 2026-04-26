import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BillingState, BillingUsageKind, billingRemaining, getBillingPlan, usageTotal } from './billingModel';
import { arrayBufferToBase64, postMobileDownload } from './mobileBridge';

export const downloadBillingInvoicePdf = (state: BillingState, accountName: string) => {
  const plan = getBillingPlan(state.planKey);
  const invoice = state.invoices[0];
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  doc.setFillColor(11, 18, 32);
  doc.rect(0, 0, 595, 92, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text('CarbonTrace AI Invoice', 40, 42);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text('Demo billing record for SaaS business model validation', 40, 64);

  doc.setTextColor(20, 35, 56);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Billing Summary', 40, 130);
  autoTable(doc, {
    startY: 150,
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 10, cellPadding: 8, textColor: [20, 35, 56] },
    headStyles: { fillColor: [20, 35, 56], textColor: [255, 255, 255] },
    head: [['Field', 'Value']],
    body: [
      ['Account', accountName],
      ['Invoice ID', invoice?.id ?? 'INV-DEMO'],
      ['Plan', plan.name],
      ['Amount', invoice?.amount ?? plan.price],
      ['Status', invoice?.status ?? 'Demo'],
      ['Generated', new Date().toLocaleString('en-IN')],
    ],
  });

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 28,
    theme: 'striped',
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 7, textColor: [20, 35, 56] },
    headStyles: { fillColor: [244, 122, 38], textColor: [255, 255, 255] },
    head: [['Usage Type', 'Used', 'Limit', 'Remaining']],
    body: (['shipment', 'report', 'eudr', 'ocr', 'verifierReview', 'importerDownload'] as BillingUsageKind[]).map((kind) => [
      kind,
      usageTotal(state, kind),
      plan.limits[kind],
      billingRemaining(state, kind),
    ]),
  });

  const fileName = `carbontrace-${plan.key}-demo-invoice.pdf`;
  if (
    postMobileDownload({
      fileName,
      contentType: 'application/pdf',
      contentBase64: arrayBufferToBase64(doc.output('arraybuffer')),
    })
  ) {
    return;
  }

  doc.save(fileName);
};
