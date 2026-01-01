
import { TelemetryPacket, CsvField, SimulationPreset } from '../types';
import { SKIP_FIELD } from '../constants';

// Physics Limits for Validation (used by parser)
const LIMITS = {
  MIN_TEMP: -273.15, // Absolute Zero
  MAX_TEMP: 200,     // Reasonable upper limit for standard electronics/environment
  MIN_ABS_ALT: -500, // Dead Sea is around -430m
  MAX_ABS_ALT: 100000, // Edge of space (ish)
  MAX_SPEED: 10000, // Hypersonic
};

// Throttle logger to prevent console spam freezing the browser
let lastLogTime = 0;
const throttleLog = (msg: string, ...args: any[]) => {
    const now = Date.now();
    // Only log once every 2 seconds per type of error roughly
    if (now - lastLogTime > 2000) {
        console.warn(msg, ...args);
        lastLogTime = now;
    }
};

export const parseTelemetryLine = (line: string, order: CsvField[], separator: string = ','): TelemetryPacket | null => {
  try {
    const rawLine = line.trim();
    if (!rawLine) return null;

    // Handle escaped tab character string if passed from UI input
    const actualSeparator = separator === '\\t' ? '\t' : separator;

    const parts = rawLine.split(actualSeparator).map(s => {
      const val = parseFloat(s.trim());
      // Graceful handling: map actual NaNs to 0, but allow legitimate 0s
      return isNaN(val) ? 0 : val;
    });

    // Logging for debugging malformed lines
    if (parts.length < 3) { // Arbitrary minimum threshold for "useful" data
       return null;
    }

    // Initialize with zeros
    const packet: TelemetryPacket = {
      pressure: 0,
      temperature: 0,
      thermistorTemp: 0,
      latitude: 0,
      longitude: 0,
      gy: 0,
      gx: 0,
      gz: 0,
      heading: 0, 
      timeElapsed: 0,
      runTime: 0,
      absAltitude: 0,
      relAltitude: 0,
      vSpeed: 0,
      hSpeed: 0,
      density: 0
    };
    
    let validFieldsFound = 0;

    order.forEach((field, index) => {
      if (index < parts.length && field !== SKIP_FIELD) {
         // @ts-ignore - ensured key safety via CsvField type
         packet[field] = parts[index];
         validFieldsFound++;
      }
    });

    if (validFieldsFound === 0) {
        return null;
    }

    // --- Validation Checks (Throttled) ---
    if (packet.temperature < LIMITS.MIN_TEMP || packet.temperature > LIMITS.MAX_TEMP) {
        throttleLog(`[Parser] Suspicious Temperature detected: ${packet.temperature}`);
    }
    if (packet.absAltitude < LIMITS.MIN_ABS_ALT || packet.absAltitude > LIMITS.MAX_ABS_ALT) {
         throttleLog(`[Parser] Suspicious Altitude detected: ${packet.absAltitude}`);
    }
    if (packet.hSpeed > LIMITS.MAX_SPEED || packet.vSpeed > LIMITS.MAX_SPEED) {
         throttleLog(`[Parser] Extreme Speed detected: H:${packet.hSpeed} V:${packet.vSpeed}`);
    }

    return packet;
  } catch (e) {
    throttleLog("[Parser] Critical error parsing line:", e);
    return null;
  }
};

// --- ADVANCED SIMULATION ENGINE ---

enum SimPhase {
  // Universal
  INIT,
  
  // Rocket Profile
  R_IDLE, R_IGNITION, R_BOOST, R_COAST, R_APOGEE, R_DROGUE, R_MAIN, R_LANDED,
  
  // Aerial (Drone/Plane) Profile
  A_TAKEOFF, A_LOITER, A_HIGH_G_TURN, A_BARREL_ROLL, A_DIVE, A_LANDING,
  
  // Unstable Profile
  U_FREEFALL, U_SPIN_FLAT, U_RECOVERY, U_LANDED,

  // Emergency Landing Profile
  E_CRUISE, E_ENGINE_FAIL, E_GLIDE, E_SPIRAL, E_FLARE, E_CRASH_LAND,

  // Stall Profile
  S_CLIMB, S_PITCH_UP_CRITICAL, S_STALL_ONSET, S_NOSE_DROP, S_RECOVERY_DIVE, S_LEVEL_OUT,

  // GPS Nav
  G_WAYPOINT_1, G_WAYPOINT_2, G_WAYPOINT_3, G_RETURN
}

