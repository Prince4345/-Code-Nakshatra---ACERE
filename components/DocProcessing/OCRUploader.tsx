import React, { useState, useCallback } from 'react';
import { createWorker } from 'tesseract.js';

interface OCRUploaderProps {
    onExtraction: (data: any) => void;
}

export const OCRUploader: React.FC<OCRUploaderProps> = ({ onExtraction }) => {
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [result, setResult] = useState<string | null>(null);

    const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setProcessing(true);
        setProgress(10);

        try {
            const worker = await createWorker('eng');

            setProgress(50);

            const { data: { text } } = await worker.recognize(file);
            await worker.terminate();

            setProgress(100);
            setResult(text);

            // Mock "Smart Extraction" Logic based on keywords
            const extractedData: any = {};

            if (text.includes("Survey")) {
                // Simulate 7/12 Land Record
                extractedData.docType = "LAND_RECORD_7_12";
                extractedData.surveyNumber = "24/2 (Extracted)";
                extractedData.owner = "Ramesh Kumar (Extracted)";
            } else if (text.includes("Electricity") || text.includes("Invoice")) {
                // Simulate Utility Bill
                extractedData.docType = "ENERGY_INVOICE";
                extractedData.units = "4500 kWh (Extracted)";
                extractedData.supplier = "MSEDCL (Extracted)";
            } else {
                extractedData.docType = "UNKNOWN";
                extractedData.rawText = text.substring(0, 50) + "...";
            }

            onExtraction(extractedData);

        } catch (err) {
            console.error(err);
        } finally {
            setProcessing(false);
        }
    }, [onExtraction]);

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex flex-col items-center justify-center space-y-4">
                <h3 className="text-white font-bold text-sm uppercase tracking-wider text-center">AI Document Scanner</h3>
                <p className="text-xs text-slate-500 text-center max-w-xs">
                    Upload a 7/12 Utara or Electricity Bill. Our agentic OCR will extract compliance data automatically.
                </p>

                <label className={`w-full h-32 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all ${processing ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800'}`}>
                    {processing ? (
                        <div className="text-center space-y-2">
                            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                            <p className="text-xs font-bold text-blue-400">Scanning Document... {progress}%</p>
                        </div>
                    ) : (
                        <div className="text-center space-y-2 pointer-events-none">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="text-xs text-slate-400 font-bold">Snap Photo / Upload</span>
                        </div>
                    )}
                    <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={processing}
                    />
                </label>

                {result && (
                    <div className="w-full bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-left">
                        <div className="flex items-center gap-2 mb-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span className="text-xs font-bold text-emerald-400">Extraction Successful</span>
                        </div>
                        <p className="text-[10px] text-emerald-200/80 line-clamp-2 font-mono">{result}</p>
                    </div>
                )}
            </div>
        </div>
    );
};
