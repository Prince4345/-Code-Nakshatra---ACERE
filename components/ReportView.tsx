import React from 'react';
import { ComplianceReport } from '../types';
import { StatusBadge } from './StatusBadge';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface ReportViewProps {
  report: ComplianceReport;
}

export const ReportView: React.FC<ReportViewProps> = ({ report }) => {
  const riskValue = report.overall_shipment_risk === 'HIGH' ? 100 : report.overall_shipment_risk === 'MEDIUM' ? 55 : 15;
  const riskData = [
    { name: 'Risk', value: riskValue },
    { name: 'Remaining', value: 100 - riskValue },
  ];

  const riskColors = {
    HIGH: '#f43f5e',
    MEDIUM: '#f59e0b',
    LOW: '#10b981',
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Shipment Identity</h3>
            <StatusBadge status={report.overall_shipment_risk} />
          </div>
          <div className="space-y-1">
            <p className="text-xl font-bold font-mono tracking-tight text-white">{report.invoice_id || 'UNKNOWN'}</p>
            <p className="text-xs text-slate-500">{report.product_category} {"->"} {report.destination_eu_country}</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">CBAM Status</h3>
            <StatusBadge status={report.cbam.status} />
          </div>
          <div className="space-y-1">
            <p className="text-xl font-bold font-mono text-white">
              {report.cbam.reported_emissions_tCO2 !== null ? `${report.cbam.reported_emissions_tCO2} tCO2e` : 'NOT APPLICABLE'}
            </p>
            <p className="text-xs text-slate-500">
              {report.cbam.default_value_triggered ? 'Default estimate used' : 'Shipment-specific data available'}
            </p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">EUDR Status</h3>
            <StatusBadge status={report.eudr.status} />
          </div>
          <div className="space-y-1">
            <p className="text-xl font-bold text-white">
              {report.eudr.geolocation_provided ? 'GEOLOCATION PRESENT' : 'LOCATION DATA MISSING'}
            </p>
            <p className="text-xs text-slate-500">
              Cutoff verification: {report.eudr.deforestation_cutoff_verified ? 'available' : 'missing'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800 bg-slate-800/50">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest">Regulatory Deviations</h3>
          </div>
          <div className="p-4 space-y-6">
            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                <h4 className="text-xs font-bold uppercase text-slate-400">CBAM Exceptions</h4>
              </div>
              {report.cbam.non_compliance_reasons.length > 0 ? (
                <ul className="space-y-2">
                  {report.cbam.non_compliance_reasons.map((reason, i) => (
                    <li key={i} className="text-sm bg-rose-500/5 border border-rose-500/10 p-2 rounded text-rose-200 flex items-start gap-2">
                      <span className="text-rose-500 mt-1">•</span>
                      {reason}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500 italic">No critical CBAM exceptions detected.</p>
              )}
            </section>

            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                <h4 className="text-xs font-bold uppercase text-slate-400">EUDR Exceptions</h4>
              </div>
              {report.eudr.non_compliance_reasons.length > 0 ? (
                <ul className="space-y-2">
                  {report.eudr.non_compliance_reasons.map((reason, i) => (
                    <li key={i} className="text-sm bg-rose-500/5 border border-rose-500/10 p-2 rounded text-rose-200 flex items-start gap-2">
                      <span className="text-rose-500 mt-1">•</span>
                      {reason}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500 italic">No critical EUDR exceptions detected.</p>
              )}
            </section>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden h-[300px]">
            <div className="px-4 py-3 border-b border-slate-800 bg-slate-800/50 flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest">Raw Audit Output</h3>
              <button
                onClick={() => navigator.clipboard.writeText(JSON.stringify(report, null, 2))}
                className="text-[10px] text-slate-400 hover:text-white transition-colors uppercase font-bold"
              >
                Copy JSON
              </button>
            </div>
            <div className="p-4 overflow-auto h-full scrollbar-hide">
              <pre className="text-[11px] font-mono text-slate-300 leading-relaxed">
                {JSON.stringify(report, null, 2)}
              </pre>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Exposure Level</h3>
              <p className="text-2xl font-bold tracking-tight text-white">{report.overall_shipment_risk} RISK</p>
              <p className="text-xs text-slate-500 mt-1 max-w-[200px]">Based on combined CBAM and EUDR data integrity checks.</p>
            </div>
            <div className="w-24 h-24">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={riskData}
                    innerRadius={30}
                    outerRadius={40}
                    paddingAngle={0}
                    dataKey="value"
                    startAngle={180}
                    endAngle={0}
                  >
                    <Cell fill={riskColors[report.overall_shipment_risk]} />
                    <Cell fill="#1e293b" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