// Persistent Simulation State
let state = {
  scenario: SimulationPreset.ROCKET_LAUNCH,
  phase: SimPhase.INIT,
  timer: 0,
  lastTick: 0,
  
  // Kinematics
  lat: 10.3157, 
  lon: 123.8854, // Cebu IT Park area approx
  alt: 0,
  vel: { x: 0, y: 0, z: 0 }, // Local frame: x=forward, y=right, z=up
  
  // Attitude
  heading: 0,
  pitch: 0,
  roll: 0,
  
  // Rates
  gyro: { x: 0, y: 0, z: 0 }
};

// Helper for randomness
const noise = (amp: number) => (Math.random() - 0.5) * 2 * amp;
// Perlin-ish smooth noise tracker
let timeOffset = 0;

export const setSimScenario = (preset: SimulationPreset) => {
    resetSim(preset);
};

const resetSim = (scenario: SimulationPreset) => {
    state.scenario = scenario;
    state.timer = 0;
    state.alt = 0;
    state.vel = { x: 0, y: 0, z: 0 };
    state.gyro = { x: 0, y: 0, z: 0 };
    state.heading = 0;
    state.pitch = 0;
    state.roll = 0;
    
    // Slight random start pos
    state.lat = 10.3157 + noise(0.005);
    state.lon = 123.8854 + noise(0.005);
    
    if (scenario === SimulationPreset.ROCKET_LAUNCH) state.phase = SimPhase.R_IDLE;
    if (scenario === SimulationPreset.AERIAL_MANEUVERS) state.phase = SimPhase.A_TAKEOFF;
    if (scenario === SimulationPreset.UNSTABLE_DESCENT) {
        state.phase = SimPhase.U_FREEFALL;
        state.alt = 2500; 
    }
    if (scenario === SimulationPreset.EMERGENCY_LANDING) {
        state.phase = SimPhase.E_CRUISE;
        state.alt = 500;
        state.vel.x = 25; // Cruise speed
    }
    if (scenario === SimulationPreset.STALL_RECOVERY) {
        state.phase = SimPhase.S_CLIMB;
        state.alt = 300;
        state.vel.x = 20;
    }
    if (scenario === SimulationPreset.GPS_NAV_TEST) {
        state.phase = SimPhase.G_WAYPOINT_1;
        state.alt = 100;
        state.vel.x = 15;
    }
};

const applyWindEffects = (dt: number, windSpeed: number, windDir: number) => {
    // 1. Wind Shear: Wind increases with altitude (Logarithmic profile approximation)
    // At 10m height = 100% windSpeed, at 1000m = ~200% windSpeed
    const shearFactor = Math.log(Math.max(state.alt, 10)) / Math.log(10); 
    const effectiveWindSpeed = windSpeed * Math.max(0.5, shearFactor);

    // 2. Gusts: Random noise superimposed on base wind
    timeOffset += dt;
    const gust = Math.sin(timeOffset * 0.5) * Math.cos(timeOffset * 2.3) * (windSpeed * 0.5); 
    const totalWind = effectiveWindSpeed + gust;

    // 3. Trajectory Drift
    // Calculate wind vector components (Wind Direction is "FROM")
    const radWind = (windDir - 180) * Math.PI / 180;
    const windVx = totalWind * Math.sin(radWind); 
    const windVy = totalWind * Math.cos(radWind);

    // Apply drift to position (independent of vehicle heading)
    const latDegPerM = 1 / 111320;
    const lonDegPerM = 1 / (111320 * Math.cos(state.lat * Math.PI / 180));
    
    state.lat += windVy * dt * latDegPerM * 0.2; // Factor 0.2 represents sideways drag coeff
    state.lon += windVx * dt * lonDegPerM * 0.2;

    // 4. Attitude Turbulence
    // Higher wind speed = more turbulence, especially if lighter aircraft
    const turbulenceScale = (totalWind / 10) * (state.scenario === SimulationPreset.ROCKET_LAUNCH ? 0.1 : 1.0);
    
    // Add rotational noise based on wind
    state.gyro.x += noise(5 * turbulenceScale); // Roll twitch
    state.gyro.y += noise(2 * turbulenceScale); // Pitch bump
    state.gyro.z += noise(1 * turbulenceScale); // Yaw drift
};

