import React, { useState, useEffect } from 'react';

// Data Arrays for Dropdowns
const INDIAN_STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
    "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
    "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
    "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
    "Uttarakhand", "West Bengal", "Delhi (NCR)", "Jammu & Kashmir"
];

const EU_COUNTRIES = [
    "Austria", "Belgium", "Bulgaria", "Croatia", "Republic of Cyprus", "Czech Republic",
    "Denmark", "Estonia", "Finland", "France", "Germany", "Greece", "Hungary", "Ireland",
    "Italy", "Latvia", "Lithuania", "Luxembourg", "Malta", "Netherlands", "Poland",
    "Portugal", "Romania", "Slovakia", "Slovenia", "Spain", "Sweden"
];

const CBAM_PRODUCTS = [
    "Steel - Wire Rods", "Steel - Hot Rolled Coils", "Steel - Bars & Rods",
    "Aluminum - Unwrought", "Aluminum - Plates/Sheets",
    "Cement - Clinker", "Cement - Portland",
    "Fertilizers - Ammonia", "Fertilizers - Urea",
    "Hydrogen", "Electricity"
];

interface ShipmentFormProps {
    onInputReady: (rawText: string, formData: any) => void;
    isLoading: boolean;
    error?: string | null;
}

export const ShipmentForm: React.FC<ShipmentFormProps> = ({ onInputReady, isLoading, error }) => {
    const [formData, setFormData] = useState({
        invoiceId: '',
        product: '',
        originState: '',
        destinationCountry: '',
        weight: '',
        energyUsage: '',
        additionalNotes: ''
    });

    // Synthesize the raw text whenever form data changes, but don't submit yet
    // We only submit when the user clicks the button.

    const handleConstructAndSubmit = () => {
        // Construct the "Raw" string for the AI Agent
        const rawString = `
New Shipment Declaration
------------------------
Invoice Number: ${formData.invoiceId || 'PENDING'}
Product Category: ${formData.product}
Origin: ${formData.originState}, India
Destination: ${formData.destinationCountry}
Quantity/Weight: ${formData.weight} (in metric tons)

Energy & Production Data:
${formData.energyUsage ? `Reported Consumption: ${formData.energyUsage}` : 'No specific energy data provided.'}

Additional Notes:
${formData.additionalNotes}
    `.trim();

        onInputReady(rawString, formData);
    };

    const isFormValid = formData.product && formData.originState && formData.destinationCountry;

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                <div>
                    <h3 className="text-white font-bold text-lg tracking-tight">New Shipment Declaration</h3>
                    <p className="text-slate-500 text-xs mt-1">Fill in the details below. Our AI will validate compliance automatically.</p>
                </div>
                <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full">
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Smart Form Active</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Invoice ID */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Invoice ID</label>
                    <input
                        type="text"
                        placeholder="e.g. INV-2024-001"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition"
                        value={formData.invoiceId}
                        onChange={e => setFormData({ ...formData, invoiceId: e.target.value })}
                    />
                </div>

                {/* Product Category */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">CBAM Product Category</label>
                    <div className="relative">
                        <select
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer transition"
                            value={formData.product}
                            onChange={e => setFormData({ ...formData, product: e.target.value })}
                        >
                            <option value="" disabled>Select Product Class...</option>
                            {CBAM_PRODUCTS.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                        <div className="absolute right-4 top-3.5 pointer-events-none text-slate-500">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Origin State (India) */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Origin (State/Province)</label>
                    <div className="relative">
                        <select
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer transition"
                            value={formData.originState}
                            onChange={e => setFormData({ ...formData, originState: e.target.value })}
                        >
                            <option value="" disabled>Select Indian State...</option>
                            {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <div className="absolute right-4 top-3.5 pointer-events-none text-slate-500">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Destination Country (EU) */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Destination (EU Member State)</label>
                    <div className="relative">
                        <select
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer transition"
                            value={formData.destinationCountry}
                            onChange={e => setFormData({ ...formData, destinationCountry: e.target.value })}
                        >
                            <option value="" disabled>Select EU Country...</option>
                            {EU_COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <div className="absolute right-4 top-3.5 pointer-events-none text-slate-500">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Weight */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Net Weight (Tonnes)</label>
                    <input
                        type="number"
                        placeholder="e.g. 500"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition"
                        value={formData.weight}
                        onChange={e => setFormData({ ...formData, weight: e.target.value })}
                    />
                </div>

                {/* Energy Data (Optional) */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Direct Emissions Data (Optional)</label>
                    <input
                        type="text"
                        placeholder="e.g. 1500 kWh consumption, Furnace #2"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition"
                        value={formData.energyUsage}
                        onChange={e => setFormData({ ...formData, energyUsage: e.target.value })}
                    />
                </div>
            </div>

            {/* Additional Notes area (Hidden by default unless needed, but we keep it small) */}
            <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Additional Notes / Remarks</label>
                <textarea
                    placeholder="Any special handling, existing certifications, or comments..."
                    className="w-full h-20 bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none transition"
                    value={formData.additionalNotes}
                    onChange={e => setFormData({ ...formData, additionalNotes: e.target.value })}
                />
            </div>

            <button
                onClick={handleConstructAndSubmit}
                disabled={isLoading || !isFormValid}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 transition-all flex justify-center items-center gap-2 group"
            >
                {isLoading ? (
                    <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Analyzing Compliance...
                    </>
                ) : (
                    <>
                        RUN COMPLIANCE ENGINE
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </>
                )}
            </button>

            {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-500 text-sm flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {error}
                </div>
            )}
        </div>
    );
};
