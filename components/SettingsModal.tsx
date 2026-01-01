import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { X, Save, BarChart, GripVertical, FileSpreadsheet, ZoomIn, Plus, Trash2, Ban, Download, RotateCcw, ListPlus, Eraser, Upload, Timer, Settings2, Gauge, Thermometer, ArrowUpDown, Cloud, ChevronDown, Split, AlertTriangle, Wind, Monitor, Layers, Box, Zap, Globe, Sparkles, Cpu, CircuitBoard, Gamepad2, Plane, Rocket, Anchor, Activity, Lightbulb, Eye } from 'lucide-react';
import { AppSettings, GraphConfig, CsvField, SpeedUnit, TempUnit, AltUnit, DensityUnit, GraphicsSettings, HardwareMode, SimulationPreset } from '../types';
import { FIELD_LABELS, SKIP_FIELD, DEFAULT_SETTINGS } from '../constants';
import { ConfirmModal } from './UIElements';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdate: (newSettings: AppSettings) => void;
}

// Helper for stable IDs
const generateId = () => Math.random().toString(36).substring(2, 9);

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onUpdate }) => {
  // Local state for stable Drag & Drop keys
  const [localItems, setLocalItems] = useState<{ id: string; field: CsvField }[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  
  // Local state for Confirmation Modal
  const [confirmModal, setConfirmModal] = useState<{
     isOpen: boolean;
     title: string;
     message: string;
     onConfirm: () => void;
     isDestructive?: boolean;
     confirmText?: string;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize local state when modal opens
  useEffect(() => {
    if (isOpen && !isInitialized) {
      setLocalItems(settings.csvOrder.map(f => ({ id: generateId(), field: f })));
      setIsInitialized(true);
    }
    if (!isOpen) {
      setIsInitialized(false);
    }
  }, [isOpen, isInitialized, settings.csvOrder]);

  // Sync local changes to parent settings
  const syncToParent = useCallback((newItems: { id: string; field: CsvField }[]) => {
      const newOrder = newItems.map(i => i.field);
      onUpdate({ ...settings, csvOrder: newOrder });
  }, [settings, onUpdate]);

  const handleChange = (key: keyof AppSettings, field: keyof GraphConfig, value: any) => {
    onUpdate({
      ...settings,
      [key]: {
        // @ts-ignore
        ...settings[key],
        [field]: value
      }
    });
  };

  const handleDensityChange = (val: 'high' | 'medium' | 'low') => {
    onUpdate({ ...settings, density: val });
  };

  const handleZoomChange = (val: number) => {
    onUpdate({ ...settings, zoomSensitivity: val });
  };
  
  const handleSeparatorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdate({ ...settings, separator: e.target.value });
  };

  const handleSimIntervalChange = (val: number) => {
    onUpdate({ ...settings, simInterval: val });
  };

  const handleStreamThrottleChange = (val: number) => {
    onUpdate({ ...settings, streamThrottle: val });
  };

  const handleGraphicsChange = (key: keyof GraphicsSettings, value: any) => {
      onUpdate({
          ...settings,
          graphics: {
              ...settings.graphics,
              [key]: value
          }
      });
  };

  const handleHardwareChange = (type: 'calculation' | 'graphics', mode: HardwareMode) => {
      onUpdate({
          ...settings,
          hardware: {
              ...settings.hardware,
              [type]: mode
          }
      });
  };

  const handleSimPresetChange = (preset: SimulationPreset) => {
      onUpdate({ ...settings, simPreset: preset });
  }

  // --- UNIT CONVERSION HELPERS ---
  const convertValue = (val: number, type: 'speed' | 'temp' | 'alt' | 'density', from: string, to: string): number => {
      if (from === to) return val;

      // Convert to Base (SI: m/s, C, m, kg/m3)
      let base = val;
      if (type === 'speed') {
          if (from === 'km/h') base = val / 3.6;
          if (from === 'mph') base = val / 2.237;
          if (from === 'ft/s') base = val / 3.281;
      }
      if (type === 'temp') {
          if (from === '°F') base = (val - 32) * (5/9);
          if (from === 'K') base = val - 273.15;
      }
      if (type === 'alt') {
          if (from === 'ft') base = val / 3.281;
      }
      if (type === 'density') {
          if (from === 'lb/ft³') base = val / 0.0624;
      }

      // Convert Base to Target
      if (type === 'speed') {
          if (to === 'km/h') return base * 3.6;
          if (to === 'mph') return base * 2.237;
          if (to === 'ft/s') return base * 3.281;
      }
      if (type === 'temp') {
          if (to === '°F') return (base * 9/5) + 32;
          if (to === 'K') return base + 273.15;
      }
      if (type === 'alt') {
          if (to === 'ft') return base * 3.281;
      }
      if (type === 'density') {
          if (to === 'lb/ft³') return base * 0.0624;
      }

      return base;
  };

  // Unit Handlers with Threshold Adaptation
  const handleUnitChange = (type: keyof AppSettings['units'], newValue: string) => {
      const oldValue = settings.units[type];
      const newThresholds = { ...settings.thresholds };

      // Helper wrapper
      const cvt = (val: number, cat: 'speed' | 'temp' | 'alt' | 'density') => 
         parseFloat(convertValue(val, cat, oldValue, newValue).toFixed(2));

      if (type === 'speed') {
          newThresholds.maxSpeed = cvt(newThresholds.maxSpeed, 'speed');
          newThresholds.minSpeed = cvt(newThresholds.minSpeed, 'speed');
          newThresholds.maxVerticalSpeed = cvt(newThresholds.maxVerticalSpeed, 'speed');
          newThresholds.minVerticalSpeed = cvt(newThresholds.minVerticalSpeed, 'speed');
      }
      if (type === 'temperature') {
          newThresholds.maxTemperature = cvt(newThresholds.maxTemperature, 'temp');
          newThresholds.minTemperature = cvt(newThresholds.minTemperature, 'temp');
      }
      if (type === 'altitude') {
          newThresholds.maxAltitude = cvt(newThresholds.maxAltitude, 'alt');
          newThresholds.minAltitude = cvt(newThresholds.minAltitude, 'alt');
      }
      if (type === 'density') {
          newThresholds.maxDensity = cvt(newThresholds.maxDensity, 'density');
          newThresholds.minDensity = cvt(newThresholds.minDensity, 'density');
      }

      onUpdate({
          ...settings,
          units: {
              ...settings.units,
              [type]: newValue
          },
          thresholds: newThresholds
      });
  };

  // Threshold Handlers
  const handleThresholdChange = (key: keyof AppSettings['thresholds'], value: string) => {
      const numVal = parseFloat(value);
      onUpdate({
          ...settings,
          thresholds: {
              ...settings.thresholds,
              [key]: isNaN(numVal) ? 0 : numVal
          }
      });
  };

  const handleExportSettings = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(settings, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", "telemetry_settings.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };
  
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const text = event.target?.result as string;
            const importedSettings = JSON.parse(text);
            
            // Basic validation check
            if (importedSettings && Array.isArray(importedSettings.csvOrder)) {
                 onUpdate(importedSettings);
                 // Update local UI state for CSV list immediately
                 const newLocalItems = importedSettings.csvOrder.map((f: CsvField) => ({ id: generateId(), field: f }));
                 setLocalItems(newLocalItems);
                 alert("Settings loaded successfully.");
            } else {
                 alert("Invalid settings file format.");
            }
        } catch (err) {
            console.error(err);
            alert("Failed to parse settings file.");
        }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  const handleLoadDefaults = () => {
    setConfirmModal({
        isOpen: true,
        title: "Revert to Defaults?",
        message: "Are you sure you want to revert all settings to their default values? This action cannot be undone.",
        isDestructive: true,
        confirmText: "Revert",
        onConfirm: () => {
            // Deep copy default settings to ensure no reference issues
            const defaults = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
            onUpdate(defaults);
            // Force re-initialization of local state
            const newLocalItems = defaults.csvOrder.map((f: CsvField) => ({ id: generateId(), field: f }));
            setLocalItems(newLocalItems);
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
    });
  };

  // --- CSV Bulk Actions ---
  const handleRemoveAll = () => {
    if (localItems.length === 0) return;
    setConfirmModal({
        isOpen: true,
        title: "Clear Parser List?",
        message: "Are you sure you want to clear the entire parser list?",
        isDestructive: true,
        confirmText: "Clear All",
        onConfirm: () => {
            setLocalItems([]);
            syncToParent([]);
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
    });
  };

  const handleAddAll = () => {
    const currentFields = localItems.map(i => i.field);
    const allFields = Object.keys(FIELD_LABELS).filter(f => f !== SKIP_FIELD) as CsvField[];
    const missingFields = allFields.filter(f => !currentFields.includes(f));
    
    if (missingFields.length === 0) return;

    const newItems = missingFields.map(f => ({ id: generateId(), field: f }));
    const updatedList = [...localItems, ...newItems];
    setLocalItems(updatedList);
    syncToParent(updatedList);
  };


  // --- Drag and Drop Handlers ---
  const onDragStart = (e: React.DragEvent, id: string) => {
    setDraggedItemId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedItemId || draggedItemId === targetId) return;

    const sourceIndex = localItems.findIndex(i => i.id === draggedItemId);
    const targetIndex = localItems.findIndex(i => i.id === targetId);

    if (sourceIndex === -1 || targetIndex === -1) return;

    const newItems = [...localItems];
    const [movedItem] = newItems.splice(sourceIndex, 1);
    newItems.splice(targetIndex, 0, movedItem);

    setLocalItems(newItems);
  };

  const onDragEnd = () => {
    setDraggedItemId(null);
    syncToParent(localItems);
  };

  // --- CSV Configuration Logic ---
  
  const addField = (field: CsvField) => {
    const newItems = [...localItems, { id: generateId(), field }];
    setLocalItems(newItems);
    syncToParent(newItems);
  };

  const removeField = (id: string) => {
    const newItems = localItems.filter(i => i.id !== id);
    setLocalItems(newItems);
    syncToParent(newItems);
  };

  // Calculate unused fields
  const availableFields = useMemo(() => {
    const currentFields = localItems.map(i => i.field);
    const allFields = Object.keys(FIELD_LABELS).filter(f => f !== SKIP_FIELD) as CsvField[];
    return allFields.filter(f => !currentFields.includes(f));
  }, [localItems]);

  // Helper to render Min/Max inputs
  const renderThresholdInputs = (label: string, minKey: keyof AppSettings['thresholds'], maxKey: keyof AppSettings['thresholds']) => (
    <div className="flex items-center gap-2">
        <label className="text-[10px] font-bold font-tech uppercase text-slate-400 w-16">{label}</label>
        <div className="flex-1 flex gap-2">
            <div className="flex-1 relative">
                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] text-slate-600 font-bold">MIN</span>
                <input 
                    type="number"
                    step="any" 
                    value={settings.thresholds[minKey]} 
                    onChange={(e) => handleThresholdChange(minKey, e.target.value)}
                    className="w-full bg-slate-900 border-b border-slate-700 pl-8 pr-2 py-1 text-xs font-mono text-orange-400 focus:border-orange-500 outline-none transition-colors" 
                    title={`Set lower threshold for ${label}`}
                />
            </div>
            <div className="flex-1 relative">
                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] text-slate-600 font-bold">MAX</span>
                <input 
                    type="number"
                    step="any"
                    value={settings.thresholds[maxKey]} 
                    onChange={(e) => handleThresholdChange(maxKey, e.target.value)}
                    className="w-full bg-slate-900 border-b border-slate-700 pl-8 pr-2 py-1 text-xs font-mono text-rose-400 focus:border-rose-500 outline-none transition-colors" 
                    title={`Set upper threshold for ${label}`}
                />
            </div>
        </div>
    </div>
  );

  // Helper to render Hardware buttons
  const renderHardwareButtons = (type: 'calculation' | 'graphics', current: HardwareMode) => (
      <div className="flex bg-slate-950 rounded p-1 border border-slate-800">
          <button 
             onClick={() => handleHardwareChange(type, 'cpu')}
             className={`flex-1 py-1.5 px-2 rounded text-[9px] font-bold uppercase transition-all ${current === 'cpu' ? 'bg-indigo-900/50 text-indigo-200 shadow border border-indigo-500/30' : 'text-slate-500 hover:text-white'}`}
          >
              CPU
          </button>
          <button 
             onClick={() => handleHardwareChange(type, 'hybrid')}
             className={`flex-1 py-1.5 px-2 rounded text-[9px] font-bold uppercase transition-all ${current === 'hybrid' ? 'bg-indigo-900/50 text-indigo-200 shadow border border-indigo-500/30' : 'text-slate-500 hover:text-white'}`}
          >
              Hybrid
          </button>
          <button 
             onClick={() => handleHardwareChange(type, 'gpu')}
             className={`flex-1 py-1.5 px-2 rounded text-[9px] font-bold uppercase transition-all ${current === 'gpu' ? 'bg-indigo-900/50 text-indigo-200 shadow border border-indigo-500/30' : 'text-slate-500 hover:text-white'}`}
          >
              GPU
          </button>
      </div>
  );

  // Helper for Simulation Preset Button
  const renderSimOption = (id: SimulationPreset, label: string, icon: React.ReactNode, desc: string) => {
      const isActive = settings.simPreset === id;
      return (
          <button
            onClick={() => handleSimPresetChange(id)}
            className={`w-full text-left p-2 rounded-sm border mb-2 transition-all flex items-start gap-3 group relative overflow-hidden ${
                isActive 
                ? 'bg-emerald-900/30 border-emerald-500/50 shadow-lg' 
                : 'bg-slate-900/50 border-slate-800 hover:border-slate-600 hover:bg-slate-800'
            }`}
          >
              {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500"></div>}
              <div className={`p-2 rounded-sm ${isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-950 text-slate-500 group-hover:text-slate-300'}`}>
                  {icon}
              </div>
              <div className="flex-1">
                  <h5 className={`text-[10px] font-bold uppercase mb-0.5 ${isActive ? 'text-emerald-300' : 'text-slate-300'}`}>{label}</h5>
                  <p className="text-[9px] text-slate-500 leading-tight">{desc}</p>
              </div>
          </button>
      );
  };

  if (!isOpen) return null;

  const renderGraphConfig = (title: string, key: keyof AppSettings) => (
    <div className="mb-4 bg-slate-950/30 border border-slate-800 p-3 rounded">
      <h3 className="text-[10px] font-bold text-slate-400 uppercase mb-2 border-b border-slate-800 pb-1 font-tech tracking-wider">{title}</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[9px] text-slate-500 mb-0.5 uppercase">Color</label>
          <div className="flex items-center gap-2">
            {/* @ts-ignore */}
            <input 
                type="color" 
                // @ts-ignore
                value={settings[key].color}
                onChange={(e) => handleChange(key, 'color', e.target.value)}
                className="w-full h-5 bg-transparent border-0 p-0 cursor-pointer"
                title="Pick graph line color"
            />
            <label className="flex items-center gap-1.5 cursor-pointer select-none" title="Show individual data points on line">
                <input 
                type="checkbox" 
                // @ts-ignore
                checked={settings[key].showDots}
                onChange={(e) => handleChange(key, 'showDots', e.target.checked)}
                className="w-3 h-3 rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500"
                />
                <span className="text-[9px] text-slate-400">Dots</span>
            </label>
          </div>
        </div>
        <div>
          <div className="flex gap-2">
              <div className="flex-1">
                  <label className="block text-[9px] text-slate-500 mb-0.5 uppercase">Min</label>
                  <input 
                    type="text" 
                    // @ts-ignore
                    value={settings[key].yMin}
                    placeholder="auto"
                    onChange={(e) => handleChange(key, 'yMin', e.target.value)}
                    className="w-full bg-slate-900 border-b border-slate-700 px-1 py-0.5 text-[10px] text-white font-mono outline-none focus:border-indigo-500 transition-colors"
                  />
              </div>
              <div className="flex-1">
                  <label className="block text-[9px] text-slate-500 mb-0.5 uppercase">Max</label>
                  <input 
                    type="text" 
                     // @ts-ignore
                    value={settings[key].yMax}
                    placeholder="auto"
                    onChange={(e) => handleChange(key, 'yMax', e.target.value)}
                    className="w-full bg-slate-900 border-b border-slate-700 px-1 py-0.5 text-[10px] text-white font-mono outline-none focus:border-indigo-500 transition-colors"
                  />
              </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    // AETHER NOTE: Semi-transparent overlay with less blur to see background
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4 transition-all duration-300">
      
      {/* AETHER NOTE: Glassmorphism settings window */}
      <div className="bg-slate-950/85 backdrop-blur-md border border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.5)] w-full max-w-7xl h-[90vh] flex flex-col animate-in zoom-in-95 duration-200 clip-corner-tl tech-border">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800/50 bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-3">
              <div className="bg-indigo-500/10 p-2 rounded-sm border border-indigo-500/20">
                  <Settings2 className="w-5 h-5 text-indigo-400" /> 
              </div>
              <div>
                  <h2 className="text-lg font-bold text-white tracking-widest font-space uppercase">System Config</h2>
                  <p className="text-[10px] text-indigo-400 font-mono tracking-wider">PARAMETERS // PERSONALIZATION</p>
              </div>
          </div>

          <div className="flex items-center gap-4">
             {/* Toolbar Buttons */}
             <div className="hidden sm:flex items-center gap-1">
                <button 
                    onClick={handleLoadDefaults}
                    className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-800 rounded text-[10px] font-bold text-slate-400 hover:text-white transition-colors border border-transparent hover:border-slate-700"
                >
                    <RotateCcw className="w-3.5 h-3.5" /> DEFAULTS
                </button>
                <div className="w-px h-4 bg-slate-800 mx-1"></div>
                <button 
                    onClick={handleImportClick}
                    className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-800 rounded text-[10px] font-bold text-slate-400 hover:text-white transition-colors border border-transparent hover:border-slate-700"
                >
                    <Upload className="w-3.5 h-3.5" /> IMPORT
                </button>
                <button 
                    onClick={handleExportSettings}
                    className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-800 rounded text-[10px] font-bold text-slate-400 hover:text-white transition-colors border border-transparent hover:border-slate-700"
                >
                    <Download className="w-3.5 h-3.5" /> EXPORT
                </button>
             </div>

             <div className="w-px h-8 bg-slate-800"></div>

             <button 
                onClick={onClose}
                className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold uppercase clip-corner-br shadow-[0_0_15px_rgba(79,70,229,0.4)] text-xs tracking-wider transition-all hover:scale-105 active:scale-95"
             >
                <Save className="w-3.5 h-3.5" /> Save Changes
             </button>

             <button onClick={onClose} className="text-slate-500 hover:text-rose-400 transition-colors" title="Close">
                <X className="w-6 h-6" />
             </button>
          </div>
        </div>
        
        {/* Main Content - Split Pane Layout */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          
          {/* Hidden File Input for Import */}
          <input type="file" ref={fileInputRef} onChange={handleImportFile} accept=".json" className="hidden" />

          {/* LEFT SIDEBAR: VISUALS & PERFORMANCE */}
          <div className="w-full lg:w-[320px] xl:w-[350px] border-b lg:border-b-0 lg:border-r border-slate-800 bg-slate-950/50 overflow-y-auto custom-scrollbar p-6 flex flex-col gap-6 shrink-0">
              <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-[0.2em] border-b border-indigo-900/30 pb-2 mb-[-10px] flex items-center gap-2 font-space">
                  <Monitor className="w-4 h-4" /> Visuals & Performance
              </h3>

              {/* HARDWARE ACCELERATION */}
              <div className="bg-slate-900/30 border border-slate-800 p-4 rounded-sm">
                 <h4 className="text-[11px] font-bold text-emerald-400 uppercase mb-3 flex items-center gap-2 font-tech tracking-wider">
                    <CircuitBoard className="w-3.5 h-3.5" /> Hardware Acceleration
                 </h4>
                 <div className="space-y-4">
                     <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Calculation Mode</label>
                            <span className="text-[9px] text-indigo-400 font-mono">{settings.hardware.calculation.toUpperCase()}</span>
                        </div>
                        {renderHardwareButtons('calculation', settings.hardware.calculation)}
                     </div>
                     <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Graphics Mode</label>
                            <span className="text-[9px] text-indigo-400 font-mono">{settings.hardware.graphics.toUpperCase()}</span>
                        </div>
                        {renderHardwareButtons('graphics', settings.hardware.graphics)}
                     </div>
                 </div>
              </div>

              {/* GRAPHICS & POST-PROCESSING */}
              <div className="bg-slate-900/30 border border-slate-800 p-4 rounded-sm">
                 <h4 className="text-[11px] font-bold text-amber-400 uppercase mb-3 flex items-center gap-2 font-tech tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" /> Display & Calibration
                 </h4>
                 
                 <div className="space-y-4">
                    {/* Post-Processing Sliders */}
                    <div className="space-y-3 pb-3 border-b border-slate-800">
                        <div>
                            <div className="flex justify-between mb-1">
                                <label className="text-[9px] text-slate-500 font-bold uppercase">Brightness</label>
                                <span className="text-[9px] text-amber-400 font-mono">{(settings.graphics.globalBrightness * 100).toFixed(0)}%</span>
                            </div>
                            <input 
                                type="range" min="0.5" max="1.5" step="0.05"
                                value={settings.graphics.globalBrightness}
                                onChange={(e) => handleGraphicsChange('globalBrightness', parseFloat(e.target.value))}
                                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                            />
                        </div>
                        <div>
                            <div className="flex justify-between mb-1">
                                <label className="text-[9px] text-slate-500 font-bold uppercase">Contrast</label>
                                <span className="text-[9px] text-amber-400 font-mono">{(settings.graphics.globalContrast * 100).toFixed(0)}%</span>
                            </div>
                            <input 
                                type="range" min="0.5" max="1.5" step="0.05"
                                value={settings.graphics.globalContrast}
                                onChange={(e) => handleGraphicsChange('globalContrast', parseFloat(e.target.value))}
                                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                            />
                        </div>
                        <div>
                            <div className="flex justify-between mb-1">
                                <label className="text-[9px] text-slate-500 font-bold uppercase">Saturation</label>
                                <span className="text-[9px] text-amber-400 font-mono">{(settings.graphics.globalSaturation * 100).toFixed(0)}%</span>
                            </div>
                            <input 
                                type="range" min="0" max="2" step="0.1"
                                value={settings.graphics.globalSaturation}
                                onChange={(e) => handleGraphicsChange('globalSaturation', parseFloat(e.target.value))}
                                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                            />
                        </div>
                    </div>

                    {/* Night Vision Toggle */}
                    <label className="flex items-center justify-between p-2 rounded-sm bg-slate-950 border border-slate-800 cursor-pointer hover:border-rose-900 transition-colors group">
                        <span className="text-[10px] font-bold text-rose-400 group-hover:text-rose-300 uppercase flex items-center gap-2">
                            <Eye className="w-3 h-3" /> Night Vision (Red Shift)
                        </span>
                        <input 
                            type="checkbox" 
                            checked={settings.graphics.nightVisionMode} 
                            onChange={(e) => handleGraphicsChange('nightVisionMode', e.target.checked)} 
                            className="w-3.5 h-3.5 accent-rose-500 rounded-sm" 
                        />
                    </label>

                    {/* UI Effects Toggles */}
                    <div className="grid grid-cols-2 gap-2">
                        <label className="flex items-center justify-between p-2 rounded-sm bg-slate-950 border border-slate-800 cursor-pointer">
                            <span className="text-[9px] font-bold text-slate-400 uppercase">Glass Blur</span>
                            <input type="checkbox" checked={settings.graphics.glassBlur} onChange={(e) => handleGraphicsChange('glassBlur', e.target.checked)} className="w-3 h-3 accent-indigo-500" />
                        </label>
                        <label className="flex items-center justify-between p-2 rounded-sm bg-slate-950 border border-slate-800 cursor-pointer">
                            <span className="text-[9px] font-bold text-slate-400 uppercase">UI Anim</span>
                            <input type="checkbox" checked={settings.graphics.animations} onChange={(e) => handleGraphicsChange('animations', e.target.checked)} className="w-3 h-3 accent-indigo-500" />
                        </label>
                    </div>
                 </div>
              </div>

              {/* 3D RENDERING ENGINE */}
              <div className="bg-slate-900/30 border border-slate-800 p-4 rounded-sm">
                 <h4 className="text-[11px] font-bold text-indigo-400 uppercase mb-3 flex items-center gap-2 font-tech tracking-wider">
                    <Box className="w-3.5 h-3.5" /> 3D Rendering Engine
                 </h4>
                 <div className="space-y-4">
                     {/* Anti-Aliasing */}
                     <label className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Anti-Aliasing (MSAA)</span>
                        <input 
                            type="checkbox" 
                            checked={settings.graphics.antialiasing} 
                            onChange={(e) => handleGraphicsChange('antialiasing', e.target.checked)} 
                            className="w-3.5 h-3.5 accent-indigo-500" 
                        />
                     </label>

                     {/* Shadow Quality */}
                     <div>
                        <div className="flex justify-between mb-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Shadow Quality</label>
                            <span className="text-[9px] text-indigo-400 font-mono uppercase">{settings.graphics.shadowQuality}</span>
                        </div>
                        <div className="flex bg-slate-950 rounded-sm p-1 border border-slate-800">
                            {['off', 'low', 'high'].map(q => (
                                <button
                                    key={q}
                                    onClick={() => handleGraphicsChange('shadowQuality', q)}
                                    className={`flex-1 py-1 text-[9px] font-bold uppercase rounded-sm transition-colors ${settings.graphics.shadowQuality === q ? 'bg-indigo-900/50 text-indigo-300' : 'text-slate-500 hover:text-white'}`}
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                     </div>

                     {/* Render Resolution */}
                     <div>
                        <div className="flex justify-between mb-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Render Scale</label>
                            <span className="text-[9px] text-indigo-400 font-mono">{(settings.graphics.renderResolution * 100).toFixed(0)}%</span>
                        </div>
                        <input 
                            type="range" min="0.5" max="2.0" step="0.25"
                            value={settings.graphics.renderResolution}
                            onChange={(e) => handleGraphicsChange('renderResolution', parseFloat(e.target.value))}
                            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                        <p className="text-[8px] text-slate-600 mt-1 italic">
                            *Lower for performance, higher for sharpness. 200% uses Super-Sampling.
                        </p>
                     </div>
                 </div>
              </div>

              {/* AMBIENT ATMOSPHERE */}
              <div className="bg-slate-900/30 border border-slate-800 p-4 rounded-sm">
                 <h4 className="text-[11px] font-bold text-purple-400 uppercase mb-3 flex items-center gap-2 font-tech tracking-wider">
                    <Lightbulb className="w-3.5 h-3.5" /> Ambient Atmosphere
                 </h4>
                 <div className="space-y-3">
                    <label className="flex items-center justify-between p-2 rounded-sm bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-600 transition-colors group">
                        <span className="text-[10px] font-bold text-slate-400 group-hover:text-slate-200 uppercase">Enable Glow</span>
                        <input 
                            type="checkbox" 
                            checked={settings.graphics.showAmbient} 
                            onChange={(e) => handleGraphicsChange('showAmbient', e.target.checked)} 
                            className="w-3.5 h-3.5 accent-indigo-500 rounded-sm" 
                        />
                    </label>
                    
                    {settings.graphics.showAmbient && (
                        <div className="animate-in fade-in slide-in-from-top-1 space-y-4 pt-2">
                            {/* Color Picker */}
                            <div>
                                <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Glow Color</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="color" 
                                        value={settings.graphics.ambientColor}
                                        onChange={(e) => handleGraphicsChange('ambientColor', e.target.value)}
                                        className="w-8 h-8 bg-transparent border-0 p-0 cursor-pointer shrink-0 rounded"
                                    />
                                    <input 
                                        type="text" 
                                        value={settings.graphics.ambientColor}
                                        onChange={(e) => handleGraphicsChange('ambientColor', e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 px-2 text-[10px] text-white font-mono uppercase rounded-sm"
                                    />
                                </div>
                            </div>

                            {/* Opacity Slider */}
                            <div>
                                <div className="flex justify-between mb-1">
                                    <label className="text-[9px] text-slate-500 font-bold uppercase">Intensity / Opacity</label>
                                    <span className="text-[9px] text-indigo-400 font-mono">{(settings.graphics.ambientOpacity * 100).toFixed(0)}%</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="0.05" 
                                    max="1.0" 
                                    step="0.05"
                                    value={settings.graphics.ambientOpacity} 
                                    onChange={(e) => handleGraphicsChange('ambientOpacity', parseFloat(e.target.value))}
                                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500" 
                                />
                            </div>

                            {/* Animation Toggle & Speed */}
                            <div className="p-2 rounded-sm bg-slate-950 border border-slate-800">
                                <label className="flex items-center justify-between cursor-pointer group mb-2">
                                    <span className="text-[10px] font-bold text-slate-400 group-hover:text-slate-200 uppercase">Dynamic Breathing</span>
                                    <input 
                                        type="checkbox" 
                                        checked={settings.graphics.animateAmbient} 
                                        onChange={(e) => handleGraphicsChange('animateAmbient', e.target.checked)} 
                                        className="w-3.5 h-3.5 accent-purple-500 rounded-sm" 
                                    />
                                </label>
                                
                                {settings.graphics.animateAmbient && (
                                    <div className="pt-2 border-t border-slate-800/50">
                                        <div className="flex justify-between mb-1">
                                            <label className="text-[9px] text-slate-500 font-bold uppercase">Cycle Speed</label>
                                            <span className="text-[9px] text-purple-400 font-mono">{settings.graphics.ambientDuration}s</span>
                                        </div>
                                        <input 
                                            type="range" 
                                            min="2" 
                                            max="30" 
                                            step="1"
                                            value={settings.graphics.ambientDuration} 
                                            onChange={(e) => handleGraphicsChange('ambientDuration', parseFloat(e.target.value))}
                                            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500" 
                                            title="Lower is Faster"
                                        />
                                        <div className="flex justify-between text-[8px] text-slate-600 mt-1">
                                            <span>FAST</span>
                                            <span>SLOW</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                 </div>
              </div>

              {/* CHART CONFIG */}
              <div className="bg-slate-900/30 border border-slate-800 p-4 rounded-sm flex-1">
                 <h4 className="text-[11px] font-bold text-rose-400 uppercase mb-3 flex items-center gap-2 font-tech tracking-wider">
                    <BarChart className="w-3.5 h-3.5" /> Graph Config
                 </h4>
                 
                 <div className="mb-4">
                     <label className="text-[10px] text-slate-500 font-bold uppercase block mb-2">Sampling Density</label>
                     <div className="flex bg-slate-950 rounded-sm p-1 border border-slate-800">
                       {(['low', 'medium', 'high'] as const).map((level) => (
                         <button
                           key={level}
                           onClick={() => handleDensityChange(level)}
                           className={`flex-1 py-1 px-2 rounded-sm text-[9px] font-bold uppercase transition-all ${
                             settings.density === level 
                             ? 'bg-rose-900/40 text-rose-200 border border-rose-500/30' 
                             : 'text-slate-500 hover:text-white'
                           }`}
                         >
                           {level}
                         </button>
                       ))}
                     </div>
                 </div>

                 <div className="space-y-3">
                    {renderGraphConfig('Altitude', 'altitude')}
                    {renderGraphConfig('Pressure', 'pressure')}
                    {renderGraphConfig('Temperature', 'temperature')}
                 </div>
              </div>
          </div>

          {/* RIGHT CONTENT: TELEMETRY & SIMULATION */}
          {/* AETHER NOTE: Transparent background for glassmorphism */}
          <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-transparent flex flex-col gap-6">
              {/* TELEMETRY CONFIGURATION */}
              <div>
                  <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-[0.2em] border-b border-indigo-900/30 pb-2 mb-4 flex items-center gap-2 font-space">
                      <Settings2 className="w-4 h-4" /> Telemetry Configuration
                  </h3>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                      
                      {/* UNITS */}
                      <div className="bg-slate-900/20 border border-slate-800 p-4 rounded-sm">
                        <h4 className="text-[11px] font-bold text-cyan-400 uppercase mb-3 flex items-center gap-2 font-tech tracking-wider">
                            <Gauge className="w-3.5 h-3.5" /> Units
                        </h4>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] text-slate-500 font-bold uppercase">Speed</span>
                                <select value={settings.units.speed} onChange={(e) => handleUnitChange('speed', e.target.value)} className="bg-slate-950 border border-slate-700 rounded-sm px-2 py-1 text-[10px] text-white w-24 font-mono outline-none focus:border-cyan-500">
                                    <option value="m/s">m/s</option><option value="km/h">km/h</option><option value="mph">mph</option><option value="ft/s">ft/s</option>
                                </select>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] text-slate-500 font-bold uppercase">Altitude</span>
                                <select value={settings.units.altitude} onChange={(e) => handleUnitChange('altitude', e.target.value)} className="bg-slate-950 border border-slate-700 rounded-sm px-2 py-1 text-[10px] text-white w-24 font-mono outline-none focus:border-cyan-500">
                                    <option value="m">Meter</option><option value="ft">Feet</option>
                                </select>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] text-slate-500 font-bold uppercase">Temp</span>
                                <select value={settings.units.temperature} onChange={(e) => handleUnitChange('temperature', e.target.value)} className="bg-slate-950 border border-slate-700 rounded-sm px-2 py-1 text-[10px] text-white w-24 font-mono outline-none focus:border-cyan-500">
                                    <option value="°C">Celsius</option><option value="°F">Fahr</option><option value="K">Kelvin</option>
                                </select>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] text-slate-500 font-bold uppercase">Density</span>
                                <select value={settings.units.density} onChange={(e) => handleUnitChange('density', e.target.value)} className="bg-slate-950 border border-slate-700 rounded-sm px-2 py-1 text-[10px] text-white w-24 font-mono outline-none focus:border-cyan-500">
                                    <option value="kg/m³">kg/m³</option><option value="lb/ft³">lb/ft³</option>
                                </select>
                            </div>
                        </div>
                      </div>

                      {/* WIND & TIMING */}
                      <div className="bg-slate-900/20 border border-slate-800 p-4 rounded-sm flex flex-col justify-between">
                        <div>
                            <h4 className="text-[11px] font-bold text-white uppercase mb-3 flex items-center gap-2 font-tech tracking-wider">
                                <Cloud className="w-3.5 h-3.5" /> Wind Physics
                            </h4>
                            <div className="grid grid-cols-2 gap-2 mb-4">
                                <div>
                                    <label className="text-[9px] text-slate-500 block uppercase">Base Speed (m/s)</label>
                                    <input type="number" step="0.5" value={settings.windSpeed} onChange={(e) => onUpdate({ ...settings, windSpeed: parseFloat(e.target.value) || 0 })} className="w-full bg-slate-950 border-b border-slate-700 px-2 py-1 text-[10px] text-white font-mono outline-none focus:border-white transition-colors" />
                                </div>
                                <div>
                                    <label className="text-[9px] text-slate-500 block uppercase">From Dir (°)</label>
                                    <input type="number" min="0" max="360" value={settings.windDirection} onChange={(e) => onUpdate({ ...settings, windDirection: parseFloat(e.target.value) || 0 })} className="w-full bg-slate-950 border-b border-slate-700 px-2 py-1 text-[10px] text-white font-mono outline-none focus:border-white transition-colors" />
                                </div>
                            </div>
                            <p className="text-[8px] text-slate-600 leading-tight italic">
                                *Simulates shear and turbulence. Impact increases with altitude.
                            </p>
                        </div>
                        <div className="pt-3 border-t border-slate-800">
                            <h4 className="text-[11px] font-bold text-amber-400 uppercase mb-2 flex items-center gap-2 font-tech tracking-wider">
                                <Timer className="w-3.5 h-3.5" /> Timing
                            </h4>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <label className="text-[9px] text-slate-500 block uppercase">Sim (ms)</label>
                                    <input type="number" step="10" value={settings.simInterval} onChange={(e) => handleSimIntervalChange(Number(e.target.value))} className="w-full bg-slate-950 border-b border-slate-700 px-2 py-1 text-[10px] text-white font-mono outline-none focus:border-amber-500 transition-colors" />
                                </div>
                                <div className="flex-1">
                                    <label className="text-[9px] text-slate-500 block uppercase">Throttle (ms)</label>
                                    <input type="number" step="10" value={settings.streamThrottle} onChange={(e) => handleStreamThrottleChange(Number(e.target.value))} className="w-full bg-slate-950 border-b border-slate-700 px-2 py-1 text-[10px] text-white font-mono outline-none focus:border-amber-500 transition-colors" />
                                </div>
                            </div>
                        </div>
                      </div>
                  </div>

                  {/* SAFETY LIMITS & CSV PARSER - SIDE BY SIDE */}
                  <div className="flex flex-col xl:flex-row gap-4">
                      {/* LEFT COLUMN: SAFETY LIMITS + MAP CONFIG */}
                      <div className="flex flex-col gap-4 xl:w-[350px] shrink-0">
                          
                          {/* THRESHOLDS SUMMARY */}
                          <div className="bg-slate-900/20 border border-slate-800 p-4 rounded-sm">
                            <h4 className="text-[11px] font-bold text-rose-400 uppercase mb-3 flex items-center gap-2 font-tech tracking-wider">
                                <AlertTriangle className="w-3.5 h-3.5" /> Safety Limits
                            </h4>
                            <div className="space-y-3">
                                {renderThresholdInputs("Temp", 'minTemperature', 'maxTemperature')}
                                {renderThresholdInputs("Altitude", 'minAltitude', 'maxAltitude')}
                                {renderThresholdInputs("Pressure", 'minPressure', 'maxPressure')}
                                {renderThresholdInputs("Speed H", 'minSpeed', 'maxSpeed')}
                                {renderThresholdInputs("Speed V", 'minVerticalSpeed', 'maxVerticalSpeed')}
                                {renderThresholdInputs("Density", 'minDensity', 'maxDensity')}
                                {renderThresholdInputs("G-Force", 'minGForce', 'maxGForce')}
                                
                                <div className="flex items-center gap-2">
                                    <label className="text-[10px] font-bold font-tech uppercase text-slate-400 w-16">Max Q</label>
                                    <div className="flex-1">
                                        <div className="relative">
                                            <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] text-slate-600 font-bold">MAX</span>
                                            <input 
                                                type="number"
                                                step="any"
                                                value={settings.thresholds.maxDynamicPressure} 
                                                onChange={(e) => handleThresholdChange('maxDynamicPressure', e.target.value)}
                                                className="w-full bg-slate-900 border-b border-slate-700 pl-8 pr-2 py-1 text-xs font-mono text-rose-400 focus:border-rose-500 outline-none transition-colors" 
                                                title="Set maximum dynamic pressure (Max Q) threshold in kPa"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                          </div>

                          {/* AETHER NOTE: MAP SETTINGS (Relocated Here) */}
                          <div className="bg-slate-900/20 border border-slate-800 p-4 rounded-sm">
                             <h4 className="text-[11px] font-bold text-cyan-400 uppercase mb-3 flex items-center gap-2 font-tech tracking-wider">
                                <Globe className="w-3.5 h-3.5" /> Map Provider
                             </h4>
                             <div className="space-y-3">
                                <select 
                                    value={settings.graphics.mapProvider}
                                    onChange={(e) => handleGraphicsChange('mapProvider', e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-sm px-2 py-1.5 text-xs text-white outline-none focus:border-cyan-500 transition-colors font-mono"
                                >
                                    <option value="local">Localhost (Offline)</option>
                                    <option value="osm">OpenStreetMap</option>
                                    <option value="carto">CartoDB Dark</option>
                                </select>
                                
                                {settings.graphics.mapProvider === 'local' && (
                                    <div className="flex items-center gap-0">
                                         <div className="bg-slate-950 border border-r-0 border-slate-700 rounded-l-sm px-2 py-1.5 text-[10px] text-slate-500 font-mono">
                                            http://localhost:
                                         </div>
                                         <input 
                                            type="number" 
                                            value={settings.graphics.localMapPort || 8000}
                                            onChange={(e) => handleGraphicsChange('localMapPort', parseInt(e.target.value))}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-r-sm px-2 py-1.5 text-xs text-white font-mono outline-none focus:border-cyan-500"
                                         />
                                    </div>
                                )}

                                <div className="pt-2 border-t border-slate-800">
                                    <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1 flex justify-between">
                                        <span>Zoom Sensitivity</span>
                                        <span className="text-cyan-400 font-mono">{(settings.zoomSensitivity * 1000).toFixed(0)}</span>
                                    </label>
                                    <input 
                                    type="range" 
                                    min="1" 
                                    max="10" 
                                    step="0.5"
                                    value={settings.zoomSensitivity * 1000}
                                    onChange={(e) => handleZoomChange(Number(e.target.value) / 1000)}
                                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                                    />
                                </div>
                             </div>
                          </div>

                      </div>

                      {/* RIGHT COLUMN: CSV PARSER */}
                      <div className="flex flex-col flex-1 bg-slate-900/20 border border-slate-800 p-4 rounded-sm min-h-[300px]">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-[11px] font-bold text-emerald-400 uppercase flex items-center gap-2 font-tech tracking-wider">
                                <FileSpreadsheet className="w-3.5 h-3.5" /> Data Parser (CSV Map)
                            </h4>
                            <div className="flex items-center gap-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Separator</label>
                                <select 
                                    value={settings.separator || ','}
                                    onChange={handleSeparatorChange}
                                    className="bg-slate-950 border border-slate-700 rounded-sm px-2 py-1 text-[10px] text-white outline-none focus:border-emerald-500 font-mono"
                                >
                                    <option value=",">Comma (,)</option>
                                    <option value=";">Semi (;)</option>
                                    <option value=":">Colon (:)</option>
                                    <option value="|">Pipe (|)</option>
                                    <option value="\t">Tab</option>
                                    <option value=" ">Space</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex-1 bg-black/40 p-2 border border-slate-800 overflow-y-auto custom-scrollbar shadow-inner mb-4">
                            {localItems.map((item, index) => (
                              <div
                                key={item.id}
                                draggable
                                onDragStart={(e) => onDragStart(e, item.id)}
                                onDragOver={(e) => onDragOver(e, item.id)}
                                onDragEnd={onDragEnd}
                                className={`flex items-center gap-2 p-2 mb-1 border-l-2 text-xs font-mono cursor-move select-none transition-all group ${
                                  draggedItemId === item.id
                                    ? 'bg-indigo-900/40 border-indigo-500 text-indigo-200 opacity-50' 
                                    : item.field === SKIP_FIELD 
                                      ? 'bg-slate-900/30 border-slate-700 border-dashed text-slate-500'
                                      : 'bg-slate-900/80 border-slate-600 text-slate-300 hover:bg-slate-800 hover:border-emerald-500 hover:text-white'
                                }`}
                              >
                                <span className="text-slate-600 font-bold w-6 text-[10px] text-center font-space">{index}</span>
                                <GripVertical className="w-3 h-3 text-slate-600" />
                                {item.field === SKIP_FIELD ? (
                                    <span className="italic text-slate-500">SKIP_INDEX</span>
                                ) : (
                                    <span className="font-bold text-emerald-400">{FIELD_LABELS[item.field]}</span>
                                )}
                                <button 
                                  onClick={() => removeField(item.id)}
                                  className="ml-auto p-1 text-slate-600 hover:text-rose-400 hover:bg-rose-950 rounded transition-colors"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                        </div>

                        <div className="space-y-3">
                            <div className="flex gap-2">
                                <button onClick={handleAddAll} disabled={availableFields.length === 0} className="flex-1 py-2 bg-slate-900 hover:bg-indigo-900/30 text-indigo-300 border border-slate-800 rounded-sm text-[10px] font-bold uppercase transition-colors disabled:opacity-50 tracking-wider">Add All</button>
                                <button onClick={handleRemoveAll} disabled={localItems.length === 0} className="flex-1 py-2 bg-slate-900 hover:bg-rose-900/30 text-rose-300 border border-slate-800 rounded-sm text-[10px] font-bold uppercase transition-colors disabled:opacity-50 tracking-wider">Clear</button>
                            </div>
                            <div className="border-t border-slate-800 pt-3">
                                <span className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Available Fields</span>
                                <div className="flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto custom-scrollbar">
                                    {availableFields.map(field => (
                                        <button
                                          key={field}
                                          onClick={() => addField(field)}
                                          className="px-2 py-1 bg-slate-950 hover:bg-emerald-900/30 border border-slate-800 hover:border-emerald-500/50 text-[10px] text-slate-400 hover:text-emerald-300 rounded-sm transition-colors font-mono"
                                        >
                                            + {FIELD_LABELS[field]}
                                        </button>
                                    ))}
                                    <button onClick={() => addField(SKIP_FIELD)} className="px-2 py-1 bg-slate-950 border border-dashed border-slate-700 text-[10px] text-slate-500 rounded-sm hover:text-white font-mono">+ SKIP</button>
                                </div>
                            </div>
                        </div>
                      </div>
                  </div>
              </div>

              {/* LOCAL SIMULATION SCENARIOS (New Section) */}
              <div>
                  <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-[0.2em] border-b border-indigo-900/30 pb-2 mb-4 flex items-center gap-2 font-space">
                      <Gamepad2 className="w-4 h-4" /> Local Simulation Scenarios
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {renderSimOption(
                          SimulationPreset.ROCKET_LAUNCH, 
                          "Rocket Launch", 
                          <Rocket className="w-4 h-4" />,
                          "Vertical ascent, staging events, drogue/main deployment."
                      )}
                      {renderSimOption(
                          SimulationPreset.AERIAL_MANEUVERS, 
                          "Aerial Maneuvers", 
                          <Plane className="w-4 h-4" />,
                          "High-G turns, barrel rolls, and dives for fixed-wing drones."
                      )}
                      {renderSimOption(
                          SimulationPreset.UNSTABLE_DESCENT, 
                          "Unstable Tumble", 
                          <RotateCcw className="w-4 h-4" />,
                          "Chaotic freefall simulation for gyro/accelerometer testing."
                      )}
                      {renderSimOption(
                          SimulationPreset.EMERGENCY_LANDING, 
                          "Emergency Landing", 
                          <AlertTriangle className="w-4 h-4" />,
                          "Engine failure simulation, glide ratio, spiral descent."
                      )}
                      {renderSimOption(
                          SimulationPreset.STALL_RECOVERY, 
                          "Stall Recovery", 
                          <Activity className="w-4 h-4" />,
                          "Critical angle of attack, lift loss, and recovery dive."
                      )}
                      {renderSimOption(
                          SimulationPreset.GPS_NAV_TEST, 
                          "GPS Navigation", 
                          <Globe className="w-4 h-4" />,
                          "Waypoint following pattern to test heading/GPS precision."
                      )}
                  </div>
              </div>

          </div>

        </div>
      </div>
      
      {/* Confirmation Modal Overlay */}
      <ConfirmModal 
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(prev => ({...prev, isOpen: false}))}
          isDestructive={confirmModal.isDestructive}
          confirmText={confirmModal.confirmText}
      />
    </div>
  );
};