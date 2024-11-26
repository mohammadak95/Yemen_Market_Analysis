// src/components/analysis/spatial-analysis/components/autocorrelation/MoranScatterPlot.js

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Label,
} from 'recharts';
import { useSelector } from 'react-redux';
import {
  selectSpatialAutocorrelation,
  selectTimeSeriesData,
} from '../../../../../selectors/optimizedSelectors';

const MoranScatterPlot = () => {
  const spatialAutocorrelation = useSelector(selectSpatialAutocorrelation);
  const timeSeriesData = useSelector(selectTimeSeriesData);

  // Prepare data for the scatter plot
  const data = useMemo(() => {
    if (!spatialAutocorrelation || !spatialAutocorrelation.local) return [];

    return Object.entries(spatialAutocorrelation.local).map(([region, values]) => {
      const regionData = timeSeriesData.find((d) => d.region.toLowerCase() === region.toLowerCase());
      return {
        region,
        value: regionData ? regionData.avgUsdPrice : 0,
        laggedValue: values.local_i,
      };
    });
  }, [spatialAutocorrelation, timeSeriesData]);

  const globalMoranI = spatialAutocorrelation?.global?.moran_i ?? 0;

  return (
    <ResponsiveContainer width="100%" height={400}>
      <ScatterChart>
        <CartesianGrid />
        <XAxis dataKey="value" name="Price" unit=" USD">
          <Label value="Average Price (USD)" offset={-5} position="insideBottom" />
        </XAxis>
        <YAxis dataKey="laggedValue" name="Spatial Lag" unit="">
          <Label value="Spatial Lag of Price" angle={-90} position="insideLeft" />
        </YAxis>
        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
        <Scatter name="Regions" data={data} fill="#8884d8" />
        <ReferenceLine x={0} stroke="red" />
        <ReferenceLine y={0} stroke="red" />
        <ReferenceLine
          slope={globalMoranI}
          intercept={0}
          stroke="green"
          strokeDasharray="3 3"
          label={`Moran's I: ${globalMoranI.toFixed(3)}`}
        />
      </ScatterChart>
    </ResponsiveContainer>
  );
};

export default MoranScatterPlot;