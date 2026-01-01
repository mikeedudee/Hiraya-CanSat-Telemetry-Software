import React, { useEffect } from 'react';
import { X, AlertTriangle, CheckCircle, Info, HelpCircle, Trash2, MousePointerClick, Move3d, Map, Terminal, Scale, ShieldAlert, Users, Code, Copyright, Cpu, Settings, FileText, Activity, Zap, Sparkles, Gauge, Lock } from 'lucide-react';
import { ToastMessage } from '../types';
import HirayaLogo from '../src/assets/Hiraya Logo Circular.png';

// --- Toast Notification Component ---

interface ToastContainerProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  return (
    <div className="fixed bottom-10 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div 
          key={toast.id}
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-sm shadow-[0_0_15px_rgba(0,0,0,0.5)] border backdrop-blur-md min-w-[300px] animate-in slide-in-from-right-10 fade-in duration-300 clip-corner-br ${
            toast.type === 'error' ? 'bg-rose-950/80 border-rose-800 text-rose-200' :
            toast.type === 'success' ? 'bg-emerald-950/80 border-emerald-800 text-emerald-200' :
            'bg-slate-900/90 border-slate-700 text-slate-200'
          }`}
        >
          {toast.type === 'error' && <AlertTriangle className="w-5 h-5 text-rose-500" />}
          {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-500" />}
          {toast.type === 'info' && <Info className="w-5 h-5 text-indigo-500" />}
          
          <div className="flex-1 text-xs font-medium font-mono">{toast.message}</div>
          
          <button onClick={() => onRemove(toast.id)} className="opacity-60 hover:opacity-100 transition-opacity" title="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

// --- Confirmation Modal ---

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  isDestructive?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ 
  isOpen, title, message, onConfirm, onCancel, confirmText = "Confirm", isDestructive = false 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4 transition-all duration-300">
      <div className="bg-slate-950/90 backdrop-blur-md border border-slate-800 shadow-[0_0_30px_rgba(0,0,0,0.8)] w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 clip-corner-tl tech-border">
        <div className="p-5 relative">
           <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-full ${isDestructive ? 'bg-rose-500/10' : 'bg-indigo-500/10'}`}>
                <AlertTriangle className={`w-6 h-6 ${isDestructive ? 'text-rose-500' : 'text-indigo-500'}`} />
              </div>
              <h3 className="text-lg font-bold text-white font-space uppercase tracking-wide">{title}</h3>
           </div>
           <p className="text-sm text-slate-400 leading-relaxed mb-6 font-mono text-xs">
             {message}
           </p>
           <div className="flex justify-end gap-3">
             <button 
               onClick={onCancel}
               className="px-4 py-2 rounded-sm bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 text-xs font-bold uppercase transition-colors"
               title="Cancel Action"
             >
               Cancel
             </button>
             <button 
               onClick={onConfirm}
               className={`px-4 py-2 rounded-sm text-white text-xs font-bold uppercase transition-colors shadow-lg clip-corner-br ${
                 isDestructive ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/20' : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/20'
               }`}
               title="Confirm Action"
             >
               {confirmText}
             </button>
           </div>
        </div>
      </div>
    </div>
  );
};

