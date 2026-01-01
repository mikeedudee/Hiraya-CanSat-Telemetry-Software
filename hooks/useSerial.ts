import { useState, useRef, useCallback, useEffect } from 'react';
import { ConnectionStatus, TelemetryPacket, CsvField, SerialConfig, SimulationPreset, HardwareMode } from '../types';
import { parseTelemetryLine, generateMockData, setSimScenario } from '../utils/parser';

interface UseSerialProps {
  serialConfig: SerialConfig;
  csvOrder: CsvField[];
  separator?: string;
  simInterval?: number;
  simPreset?: SimulationPreset;
  windSpeed?: number;
  windDirection?: number;
  streamThrottle?: number;
  // AETHER NOTE: New Prop to control processing power
  calculationMode?: HardwareMode;
  onDataReceived: (data: TelemetryPacket) => void;
  onAutoReconnectAttempt?: () => void;
}

export const useSerial = ({ 
  serialConfig, 
  csvOrder, 
  separator = ',', 
  simInterval = 100,
  simPreset = SimulationPreset.ROCKET_LAUNCH,
  windSpeed = 0,
  windDirection = 0,
  streamThrottle = 0,
  // Default to 'hybrid' if not specified
  calculationMode = 'hybrid',
  onDataReceived, 
  onAutoReconnectAttempt 
}: UseSerialProps) => {
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [availablePorts, setAvailablePorts] = useState<any[]>([]);
  
  const [isAutoReconnectEnabled, setIsAutoReconnectEnabled] = useState(true);
  const [simProgress, setSimProgress] = useState(0); 
  const [fileLength, setFileLength] = useState(0);

  const portRef = useRef<any>(null); 
  const readerRef = useRef<ReadableStreamDefaultReader<string> | null>(null);
  const keepReadingRef = useRef(false);
  
  const simulationIntervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const fileLinesRef = useRef<string[]>([]);
  const fileIndexRef = useRef<number>(0);
  const isFileModeRef = useRef<boolean>(false);
  
  // Logic Refs
  const csvOrderRef = useRef(csvOrder);
  const separatorRef = useRef(separator);
  const lastStreamEmitRef = useRef(0);
  
  // AETHER NOTE: This ref calculates the REAL throttle based on Hardware Mode
  const effectiveThrottleRef = useRef(streamThrottle);
  
  const simIntervalRef = useRef(simInterval);
  const simPresetRef = useRef(simPreset);
  const windSpeedRef = useRef(windSpeed);
  const windDirectionRef = useRef(windDirection);
  
  const onDataReceivedRef = useRef(onDataReceived);
  const onAutoReconnectAttemptRef = useRef(onAutoReconnectAttempt);

  useEffect(() => { csvOrderRef.current = csvOrder; }, [csvOrder]);
  useEffect(() => { separatorRef.current = separator; }, [separator]);
  useEffect(() => { simIntervalRef.current = simInterval; }, [simInterval]);
  useEffect(() => { windSpeedRef.current = windSpeed; }, [windSpeed]);
  useEffect(() => { windDirectionRef.current = windDirection; }, [windDirection]);

  // AETHER NOTE: HARDWARE ACCELERATION LOGIC
  // This effect updates the throttle limit whenever the mode changes
  useEffect(() => {
      let minDelay = 0;
      
      // CPU Mode: Force 100ms delay (Low Power)
      if (calculationMode === 'cpu') minDelay = 100;
      
      // Hybrid Mode: Force 30ms delay (~30 FPS)
      if (calculationMode === 'hybrid') minDelay = 30;
      
      // GPU Mode: Unlocked (0ms) - Uses full system power
      if (calculationMode === 'gpu') minDelay = 0;

      // The final throttle is the higher of: User Setting vs Hardware Floor
      effectiveThrottleRef.current = Math.max(streamThrottle, minDelay);
  }, [streamThrottle, calculationMode]);

  useEffect(() => {
     if (simPreset !== simPresetRef.current) {
         simPresetRef.current = simPreset;
         if (isSimulating && !isFileModeRef.current) {
             setSimScenario(simPreset);
         }
     }
  }, [simPreset, isSimulating]);
  
  useEffect(() => { onDataReceivedRef.current = onDataReceived; }, [onDataReceived]);
  useEffect(() => { onAutoReconnectAttemptRef.current = onAutoReconnectAttempt; }, [onAutoReconnectAttempt]);
  
  const reconnectIntervalRef = useRef<number | null>(null);

  const checkPorts = useCallback(async () => {
    if ('serial' in navigator) {
      try {
        // @ts-ignore
        const ports = await navigator.serial.getPorts();
        setAvailablePorts(ports);
        return ports;
      } catch (e) {
        console.error("Error checking ports", e);
        return [];
      }
    }
    return [];
  }, []);

  useEffect(() => {
    const init = async () => { await checkPorts(); };
    init();
    const handleConnectEvent = () => { checkPorts(); };
    const handleDisconnectEvent = () => { checkPorts(); };

    if ('serial' in navigator) {
        // @ts-ignore
        navigator.serial.addEventListener('connect', handleConnectEvent);
        // @ts-ignore
        navigator.serial.addEventListener('disconnect', handleDisconnectEvent);
    }
    return () => {
        if ('serial' in navigator) {
            // @ts-ignore
            navigator.serial.removeEventListener('connect', handleConnectEvent);
            // @ts-ignore
            navigator.serial.removeEventListener('disconnect', handleDisconnectEvent);
        }
    };
  }, [checkPorts]);

  const cleanup = useCallback(async () => {
    keepReadingRef.current = false;
    if (reconnectIntervalRef.current) {
      clearInterval(reconnectIntervalRef.current);
      reconnectIntervalRef.current = null;
    }
    if (readerRef.current) {
      try { await readerRef.current.cancel(); } catch (e) { console.warn("Error canceling reader", e); }
      readerRef.current = null;
    }
    if (portRef.current) {
      try { await portRef.current.close(); } catch (e) { console.warn("Error closing port", e); }
      portRef.current = null;
    }
  }, []);

  const requestAccess = useCallback(async () => {
    setErrorMessage(null);
    if (!('serial' in navigator)) {
        alert("Web Serial API is not supported.");
        return false;
    }
    try {
        // @ts-ignore
        await navigator.serial.requestPort();
        await checkPorts();
        return true;
    } catch (e: any) {
        if (e.name === 'NotFoundError') {
            setErrorMessage("Device selection cancelled by user.");
        } else {
            setErrorMessage(`Device selection failed: ${e.message}`);
        }
        return false;
    }
  }, [checkPorts]);

  const connectToPort = async (port: any) => {
    try {
      setErrorMessage(null);
      setStatus(ConnectionStatus.CONNECTING);
      
      try {
        await port.open({ 
            baudRate: serialConfig.baudRate,
            dataBits: serialConfig.dataBits,
            stopBits: serialConfig.stopBits,
            parity: serialConfig.parity,
            flowControl: serialConfig.flowControl
        });
      } catch (err: any) {
        if (err.name === 'InvalidStateError' || (err.message && err.message.includes('already open'))) {
            try {
                await port.close();
                await new Promise(resolve => setTimeout(resolve, 200));
                await port.open({ 
                    baudRate: serialConfig.baudRate,
                    dataBits: serialConfig.dataBits,
                    stopBits: serialConfig.stopBits,
                    parity: serialConfig.parity,
                    flowControl: serialConfig.flowControl
                });
            } catch (closeErr) {
                throw new Error("Port is hung. Please unplug and replug the device.");
            }
        } else {
            throw err;
        }
      }
      
      portRef.current = port;
      keepReadingRef.current = true;
      setStatus(ConnectionStatus.CONNECTED);
      lastStreamEmitRef.current = 0; 
      
      if (reconnectIntervalRef.current) {
        clearInterval(reconnectIntervalRef.current);
        reconnectIntervalRef.current = null;
      }

      readLoop(port);
    } catch (error: any) {
      console.error("Connection failed", error);
      setErrorMessage(error.message || "Failed to open serial port.");
      setStatus(ConnectionStatus.ERROR);
      portRef.current = null;
    }
  };

  const connect = useCallback(async (specificPort?: any) => {
    if (isSimulating) return;
    if (!('serial' in navigator)) {
      alert("Web Serial API is not supported.");
      return;
    }
    try {
      setErrorMessage(null);
      let port = specificPort;
      if (!port) throw new Error("No port selected.");
      await connectToPort(port);
    } catch (error: any) {
      setErrorMessage(error.message || "Connection failed.");
      setStatus(ConnectionStatus.ERROR);
    }
  }, [serialConfig, isSimulating]);

  const disconnect = useCallback(async () => {
    setErrorMessage(null);
    await cleanup();
    stopSimulation();
    setStatus(ConnectionStatus.DISCONNECTED);
  }, [cleanup]);

  const readLoop = async (port: any) => {
    if (port.readable.locked) {
        setErrorMessage("Port stream is locked. Try disconnecting and reconnecting.");
        setStatus(ConnectionStatus.ERROR);
        return;
    }

    const textDecoder = new TextDecoderStream();
    port.readable.pipeTo(textDecoder.writable);
    const reader = textDecoder.readable.getReader();
    readerRef.current = reader;

    let buffer = '';
    const MAX_BUFFER_SIZE = 1 * 1024 * 1024; 

    try {
      while (keepReadingRef.current) {
        const { value, done } = await reader.read();
        if (done) break;
        
        buffer += value;
        if (buffer.length > MAX_BUFFER_SIZE) {
            buffer = '';
            continue;
        }

        const lines = buffer.split('\n');
        
        for (let i = 0; i < lines.length - 1; i++) {
          const now = Date.now();
          // AETHER NOTE: Using the hardware-optimized throttle
          if (now - lastStreamEmitRef.current >= effectiveThrottleRef.current) {
              const packet = parseTelemetryLine(lines[i], csvOrderRef.current, separatorRef.current);
              if (packet) {
                if (onDataReceivedRef.current) onDataReceivedRef.current(packet);
                lastStreamEmitRef.current = now;
              }
          }
        }
        buffer = lines[lines.length - 1];
      }
    } catch (error: any) {
      if (error.name === 'NetworkError') {
          setErrorMessage("Connection Lost: Device was disconnected.");
      } else {
          setErrorMessage(`Stream Error: ${error.message}`);
      }
      setStatus(ConnectionStatus.ERROR);
      triggerAutoReconnect();
    } finally {
      try { reader.releaseLock(); } catch (e) {}
      if (keepReadingRef.current) triggerAutoReconnect();
    }
  };

  const triggerAutoReconnect = useCallback(() => {
     if (reconnectIntervalRef.current || !isAutoReconnectEnabled) return;
     reconnectIntervalRef.current = window.setInterval(async () => {
        if (onAutoReconnectAttemptRef.current) onAutoReconnectAttemptRef.current();
        // @ts-ignore
        const ports = await navigator.serial.getPorts();
        if (ports.length > 0) await connectToPort(ports[0]);
     }, 3000); 
  }, [serialConfig, isAutoReconnectEnabled]);

  useEffect(() => {
    if (!('serial' in navigator)) return;
    const handleDisconnect = (e: Event) => {
        // @ts-ignore
       if (portRef.current && e.target === portRef.current) {
          keepReadingRef.current = false; 
          portRef.current = null;
          setStatus(ConnectionStatus.ERROR);
          setErrorMessage("Alert: Device physically disconnected.");
          triggerAutoReconnect();
       }
    };
    // @ts-ignore
    navigator.serial.addEventListener('disconnect', handleDisconnect);
    // @ts-ignore
    return () => navigator.serial.removeEventListener('disconnect', handleDisconnect);
  }, [triggerAutoReconnect]);

  const runSimulationTick = useCallback(() => {
    if (isFileModeRef.current) {
        if (fileIndexRef.current < fileLinesRef.current.length) {
            const line = fileLinesRef.current[fileIndexRef.current];
            const packet = parseTelemetryLine(line, csvOrderRef.current, separatorRef.current);
            if (packet && onDataReceivedRef.current) onDataReceivedRef.current(packet);
            fileIndexRef.current++;
            setSimProgress(fileIndexRef.current / fileLinesRef.current.length);
        } else {
            stopSimulation();
            setErrorMessage("Simulation playback finished.");
        }
    } else {
        const elapsed = Date.now() - startTimeRef.current;
        const mockData = generateMockData(elapsed, simPresetRef.current, windSpeedRef.current, windDirectionRef.current);
        if (onDataReceivedRef.current) onDataReceivedRef.current(mockData);
    }
  }, []);

  const startSimulation = useCallback((fileContent?: string) => {
    setIsSimulating(true);
    setErrorMessage(null);
    setStatus(ConnectionStatus.CONNECTED); 
    startTimeRef.current = Date.now();
    
    if (fileContent) {
        isFileModeRef.current = true;
        const lines = fileContent.split('\n').filter(l => l.trim().length > 0);
        fileLinesRef.current = lines;
        setFileLength(lines.length);
        fileIndexRef.current = 0;
        setSimProgress(0);
    } else {
        isFileModeRef.current = false;
        fileLinesRef.current = [];
        setFileLength(0);
        setSimScenario(simPresetRef.current);
    }
    
    if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
    
    // AETHER NOTE: Also apply the Hardware Throttle to the Simulation
    const tickRate = Math.max(simIntervalRef.current, effectiveThrottleRef.current);
    simulationIntervalRef.current = window.setInterval(runSimulationTick, tickRate);

  }, [runSimulationTick]);

  const stopSimulation = useCallback(() => {
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
      simulationIntervalRef.current = null;
    }
    setIsSimulating(false);
    isFileModeRef.current = false;
    fileLinesRef.current = [];
    setStatus(ConnectionStatus.DISCONNECTED);
  }, []);

  const seekSimulation = useCallback((percentage: number) => {
    if (!isFileModeRef.current || fileLinesRef.current.length === 0) return;
    const newIndex = Math.floor(percentage * fileLinesRef.current.length);
    fileIndexRef.current = newIndex;
    setSimProgress(percentage);
  }, []);

  // Hot-reload simulation speed if hardware mode changes
  useEffect(() => {
      if (isSimulating) {
          if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
          const tickRate = Math.max(simInterval, effectiveThrottleRef.current);
          simulationIntervalRef.current = window.setInterval(runSimulationTick, tickRate);
      }
  }, [simInterval, isSimulating, runSimulationTick, calculationMode]);

  const toggleAutoReconnect = useCallback(() => { setIsAutoReconnectEnabled(prev => !prev); }, []);

  useEffect(() => { return () => { cleanup(); }; }, [cleanup]);

  return {
    status,
    errorMessage,
    connect,
    disconnect,
    isSimulating,
    isFileMode: isFileModeRef.current,
    startSimulation,
    stopSimulation,
    seekSimulation,
    simProgress,
    availablePorts,
    refreshPorts: checkPorts,
    requestAccess, 
    isAutoReconnectEnabled,
    toggleAutoReconnect
  };
};