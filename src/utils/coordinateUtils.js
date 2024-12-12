// src/utils/coordinateUtils.js
export const convertUTMtoLatLng = (easting, northing) => {
    // Constants for UTM Zone 38N to WGS84 conversion
    const k0 = 0.9996;
    const a = 6378137;
    const e = 0.081819191;
    const e1sq = 0.006739497;
    const falseEasting = 500000;
    const zone = 38;
  
    try {
      const x = easting - falseEasting;
      const y = northing;
  
      const M = y / k0;
      const mu = M / (a * (1 - e * e / 4 - 3 * e * e * e * e / 64));
  
      const phi1 = mu + (3 * e1sq / 2 - 27 * Math.pow(e1sq, 3) / 32) * Math.sin(2 * mu);
      const phi2 = phi1 + (21 * Math.pow(e1sq, 2) / 16 - 55 * Math.pow(e1sq, 4) / 32) * Math.sin(4 * mu);
      const phi = phi2 + (151 * Math.pow(e1sq, 3) / 96) * Math.sin(6 * mu);
  
      const N1 = a / Math.sqrt(1 - e * e * Math.sin(phi) * Math.sin(phi));
      const T1 = Math.tan(phi) * Math.tan(phi);
      const C1 = (e * e * Math.cos(phi) * Math.cos(phi)) / (1 - e * e);
      const R1 = (a * (1 - e * e)) / Math.pow(1 - e * e * Math.sin(phi) * Math.sin(phi), 1.5);
      const D = x / (N1 * k0);
  
      const lat = phi - (N1 * Math.tan(phi) / R1) * (
        (D * D) / 2 -
        (5 + 3 * T1 + 10 * C1 - 4 * Math.pow(C1, 2) - 9 * e * e) * Math.pow(D, 4) / 24 +
        (61 + 90 * T1 + 298 * C1 + 45 * Math.pow(T1, 2) - 252 * e * e - 3 * Math.pow(C1, 2)) * Math.pow(D, 6) / 720
      );
  
      const lon = ((zone * 6 - 183) + (D - (1 + 2 * T1 + C1) * Math.pow(D, 3) / 6 +
        (5 - 2 * C1 + 28 * T1 - 3 * Math.pow(C1, 2) + 8 * e * e + 24 * Math.pow(T1, 2)) * Math.pow(D, 5) / 120)
      ) / Math.cos(phi) * (180 / Math.PI);
  
      return [
        lon * (180 / Math.PI),
        lat * (180 / Math.PI)
      ];
    } catch (error) {
      console.error('Error converting coordinates:', error);
      return null;
    }
  };
  