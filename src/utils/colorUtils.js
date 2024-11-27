// src/utils/colorUtils.js

/**
 * Calculate contrast ratio between two colors
 * @param {string} foreground - Foreground color in hex format
 * @param {string} background - Background color in hex format
 * @returns {number} Contrast ratio
 */
export const calculateContrast = (foreground, background) => {
    const getLuminance = (hexColor) => {
      const rgb = hexColor.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
      if (!rgb) return 0;
      
      const [r, g, b] = [
        parseInt(rgb[1], 16) / 255,
        parseInt(rgb[2], 16) / 255,
        parseInt(rgb[3], 16) / 255
      ].map(val => {
        return val <= 0.03928
          ? val / 12.92
          : Math.pow((val + 0.055) / 1.055, 2.4);
      });
  
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
  
    const l1 = getLuminance(foreground);
    const l2 = getLuminance(background);
    const brightest = Math.max(l1, l2);
    const darkest = Math.min(l1, l2);
    
    return (brightest + 0.05) / (darkest + 0.05);
  };
  
  /**
   * Get appropriate text color based on background
   * @param {string} backgroundColor - Background color in hex format
   * @returns {string} Text color in hex format
   */
  export const getTextColor = (backgroundColor) => {
    const whiteContrast = calculateContrast('#FFFFFF', backgroundColor);
    const blackContrast = calculateContrast('#000000', backgroundColor);
    return whiteContrast > blackContrast ? '#FFFFFF' : '#000000';
  };
  
  /**
   * Interpolate between two colors
   * @param {string} color1 - First color in hex format
   * @param {string} color2 - Second color in hex format
   * @param {number} ratio - Interpolation ratio (0-1)
   * @returns {string} Interpolated color in hex format
   */
  export const interpolateColor = (color1, color2, ratio) => {
    const r1 = parseInt(color1.slice(1, 3), 16);
    const g1 = parseInt(color1.slice(3, 5), 16);
    const b1 = parseInt(color1.slice(5, 7), 16);
    
    const r2 = parseInt(color2.slice(1, 3), 16);
    const g2 = parseInt(color2.slice(3, 5), 16);
    const b2 = parseInt(color2.slice(5, 7), 16);
    
    const r = Math.round(r1 + (r2 - r1) * ratio);
    const g = Math.round(g1 + (g2 - g1) * ratio);
    const b = Math.round(b1 + (b2 - b1) * ratio);
    
    return `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`;
  };
  
  /**
   * Create a color scale function
   * @param {Array} colors - Array of colors in hex format
   * @param {Array} domain - Array of domain values
   * @returns {Function} Color scale function
   */
  export const createColorScale = (colors, domain) => {
    return (value) => {
      // Find the segment containing the value
      for (let i = 0; i < domain.length - 1; i++) {
        if (value >= domain[i] && value <= domain[i + 1]) {
          const ratio = (value - domain[i]) / (domain[i + 1] - domain[i]);
          return interpolateColor(colors[i], colors[i + 1], ratio);
        }
      }
      return value <= domain[0] ? colors[0] : colors[colors.length - 1];
    };
  };
  
  /**
   * Adjust color brightness
   * @param {string} color - Color in hex format
   * @param {number} factor - Brightness adjustment factor (negative darkens, positive lightens)
   * @returns {string} Adjusted color in hex format
   */
  export const adjustBrightness = (color, factor) => {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    
    const adjust = (value) => {
      return Math.min(255, Math.max(0, Math.round(value * (1 + factor))));
    };
    
    return `#${[r, g, b].map(x => adjust(x).toString(16).padStart(2, '0')).join('')}`;
  };