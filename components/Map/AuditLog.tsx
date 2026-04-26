import React from 'react';

export interface AuditLogEntry {
    id: string;
    timestamp: string;
    locationName: string;
    areaHectares: string;
    risk: 'SAFE' | 'HIGH';
    coordinates: { lat: number; lng: number }[];
    aiJustification: string;
}

interface AuditLogProps {
    entries: AuditLogEntry[];
}

export const AuditLog: React.FC<AuditLogProps> = ({ entries }) => {
    const downloadJSON = () => {
        const dataStr = JSON.stringify(entries, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `eudr_compliance_audit_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (entries.length === 0) return null;

    return (
        <div className="mt-6 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-4">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 001-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
                    </svg>
                    <h3 className="font-bold text-slate-800">Compliance Audit Log</h3>
                    <span className="bg-slate-200 text-slate-600 text-xs px-2 py-0.5 rounded-full font-medium">{entries.length} Records</span>
                </div>
                <button
                    onClick={downloadJSON}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download JSON
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                        <tr>
                            <th className="px-4 py-3">Time</th>
                            <th className="px-4 py-3">Location</th>
                            <th className="px-4 py-3">Area (Ha)</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Details</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {entries.slice().reverse().map((entry) => (
                            <tr key={entry.id} className="hover:bg-slate-50 transition">
                                <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                                    {new Date(entry.timestamp).toLocaleTimeString()} <span className="text-xs text-slate-400">{new Date(entry.timestamp).toLocaleDateString()}</span>
                                </td>
                                <td className="px-4 py-3 font-medium text-slate-800">
                                    {entry.locationName}
                                </td>
                                <td className="px-4 py-3 text-slate-600 font-mono">
                                    {entry.areaHectares}
                                </td>
                                <td className="px-4 py-3">
                                    {entry.risk === 'SAFE' ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                            COMPLIANT
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                            HIGH RISK
                                        </span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-xs text-slate-500 max-w-xs truncate" title={entry.aiJustification}>
                                    {entry.aiJustification}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
