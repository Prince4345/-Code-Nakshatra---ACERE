import React from 'react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-200">
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
              A
            </div>
            <div>
              <h1 className="font-bold tracking-tight text-white">AERCE_CORE</h1>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-medium">EU Compliance Engine</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-[11px] font-mono text-slate-500 border border-slate-700 px-2 py-0.5 rounded">v1.1.0-MVP</span>
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8">
        {children}
      </main>
      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        <p>© 2026 AERCE_CORE. Built for CBAM and EUDR workflow prototyping.</p>
      </footer>
    </div>
  );
};