export const generateMockData = (totalTimeMs: number, preset: SimulationPreset, windSpeed: number = 5, windDir: number = 90): TelemetryPacket => {
  // Sync preset if changed externally (though normally setSimScenario handles reset)
  if (state.scenario !== preset) {
      resetSim(preset);
  }

  let dt = (totalTimeMs - state.lastTick) / 1000;
  
  if (dt < 0 || dt > 1 || state.phase === SimPhase.INIT) {
      dt = 0.05;
      if (state.phase === SimPhase.INIT) resetSim(preset);
  }
  state.lastTick = totalTimeMs;
  state.timer += dt;

  // --- SCENARIO STATE MACHINE ---
  switch (state.scenario) {
      case SimulationPreset.ROCKET_LAUNCH: runRocketLogic(dt); break;
      case SimulationPreset.AERIAL_MANEUVERS: runAerialLogic(dt); break;
      case SimulationPreset.UNSTABLE_DESCENT: runUnstableLogic(dt); break;
      case SimulationPreset.EMERGENCY_LANDING: runEmergencyLogic(dt); break;
      case SimulationPreset.STALL_RECOVERY: runStallLogic(dt); break;
      case SimulationPreset.GPS_NAV_TEST: runGPSNavLogic(dt); break;
  }

  // --- PHYSICS INTEGRATION ---
  
  // Apply Wind Physics
  applyWindEffects(dt, windSpeed, windDir);

  // Update Attitude (Quaternion approximation via Euler integration)
  state.heading = (state.heading + state.gyro.z * dt) % 360;
  if (state.heading < 0) state.heading += 360;
  
  state.pitch += state.gyro.y * dt; // Simplified pitch integration
  state.roll += state.gyro.x * dt; // Simplified roll integration
  
  // Dampen pitch/roll naturally if not driven (stability)
  if (state.scenario !== SimulationPreset.UNSTABLE_DESCENT && state.scenario !== SimulationPreset.STALL_RECOVERY) {
     state.roll *= 0.99;
     state.pitch *= 0.99;
  }

  // Update Position
  const latDegPerM = 1 / 111320;
  const lonDegPerM = 1 / (111320 * Math.cos(state.lat * Math.PI / 180));
  
  const radH = state.heading * Math.PI / 180;
  // Velocity X is forward speed
  const vNorth = state.vel.x * Math.cos(radH);
  const vEast = state.vel.x * Math.sin(radH);

  state.lat += vNorth * dt * latDegPerM;
  state.lon += vEast * dt * lonDegPerM;
  state.alt += state.vel.z * dt;
  
  if (state.alt < 0 && state.phase !== SimPhase.U_FREEFALL) state.alt = 0; 

  // --- SENSOR SYNTHESIS ---

  let temp = 30 - (state.alt / 1000 * 6.5);
  // Pressure: Barometric formula
  const pressure = 101325 * Math.pow(1 - 2.25577e-5 * state.alt, 5.25588) + noise(5);
  // Density
  const density = 1.225 * Math.pow(1 - 2.25577e-5 * state.alt, 4.25588);

  return {
    pressure,
    temperature: temp + noise(0.2),
    thermistorTemp: temp + 5 + noise(0.1), 
    latitude: state.lat + noise(0.000005), 
    longitude: state.lon + noise(0.000005),
    gy: state.gyro.y + noise(0.5), 
    gx: state.gyro.x + noise(0.5), 
    gz: state.gyro.z + noise(0.5), 
    heading: state.heading,
    timeElapsed: totalTimeMs,
    runTime: totalTimeMs,
    absAltitude: state.alt + 50, 
    relAltitude: state.alt + noise(0.2), 
    vSpeed: state.vel.z + noise(0.1),
    hSpeed: Math.sqrt(state.vel.x**2 + state.vel.y**2) + noise(0.1),
    density: density + noise(0.001)
  };
};

// --- SCENARIO LOGIC IMPLEMENTATIONS ---

