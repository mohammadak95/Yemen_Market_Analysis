// src/components/analysis/spatial-analysis/hooks/useNetworkData.js

import { useMemo } from 'react';
import { eigenvectorCentrality, betweennessCentrality } from '../utils/networkAnalysis.js';

const useNetworkData = (correlationMatrix = {}, accessibility = {}, threshold = 0.5) => {
  return useMemo(() => {
    const nodes = Object.keys(correlationMatrix).map(market => ({
      id: market,
      name: market,
      accessibility: typeof accessibility[market] === 'number' ? accessibility[market] : 1
    }));

    const links = [];
    const linksSet = new Set();

    Object.entries(correlationMatrix).forEach(([source, correlations]) => {
      Object.entries(correlations).forEach(([target, weight]) => {
        if (Math.abs(weight) >= threshold) {
          const sortedPair = [source, target].sort();
          const edgeKey = sortedPair.join('-');
          if (!linksSet.has(edgeKey)) {
            linksSet.add(edgeKey);
            links.push({ source: sortedPair[0], target: sortedPair[1], weight: Math.abs(weight) });
          }
        }
      });
    });

    console.log(`Correlation Threshold: ${threshold}`);
    console.log(`Number of nodes: ${nodes.length}`);
    console.log(`Number of links after thresholding: ${links.length}`);

    // Choose centrality measure
    let centralityMeasures = eigenvectorCentrality(nodes, links);
    if (Object.keys(centralityMeasures).length === 0) {
      console.warn('Eigenvector centrality failed or returned empty. Falling back to betweenness centrality.');
      centralityMeasures = betweennessCentrality(nodes, links);
    }

    const centralityValues = Object.values(centralityMeasures);

    // Check if centralityValues is empty
    if (centralityValues.length === 0) {
      console.warn('Centrality measures are empty. Assigning default values.');
      nodes.forEach(node => {
        centralityMeasures[node.id] = 0;
      });
    }

    const maxCentrality = Math.max(...centralityValues);
    const minCentrality = Math.min(...centralityValues);

    const normalizedCentrality = {};
    Object.keys(centralityMeasures).forEach(nodeId => {
      normalizedCentrality[nodeId] = (centralityMeasures[nodeId] - minCentrality) / (maxCentrality - minCentrality || 1);
    });

    return {
      nodes,
      links,
      centralityMeasures: normalizedCentrality
    };
  }, [correlationMatrix, accessibility, threshold]);
};

export default useNetworkData;