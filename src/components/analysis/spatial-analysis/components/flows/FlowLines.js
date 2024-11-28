// src/components/analysis/spatial-analysis/components/flows/FlowLines.js

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Polyline, Tooltip } from 'react-leaflet';
import { scaleLinear } from 'd3-scale';
import { useTheme } from '@mui/material/styles';

const FlowLines = ({ flows, metricType }) => {
  const theme = useTheme();

  // Determine the value range for scaling
  const values = useMemo(() => flows.map((flow) => flow[metricType]), [flows, metricType]);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);

  // Define color and width scales
  const colorScale = useMemo(
    () =>
      scaleLinear()
        .domain([minValue, maxValue])
        .range([theme.palette.info.light, theme.palette.info.dark]),
    [minValue, maxValue, theme]
  );

  const widthScale = useMemo(
    () => scaleLinear().domain([minValue, maxValue]).range([1, 8]),
    [minValue, maxValue]
  );

  if (!flows.length) {
    return null;
  }

  return (
    <>
      {flows.map((flow, index) => {
        // Ensure coordinates exist and are in the correct format
        if (!flow.sourceCoords || !flow.targetCoords) {
          return null;
        }

        const sourceCoords = [flow.sourceCoords[1], flow.sourceCoords[0]];
        const targetCoords = [flow.targetCoords[1], flow.targetCoords[0]];

        return (
          <Polyline
            key={`${flow.sourceName}-${flow.targetName}-${index}`}
            positions={[sourceCoords, targetCoords]}
            pathOptions={{
              color: colorScale(flow[metricType]),
              weight: widthScale(flow[metricType]),
              opacity: 0.7,
            }}
          >
            <Tooltip>
              <div>
                <strong>
                  {flow.sourceName} → {flow.targetName}
                </strong>
                <br />
                {metricType === 'total_flow' && `Total Flow: ${flow.total_flow.toFixed(2)}`}
                {metricType === 'avg_price_differential' &&
                  `Avg Price Diff: ${flow.avg_price_differential.toFixed(2)}`}
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
  flows: PropTypes.arrayOf(
    PropTypes.shape({
      sourceName: PropTypes.string.isRequired,
      targetName: PropTypes.string.isRequired,
      sourceCoords: PropTypes.arrayOf(PropTypes.number).isRequired,
      targetCoords: PropTypes.arrayOf(PropTypes.number).isRequired,
      total_flow: PropTypes.number,
      avg_price_differential: PropTypes.number,
      flow_count: PropTypes.number,
    })
  ).isRequired,
  metricType: PropTypes.oneOf(['total_flow', 'avg_price_differential', 'flow_count']).isRequired,
};

export default React.memo(FlowLines);