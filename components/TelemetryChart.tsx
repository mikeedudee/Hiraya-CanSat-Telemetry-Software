
import React, { useState, useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Brush, ReferenceLine, Label 
} from 'recharts';
import { TelemetryPacket, GraphConfig, ThresholdSettings } from '../types';
import { LucideIcon, MousePointerClick, Eye, EyeOff, Filter, X, Baseline } from 'lucide-react';

interface LineConfig {
  key: keyof TelemetryPacket;
  name: string;
  color: string;
  yAxisId?: string;
  dot?: boolean;
  strokeDasharray?: string;
  strokeWidth?: number;
}

interface TelemetryChartProps {
  title: string;
  icon: LucideIcon;
  data: TelemetryPacket[];
  lines: LineConfig[];
  yAxisConfig?: {
    left?: GraphConfig;
    right?: GraphConfig;
  };
  density?: 'high' | 'medium' | 'low';
  thresholds?: ThresholdSettings;
  unit?: string; // Main unit for the chart (e.g. 'm', '°C')
}

// Optimized with React.memo to prevent full re-renders when parent state changes (like clock ticks)
export const TelemetryChart = React.memo<TelemetryChartProps>(({ 
  title, 
  icon: Icon, 
  data, 
  lines, 
  yAxisConfig,
  density = 'high',
  thresholds,
  unit = ''
}) => {
  const [hoveredValue, setHoveredValue] = useState<number | null>(null);
  const [pinnedIndex, setPinnedIndex] = useState<number | null>(null);
  const [hiddenSeries, setHiddenSeries] = useState<string[]>([]);
  const [showRefLines, setShowRefLines] = useState(true);
  
  // Filter State: seconds to look back, null means show all
  const [timeWindow, setTimeWindow] = useState<number | null>(null); 
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  // Statistics Calculation (Apogee, Max Temps)
  const stats = useMemo(() => {
    if (data.length === 0) return { apogee: 0, maxTemps: {} as Record<string, number>, maxVal: 0 };

    let maxAlt = -Infinity;
    let globalMax = -Infinity;
    const maxTemps: Record<string, number> = {};

    data.forEach(d => {
      // Calculate Apogee (Max Relative Altitude)
      if (d.relAltitude > maxAlt) maxAlt = d.relAltitude;

      // Calculate Max Temps for active lines
      lines.forEach(line => {
        // @ts-ignore
        const val = d[line.key] as number;
        
        // Track global max for scaling logic
        if (val > globalMax) globalMax = val;

        if (line.key === 'temperature' || line.key === 'thermistorTemp') {
           if (!maxTemps[line.key] || val > maxTemps[line.key]) {
             maxTemps[line.key as string] = val;
           }
        }
      });
    });

    return { apogee: maxAlt, maxTemps, maxVal: globalMax };
  }, [data, lines]);

  // Optimized Sampling Logic
  const sampledData = useMemo(() => {
    let startIndex = 0;
    
    // 1. Filter by Time Window using index search instead of array.filter
    if (timeWindow !== null && data.length > 0) {
      const lastTime = data[data.length - 1].timeElapsed;
      const cutoff = lastTime - (timeWindow * 1000);
      // Binary search or simple findIndex would work, simple loop is fine for <500 items
      // For large datasets, this loop avoids creating intermediate arrays
      for(let i = data.length - 1; i >= 0; i--) {
          if (data[i].timeElapsed < cutoff) {
              startIndex = i + 1;
              break;
          }
      }
    }

    // 2. Apply Density Sampling
    const result = [];
    const step = density === 'high' ? 1 : (density === 'medium' ? 2 : 5);
    const totalLen = data.length;

    for (let i = startIndex; i < totalLen; i++) {
        if ((i - startIndex) % step === 0 || i === totalLen - 1) {
            // We attach originalIndex without spreading the whole object if possible,
            // but Recharts needs properties on the same object. 
            // We shallow copy only the visible points to reduce GC.
            result.push({ ...data[i], originalIndex: i });
        }
    }
    return result;
  }, [data, density, timeWindow]);

  const toggleSeries = (key: string) => {
    setHiddenSeries(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const getDomain = (cfg?: GraphConfig): [number | 'auto', number | 'auto'] => {
    if (!cfg) return ['auto', 'auto'];
    return [
      cfg.yMin === 'auto' || cfg.yMin === '' ? 'auto' : Number(cfg.yMin),
      cfg.yMax === 'auto' || cfg.yMax === '' ? 'auto' : Number(cfg.yMax)
    ];
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const point = payload[0].payload;
      return (
        <div className="bg-slate-900/95 border border-slate-600 p-3 rounded-sm shadow-[0_0_15px_rgba(0,0,0,0.5)] backdrop-blur-md z-50 min-w-[150px] clip-corner-br">
          <div className="flex justify-between items-start mb-2 border-b border-slate-700 pb-2">
            <div className="flex flex-col gap-0.5">
               <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Data Point</span>
               <div className="flex items-baseline gap-2">
                  <span className="text-indigo-400 font-mono text-xs">#{point.originalIndex ?? label}</span>
                  <span className="text-slate-400 font-mono text-[10px]">{(point.timeElapsed / 1000).toFixed(2)}s</span>
               </div>
            </div>
            {pinnedIndex !== null && <span className="text-[9px] text-emerald-500 font-bold uppercase tracking-wider bg-emerald-500/10 px-1 rounded border border-emerald-500/20">PINNED</span>}
          </div>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between gap-4 text-xs font-mono">
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: entry.color }} />
                   <span className="text-slate-300 opacity-90">{entry.name}</span>
                </div>
                <span className="text-white font-bold">{Number(entry.value).toFixed(2)}</span>
              </div>
            ))}
          </div>
          {pinnedIndex !== null && (
             <div className="mt-2 pt-1 border-t border-slate-800 text-[9px] text-slate-600 italic text-center">Click chart to unpin</div>
          )}
        </div>
      );
    }
    return null;
  };

  const handleChartClick = (e: any) => {
    if (e && e.activeTooltipIndex !== undefined) {
      if (pinnedIndex === e.activeTooltipIndex) {
        setPinnedIndex(null); // Toggle off
      } else {
        setPinnedIndex(e.activeTooltipIndex);
      }
    } else {
      setPinnedIndex(null);
    }
  };

  // Determine if this is an Altitude chart to show Apogee/Target
  const hasAltitude = lines.some(l => l.key === 'relAltitude');
  const hasTemperature = lines.some(l => l.key === 'temperature');

  // Helper to determine text position based on proximity to top border
  // If value is within top 15% of the visible range (estimated by maxVal), move text down
  const getPosition = (val: number, maxVal: number, isRight: boolean = false) => {
      const isNearTop = val > (maxVal * 0.85);
      if (isRight) {
          return isNearTop ? 'insideBottomRight' : 'insideTopRight';
      }
      return isNearTop ? 'insideBottomLeft' : 'insideTopLeft';
  };

  return (
    <div className="flex-1 tech-border rounded-lg p-2 flex flex-col min-h-[200px] relative group transition-all">
       <div className="flex justify-between items-center mb-1 shrink-0 px-1">
          <h3 className="text-slate-300 font-bold text-xs uppercase flex items-center gap-2 font-tech tracking-wider">
            <Icon className="w-3 h-3 text-cyan-400" /> {title}
          </h3>
          <div className="flex items-center gap-2">
             
             {/* Reference Line Toggle */}
             <button
               onClick={() => setShowRefLines(!showRefLines)}
               className={`flex items-center gap-1 px-1.5 py-0.5 rounded-sm border transition-colors ${showRefLines ? 'bg-indigo-900/50 border-indigo-500 text-indigo-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}
               title={showRefLines ? "Hide Max/Target Reference Lines" : "Show Max/Target Reference Lines"}
             >
                <Baseline className="w-3 h-3" />
             </button>

             {/* Filter Control */}
             <div className="relative">
                <button 
                  onClick={() => setShowFilterMenu(!showFilterMenu)}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded-sm border transition-colors ${timeWindow ? 'bg-indigo-900/50 border-indigo-500 text-indigo-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}
                  title={timeWindow ? "Time filter active. Click to clear." : "Filter Data by Time Window"}
                >
                  <Filter className="w-3 h-3" />
                  <span className="text-[9px] font-mono">{timeWindow ? `${timeWindow}s` : 'ALL'}</span>
                </button>
                
                {showFilterMenu && (
                  <div className="absolute right-0 top-full mt-1 bg-slate-950 border border-slate-700 rounded-sm shadow-xl z-20 flex flex-col min-w-[80px] p-1 animate-in zoom-in-95 origin-top-right">
                     <button onClick={() => { setTimeWindow(null); setShowFilterMenu(false); }} className="text-[10px] text-left px-2 py-1 hover:bg-slate-800 rounded text-slate-300" title="Show entire dataset">Show All</button>
                     <button onClick={() => { setTimeWindow(30); setShowFilterMenu(false); }} className="text-[10px] text-left px-2 py-1 hover:bg-slate-800 rounded text-slate-300" title="Show only last 30 seconds">Last 30s</button>
                     <button onClick={() => { setTimeWindow(60); setShowFilterMenu(false); }} className="text-[10px] text-left px-2 py-1 hover:bg-slate-800 rounded text-slate-300" title="Show only last 60 seconds">Last 60s</button>
                     <button onClick={() => { setTimeWindow(300); setShowFilterMenu(false); }} className="text-[10px] text-left px-2 py-1 hover:bg-slate-800 rounded text-slate-300" title="Show only last 5 minutes">Last 5m</button>
                  </div>
                )}
             </div>

             {pinnedIndex !== null && (
                 <div title="Tooltip pinned. Click chart to release.">
                    <MousePointerClick className="w-3 h-3 text-indigo-400 animate-pulse" />
                 </div>
             )}
             <span className="text-[9px] text-slate-600 uppercase font-mono" title="Rendering Density Setting and Visible Data Points">{density} QTY: {sampledData.length}</span>
          </div>
       </div>
       
       <div className="flex-1 w-full min-h-[150px] relative">
         <div className="absolute inset-0">
           {sampledData.length > 0 ? (
           <ResponsiveContainer width="100%" height="100%">
             <LineChart 
               data={sampledData} 
               margin={{ left: 0, right: 0, top: 5, bottom: 5 }}
               onMouseMove={(e: any) => {
                  // If not pinned, follow mouse
                  if (pinnedIndex === null) {
                     if (e && e.activePayload && e.activePayload.length > 0) {
                       setHoveredValue(e.activePayload[0].value as number);
                     }
                  }
               }}
               onMouseLeave={() => {
                 if (pinnedIndex === null) setHoveredValue(null);
               }}
               onClick={handleChartClick}
             >
               <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
               <XAxis dataKey="timeElapsed" hide />
               
               <YAxis 
                 yAxisId="left" 
                 stroke={yAxisConfig?.left?.color || '#94a3b8'} 
                 fontSize={10} 
                 width={35}
                 tickFormatter={(val) => Number(val).toFixed(0)}
                 domain={getDomain(yAxisConfig?.left)}
               />

               {yAxisConfig?.right && (
                 <YAxis 
                   yAxisId="right" 
                   orientation="right" 
                   stroke={yAxisConfig.right.color} 
                   fontSize={10} 
                   width={40}
                   tickFormatter={(val) => (Number(val)/1000).toFixed(1) + 'k'}
                   domain={getDomain(yAxisConfig.right)} 
                 />
               )}
               
               <Tooltip 
                 content={<CustomTooltip />} 
                 cursor={{ stroke: '#fff', strokeWidth: 1, strokeDasharray: '3 3', opacity: 0.5 }} 
                 isAnimationActive={false}
                 // @ts-ignore
                 active={pinnedIndex !== null ? true : undefined}
                 // @ts-ignore
                 position={pinnedIndex !== null ? undefined : undefined} 
                 // @ts-ignore
                 activeIndex={pinnedIndex !== null ? pinnedIndex : undefined}
               />
               
               {hoveredValue !== null && (
                  <ReferenceLine 
                    yAxisId="left" 
                    y={hoveredValue} 
                    stroke="#fff" 
                    strokeDasharray="3 3" 
                    strokeWidth={1}
                    opacity={0.5}
                  />
               )}

               {/* -------------------- ALTITUDE LINES -------------------- */}
               {hasAltitude && showRefLines && thresholds && (
                 <ReferenceLine 
                    yAxisId="left" 
                    y={thresholds.maxAltitude} 
                    stroke="#f97316" 
                    strokeDasharray="10 5" 
                    opacity={0.7}
                 >
                    <Label 
                        value={`Target: ${thresholds.maxAltitude}${unit}`} 
                        // @ts-ignore
                        position={getPosition(thresholds.maxAltitude, Math.max(stats.maxVal, thresholds.maxAltitude), true)} 
                        fill="#f97316" 
                        fontSize={10} 
                        fontWeight="bold"
                    />
                 </ReferenceLine>
               )}

               {hasAltitude && showRefLines && stats.apogee > 5 && (
                 <ReferenceLine 
                    yAxisId="left" 
                    y={stats.apogee} 
                    stroke="#f43f5e" 
                    strokeDasharray="5 2" 
                    opacity={0.8}
                 >
                    <Label 
                        value={`Apogee: ${stats.apogee.toFixed(1)}${unit}`} 
                        // @ts-ignore
                        position={getPosition(stats.apogee, stats.maxVal, false)}
                        fill="#f43f5e" 
                        fontSize={10} 
                        fontWeight="bold" 
                    />
                 </ReferenceLine>
               )}

               {/* -------------------- THERMAL LINES -------------------- */}
               {hasTemperature && showRefLines && Object.entries(stats.maxTemps).map(([key, val]) => {
                  // Determine overlap avoidance: Temp Left, Thermistor Right
                  const isThermistor = key === 'thermistorTemp';
                  // Calculate dynamic top/bottom position
                  // @ts-ignore
                  const position = getPosition(val, stats.maxVal, isThermistor);

                  return (
                    <ReferenceLine
                      key={key}
                      yAxisId="left"
                      y={val}
                      stroke={isThermistor ? '#ef4444' : '#fbbf24'}
                      strokeDasharray="3 3"
                      opacity={0.6}
                    >
                      <Label 
                        value={`Max ${isThermistor ? 'Th' : 'T'}: ${val.toFixed(1)}${unit}`} 
                        // @ts-ignore
                        position={position} 
                        fill={isThermistor ? '#ef4444' : '#fbbf24'} 
                        fontSize={9} 
                        fontWeight="bold"
                      />
                    </ReferenceLine>
                  );
               })}

               <Brush 
                 dataKey="timeElapsed" 
                 height={15} 
                 stroke="#334155" 
                 fill="#0f172a" 
                 tickFormatter={() => ""} 
               />
               
               {lines.map((line) => (
                 <Line 
                   key={line.key}
                   // @ts-ignore
                   hide={hiddenSeries.includes(line.key as string)}
                   yAxisId={line.yAxisId || 'left'}
                   type="monotone" 
                   dataKey={line.key} 
                   name={line.name}
                   stroke={line.color} 
                   strokeWidth={line.strokeWidth || 2} 
                   dot={line.dot || false} 
                   strokeDasharray={line.strokeDasharray}
                   isAnimationActive={false} 
                   animationDuration={0}
                 />
               ))}
             </LineChart>
           </ResponsiveContainer>
           ) : (
               <div className="flex items-center justify-center h-full text-slate-600 text-xs italic">
                   No data points in this range
               </div>
           )}
         </div>
       </div>

       {/* Interactive Legend */}
       <div className="flex items-center gap-3 mt-1 px-1 flex-wrap justify-end">
          {lines.map((line) => {
             const isHidden = hiddenSeries.includes(line.key as string);
             return (
               <button 
                 key={line.key as string}
                 onClick={() => toggleSeries(line.key as string)}
                 className={`flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-sm border transition-all ${
                   isHidden 
                   ? 'bg-slate-900/50 text-slate-600 border-slate-800 opacity-75' 
                   : 'bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700 shadow-sm'
                 }`}
                 title={isHidden ? `Click to Show ${line.name}` : `Click to Hide ${line.name}`}
               >
                 <div 
                   className={`w-2 h-2 rounded-full transition-colors ${isHidden ? 'bg-slate-600' : ''}`}
                   style={{ backgroundColor: isHidden ? undefined : line.color }} 
                 />
                 <span className={`${isHidden ? 'line-through text-slate-500' : 'font-medium'}`}>{line.name}</span>
                 {isHidden ? <EyeOff className="w-2.5 h-2.5 opacity-50" /> : <Eye className="w-2.5 h-2.5 text-indigo-400" />}
               </button>
             );
          })}
       </div>
    </div>
  );
});
