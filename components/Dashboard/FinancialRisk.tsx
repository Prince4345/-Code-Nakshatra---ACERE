import React, { useState, useMemo } from 'react';

interface FinancialRiskProps {
    emissions: number; // tCO2e/ton
}

const EU_CARBON_PRICE = 85.00; // EUR per ton
const FREE_ALLOWANCE = 0.8; // Percentage covered by allowances (mock)

export const FinancialRisk: React.FC<FinancialRiskProps> = ({ emissions }) => {
    const [useActual, setUseActual] = useState(true);

    // Standard specific emissions for steel (Default Value)
    const DEFAULT_EMISSIONS = 2.4;

    const metrics = useMemo(() => {
        const activeEmissions = useActual ? emissions : DEFAULT_EMISSIONS;
        const taxableAmount = Math.max(0, activeEmissions * (1 - FREE_ALLOWANCE));
        const taxLiability = taxableAmount * EU_CARBON_PRICE;

        // Calculate potential savings if using actual data vs default
        const defaultLiability = (DEFAULT_EMISSIONS * (1 - FREE_ALLOWANCE)) * EU_CARBON_PRICE;
        const savings = Math.max(0, defaultLiability - taxLiability);

        return {
            taxLiability,
            savings
        };
    }, [emissions, useActual]);

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </div>

            <div className="flex justify-between items-start mb-4">
                <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest">Financial Exposure</h3>
                <label className="flex items-center cursor-pointer gap-2">
                    <span className={`text-[10px] uppercase font-bold ${useActual ? 'text-blue-400' : 'text-slate-600'}`}>Real Data</span>
                    <div className="relative">
                        <input type="checkbox" checked={!useActual} onChange={() => setUseActual(!useActual)} className="sr-only" />
                        <div className="w-8 h-4 bg-slate-800 rounded-full shadow-inner"></div>
                        <div className={`dot absolute w-2 h-2 bg-white rounded-full shadow -left-0 top-1 transition ${!useActual ? 'transform translate-x-full bg-rose-500' : 'translate-x-1 bg-emerald-500'}`}></div>
                    </div>
                    <span className={`text-[10px] uppercase font-bold ${!useActual ? 'text-rose-400' : 'text-slate-600'}`}>EU Defaults</span>
                </label>
            </div>

            <div className="space-y-4 relative z-10">
                <div>
                    <span className="text-3xl font-bold text-white tracking-tighter">
                        € {metrics.taxLiability.toFixed(2)}
                    </span>
                    <span className="text-xs text-slate-500 block">Est. CBAM Liability / Ton</span>
                </div>

                {useActual && metrics.savings > 0 && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                        <div className="flex-1">
                            <p className="text-xs text-emerald-400 font-bold uppercase">AERCE Value Add</p>
                            <p className="text-xs text-slate-300">You are saving <span className="text-white font-bold">€{metrics.savings.toFixed(2)}</span> per ton by using real data over default values.</p>
                        </div>
                    </div>
                )}

                {!useActual && (
                    <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-3">
                        <p className="text-xs text-rose-400">
                            <span className="font-bold">WARNING:</span> Using standard values increases liability significantly.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