function runRocketLogic(dt: number) {
    switch (state.phase) {
        case SimPhase.R_IDLE:
            if (state.timer > 3) { state.phase = SimPhase.R_IGNITION; state.timer = 0; }
            break;
        case SimPhase.R_IGNITION:
            state.gyro.x = noise(10); state.gyro.y = noise(10); 
            if (state.timer > 1.5) { state.phase = SimPhase.R_BOOST; state.timer = 0; }
            break;
        case SimPhase.R_BOOST:
            state.vel.z += 60 * dt; 
            state.vel.x = 5; 
            state.gyro.z += dt * 10; 
            state.gyro.x = noise(20); 
            if (state.timer > 3.5) { state.phase = SimPhase.R_COAST; state.timer = 0; }
            break;
        case SimPhase.R_COAST:
            state.vel.z -= 9.81 * dt; 
            state.gyro.x = noise(1); state.gyro.y = noise(1);
            if (state.vel.z <= 0) { state.phase = SimPhase.R_APOGEE; state.timer = 0; }
            break;
        case SimPhase.R_APOGEE:
            state.gyro.x = 40; 
            if (state.timer > 1) { state.phase = SimPhase.R_DROGUE; state.timer = 0; }
            break;
        case SimPhase.R_DROGUE:
            const termVelDrogue = -25;
            state.vel.z += (termVelDrogue - state.vel.z) * 2 * dt; 
            state.gyro.z = 45; 
            state.gyro.y = Math.sin(state.timer * 3) * 30; 
            if (state.alt < 400) { state.phase = SimPhase.R_MAIN; state.timer = 0; }
            break;
        case SimPhase.R_MAIN:
            const termVelMain = -5;
            state.vel.z += (termVelMain - state.vel.z) * 5 * dt; 
            state.gyro.z = 5; 
            state.gyro.y = Math.sin(state.timer) * 5; 
            if (state.alt <= 0) { state.phase = SimPhase.R_LANDED; state.timer = 0; }
            break;
        case SimPhase.R_LANDED:
            state.vel = {x:0, y:0, z:0}; 
            state.gyro = {x:0, y:0, z:0};
            break;
    }
}

function runAerialLogic(dt: number) {
    switch (state.phase) {
        case SimPhase.A_TAKEOFF:
            state.vel.z += (15 - state.vel.z) * dt;
            state.vel.x += (25 - state.vel.x) * dt;
            state.gyro.y = -10; 
            if (state.alt > 200) { state.phase = SimPhase.A_LOITER; state.timer = 0; }
            break;
        case SimPhase.A_LOITER:
            state.vel.z += (0 - state.vel.z) * dt;
            state.vel.x = 35;
            state.gyro.y = 0; state.gyro.x = 0;
            state.gyro.z = 15; 
            if (state.timer > 15) { state.phase = SimPhase.A_HIGH_G_TURN; state.timer = 0; }
            break;
        case SimPhase.A_HIGH_G_TURN:
            state.gyro.z = 60;
            state.gyro.x = 45; 
            state.vel.x = 45;
            if (state.timer > 6) { state.phase = SimPhase.A_BARREL_ROLL; state.timer = 0; }
            break;
        case SimPhase.A_BARREL_ROLL:
            state.gyro.x = 200; 
            state.gyro.z = 0;
            state.vel.z = Math.sin(state.timer * Math.PI) * 10;
            if (state.timer > 4) { state.phase = SimPhase.A_DIVE; state.timer = 0; }
            break;
        case SimPhase.A_DIVE:
            state.vel.z = -50;
            state.vel.x = 60;
            state.gyro.x = 0;
            state.gyro.y = 30;
            if (state.alt < 50) { state.phase = SimPhase.A_LANDING; state.timer = 0; }
            break;
        case SimPhase.A_LANDING:
            state.vel.x += (0 - state.vel.x) * 0.5 * dt;
            state.vel.z = -2;
            state.gyro.y = -5;
            if (state.alt <= 0) { 
                state.alt = 0;
            }
            break;
    }
}

function runUnstableLogic(dt: number) {
    switch (state.phase) {
        case SimPhase.U_FREEFALL:
            state.vel.z -= 9.81 * dt;
            state.gyro.x = Math.sin(state.timer * 7) * 250;
            state.gyro.y = Math.cos(state.timer * 5) * 250;
            state.gyro.z = Math.sin(state.timer * 3) * 150;
            if (state.alt < 500) { state.phase = SimPhase.U_RECOVERY; state.timer = 0; }
            break;
        case SimPhase.U_RECOVERY:
            const targetV = -10;
            state.vel.z += (targetV - state.vel.z) * 3 * dt;
            state.gyro.x *= 0.95;
            state.gyro.y *= 0.95;
            state.gyro.z = 30; 
            if (state.alt <= 0) { state.alt = 0; }
            break;
    }
}