// --- Help/User Guide Modal ---

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4 transition-all duration-300">
       <div className="bg-slate-950/85 backdrop-blur-md border border-slate-800 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col clip-corner-tl tech-border">
          
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/50 sticky top-0 z-10 backdrop-blur-md">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 font-space uppercase tracking-wider">
              <HelpCircle className="w-5 h-5 text-cyan-400" /> Operational User Guide
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors" title="Close Help">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-8 text-sm text-slate-300">
             
             {/* --- NEW SECTION: HARDWARE ACCELERATION --- */}
             <section className="space-y-4">
               <h3 className="text-indigo-400 font-bold uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2 font-tech">
                 <Cpu className="w-4 h-4" /> Hardware Acceleration Profiles
               </h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Calculation Mode */}
                  <div className="bg-slate-900/40 p-3 rounded-sm border border-slate-800">
                      <div className="font-bold text-slate-200 text-xs mb-2 flex items-center gap-2"><Activity className="w-3.5 h-3.5 text-indigo-400"/> Calculation Mode (Logic)</div>
                      <ul className="space-y-2 text-[11px] text-slate-400 leading-normal list-disc pl-4">
                         <li><strong>CPU (Eco):</strong> Throttles processing to 10Hz (100ms). Saves battery on laptops. Ideal for long-duration flights.</li>
                         <li><strong>Hybrid (Default):</strong> Throttles to 30Hz. Balanced performance.</li>
                         <li><strong>GPU (Performance):</strong> Unlocked (0ms). Processes every packet instantly. Requires mains power or high-perf device.</li>
                      </ul>
                  </div>
                  {/* Graphics Mode */}
                  <div className="bg-slate-900/40 p-3 rounded-sm border border-slate-800">
                      <div className="font-bold text-slate-200 text-xs mb-2 flex items-center gap-2"><Move3d className="w-3.5 h-3.5 text-purple-400"/> Graphics Mode (Visuals)</div>
                      <ul className="space-y-2 text-[11px] text-slate-400 leading-normal list-disc pl-4">
                         <li><strong>CPU:</strong> Disables Glassmorphism/Blur. Uses low-power WebGL. Best for integrated graphics.</li>
                         <li><strong>GPU:</strong> Enables High-Perf WebGL (RTX/Dedicated). Turns on Anti-Aliasing, Shadows, and full UI Blur effects.</li>
                      </ul>
                  </div>
               </div>
             </section>

             {/* --- NEW SECTION: VISUAL CALIBRATION --- */}
             <section className="space-y-4">
               <h3 className="text-amber-400 font-bold uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2 font-tech">
                 <Sparkles className="w-4 h-4" /> Display & Environment
               </h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <p className="text-xs text-slate-400 leading-relaxed">
                      The Ground Station is designed for variable lighting conditions. Use the <strong>Display & Calibration</strong> settings to adjust visibility.
                   </p>
                   <ul className="space-y-1.5 text-xs text-slate-400">
                        <li className="flex items-start gap-2"><Zap className="w-3 h-3 text-amber-400 mt-0.5"/> <span><strong>Night Vision:</strong> Applies a global red-shift filter to preserve scotopic vision during night ops.</span></li>
                        <li className="flex items-start gap-2"><Zap className="w-3 h-3 text-cyan-400 mt-0.5"/> <span><strong>Ambient Glow:</strong> Provides peripheral status cues. Can be set to "Dynamic" to verify app responsiveness.</span></li>
                        <li className="flex items-start gap-2"><Zap className="w-3 h-3 text-indigo-400 mt-0.5"/> <span><strong>Post-Processing:</strong> Sliders for Global Brightness, Contrast, and Saturation to combat screen glare.</span></li>
                   </ul>
               </div>
             </section>

             {/* DATA PROTOCOL SECTION */}
             <section className="space-y-4">
               <h3 className="text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2 font-tech">
                 <Terminal className="w-4 h-4" /> Data Stream Protocol
               </h3>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-slate-200 font-bold mb-2 flex items-center gap-2 text-xs uppercase">
                        <Settings className="w-3.5 h-3.5 text-indigo-400" /> Delimiters & Separators
                    </h4>
                    <p className="text-slate-400 text-xs leading-relaxed mb-3">
                        The application allows for custom data delimiters. The default is <strong>Comma (,)</strong>, but you can change this in <span className="text-white font-bold">Settings</span>.
                    </p>
                    <div className="bg-slate-900/50 border border-slate-800 rounded-sm p-2 space-y-2">
                        <div className="text-[10px] text-slate-500 font-bold uppercase">Supported Delimiters</div>
                        <div className="grid grid-cols-3 gap-2 text-xs font-mono text-emerald-400">
                            <span className="bg-black/40 px-1 rounded-sm">Comma (,)</span>
                            <span className="bg-black/40 px-1 rounded-sm">Semi (;)</span>
                            <span className="bg-black/40 px-1 rounded-sm">Colon (:)</span>
                            <span className="bg-black/40 px-1 rounded-sm">Pipe (|)</span>
                            <span className="bg-black/40 px-1 rounded-sm">Tab (\t)</span>
                            <span className="bg-black/40 px-1 rounded-sm">Space</span>
                        </div>
                    </div>
                  </div>

                  <div>
                     <h4 className="text-slate-200 font-bold mb-2 flex items-center gap-2 text-xs uppercase">
                        <Code className="w-3.5 h-3.5 text-rose-400" /> Embedded Code Example
                     </h4>
                     <div className="bg-black/40 border border-slate-800 p-3 rounded-sm font-mono text-[10px] overflow-x-auto">
