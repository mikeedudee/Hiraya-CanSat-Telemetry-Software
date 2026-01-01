
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  // Haversine Formula
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

export const calculateSpeed = (
  prevLat: number, 
  prevLon: number, 
  prevTime: number, 
  currLat: number, 
  currLon: number, 
  currTime: number
): number => {
  const dist = calculateDistance(prevLat, prevLon, currLat, currLon);
  const timeDiff = (currTime - prevTime) / 1000; // seconds
  
  if (timeDiff <= 0) return 0;
  return dist / timeDiff; // m/s
};

export const calculateSmoothedSpeed = (history: {latitude: number, longitude: number, timeElapsed: number}[], windowSize: number = 12): number => {
  if (history.length < 2) return 0;
  
  // Use a sliding window (increased to 12 for better smoothing)
  const endIndex = history.length - 1;
  const startIndex = Math.max(0, endIndex - windowSize);
  
  if (startIndex === endIndex) return 0;

  const startPoint = history[startIndex];
  const endPoint = history[endIndex];

  // Calculate total path distance within the window
  let totalDist = 0;
  for(let i = startIndex; i < endIndex; i++) {
     totalDist += calculateDistance(
       history[i].latitude, history[i].longitude, 
       history[i+1].latitude, history[i+1].longitude
     );
  }

  const timeDiff = (endPoint.timeElapsed - startPoint.timeElapsed) / 1000; // seconds

  if (timeDiff <= 0.1) return 0; // Avoid division by near-zero

  return totalDist / timeDiff; // m/s
};

export const calculateVerticalSpeed = (
  prevAlt: number,
  prevTime: number,
  currAlt: number,
  currTime: number
): number => {
  const altDiff = currAlt - prevAlt;
  const timeDiff = (currTime - prevTime) / 1000; // seconds
  
  if (timeDiff <= 0) return 0;
  return altDiff / timeDiff; // m/s
};

export const calculateTotalDistance = (history: {latitude: number, longitude: number}[]): number => {
  let total = 0;
  for (let i = 1; i < history.length; i++) {
    total += calculateDistance(
      history[i-1].latitude, history[i-1].longitude,
      history[i].latitude, history[i].longitude
    );
  }
  return total;
};

// Geodetic calculation to find new point given distance and bearing
export const calculateDestination = (lat: number, lon: number, dist: number, bearing: number) => {
    const R = 6371e3;
    const angDist = dist / R;
    const radLat = lat * Math.PI / 180;
    const radLon = lon * Math.PI / 180;
    const radBear = bearing * Math.PI / 180;

    const lat2 = Math.asin(Math.sin(radLat) * Math.cos(angDist) + 
                           Math.cos(radLat) * Math.sin(angDist) * Math.cos(radBear));
    const lon2 = radLon + Math.atan2(Math.sin(radBear) * Math.sin(angDist) * Math.cos(radLat),
                                     Math.cos(angDist) - Math.sin(radLat) * Math.sin(lat2));
    
    return {
        lat: lat2 * 180 / Math.PI,
        lon: lon2 * 180 / Math.PI
    };
};

export const predictLanding = (
    lat: number, lon: number, alt: number, 
    vSpeed: number, hSpeed: number, heading: number, 
    windSpeed: number, windDir: number
) => {
    // Only predict if descending (negative vertical speed)
    // Threshold set to -0.5 m/s to filter out noise
    if (vSpeed >= -0.5) return null;

    const timeToGround = Math.abs(alt / vSpeed);

    // Current Drone Velocity Vector (Ground Track from GPS)
    const radHeading = heading * Math.PI / 180;
    const droneVx = hSpeed * Math.sin(radHeading);
    const droneVy = hSpeed * Math.cos(radHeading);

    // Wind Vector (User Input Bias)
    // Wind Direction is "From", so vector is opposite (+180)
    const radWind = (windDir + 180) * Math.PI / 180;
    const windVx = windSpeed * Math.sin(radWind);
    const windVy = windSpeed * Math.cos(radWind);

    // Combined Drift Vector
    // Note: If hSpeed is GPS-derived, it technically already includes wind drift.
    // However, we add the 'windSpeed' param as an additional environmental bias 
    // or correction factor as requested.
    const totalVx = droneVx + windVx;
    const totalVy = droneVy + windVy;

    // Total distance traveled during descent
    const dist = Math.sqrt(totalVx*totalVx + totalVy*totalVy) * timeToGround;
    
    // Resultant Bearing
    const finalBearingRad = Math.atan2(totalVx, totalVy);
    const finalBearing = (finalBearingRad * 180 / Math.PI + 360) % 360;

    return calculateDestination(lat, lon, dist, finalBearing);
}
