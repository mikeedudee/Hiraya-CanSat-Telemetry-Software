import { CsvField, AppSettings, SimulationPreset } from './types';

export const BAUD_RATES = [
  4800,
  9600,
  19200,
  38400,
  57600,
  115200,
  230400,
  460800,
  921600
];

export const MAX_DATA_POINTS = 500;
export const SKIP_FIELD = '__SKIP__';

// Default CSV Order
export const DEFAULT_CSV_ORDER: CsvField[] = [
  'pressure', 
  'temperature', 
  'thermistorTemp', 
  'latitude', 
  'longitude', 
  'gy', 
  'gx', 
  'gz', 
  'heading', 
  'timeElapsed',
  'runTime',
  'absAltitude', 
  'relAltitude',
  'vSpeed',
  'hSpeed',
  'density'
];

export const FIELD_LABELS: Record<string, string> = {
  pressure: "Pressure",
  temperature: "Temperature",
  thermistorTemp: "Thermistor",
  latitude: "Latitude",
  longitude: "Longitude",
  gy: "Gyro Y",
  gx: "Gyro X",
  gz: "Gyro Z",
  heading: "Compass Heading", 
  timeElapsed: "Time Elapsed",
  runTime: "Run Time",
  absAltitude: "Abs Altitude",
  relAltitude: "Rel Altitude",
  vSpeed: "Vertical Speed",
  hSpeed: "Horizontal Speed",
  density: "Air Density",
  [SKIP_FIELD]: "NULL (Skip Index)"
};

export const DEFAULT_SETTINGS: AppSettings = {
  altitude: { color: '#22d3ee', showDots: false, yMin: 'auto', yMax: 'auto' },
  pressure: { color: '#34d399', showDots: false, yMin: 'auto', yMax: 'auto' },
  temperature: { color: '#fbbf24', showDots: false, yMin: 'auto', yMax: 'auto' },
  density: 'high',
  zoomSensitivity: 0.005,
  csvOrder: DEFAULT_CSV_ORDER,
  separator: ',',
  simInterval: 100,
  simPreset: SimulationPreset.ROCKET_LAUNCH, 
  streamThrottle: 100,
  units: {
    speed: 'm/s',
    temperature: '°C',
    altitude: 'm',
    density: 'kg/m³'
  },
  thresholds: {
    maxTemperature: 60,
    minTemperature: -0,
    maxPressure: 110000,
    minPressure: 50000, 
    maxAltitude: 1500, 
    minAltitude: 0,
    maxSpeed: 340, 
    minSpeed: 0,
    maxVerticalSpeed: 100,
    minVerticalSpeed: 0,
    maxDensity: 1.5,
    minDensity: 0,
    maxDynamicPressure: 20, 
    maxGForce: 12, // Structural Warning
    minGForce: -2  // Negative G Warning
  },
  windSpeed: 5, 
  windDirection: 0, 
  graphics: {
    animations: true,
    glowEffects: true,
    glassBlur: true,
    show3DShadows: true, // Legacy flag, kept for compatibility if needed
    mapProvider: 'osm',
    localMapPort: 8000,
    
    // Ambient
    showAmbient: true,
    ambientColor: '#4f46e5',
    animateAmbient: true,
    ambientOpacity: 0.3,
    ambientDuration: 15,

    // AETHER NOTE: New Graphics Defaults
    antialiasing: true,
    shadowQuality: 'high',
    renderResolution: 1.0,
    
    globalBrightness: 1.0,
    globalContrast: 1.0,
    globalSaturation: 1.0,
    nightVisionMode: false
  },
  hardware: {
    calculation: 'hybrid',
    graphics: 'hybrid'
  }
};