<pre className="text-slate-400">
<span className="text-purple-400">void</span> <span className="text-blue-400">loop</span>() {'{'}
  <span className="text-slate-500">// Example for Comma Separator</span>
  Serial.<span className="text-yellow-300">print</span>(pressure);
  Serial.<span className="text-yellow-300">print</span>(<span className="text-emerald-300">","</span>);
  Serial.<span className="text-yellow-300">print</span>(temperature);
  Serial.<span className="text-yellow-300">print</span>(<span className="text-emerald-300">","</span>);
  Serial.<span className="text-yellow-300">print</span>(altitude);
  <span className="text-slate-500">// ... other fields ...</span>
  Serial.<span className="text-yellow-300">println</span>(); <span className="text-slate-500">// Must end with Newline</span>
  <span className="text-yellow-300">delay</span>(30); <span className="text-slate-500">// Hybrid/GPU Mode Friendly</span>
{'}'}
</pre>
                     </div>
                  </div>
               </div>

               <div className="bg-slate-900/30 border border-slate-800 p-4 rounded-sm">
                  <div className="text-xs text-slate-500 font-bold uppercase mb-2">Formatting Rules (Do's & Don'ts)</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <ul className="space-y-1.5 text-xs text-slate-400">
                        <li className="flex items-start gap-2 text-emerald-300"><CheckCircle className="w-3 h-3 shrink-0 mt-0.5"/> <span>Ensure the number of fields matches your Settings &gt; CSV Order.</span></li>
                        <li className="flex items-start gap-2 text-emerald-300"><CheckCircle className="w-3 h-3 shrink-0 mt-0.5"/> <span>Use <code>0</code> or <code>0.0</code> for missing sensor data, never leave empty.</span></li>
                        <li className="flex items-start gap-2 text-emerald-300"><CheckCircle className="w-3 h-3 shrink-0 mt-0.5"/> <span>Terminate every packet with a newline character <code>\n</code>.</span></li>
                     </ul>
                     <ul className="space-y-1.5 text-xs text-slate-400">
                        <li className="flex items-start gap-2 text-rose-300"><AlertTriangle className="w-3 h-3 shrink-0 mt-0.5"/> <span>Do NOT include labels (e.g. "Temp:20"). Send raw numbers only.</span></li>
                        <li className="flex items-start gap-2 text-rose-300"><AlertTriangle className="w-3 h-3 shrink-0 mt-0.5"/> <span>Do NOT mix debug messages (e.g. "Initializing...") in the same stream.</span></li>
                        <li className="flex items-start gap-2 text-rose-300"><AlertTriangle className="w-3 h-3 shrink-0 mt-0.5"/> <span>Avoid variable packet lengths. Keep the structure consistent.</span></li>
                     </ul>
                  </div>
               </div>
             </section>

             {/* SAFETY & LIMITS */}
             <section className="space-y-4">
               <h3 className="text-rose-400 font-bold uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2 font-tech">
                 <ShieldAlert className="w-4 h-4" /> Safety & Limits
               </h3>
               <div className="bg-slate-900/30 border border-slate-800 p-4 rounded-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div>
                        <h4 className="text-xs font-bold text-white uppercase mb-2">New Metrics</h4>
                        <ul className="space-y-2 text-xs text-slate-400">
                            <li className="flex items-center gap-2"><span className="text-indigo-400 font-bold">Max Q:</span> Maximum Dynamic Pressure (Aerodynamic stress). Defined in kPa.</li>
                            <li className="flex items-center gap-2"><span className="text-indigo-400 font-bold">G-Force:</span> Derived structural load based on velocity changes. (1G = 9.8m/s²).</li>
                            <li className="flex items-center gap-2"><span className="text-indigo-400 font-bold">Density:</span> Air density tracking for parachute effectiveness.</li>
                        </ul>
                     </div>
                     <div>
                        <h4 className="text-xs font-bold text-white uppercase mb-2">Alert Logic</h4>
                        <p className="text-[11px] text-slate-400 leading-normal">
                            If a telemetry value exceeds the <strong>MAX</strong> or falls below the <strong>MIN</strong> threshold set in Settings, the corresponding dashboard card will flash RED/ORANGE and pulse to alert the operator.
                        </p>
                     </div>
                  </div>
               </div>
             </section>

             {/* PERFORMANCE CONTROL */}
             <section className="space-y-4">
               <h3 className="text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2 font-tech">
                 <Cpu className="w-4 h-4" /> Performance & Throttling
               </h3>
               <p className="text-xs text-slate-400 mb-2">
                  High-frequency telemetry (e.g., &gt;50Hz) can overwhelm browser rendering. Use the built-in controls to manage load.
               </p>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-900/50 p-3 rounded-sm border border-slate-800">
                      <div className="font-bold text-slate-200 text-xs mb-1 flex items-center gap-2"><Activity className="w-3 h-3 text-emerald-400"/> Stream Throttle</div>
                      <p className="text-[11px] text-slate-400 leading-normal">
                         Located in the header when connected. This sets a minimum delay between processing packets. 
                         <br/><br/>
                         <strong>Recommended:</strong> Set to <code>100ms</code> if the UI feels sluggish during high-speed data transmission. Set to <code>0ms</code> for real-time precision.
                      </p>
                  </div>
                  <div className="bg-slate-900/50 p-3 rounded-sm border border-slate-800">
                      <div className="font-bold text-slate-200 text-xs mb-1 flex items-center gap-2"><FileText className="w-3 h-3 text-indigo-400"/> Data Density</div>
                      <p className="text-[11px] text-slate-400 leading-normal">
                         Located in Settings. This controls how many points are rendered on the charts.
                         <br/><br/>
                         <strong>High:</strong> Renders every point. <br/>
                         <strong>Low:</strong> Renders every 5th point (Greatly improves performance for long sessions).
                      </p>
                  </div>
               </div>
             </section>

             {/* TROUBLESHOOTING */}
             <section className="space-y-4">
                <h3 className="text-amber-400 font-bold uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2 font-tech">
                 <ShieldAlert className="w-4 h-4" /> Troubleshooting
               </h3>
               <div className="overflow-hidden rounded-sm border border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/80 text-slate-400 font-bold uppercase">
                        <tr>
                            <th className="p-3 border-b border-slate-800">Symptom</th>
                            <th className="p-3 border-b border-slate-800">Probable Cause</th>
                            <th className="p-3 border-b border-slate-800">Solution</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                        <tr className="bg-slate-900/30">
                            <td className="p-3">Garbage Characters</td>
                            <td className="p-3 text-slate-500">Baud Rate Mismatch</td>
                            <td className="p-3">Ensure App Baud Rate matches `Serial.begin(rate)` in firmware.</td>
                        </tr>
                        <tr>
                            <td className="p-3">Values are wrong / 0</td>
                            <td className="p-3 text-slate-500">CSV Order Mismatch</td>
                            <td className="p-3">Go to Settings and drag-and-drop fields to match your print order.</td>
                        </tr>
                        <tr className="bg-slate-900/30">
                            <td className="p-3">"No Port Selected"</td>
                            <td className="p-3 text-slate-500">Driver / Permissions</td>
                            <td className="p-3">Check USB cable. Ensure drivers (CH340/CP2102) are installed. Use the Device Manager to check.</td>
                        </tr>
                        <tr>
                            <td className="p-3">Parsing Errors</td>
                            <td className="p-3 text-slate-500">Wrong Delimiter</td>
                            <td className="p-3">Check if your code uses commas, tabs, or spaces. Update Settings &gt; Separator.</td>
                        </tr>
                    </tbody>
                  </table>
               </div>
             </section>

             {/* LICENSE SECTION (RESTORED RED/ROSE STYLING) */}
             <section className="mt-8 pt-6 border-t border-slate-800">
               <h3 className="text-rose-500 font-bold uppercase tracking-wider mb-3 flex items-center gap-2 font-tech">
                 <Scale className="w-4 h-4" /> Legal & Licensing
               </h3>
               <div className="bg-rose-950/10 border border-rose-900/50 p-4 rounded-sm text-xs text-rose-200/80 text-justify leading-relaxed">
                 <p className="mb-2 font-bold flex items-center gap-1.5"><ShieldAlert className="w-3 h-3"/> STRICTLY PROPRIETARY</p>
                 <p>
                   Copyright © {new Date().getFullYear()} Francis Mike John Camogao. All Rights Reserved.
                 </p>
                 <p className="mt-2">
                   This software, "HIRAYA Ground Station", including its source code, architecture, and design, or any assets of this software is the exclusive intellectual property of <strong>Francis Mike John Camogao</strong>.
                 </p>
                 <p className="mt-2">
                   <strong>Competition License:</strong> The HIRAYA Team is granted a limited, non-exclusive, non-transferable license to use this software solely for the duration and purposes of the <strong>2026 Rocket and CanSatellite Competition</strong> (Primary and Secondary Missions).
                 </p>
                 <p className="mt-2">
                   Unauthorized commercial distribution, sub-licensing, or claiming ownership of this software by any other party is strictly prohibited.
                 </p>
               </div>
             </section>

             <div className="mt-8 text-center text-[10px] text-slate-500 font-mono">
               HIRAYA Telemetry System v7.0 • Local Processing Only
             </div>
          </div>
       </div>
    </div>
  );
};

