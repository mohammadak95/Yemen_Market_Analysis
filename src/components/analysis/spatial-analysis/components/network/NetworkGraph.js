// src/components/analysis/spatial-analysis/components/network/NetworkGraph.js

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '@mui/material/styles';
import ForceGraph2D from 'react-force-graph-2d';

const NetworkGraph = ({ threshold }) => {
  const theme = useTheme();

  // Mock data for now - we'll replace this with real data later
  const data = useMemo(() => ({
    nodes: [
      { id: 'Market1', name: 'Market 1' },
      { id: 'Market2', name: 'Market 2' },
      { id: 'Market3', name: 'Market 3' }
    ],
    links: [
      { source: 'Market1', target: 'Market2', value: 0.8 },
      { source: 'Market2', target: 'Market3', value: 0.6 },
      { source: 'Market1', target: 'Market3', value: 0.4 }
    ]
  }), []);

  return (
    <div style={{ height: '500px', width: '100%' }}>
      <ForceGraph2D
        graphData={data}
        nodeColor={theme.palette.primary.main}
        linkColor={theme.palette.secondary.main}
        nodeLabel={node => node.name}
        linkLabel={link => link.value.toFixed(2)}
        linkWidth={2}
        nodeRelSize={6}
      />
    </div>
  );
};

NetworkGraph.propTypes = {
  threshold: PropTypes.number,
};

NetworkGraph.defaultProps = {
  threshold: 0.5,
};

export default NetworkGraph;
