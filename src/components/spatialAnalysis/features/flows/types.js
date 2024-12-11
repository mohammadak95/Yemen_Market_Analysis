/**
 * Types and constants for market flow analysis
 */

// Flow strength thresholds
export const FLOW_THRESHOLDS = {
  HIGH: 0.7,    // Strong market flow
  MEDIUM: 0.4,  // Moderate market flow
  LOW: 0.2      // Weak market flow
};

// Flow types based on characteristics
export const FLOW_TYPES = {
  BIDIRECTIONAL: 'bidirectional',  // Flow in both directions
  UNIDIRECTIONAL: 'unidirectional', // Flow in one direction
  INTERMITTENT: 'intermittent'     // Irregular flow
};

// Network metrics thresholds
export const NETWORK_THRESHOLDS = {
  DENSITY: {
    HIGH: 0.6,    // High network density
    MEDIUM: 0.3,  // Medium network density
    LOW: 0.1      // Low network density
  },
  CENTRALITY: {
    HIGH: 0.8,    // High centrality
    MEDIUM: 0.5,  // Medium centrality
    LOW: 0.2      // Low centrality
  }
};

// Flow visualization parameters
export const VISUALIZATION_PARAMS = {
  // Flow line parameters
  MIN_FLOW_WIDTH: 1,       // Minimum flow line width
  MAX_FLOW_WIDTH: 5,       // Maximum flow line width
  MIN_OPACITY: 0.4,        // Minimum flow opacity
  MAX_OPACITY: 0.8,        // Maximum flow opacity
  
  // Market node parameters
  MIN_NODE_SIZE: 4,        // Minimum market node size
  MAX_NODE_SIZE: 10,       // Maximum market node size
  NODE_BORDER_WIDTH: 1,    // Node border width
  NODE_OPACITY: 0.8,       // Node fill opacity
  NODE_BORDER_OPACITY: 1,  // Node border opacity
  
  // Selection parameters
  SELECTION_SCALE: 1.5,    // Scale factor for selected elements
  HOVER_SCALE: 1.2,        // Scale factor for hovered elements
  
  // Animation parameters
  ANIMATION_DURATION: 200  // Animation duration in ms
};

// Flow color scheme
export const FLOW_COLORS = {
  POSITIVE: '#1976d2',    // Positive flow direction (blue)
  NEGATIVE: '#d32f2f',    // Negative flow direction (red)
  NEUTRAL: '#757575',     // Neutral or baseline flow (gray)
  SELECTED: '#ffc107',    // Selected flow highlight (amber)
  NODE: {
    FILL: '#1976d2',      // Node fill color (blue)
    BORDER: '#ffffff',    // Node border color (white)
    SELECTED: '#ffc107',  // Selected node color (amber)
    INACTIVE: '#757575'   // Inactive node color (gray)
  }
};

// Flow status indicators
export const FLOW_STATUS = {
  ACTIVE: 'Active',           // Currently active flow
  INACTIVE: 'Inactive',       // Currently inactive flow
  STABLE: 'Stable',          // Stable flow volume
  PARTIAL: 'Partial'         // Partially active flow
};

// Analysis parameters
export const ANALYSIS_PARAMS = {
  MIN_FLOW_VALUE: 0.1,    // Minimum significant flow value
  MIN_CONNECTIONS: 2,     // Minimum connections for analysis
  TIME_WINDOW: 3,         // Default time window for analysis
  SIGNIFICANCE_LEVEL: 0.05 // Statistical significance threshold
};

