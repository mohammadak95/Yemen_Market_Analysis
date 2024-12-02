//src/components/analysis/spatial/utils/mapUtils.js

import chroma from 'chroma-js';

export const getResidualStats = (residuals) => {
  if (!residuals || residuals.length === 0) return null;

  const values = residuals.map(r => r.residual);
  return {
    min: Math.min(...values),
    max: Math.max(...values),
    mean: values.reduce((a, b) => a + b, 0) / values.length,
    std: Math.sqrt(
      values.reduce((a, b) => a + Math.pow(b - values.reduce((c, d) => c + d, 0) / values.length, 2), 0) / values.length
    )
  };
};

export const getColorScale = (min, max, theme) => {
  // Create a diverging color scale centered at 0
  const maxAbs = Math.max(Math.abs(min), Math.abs(max));
  
  return chroma.scale([
    theme.palette.error.main,    // Negative residuals
    theme.palette.grey[300],     // Zero
    theme.palette.success.main   // Positive residuals
  ]).domain([-maxAbs, 0, maxAbs]);
};