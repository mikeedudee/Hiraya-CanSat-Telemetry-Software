# 🚀 HIRAYA Ground Station v7.0

![Version](https://img.shields.io/badge/version-7.0.0-blue.svg)
![Status](https://img.shields.io/badge/status-Mission%20Ready-success.svg)
![License](https://img.shields.io/badge/license-Proprietary-red.svg)

**A high-performance, hardware-accelerated telemetry visualization system designed for the 2026 Rocket and CanSatellite Competition.**

Architected and developed by **Francis Mike John Camogao**.

## 🛸 Mission Overview
The HIRAYA Ground Station is a custom-built mission control interface designed to visualize high-frequency telemetry data from CanSats and Sounding Rockets. Unlike standard serial monitors, this software leverages **GPU Hardware Acceleration** (WebGL) to render real-time 3D orientation and flight dynamics without choking the CPU logic thread.

## ⚡ Key Engineering Features

### 1. Hardware Acceleration Pipeline
* **Hybrid Computing Architecture:** Separates logic processing (CPU) from rendering (GPU).
* **Dynamic Throttling:** Features selectable modes (Eco/Hybrid/GPU) that adjust the React render loop from 10Hz up to unthrottled real-time processing depending on available hardware (optimized for NVIDIA RTX 4050).

### 2. Advanced Flight Dynamics
* **G-Force Derivation Engine:** Calculates instantaneous structural load ($g$) based on velocity deltas ($\Delta v / \Delta t$).
* **Max Q Monitoring:** Real-time calculation of dynamic pressure ($q = \frac{1}{2}\rho v^2$) to monitor aerodynamic stress.
* **Atmospheric Density Tracking:** Visualizes air density changes for parachute deployment prediction.

### 3. Operational Robustness
* **Visual Calibration:** Includes "Night Vision" (Red-shift) mode and global contrast/gamma correction for field laptop visibility under harsh sunlight.
* **Ghost-State Initialization:** Prevents layout thrashing during initial data stream connection.
* **Black Box Recording:** (Planned) IndexedDB integration for zero-loss data logging.

## 🛠️ Technology Stack
* **Core:** React 18, TypeScript, Vite
* **Runtime:** Electron (Windows x64 Build)
* **Visualization:** Three.js (WebGL), Recharts
* **Styling:** TailwindCSS (Glassmorphism UI)
* **Protocol:** Web Serial API / Node Serial

## ⚠️ Legal & Licensing
**Copyright © 2026 Francis Mike John Camogao.**
This software is **strictly proprietary**. Access to the source code does not grant rights to copy, modify, or distribute the work. A limited license is granted to the HIRAYA Team for competition purposes only.