// --- About / Team Modal ---

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4 animate-in fade-in duration-200 transition-all">
       <div className="bg-slate-950/85 backdrop-blur-md border border-slate-800 shadow-[0_0_50px_rgba(79,70,229,0.15)] w-full max-w-md overflow-hidden relative tech-border clip-corner-br">
          
          <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors z-10" title="Close About">
              <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-center pt-10 pb-6 px-6 bg-gradient-to-b from-indigo-950/20 to-slate-950/50">
             <div className="w-24 h-24 bg-slate-900 rounded-full border-4 border-slate-800 flex items-center justify-center mb-4 shadow-xl overflow-hidden p-2">
                <img 
                    src={HirayaLogo}
                    alt="Hiraya Logo" 
                    className="w-full h-full object-contain"
                />
             </div>
             <h2 className="text-2xl font-black tracking-widest text-white font-space">HIRAYA</h2>
             <span className="text-indigo-400 font-mono text-xs uppercase tracking-[0.2em] mt-1">Rocket and CanSatellite Team</span>
          </div>

          <div className="px-8 pb-8 space-y-6">
             <div className="text-center">
                <p className="text-sm text-slate-400 leading-relaxed italic">
                   "Hiraya Manawari" — May your dreams come true.
                </p>
             </div>

             <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 border-b border-slate-800 pb-1 font-tech">
                   <Code className="w-3 h-3" /> The Team
                </h3>
                <div className="flex items-center gap-3 p-2 rounded-sm bg-slate-900/50">
                   <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                      <Users className="w-4 h-4" />
                   </div>
                   <div>
                      <div className="text-sm font-bold text-slate-200">Francis Mike John Camogao</div>
                      <div className="text-[10px] text-slate-500 uppercase font-mono">Lead Software Engineer • Flight System Engineer • Structure</div>
                   </div>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-sm bg-slate-900/50">
                   <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                      <Users className="w-4 h-4" />
                   </div>
                   <div>
                      <div className="text-sm font-bold text-slate-200">Joevic Torrecampo</div>
                      <div className="text-[10px] text-slate-500 uppercase font-mono">Lead Payload Engineer • Propulsion and Deployment • Structure</div>
                   </div>
                </div>
             </div>

             <div className="space-y-2">
                 <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 border-b border-slate-800 pb-1 font-tech">
                   <Copyright className="w-3 h-3" /> License
                </h3>
                <div className="text-[10px] text-slate-500 text-justify leading-tight">
                   <p className="mb-2">
                      This software is the intellectual property of <strong>Francis Mike John Camogao</strong>.
                   </p>
                   <p>
                      Licensed for use by the HIRAYA Team for the 2026 Rocket and CanSatellite Competition. All other rights reserved.
                   </p>
                </div>
             </div>

          </div>
       </div>
    </div>
  );
};