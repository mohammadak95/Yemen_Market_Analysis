// src/utils/regionMappingValidator.js

/**
 * Validate network data without region mapping
 * @param {Array} nodes - Network nodes
 * @param {Array} links - Network links
 * @returns {Object} Validation result
 */
export const validateNetworkData = (nodes, links) => {
  const errors = [];
  const warnings = [];

  // Check if we have nodes and links
  if (!nodes?.length) {
    errors.push('No nodes available');
  }

  if (!links?.length) {
    errors.push('No links available');
  }

  if (errors.length > 0) {
    return {
      isValid: false,
      errors,
      warnings
    };
  }

  // Create a set of node IDs for quick lookup
  const nodeIds = new Set(nodes.map(n => n.id));

  // Validate links
  links.forEach((link, index) => {
    if (!link.source || !link.target) {
      errors.push(`Link at index ${index} missing source or target`);
      return;
    }

    if (!nodeIds.has(link.source)) {
      warnings.push(`Source node "${link.source}" not found for link at index ${index}`);
    }

    if (!nodeIds.has(link.target)) {
      warnings.push(`Target node "${link.target}" not found for link at index ${index}`);
    }

    if (!Number.isFinite(link.value)) {
      warnings.push(`Invalid flow value for link at index ${index}`);
    }
  });

  // Check for isolated nodes
  const connectedNodes = new Set();
  links.forEach(link => {
    connectedNodes.add(link.source);
    connectedNodes.add(link.target);
  });

  nodes.forEach(node => {
    if (!connectedNodes.has(node.id)) {
      warnings.push(`Node "${node.id}" is isolated (no connections)`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};
