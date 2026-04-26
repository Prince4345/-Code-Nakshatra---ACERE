import React, { useEffect, useState } from 'react';

interface AnomalyAlertProps {
    active: boolean;
    onResolve: () => void;
}

export const AnomalyAlert: React.FC<AnomalyAlertProps> = ({ active, onResolve }) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (active) setVisible(true);
    }, [active]);

    if (!active && !visible) return null;

    return (
        <div className={`fixed bottom-8 right-8 z-50 transition-all duration-500 transform ${active ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
            <div className="bg-rose-950 border border-rose-500/50 shadow-2xl rounded-2xl p-6 max-w-sm flex items-start gap-4 backdrop-blur-md">
                <div className="bg-rose-500/20 p-3 rounded-full shrink-0 animate-pulse">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <div className="space-y-2">
                    <h4 className="text-white font-bold">Abnormal Energy Spike Detected</h4>
                    <p className="text-rose-200 text-xs leading-relaxed">
                        Sensor #4 detected a +15% deviation in furnace energy consumption. This may trigger a CBAM audit flag.
                    </p>
                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={onResolve}
                            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg transition-colors"
                        >
                            Review & Rectify
                        </button>
                        <button
                            onClick={() => setVisible(false)}
                            className="px-4 py-2 hover:bg-white/5 text-slate-400 text-xs font-bold rounded-lg transition-colors"
                        >
                            Dismiss
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
