import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { IoTData } from '../../services/iotSimulator';

interface EmissionsTickerProps {
    data: IoTData;
}

const COLORS = ['#10B981', '#F59E0B', '#EF4444']; // Green, Yellow, Red

export const EmissionsTicker: React.FC<EmissionsTickerProps> = ({ data }) => {
    // Determine threat level based on intensity
    const threatLevel = useMemo(() => {
        if (data.carbonIntensity < 2.0) return 'COMPLIANT';
        if (data.carbonIntensity < 2.5) return 'WARNING';
        return 'CRITICAL';
    }, [data.carbonIntensity]);

    const gaugeData = useMemo(() => [
        { name: 'Current', value: data.carbonIntensity },
        { name: 'Remaining Limit', value: Math.max(0, 3.0 - data.carbonIntensity) } // Assuming 3.0 max visual scale
    ], [data.carbonIntensity]);

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
            </div>

            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">Real-Time Carbon Pulse</h3>

            <div className="flex items-center gap-6">
                <div className="h-32 w-32 relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={gaugeData}
                                cx="50%"
                                cy="50%"
                                innerRadius={35}
                                outerRadius={50}
                                startAngle={180}
                                endAngle={0}
                                paddingAngle={0}
                                dataKey="value"
                                stroke="none"
                            >
                                <Cell key="current" fill={threatLevel === 'COMPLIANT' ? COLORS[0] : threatLevel === 'WARNING' ? COLORS[1] : COLORS[2]} />
                                <Cell key="remaining" fill="#1e293b" />
                            </Pie>
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '12px' }}
                                itemStyle={{ color: '#fff' }}
                                formatter={(value: number) => [value.toFixed(2), 'tCO2e']}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pt-8">
                        <span className={`text-2xl font-bold ${threatLevel === 'COMPLIANT' ? 'text-emerald-400' :
                                threatLevel === 'WARNING' ? 'text-amber-400' : 'text-rose-500'
                            }`}>
                            {data.carbonIntensity.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-slate-500">tCO2e/ton</span>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${threatLevel === 'COMPLIANT' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500 animate-ping'}`}></div>
                        <span className="text-white font-mono text-sm">{threatLevel}</span>
                    </div>
                    <p className="text-slate-500 text-xs max-w-[140px]">
                        Live emission intensity from furnace sensors. Updates every 2s.
                    </p>
                </div>
            </div>
        </div>
    );
};
