
import React, { useState, useRef, useEffect } from 'react';
import { Move3d, RefreshCw, Upload, Scaling, Eye, RotateCcw, X, Loader2, AlertCircle, Rotate3d, ArrowRight } from 'lucide-react';
import * as THREE from 'three';
// AETHER NOTE: Fixed imports for local compatibility (removed .js and switched to examples/jsm)
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { HardwareMode } from '../types';
import HirayaLogo from '../src/assets/Hiraya Logo Circular.png';

interface AttitudeCubeProps {
  gx: number;
  gy: number;
  gz: number;
  showShadows?: boolean;
  hardwareMode?: HardwareMode; // New Prop
}

const LABEL_NAMES = ['FRONT', 'BACK', 'RIGHT', 'LEFT', 'TOP', 'BOTTOM'];

export const AttitudeCube: React.FC<AttitudeCubeProps> = ({ gx, gy, gz, showShadows = true, hardwareMode = 'hybrid' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const pivotRef = useRef<THREE.Group | null>(null); 
  const modelRef = useRef<THREE.Object3D | null>(null);
  const animationReqRef = useRef<number>(0);
  
  // Refs for direct DOM manipulation of labels
  const labelDivsRef = useRef<(HTMLDivElement | null)[]>([]);
  const markersRef = useRef<{ [key: string]: THREE.Mesh }>({});
  
  const [isDefault, setIsDefault] = useState(true);
  const [modelScale, setModelScale] = useState(1);
  const [manualRot, setManualRot] = useState({ x: 0, y: 0, z: 0 }); // Re-orient state
  const [fileName, setFileName] = useState<string | null>(null);
  const [showResize, setShowResize] = useState(false);
  const [showReorient, setShowReorient] = useState(false);
  
  // Loading State
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Helper: Dispose of 3D objects recursively
  const disposeObject = (obj: THREE.Object3D) => {
    if (!obj) return;
    obj.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((m: THREE.Material) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
  };

  // Effect to update shadows dynamically
  useEffect(() => {
    if (rendererRef.current) {
        // GPU Mode forces shadows if requested, CPU/Low mode disables them to save resources
        const effectiveShadows = hardwareMode === 'cpu' ? false : showShadows;
        
        rendererRef.current.shadowMap.enabled = effectiveShadows;
        if (sceneRef.current) {
             sceneRef.current.traverse((child) => {
                 if (child instanceof THREE.Mesh) {
                     child.castShadow = effectiveShadows;
                     child.receiveShadow = effectiveShadows;
                 }
                 if (child instanceof THREE.DirectionalLight) {
                     child.castShadow = effectiveShadows;
                 }
             });
        }
    }
  }, [showShadows, hardwareMode]);

  // Initialize Three.js
  useEffect(() => {
    if (!containerRef.current) return;

    // AETHER NOTE: Restored ResizeObserver for robust layout handling
    // Fixed: Wrapped in requestAnimationFrame to avoid "ResizeObserver loop limit exceeded"
    const resizeObserver = new ResizeObserver((entries) => {
        window.requestAnimationFrame(() => {
            if (!Array.isArray(entries) || !entries.length) return;
            for (let entry of entries) {
                if (rendererRef.current && cameraRef.current) {
                const { width, height } = entry.contentRect;
                if (height === 0) return; 
                cameraRef.current.aspect = width / height;
                cameraRef.current.updateProjectionMatrix();
                rendererRef.current.setSize(width, height);
                }
            }
        });
    });
    resizeObserver.observe(containerRef.current);

    const width = containerRef.current.clientWidth || 300;
    const height = containerRef.current.clientHeight || 300;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    
    // Camera - AETHER NOTE: Using your preferred "Lifted" coordinates
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(4, 3, 5); 
    cameraRef.current = camera;

    // Configure Renderer based on Hardware Mode
    const powerPref = hardwareMode === 'gpu' ? 'high-performance' : (hardwareMode === 'cpu' ? 'low-power' : 'default');
    const antialias = hardwareMode !== 'cpu'; // Disable AA on low power

    // Renderer
    const renderer = new THREE.WebGLRenderer({ 
        alpha: true, 
        antialias: antialias, 
        preserveDrawingBuffer: true,
        powerPreference: powerPref
    });
    
    renderer.setSize(width, height);
    
    // PERF FIX: Cap pixel ratio to 2.0 to prevent massive GPU load on high-DPI (Retina) screens
    // Unless specifically in GPU mode, then use full native resolution
    const pixelRatio = hardwareMode === 'gpu' ? window.devicePixelRatio : Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(pixelRatio);
    
    const effectiveShadows = hardwareMode === 'cpu' ? false : showShadows;
    renderer.shadowMap.enabled = effectiveShadows; 
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // AETHER NOTE: Fix pointer events for interactions
    renderer.domElement.style.pointerEvents = 'auto'; 
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    
    containerRef.current.innerHTML = ''; 
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = false;
    controls.minDistance = 1.5;
    controls.maxDistance = 10;
    
    // AETHER NOTE: Restored target offset to lift object visually
    controls.target.set(0, -0.8, 0); 

    controlsRef.current = controls;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(5, 10, 7.5);
    dirLight.castShadow = effectiveShadows;
    dirLight.shadow.mapSize.width = hardwareMode === 'gpu' ? 1024 : 512; // Lower res shadows on hybrid
    dirLight.shadow.mapSize.height = hardwareMode === 'gpu' ? 1024 : 512;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x60a5fa, 0.5);
    fillLight.position.set(-5, 0, -5);
    scene.add(fillLight);

    const bottomLight = new THREE.DirectionalLight(0xffffff, 0.3);
    bottomLight.position.set(0, -10, 0);
    scene.add(bottomLight);

    // Pivot Group
    const pivot = new THREE.Group();
    scene.add(pivot);
    pivotRef.current = pivot;

    // Axis Helpers
    const axisGroup = new THREE.Group();
    const axisRadius = 0.025;
    const axisLength = 2.0;
    const axisMatConfig = { depthTest: false, transparent: true, opacity: 0.9, toneMapped: false };

    // X Axis
    const xGeo = new THREE.CylinderGeometry(axisRadius, axisRadius, axisLength, 12);
    xGeo.rotateZ(-Math.PI / 2);
    xGeo.translate(axisLength/2, 0, 0);
    const xAxis = new THREE.Mesh(xGeo, new THREE.MeshBasicMaterial({ color: 0xff4444, ...axisMatConfig }));
    axisGroup.add(xAxis);

    // Y Axis
    const yGeo = new THREE.CylinderGeometry(axisRadius, axisRadius, axisLength, 12);
    yGeo.translate(0, axisLength/2, 0);
    const yAxis = new THREE.Mesh(yGeo, new THREE.MeshBasicMaterial({ color: 0x44ff44, ...axisMatConfig }));
    axisGroup.add(yAxis);

    // Z Axis
    const zGeo = new THREE.CylinderGeometry(axisRadius, axisRadius, axisLength, 12);
    zGeo.rotateX(Math.PI / 2);
    zGeo.translate(0, 0, axisLength/2);
    const zAxis = new THREE.Mesh(zGeo, new THREE.MeshBasicMaterial({ color: 0x4488ff, ...axisMatConfig }));
    axisGroup.add(zAxis);

    // Origin Sphere
    const originGeo = new THREE.SphereGeometry(axisRadius * 2.5, 16, 16);
    const originMesh = new THREE.Mesh(originGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, ...axisMatConfig }));
    axisGroup.add(originMesh);

    pivot.add(axisGroup);

    // Invisible Markers
    const markerGeo = new THREE.BoxGeometry(0.05, 0.05, 0.05);
    const markerMat = new THREE.MeshBasicMaterial({ visible: false });
    
    const createMarker = (x: number, y: number, z: number, name: string) => {
        const mesh = new THREE.Mesh(markerGeo, markerMat);
        mesh.position.set(x, y, z);
        pivot.add(mesh);
        markersRef.current[name] = mesh;
    };

    createMarker(0, 0, 1.5, 'FRONT');
    createMarker(0, 0, -1.5, 'BACK');
    createMarker(1.5, 0, 0, 'RIGHT');
    createMarker(-1.5, 0, 0, 'LEFT');
    createMarker(0, 1.5, 0, 'TOP');
    createMarker(0, -1.5, 0, 'BOTTOM');

    // Initial Load
    loadDefaultModel();

    // Animation Loop
    const tempV = new THREE.Vector3();

    const animate = () => {
      animationReqRef.current = requestAnimationFrame(animate);
      
      if (controlsRef.current) controlsRef.current.update();

      if (cameraRef.current && pivotRef.current && containerRef.current) {
          const canvasWidth = containerRef.current.clientWidth;
          const canvasHeight = containerRef.current.clientHeight;

          LABEL_NAMES.forEach((name, index) => {
             const mesh = markersRef.current[name];
             const div = labelDivsRef.current[index];

             if (mesh && div) {
                 mesh.getWorldPosition(tempV);
                 tempV.project(cameraRef.current!);
                 
                 if (tempV.z < 1) {
                     const x = (tempV.x * 0.5 + 0.5) * canvasWidth;
                     const y = (-(tempV.y * 0.5) + 0.5) * canvasHeight;
                     
                     div.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
                     div.style.display = 'block';
                 } else {
                     div.style.display = 'none';
                 }
             }
          });
      }

      if (rendererRef.current && scene && cameraRef.current) {
        rendererRef.current.render(scene, cameraRef.current);
      }
    };
    animate();

    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(animationReqRef.current);
      
      // Cleanup Scene
      if (sceneRef.current) {
        sceneRef.current.traverse((object) => {
            if (object instanceof THREE.Mesh) {
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                    if (Array.isArray(object.material)) object.material.forEach((m: any) => m.dispose());
                    else object.material.dispose();
                }
            }
        });
      }

      // Cleanup Renderer
      if (rendererRef.current) {
        rendererRef.current.dispose();
        if (containerRef.current && rendererRef.current.domElement.parentNode === containerRef.current) {
            containerRef.current.removeChild(rendererRef.current.domElement);
        }
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hardwareMode]); // Re-run when hardware settings change

  // Telemetry Updates
  useEffect(() => {
    if (pivotRef.current) {
      pivotRef.current.rotation.order = 'ZYX'; 
      pivotRef.current.rotation.x = THREE.MathUtils.degToRad(gx); 
      pivotRef.current.rotation.z = THREE.MathUtils.degToRad(-gy); 
      pivotRef.current.rotation.y = THREE.MathUtils.degToRad(-gz); 
    }
  }, [gx, gy, gz]);

  // Scale Updates
  useEffect(() => {
    if (modelRef.current) {
      modelRef.current.scale.set(modelScale, modelScale, modelScale);
    }
  }, [modelScale]);

  // Manual Rotation Updates (Re-orient)
  useEffect(() => {
    if (modelRef.current && !isDefault) {
       modelRef.current.rotation.x = THREE.MathUtils.degToRad(manualRot.x);
       modelRef.current.rotation.y = THREE.MathUtils.degToRad(manualRot.y);
       modelRef.current.rotation.z = THREE.MathUtils.degToRad(manualRot.z);
    }
  }, [manualRot, isDefault]);

  const loadDefaultModel = () => {
    if (!pivotRef.current) return;
    
    if (modelRef.current) {
        pivotRef.current.remove(modelRef.current);
        disposeObject(modelRef.current);
    }

    const group = new THREE.Group();

    // Default CanSat Cylinder
    const geometry = new THREE.CylinderGeometry(0.5, 0.5, 1.5, 32);
    const material = new THREE.MeshStandardMaterial({ 
        color: 0x06b6d4, 
        metalness: 0.6, 
        roughness: 0.2,
        transparent: true,
        opacity: 0.8
    });
    const cylinder = new THREE.Mesh(geometry, material);
    cylinder.castShadow = true;
    cylinder.receiveShadow = true;
    
    const inner = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 1.2, 0.35),
        new THREE.MeshBasicMaterial({ color: 0x10b981, wireframe: true })
    );

    const capGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.1, 32);
    const capMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.2 });
    const topCap = new THREE.Mesh(capGeo, capMat);
    topCap.position.y = 0.75;
    topCap.castShadow = true;
    
    const botCap = new THREE.Mesh(capGeo, capMat);
    botCap.position.y = -0.75;
    botCap.castShadow = true;

    const ant = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 0.8),
        new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1.0 })
    );
    ant.position.set(0.3, 1.15, 0);
    ant.castShadow = true;

    group.add(cylinder, inner, topCap, botCap, ant);
    group.rotation.set(0,0,0);

    pivotRef.current.add(group);
    modelRef.current = group;
    
    setIsDefault(true);
    setFileName("Default CanSat");
    setModelScale(1);
    setManualRot({ x: 0, y: 0, z: 0 });
    setErrorMsg(null);
    setShowReorient(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pivotRef.current) return;

    setIsLoading(true);
    setLoadingProgress(0);
    setErrorMsg(null);

    const url = URL.createObjectURL(file);
    const extension = file.name.split('.').pop()?.toLowerCase();

    // Reset input value so same file can be selected again
    e.target.value = '';

    if (extension === 'stl') {
        const loader = new STLLoader();
        loader.load(url, 
        (geometry) => { 
            if (modelRef.current && pivotRef.current) {
                pivotRef.current.remove(modelRef.current);
                disposeObject(modelRef.current);
            }
            
            try {
              geometry.computeVertexNormals();
              geometry.center();
              
              geometry.computeBoundingBox();
              const box = geometry.boundingBox!;
              const size = new THREE.Vector3();
              box.getSize(size);
              const maxDim = Math.max(size.x, size.y, size.z);
              
              if (maxDim < 0.0001) throw new Error("Model dimensions too small.");

              const scaleFactor = 2 / maxDim;

              const material = new THREE.MeshStandardMaterial({ 
                  color: 0x94a3b8, 
                  metalness: 0.5, 
                  roughness: 0.5,
                  side: THREE.DoubleSide
              });
              
              const mesh = new THREE.Mesh(geometry, material);
              mesh.scale.set(scaleFactor, scaleFactor, scaleFactor);
              mesh.castShadow = true;
              mesh.receiveShadow = true;
              
              // We don't hardcode rotation here anymore. We use the manualRot state.
              // Most STLs are Z-up, Three.js is Y-up. -90 X rotation is usually needed.
              setManualRot({ x: -90, y: 0, z: 0 });

              pivotRef.current?.add(mesh);
              modelRef.current = mesh;

              setIsDefault(false);
              setFileName(file.name);
              setModelScale(1); 
              setIsLoading(false);
              setShowReorient(true); // Show the re-orient tools
            } catch (err: any) {
               console.error(err);
               setErrorMsg(err.message || "Failed to process STL geometry.");
               setIsLoading(false);
               loadDefaultModel(); 
            }
            
            URL.revokeObjectURL(url);
        }, 
        (xhr) => { 
            if (xhr.lengthComputable) {
                const percentComplete = (xhr.loaded / xhr.total) * 100;
                setLoadingProgress(Math.round(percentComplete));
            }
        },
        (err) => { 
            console.error(err);
            setErrorMsg("Failed to load file. Ensure valid binary/ascii STL.");
            setIsLoading(false);
            loadDefaultModel();
            URL.revokeObjectURL(url);
        });
    } else {
        setErrorMsg("Invalid file type. Please upload .STL");
        setIsLoading(false);
    }
  };

  const resetView = () => {
    if (controlsRef.current && cameraRef.current) {
        controlsRef.current.reset();
        // AETHER NOTE: Explicitly reset to "Lifted" target
        controlsRef.current.target.set(0, -0.8, 0); 
        // AETHER NOTE: Reset to preferred distance
        cameraRef.current.position.set(4, 3, 5);
        cameraRef.current.lookAt(0, -0.8, 0);
        controlsRef.current.update();
    }
  };

  const rotateMesh = (axis: 'x' | 'y' | 'z') => {
      setManualRot(prev => ({
          ...prev,
          [axis]: prev[axis] + 90
      }));
  };

  return (
    <div className="w-full h-full relative group">
        {/* 3D Canvas */}
        <div ref={containerRef} className="w-full h-full bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden cursor-move shadow-inner" style={{ minHeight: '300px' }} />

        {/* Header Overlay */}
        <div className="absolute top-2 left-3 z-10 pointer-events-none">
            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2 drop-shadow-md">
                <Move3d className="w-3 h-3 text-indigo-400" /> Attitude
            </h3>
        </div>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-black/80 z-40 flex flex-col items-center justify-center backdrop-blur-sm p-4 text-center">
             <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
             <span className="text-xs text-slate-200 font-bold mb-1">Loading 3D Model...</span>
             <div className="w-32 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div 
                   className="h-full bg-indigo-500 transition-all duration-300 ease-out" 
                   style={{ width: `${loadingProgress}%` }}
                />
             </div>
             <span className="text-[10px] text-slate-400 font-mono mt-1">{loadingProgress}%</span>
          </div>
        )}

        {/* Error Overlay */}
        {errorMsg && (
             <div className="absolute inset-0 bg-black/80 z-50 flex flex-col items-center justify-center backdrop-blur-sm p-4 text-center animate-in fade-in">
                 <AlertCircle className="w-8 h-8 text-rose-500 mb-2" />
                 <span className="text-sm text-rose-200 font-bold">Model Load Failed</span>
                 <p className="text-xs text-rose-300/80 mt-1 max-w-[200px]">{errorMsg}</p>
                 <button 
                   onClick={() => setErrorMsg(null)}
                   className="mt-3 px-3 py-1 bg-rose-900/50 hover:bg-rose-900 border border-rose-700 text-rose-100 text-[10px] font-bold uppercase rounded transition-colors"
                   title="Close Error Message"
                 >
                    Dismiss
                 </button>
             </div>
        )}

        {/* Orientation Labels */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
            {LABEL_NAMES.map((name, i) => (
                <div 
                    key={name}
                    ref={(el) => { labelDivsRef.current[i] = el; }}
                    className="absolute text-[8px] font-bold font-mono text-slate-500 bg-black/30 px-1 rounded backdrop-blur-[1px]"
                    style={{ 
                        left: 0, 
                        top: 0, 
                        display: 'none',
                        opacity: 0.7,
                        transform: 'translate(-50%, -50%)',
                        willChange: 'transform'
                    }}
                >
                    {name}
                </div>
            ))}
        </div>

        {/* Controls Toolbar */}
        <div className="absolute top-2 right-2 z-20 flex flex-col gap-2 items-end pointer-events-auto">
            {/* Upload Button */}
            <label className={`p-1.5 rounded bg-black/60 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors border border-slate-700 backdrop-blur-sm cursor-pointer shadow-lg ${isLoading ? 'opacity-50 pointer-events-none' : ''}`} title="Upload Custom .STL Model">
                <Upload className="w-3.5 h-3.5" />
                <input type="file" className="hidden" accept=".stl" onChange={handleFileUpload} disabled={isLoading} />
            </label>

            {/* Resize Toggle */}
            <button 
                onClick={() => { setShowResize(!showResize); setShowReorient(false); }} 
                className={`p-1.5 rounded transition-colors border backdrop-blur-sm shadow-lg ${showResize ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-black/60 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700'}`}
                title="Scale/Resize Model"
            >
                <Scaling className="w-3.5 h-3.5" />
            </button>

            {/* Re-orient Toggle (Only for Custom Models) */}
            {!isDefault && (
                <button 
                    onClick={() => { setShowReorient(!showReorient); setShowResize(false); }}
                    className={`p-1.5 rounded transition-colors border backdrop-blur-sm shadow-lg ${showReorient ? 'bg-cyan-600 border-cyan-500 text-white' : 'bg-black/60 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700'}`}
                    title="Re-orient Custom Model (Rotate Geometry)"
                >
                    <Rotate3d className="w-3.5 h-3.5" />
                </button>
            )}

            {/* Reset View */}
            <button 
                onClick={resetView} 
                className="p-1.5 rounded bg-black/60 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors border border-slate-700 backdrop-blur-sm shadow-lg"
                title="Reset Camera View to Default Position"
            >
                <Eye className="w-3.5 h-3.5" />
            </button>

            {/* Reset Model */}
            {!isDefault && (
                <button 
                    onClick={loadDefaultModel} 
                    className="p-1.5 rounded bg-black/60 hover:bg-rose-900/50 text-slate-400 hover:text-rose-400 transition-colors border border-slate-700 backdrop-blur-sm shadow-lg"
                    title="Revert to Default CanSat Model"
                >
                    <RefreshCw className="w-3.5 h-3.5" />
                </button>
            )}
        </div>

        {/* Resize Panel */}
        {showResize && (
            <div className="absolute top-10 right-10 z-30 bg-black/80 border border-slate-700 p-3 rounded-lg backdrop-blur-md shadow-2xl flex flex-col gap-2 w-32 animate-in fade-in slide-in-from-right-5 duration-200">
                <div className="flex justify-between items-center pb-1 border-b border-slate-700/50">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Model Scale</span>
                    <button onClick={() => setShowResize(false)} className="text-slate-500 hover:text-white" title="Close Resize Panel"><X className="w-3 h-3"/></button>
                </div>
                <div className="flex items-center gap-2">
                     <input 
                        type="range" 
                        min="0.1" 
                        max="3" 
                        step="0.1" 
                        value={modelScale} 
                        onChange={(e) => setModelScale(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                        title="Drag to adjust model size"
                    />
                </div>
                <div className="text-right text-[10px] font-mono text-cyan-400">{modelScale.toFixed(1)}x</div>
            </div>
        )}

        {/* Re-Orient Panel */}
        {showReorient && !isDefault && (
             <div className="absolute top-10 right-10 z-30 bg-black/80 border border-slate-700 p-3 rounded-lg backdrop-blur-md shadow-2xl flex flex-col gap-2 w-40 animate-in fade-in slide-in-from-right-5 duration-200">
                <div className="flex justify-between items-center pb-1 border-b border-slate-700/50">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Align Model</span>
                    <button onClick={() => setShowReorient(false)} className="text-slate-500 hover:text-white" title="Close Panel"><X className="w-3 h-3"/></button>
                </div>
                <p className="text-[8px] text-slate-500 leading-tight">Rotate mesh to match sensor frame (Front/Up).</p>
                <div className="grid grid-cols-3 gap-1">
                    <button onClick={() => rotateMesh('x')} className="bg-slate-800 hover:bg-cyan-900/50 border border-slate-600 text-[10px] text-cyan-400 font-bold py-1 rounded transition-colors" title="Rotate X +90°">X</button>
                    <button onClick={() => rotateMesh('y')} className="bg-slate-800 hover:bg-emerald-900/50 border border-slate-600 text-[10px] text-emerald-400 font-bold py-1 rounded transition-colors" title="Rotate Y +90°">Y</button>
                    <button onClick={() => rotateMesh('z')} className="bg-slate-800 hover:bg-indigo-900/50 border border-slate-600 text-[10px] text-indigo-400 font-bold py-1 rounded transition-colors" title="Rotate Z +90°">Z</button>
                </div>
                <div className="grid grid-cols-3 gap-1 text-[8px] text-center font-mono text-slate-400">
                    <span>{manualRot.x % 360}°</span>
                    <span>{manualRot.y % 360}°</span>
                    <span>{manualRot.z % 360}°</span>
                </div>
             </div>
        )}

        {/* Telemetry Data Footer */}
        <div className="absolute bottom-6 left-3 text-right text-[10px] font-mono text-slate-500 pointer-events-none drop-shadow-md z-10">
            <div className="flex items-center justify-end gap-2">
                 <span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.5)]"></span>
                 <span>PITCH: {gx.toFixed(1)}°</span>
            </div>
            <div className="flex items-center justify-end gap-2">
                 <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]"></span>
                 <span>ROLL: {gy.toFixed(1)}°</span>
            </div>
            <div className="flex items-center justify-end gap-2">
                 <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.5)]"></span>
                 <span>YAW: {gz.toFixed(1)}°</span>
            </div>
        </div>

        {/* File Name Footer */}
        <div className="absolute bottom-2 left-3 text-[9px] font-mono text-slate-600 pointer-events-none z-10">
             {fileName && <span className="text-indigo-400/80">Model: {fileName.length > 12 ? fileName.substring(0,12)+'...' : fileName}</span>}
        </div>
    </div>
  );
};