// Helper functions for flow validation
export const flowValidation = {
  // Filter data by date - handles multiple data structures (flows, shocks, time series)
  filterFlowsByDate: (data, selectedDate) => {
    if (!Array.isArray(data) || !selectedDate) {
      console.debug('Invalid parameters for filterFlowsByDate:', { 
        hasData: Boolean(data), 
        isArray: Array.isArray(data),
        selectedDate 
      });
      return [];
    }

    // Convert selectedDate to YYYY-MM format if it's in YYYY-MM-DD format
    const targetDate = selectedDate.substring(0, 7);

    return data.filter(item => {
      if (!item) return false;

      // Handle different date field names
      const itemDate = item.date || item.month || null;
      if (!itemDate) {
        console.debug('Missing date field in item:', item);
        return false;
      }

      // Convert item date to YYYY-MM format for comparison
      const normalizedDate = itemDate.substring(0, 7);
      return normalizedDate === targetDate;
    });
  },

  // Validate coordinates structure
  isValidCoordinates: (coordinates) => {
    const isValid = coordinates &&
      Array.isArray(coordinates.source) &&
      Array.isArray(coordinates.target) &&
      coordinates.source.length === 2 &&
      coordinates.target.length === 2 &&
      coordinates.source.every(coord => typeof coord === 'number' && !isNaN(coord)) &&
      coordinates.target.every(coord => typeof coord === 'number' && !isNaN(coord));

    if (!isValid && coordinates) {
      console.debug('Invalid coordinates:', {
        hasSource: Boolean(coordinates.source),
        hasTarget: Boolean(coordinates.target),
        sourceValid: Array.isArray(coordinates.source) && coordinates.source.length === 2,
        targetValid: Array.isArray(coordinates.target) && coordinates.target.length === 2,
        sourceCoords: coordinates.source,
        targetCoords: coordinates.target
      });
    }

    return isValid;
  },

  // Validate basic flow structure
  isValidFlow: (flow) => {
    const isValid = flow && 
      typeof flow === 'object' &&
      typeof flow.source === 'string' &&
      typeof flow.target === 'string' &&
      typeof flow.total_flow === 'number' &&
      !isNaN(flow.total_flow);

    if (!isValid && flow) {
      console.debug('Invalid flow:', {
        hasSource: typeof flow.source === 'string',
        hasTarget: typeof flow.target === 'string',
        hasTotalFlow: typeof flow.total_flow === 'number',
        source: flow.source,
        target: flow.target,
        total_flow: flow.total_flow
      });
    }

    return isValid;
  },

  // Get flow value (total_flow)
  getFlowValue: (flow) => {
    if (!flow || typeof flow.total_flow !== 'number' || isNaN(flow.total_flow)) {
      return 0;
    }
    return flow.total_flow;
  },

  // Normalize flow value against a maximum
  normalizeFlow: (flow, maxFlow) => {
    const value = flowValidation.getFlowValue(flow);
    if (!maxFlow || maxFlow <= 0) {
      console.debug('Invalid maxFlow for normalization:', maxFlow);
      return 0;
    }
    return value / maxFlow;
  },

  // Get flow status based on normalized value
  getFlowStatus: (normalizedFlow) => {
    if (typeof normalizedFlow !== 'number' || isNaN(normalizedFlow)) {
      console.debug('Invalid normalizedFlow for status:', normalizedFlow);
      return FLOW_STATUS.INACTIVE;
    }

    if (normalizedFlow >= FLOW_THRESHOLDS.HIGH) return FLOW_STATUS.ACTIVE;
    if (normalizedFlow >= FLOW_THRESHOLDS.MEDIUM) return FLOW_STATUS.STABLE;
    if (normalizedFlow >= FLOW_THRESHOLDS.LOW) return FLOW_STATUS.PARTIAL;
    return FLOW_STATUS.INACTIVE;
  },

  // Calculate node size based on flow volume
  calculateNodeSize: (totalFlow, maxFlow) => {
    if (!maxFlow || maxFlow <= 0) return VISUALIZATION_PARAMS.MIN_NODE_SIZE;
    const normalizedFlow = totalFlow / maxFlow;
    return VISUALIZATION_PARAMS.MIN_NODE_SIZE + 
      (normalizedFlow * (VISUALIZATION_PARAMS.MAX_NODE_SIZE - VISUALIZATION_PARAMS.MIN_NODE_SIZE));
  },

  // Calculate flow metrics for an array of flows
  calculateFlowMetrics: (flows) => {
    if (!Array.isArray(flows)) {
      console.debug('Invalid flows array for metrics calculation');
      return null;
    }

    const validFlows = flows.filter(flowValidation.isValidFlow);
    if (!validFlows.length) {
      console.debug('No valid flows found for metrics calculation');
      return null;
    }

    const flowValues = validFlows.map(flowValidation.getFlowValue);
    const totalFlow = flowValues.reduce((sum, val) => sum + val, 0);
    const avgFlow = totalFlow / flowValues.length;
    const maxFlow = Math.max(...flowValues);
    const minFlow = Math.min(...flowValues);

    // Calculate standard deviation
    const variance = flowValues.reduce((sum, val) => 
      sum + Math.pow(val - avgFlow, 2), 0) / flowValues.length;
    const stdDev = Math.sqrt(variance);

    return {
      totalFlow,
      avgFlow,
      maxFlow,
      minFlow,
      stdDev,
      count: validFlows.length,
      normalized: flowValues.map(value => value / maxFlow)
    };
  }
};

export default {
  FLOW_THRESHOLDS,
  FLOW_TYPES,
  NETWORK_THRESHOLDS,
  VISUALIZATION_PARAMS,
  ANALYSIS_PARAMS,
  FLOW_COLORS,
  FLOW_STATUS,
  flowValidation
};
