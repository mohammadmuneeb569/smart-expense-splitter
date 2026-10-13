import React from 'react';

export default function LoadingSpinner({ size = 'md', text = '' }) {
  const sizeMap = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-2',
    xl: 'w-10 h-10 border-2',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-2.5">
      <div className={`spinner ${sizeMap[size] || sizeMap.md} rounded-full`} />
      {text && <p className="text-xs text-slate-400 font-medium">{text}</p>}
    </div>
  );
}

export function PageLoader({ text = 'Loading...' }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#0B0F17]/90 z-50">
      <div className="bg-[#111827] border border-slate-800 rounded-xl px-6 py-5 flex flex-col items-center gap-3 shadow-xl">
        <div className="w-8 h-8 spinner rounded-full" />
        <p className="text-slate-300 text-xs font-medium tracking-tight">{text}</p>
      </div>
    </div>
  );
}
