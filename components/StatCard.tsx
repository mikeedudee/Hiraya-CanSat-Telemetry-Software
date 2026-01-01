
import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  isHigh?: boolean; // Critical Maximum (Red)
  isLow?: boolean;  // Critical Minimum (Orange)
  isActive?: boolean; // Data is flowing (Blue/Cyan)
  color?: 'blue' | 'green' | 'red' | 'amber' | 'slate'; // Fallback
}

export const StatCard: React.FC<StatCardProps> = ({ 
  label, 
  value, 
  unit, 
  isHigh = false, 
  isLow = false,
  isActive = false,
  color = 'slate' 
}) => {
  
  // Base: Left border is 2px (accent), others are 1px (default)
  let containerClass = "relative flex flex-col p-3 clip-corner-br transition-all duration-300 backdrop-blur-md border-t border-r border-b border-l-2 ";
  let labelClass = "text-[9px] uppercase tracking-widest font-tech opacity-80 mb-1 ";
  let valueClass = "text-xl md:text-2xl font-space font-bold leading-none tracking-wide drop-shadow-md ";
  let unitClass = "text-[10px] font-bold font-mono text-slate-500";
  let cornerClass = "border-slate-600/30";

  // Default / Normal State
  if (!isHigh && !isLow && !isActive) {
      containerClass += "bg-slate-900/40 border-slate-800 "; 
      
      // Handle Manual Colors (Left Border Accent)
      if (color === 'blue') containerClass += "border-l-blue-500 ";
      else if (color === 'green') containerClass += "border-l-emerald-500 ";
      else containerClass += "border-l-slate-700 "; // Default Slate

      labelClass += "text-slate-400";
      valueClass += "text-slate-200";
  } 
  // High Alert State (Red)
  else if (isHigh) {
      // Stronger Red Glow: Increased blur to 30px, opacity to 0.6, added inset glow
      containerClass += "bg-rose-950/60 border-slate-700 border-l-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.6),inset_0_0_15px_rgba(244,63,94,0.3)] animate-pulse ";
      labelClass += "text-rose-400 font-bold drop-shadow-[0_0_5px_rgba(244,63,94,0.9)] opacity-100 ";
      valueClass += "text-rose-50 drop-shadow-[0_0_10px_rgba(244,63,94,0.9)] ";
      unitClass = "text-[10px] font-bold font-mono text-rose-500 drop-shadow-[0_0_3px_rgba(244,63,94,0.6)]";
      cornerClass = "border-rose-500/80";
  }
  // Low Alert State (Orange)
  else if (isLow) {
      // Stronger Orange Glow: Increased blur to 30px, opacity to 0.6, added inset glow
      containerClass += "bg-orange-950/60 border-slate-700 border-l-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.6),inset_0_0_15px_rgba(249,115,22,0.3)] animate-pulse ";
      labelClass += "text-orange-400 font-bold drop-shadow-[0_0_5px_rgba(249,115,22,0.9)] opacity-100 ";
      valueClass += "text-orange-50 drop-shadow-[0_0_10px_rgba(249,115,22,0.9)] ";
      unitClass = "text-[10px] font-bold font-mono text-orange-500 drop-shadow-[0_0_3px_rgba(249,115,22,0.6)]";
      cornerClass = "border-orange-500/80";
  }
  // Active State (Data flowing, but not alert)
  else if (isActive) {
      containerClass += "bg-cyan-950/30 border-cyan-900/30 border-l-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.25)] ";
      labelClass += "text-cyan-400/90 ";
      valueClass += "text-cyan-50 drop-shadow-[0_0_6px_rgba(6,182,212,0.6)] ";
      unitClass = "text-[10px] font-bold font-mono text-cyan-600";
  }

  return (
    <div className={containerClass}>
      <div className="flex justify-between items-start">
          <span className={labelClass}>
            {label}
          </span>
          {/* Status Dot - Keeps pinging for extra attention */}
          {(isHigh || isLow) && (
             <span className={`w-2 h-2 rounded-full animate-ping ${isHigh ? 'bg-rose-500' : 'bg-orange-500'} shadow-[0_0_12px_currentColor]`}></span>
          )}
      </div>
      
      <div className="flex items-baseline gap-1 mt-auto">
        <span className={valueClass}>
            {value}
        </span>
        {unit && <span className={unitClass}>{unit}</span>}
      </div>

      {/* Decorative Corner Line */}
      <div className={`absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 ${cornerClass} rounded-br-lg pointer-events-none`}></div>
    </div>
  );
};
