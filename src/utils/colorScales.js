// src/utils/colorScales.js

import * as d3 from 'd3';
import { COLOR_SCALES } from '../constants';

export const getColorScale = (visualizationMode) => {
  switch (visualizationMode) {
    case 'prices':
      return d3.scaleQuantize().domain([0, 100]).range(COLOR_SCALES.PRICES);
    case 'integration':
      return d3.scaleQuantize().domain([0, 1]).range(COLOR_SCALES.INTEGRATION);
    case 'shocks':
      return d3.scaleQuantize().domain([0, 5]).range(COLOR_SCALES.SHOCKS);
    default:
      return () => '#cccccc';
  }
};