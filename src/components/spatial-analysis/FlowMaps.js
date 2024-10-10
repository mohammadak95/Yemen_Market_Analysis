// src/components/spatial-analysis/FlowMaps.js

import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import { Typography, Paper } from '@mui/material';
import ForceGraph2D from 'react-force-graph-2d';

const FlowMaps = ({ flowMaps, uniqueRegions }) => {
  if (!flowMaps) {
    return (
      <Typography variant="body1">
        Loading flow maps data...
      </Typography>
    );
  }

  if (flowMaps.length === 0) {
    return (
      <Typography variant="body1">
        No flow maps data available.
      </Typography>
    );
  }

  // Verify the first flowMap has required properties
  if (!flowMaps[0].source || !flowMaps[0].target || flowMaps[0].weight === undefined) {
    console.warn('FlowMaps data is missing required properties:', flowMaps[0]);
    return (
      <Typography variant="body1" color="error">
        Flow maps data is malformed. Please check the data source.
      </Typography>
    );
  }

  // Prepare nodes and links for the graph
  const nodes = uniqueRegions.map((region) => ({
    id: region.region_id,
    name: region.region_id,
  }));

  const links = flowMaps.map((flow) => ({
    source: flow.source,
    target: flow.target,
    value: flow.weight,
  }));

  // Reference to the ForceGraph component for potential manipulations
  const fgRef = useRef();

  return (
    <Paper sx={{ p: 2, mt: 3 }}>
      <Typography variant="h6" gutterBottom>
        Flow Maps
      </Typography>
      <ForceGraph2D
        ref={fgRef}
        graphData={{ nodes, links }}
        nodeLabel="name"
        linkDirectionalArrowLength={3.5}
        linkDirectionalArrowRelPos={1}
        linkWidth={(link) => Math.log(link.value + 1)}
        nodeAutoColorBy="id"
        width={800}
        height={600}
        // Optional: Add interactivity
        onNodeClick={(node) => {
          // Implement actions on node click, e.g., highlighting
          console.log('Node clicked:', node);
        }}
        onLinkClick={(link) => {
          console.log('Link clicked:', link);
        }}
      />
    </Paper>
  );
};

FlowMaps.propTypes = {
  flowMaps: PropTypes.arrayOf(
    PropTypes.shape({
      source: PropTypes.string.isRequired,
      target: PropTypes.string.isRequired,
      weight: PropTypes.number.isRequired,
    })
  ).isRequired,
  uniqueRegions: PropTypes.arrayOf(
    PropTypes.shape({
      region_id: PropTypes.string.isRequired,
      geometry: PropTypes.object.isRequired,
    })
  ).isRequired,
};

export default FlowMaps;
