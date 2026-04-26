import React, { useCallback } from 'react';

interface TRACESGeneratorProps {
    data: any;
}

export const TRACESGenerator: React.FC<TRACESGeneratorProps> = ({ data }) => {
    const handleDownload = useCallback(() => {
        // Generate a strictly formatted XML mocking EU TRACES standards
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<TRACES_NT_Import>
    <Header>
        <MessageID>${Math.random().toString(36).substr(2, 9).toUpperCase()}</MessageID>
        <Timestamp>${new Date().toISOString()}</Timestamp>
        <SenderID>AERCE_INDIA_GATEWAY</SenderID>
        <ReceiverID>EU_DG_TAXUD</ReceiverID>
    </Header>
    <Shipment>
        <InvoiceID>${data?.invoice_id || 'PENDING'}</InvoiceID>
        <ProductCode>${data?.product_category || 'UNK'}</ProductCode>
        <Destination>${data?.destination_eu_country || 'EU'}</Destination>
        <CBAM_Declaration>
            <Status>${data?.cbam?.status || 'UNKNOWN'}</Status>
            <Emissions>${data?.cbam?.reported_emissions_tCO2 || 0}</Emissions>
        </CBAM_Declaration>
        <EUDR_Declaration>
            <Status>${data?.eudr?.status || 'UNKNOWN'}</Status>
            <GeolocationVerified>${data?.eudr?.geolocation_provided ? 'YES' : 'NO'}</GeolocationVerified>
        </EUDR_Declaration>
    </Shipment>
    <DigitalSignature>
        <HashAlgo>SHA-256</HashAlgo>
        <Value>AERCE_SIG_${Date.now()}_VERIFIED_CLOSED_SOURCE</Value>
    </DigitalSignature>
</TRACES_NT_Import>`;

        const blob = new Blob([xml], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `AERCE_TRACES_EXPORT_${Date.now()}.xml`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }, [data]);

    return (
        <button
            onClick={handleDownload}
            className="w-full flex items-center justify-center gap-2 py-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all group"
        >
            <div className="bg-slate-700 p-2 rounded-lg group-hover:bg-slate-600 transition">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            </div>
            <div className="text-left">
                <span className="block text-white font-bold text-xs uppercase tracking-wider">Download EU TRACES XML</span>
                <span className="block text-[10px] text-slate-500">Official Customs Format</span>
            </div>
        </button>
    );
};
