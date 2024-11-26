// src/components/analysis/spatial-analysis/components/flows/FlowLines.js

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Polyline, Tooltip } from 'react-leaflet';
import { scaleLinear } from 'd3-scale';
import { useTheme } from '@mui/material/styles';

const FlowLines = ({ flows, metricType }) => {
  const theme = useTheme();

  // Determine the value range for scaling
  const values = flows.map(flow => flow[metricType]);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);

  // Define color and width scales
  const colorScale = useMemo(() => scaleLinear()
    .domain([minValue, maxValue])
    .range([theme.palette.info.light, theme.palette.info.dark]), [minValue, maxValue, theme]);

  const widthScale = useMemo(() => scaleLinear()
    .domain([minValue, maxValue])
    .range([1, 8]), [minValue, maxValue]);

  return (
    <>
      {flows.map((flow, index) => {
        const sourceCoords = [flow.source_coordinates[1], flow.source_coordinates[0]];
        const targetCoords = [flow.target_coordinates[1], flow.target_coordinates[0]];

        return (
          <Polyline
            key={`${flow.source}-${flow.target}-${index}`}
            positions={[sourceCoords, targetCoords]}
            pathOptions={{
              color: colorScale(flow[metricType]),
              weight: widthScale(flow[metricType]),
              opacity: 0.7,
            }}
          >
            <Tooltip>
              <div>
                <strong>{flow.source} → {flow.target}</strong><br />
                {metricType === 'total_flow' && `Total Flow: ${flow.total_flow.toFixed(2)}`}
                {metricType === 'avg_price_differential' && `Avg Price Diff: ${flow.avg_price_differential.toFixed(2)}`}
                {metricType === 'flow_count' && `Flow Count: ${flow.flow_count}`}
              </div>
            </Tooltip>
          </Polyline>
        );
      })}
    </>
  );
};

FlowLines.propTypes = {
  flows: PropTypes.array.isRequired,
  metricType: PropTypes.string.isRequired,
};

export default React.memo(FlowLines);