// src/components/analysis/spatial-analysis/components/flows/FlowLines.js

import React from 'react';
import { Polyline, Tooltip } from 'react-leaflet';
import 'leaflet-arrowheads';

const FlowLines = ({ flows, colorScale, metricType }) => {
  return flows.map((flow, index) => {
    const width = Math.max(1, Math.min(8, Math.sqrt(flow.value) / 2));
    const color = colorScale(flow.value);

    return (
      <Polyline
        key={`${flow.source}-${flow.target}-${index}`}
        positions={[
          [flow.source_coordinates[0], flow.source_coordinates[1]],
          [flow.target_coordinates[0], flow.target_coordinates[1]]
        ]}
        pathOptions={{
          color,
          weight: width,
          opacity: 0.7
        }}
        arrowheads={{
          fill: true,
          size: '10px',
          frequency: 'endonly'
        }}
      >
        <Tooltip>
          <div>
            <strong>{flow.source} → {flow.target}</strong><br/>
            {metricType === 'volume' && `Total Flow: ${flow.total_flow.toFixed(2)}`}
            {metricType === 'price_diff' && `Price Diff: ${flow.avg_price_differential.toFixed(2)}`}
            {metricType === 'frequency' && `Flow Count: ${flow.flow_count}`}
          </div>
        </Tooltip>
      </Polyline>
    );
  });
};

export default FlowLines;