function runEmergencyLogic(dt: number) {
    // Engine fail -> Glide -> Spiral -> Crash/Flare
    switch (state.phase) {
        case SimPhase.E_CRUISE:
            state.vel.z = 0; state.vel.x = 30; state.gyro = {x:0, y:0, z:0};
            if (state.timer > 5) { state.phase = SimPhase.E_ENGINE_FAIL; state.timer = 0; }
            break;
        case SimPhase.E_ENGINE_FAIL:
            state.vel.x *= 0.95; // Drag slows down
            state.gyro.y = 5; // Nose dips
            if (state.vel.x < 15) { state.phase = SimPhase.E_GLIDE; state.timer = 0; }
            break;
        case SimPhase.E_GLIDE:
            state.vel.z = -4; // Glide descent
            state.vel.x = 18; // Stable glide speed
            state.gyro.y = 2; // Slight nose down
            state.gyro.z = 5; // Searching for spot
            if (state.timer > 8) { state.phase = SimPhase.E_SPIRAL; state.timer = 0; }
            break;
        case SimPhase.E_SPIRAL:
            state.vel.z = -10; // Rapid descent
            state.gyro.z = 45; // Tight turn
            state.gyro.x = 30; // Bank
            if (state.alt < 50) { state.phase = SimPhase.E_FLARE; state.timer = 0; }
            break;
        case SimPhase.E_FLARE:
            state.vel.z += (0 - state.vel.z) * 2 * dt; // Arrest descent
            state.vel.x *= 0.9; // Bleed speed
            state.gyro.x = 0; state.gyro.z = 0; state.gyro.y = -10; // Pitch up
            if (state.alt <= 0) { state.phase = SimPhase.E_CRASH_LAND; state.timer = 0; }
            break;
        case SimPhase.E_CRASH_LAND:
            state.vel = {x:0,y:0,z:0};
            state.gyro = {x:0, y:0, z:0};
            break;
    }
}

function runStallLogic(dt: number) {
    switch (state.phase) {
        case SimPhase.S_CLIMB:
            state.vel.z = 5; state.vel.x = 20;
            state.gyro.y = -5; // Pitch up
            if (state.timer > 3) { state.phase = SimPhase.S_PITCH_UP_CRITICAL; state.timer = 0; }
            break;
        case SimPhase.S_PITCH_UP_CRITICAL:
            state.gyro.y = -20; // Aggressive pull up
            state.vel.x -= 5 * dt; // Speed bleeding fast
            state.vel.z = 10;
            if (state.vel.x < 5) { state.phase = SimPhase.S_STALL_ONSET; state.timer = 0; }
            break;
        case SimPhase.S_STALL_ONSET:
            state.gyro.y = noise(10); // Buffeting
            state.gyro.x = noise(15); // Wing rock
            state.vel.z = -2; // Lift loss
            if (state.timer > 2) { state.phase = SimPhase.S_NOSE_DROP; state.timer = 0; }
            break;
        case SimPhase.S_NOSE_DROP:
            state.gyro.y = 60; // Nose drop violent
            state.vel.z = -20; // Falling
            if (state.pitch > 45 || state.timer > 1.5) { state.phase = SimPhase.S_RECOVERY_DIVE; state.timer = 0; }
            break;
        case SimPhase.S_RECOVERY_DIVE:
            state.gyro.y = 0; // Hold dive
            state.vel.x += 10 * dt; // Regaining speed
            state.gyro.x *= 0.9; // Stabilize roll
            if (state.vel.x > 25) { state.phase = SimPhase.S_LEVEL_OUT; state.timer = 0; }
            break;
        case SimPhase.S_LEVEL_OUT:
            state.gyro.y = -10; // Pull out
            state.vel.z += (0 - state.vel.z) * dt;
            if (Math.abs(state.vel.z) < 1) state.phase = SimPhase.S_CLIMB; // Repeat loop
            break;
    }
}

function runGPSNavLogic(dt: number) {
    // Simple waypoint zigzag
    const targetHeading1 = 45;
    const targetHeading2 = 315;
    const targetHeading3 = 0;

    const turnTo = (target: number) => {
        let diff = target - state.heading;
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;
        state.gyro.z = diff * 2; // P-controller for turn rate
        state.gyro.x = -state.gyro.z * 0.5; // Coordinated bank
    };

    switch(state.phase) {
        case SimPhase.G_WAYPOINT_1:
            turnTo(targetHeading1);
            if (state.timer > 10) { state.phase = SimPhase.G_WAYPOINT_2; state.timer = 0; }
            break;
        case SimPhase.G_WAYPOINT_2:
            turnTo(targetHeading2);
            if (state.timer > 10) { state.phase = SimPhase.G_WAYPOINT_3; state.timer = 0; }
            break;
        case SimPhase.G_WAYPOINT_3:
            turnTo(targetHeading3);
            if (state.timer > 10) { state.phase = SimPhase.G_RETURN; state.timer = 0; }
            break;
        case SimPhase.G_RETURN:
            turnTo(180);
            if (state.timer > 10) { state.phase = SimPhase.G_WAYPOINT_1; state.timer = 0; }
            break;
    }
}
