export interface TelemetryPacket {
  pressure: number;
  temperature: number;
  thermistorTemp: number;
  latitude: number;
  longitude: number;
  gy: number;
  gx: number;
  gz: number;
  heading: number; 
  timeElapsed: number;
  runTime: number; 
  absAltitude: number;
  relAltitude: number;
  vSpeed: number;
  hSpeed: number;
  density: number;
  id?: string; 
}

export type CsvField = keyof TelemetryPacket | '__SKIP__';

export enum ConnectionStatus {
  DISCONNECTED = 'Disconnected',
  CONNECTING = 'Connecting',
  CONNECTED = 'Connected',
  ERROR = 'Error'
}

export interface SerialConfig {
  baudRate: number;
  dataBits: 7 | 8;
  stopBits: 1 | 2;
  parity: 'none' | 'even' | 'odd';
  flowControl: 'none' | 'hardware';
}

export interface SerialOptions extends SerialConfig {
  // extended options if needed
}

export interface GraphConfig {
  color: string;
  showDots: boolean;
  yMin: string | number;
  yMax: string | number;
}

export type SpeedUnit = 'm/s' | 'km/h' | 'mph' | 'ft/s';
export type TempUnit = '°C' | '°F' | 'K';
export type AltUnit = 'm' | 'ft';
export type DensityUnit = 'kg/m³' | 'lb/ft³';

export interface UnitSettings {
  speed: SpeedUnit;
  temperature: TempUnit;
  altitude: AltUnit;
  density: DensityUnit;
}

export interface ThresholdSettings {
  maxTemperature: number;
  minTemperature: number;
  maxPressure: number;
  minPressure: number;
  maxAltitude: number;
  minAltitude: number;
  maxSpeed: number;
  minSpeed: number;
  maxVerticalSpeed: number;
  minVerticalSpeed: number;
  maxDensity: number;
  minDensity: number;
  maxDynamicPressure: number;
  maxGForce: number; 
  minGForce: number;
}

export interface GraphicsSettings {
  animations: boolean;    
  glowEffects: boolean;   
  glassBlur: boolean;     
  mapProvider: 'local' | 'osm' | 'carto'; 
  localMapPort: number;   
  
  // Ambient Settings
  showAmbient: boolean;
  ambientColor: string;
  animateAmbient: boolean;
  ambientOpacity: number;
  ambientDuration: number;

  // AETHER NOTE: New Comprehensive Graphics Options
  // 3D Engine
  antialiasing: boolean;        // MSAA Toggle
  shadowQuality: 'off' | 'low' | 'high'; // Shadow Resolution
  renderResolution: number;     // 0.5 (Performance) to 2.0 (Super-sampling)
  
  // Post-Processing / Display Calibration
  globalBrightness: number;     // 50% - 150%
  globalContrast: number;       // 50% - 150%
  globalSaturation: number;     // 0% (B&W) - 200% (Vibrant)
  nightVisionMode: boolean;     // Red Filter for low-light ops
}

export type HardwareMode = 'cpu' | 'gpu' | 'hybrid';

export interface HardwareSettings {
  calculation: HardwareMode; 
  graphics: HardwareMode;    
}

export enum SimulationPreset {
  ROCKET_LAUNCH = 'ROCKET_LAUNCH',
  AERIAL_MANEUVERS = 'AERIAL_MANEUVERS', 
  UNSTABLE_DESCENT = 'UNSTABLE_DESCENT', 
  EMERGENCY_LANDING = 'EMERGENCY_LANDING',
  STALL_RECOVERY = 'STALL_RECOVERY',
  GPS_NAV_TEST = 'GPS_NAV_TEST'
}

export interface AppSettings {
  altitude: GraphConfig;
  pressure: GraphConfig;
  temperature: GraphConfig;
  density: 'high' | 'medium' | 'low';
  zoomSensitivity: number;
  csvOrder: CsvField[];
  separator: string; 
  simInterval: number;
  simPreset: SimulationPreset; 
  streamThrottle: number;
  units: UnitSettings; 
  thresholds: ThresholdSettings; 
  windSpeed: number; 
  windDirection: number; 
  graphics: GraphicsSettings; 
  hardware: HardwareSettings; 
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}