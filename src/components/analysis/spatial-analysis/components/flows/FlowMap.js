// src/components/analysis/spatial-analysis/components/flows/FlowMap.js

import React, { useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import { useTheme } from '@mui/material/styles';
import { safeGeoJSONProcessor } from '../../../../../utils/geoJSONProcessor';
import { transformRegionName } from '../../utils/spatialUtils';
import SpatialErrorBoundary from '../../SpatialErrorBoundary';
import FlowLines from './FlowLines';
import { useSelector } from 'react-redux';
import { selectMarketFlows, selectMarketIntegration, selectGeometryData } from '../../../../../selectors/optimizedSelectors';

const FlowMap = ({
  visualizationMode,
  metricType = 'total_flow',
  flowThreshold = 0
}) => {
  const theme = useTheme();
  const flows = useSelector(selectMarketFlows);
  const marketIntegration = useSelector(selectMarketIntegration);
  const geometry = useSelector(selectGeometryData);

  const regionStyle = {
    fillColor: theme.palette.background.default,
    weight: 1,
    opacity: 0.7,
    color: theme.palette.divider,
    fillOpacity: 0.3,
  };

  // Process GeoJSON with safe preprocessing and name normalization
  const processedGeometry = useMemo(() => {
    if (!geometry?.unified) return null;

    const processed = safeGeoJSONProcessor(geometry.unified, 'flows');
    if (!processed?.features) return null;

    return {
      ...processed,
      features: processed.features.map((feature) => {
        const originalName =
          feature.properties.originalName ||
          feature.properties.region_id ||
          feature.properties.name;
        const normalizedName = transformRegionName(originalName);

        return {
          ...feature,
          properties: {
            ...feature.properties,
            originalName,
            normalizedName,
          },
        };
      }),
    };
  }, [geometry]);

  // Filter and prepare flow lines based on the threshold
  const filteredFlows = useMemo(() => {
    if (!flows || !marketIntegration) return [];

    return flows
      .filter((flow) => flow[metricType] >= flowThreshold)
      .map((flow) => {
        const normalizedSource = transformRegionName(flow.sourceName);
        const normalizedTarget = transformRegionName(flow.targetName);
        const sourceCoords = marketIntegration[normalizedSource]?.coordinates;
        const targetCoords = marketIntegration[normalizedTarget]?.coordinates;

        if (!sourceCoords || !targetCoords) return null;

        return {
          ...flow,
          sourceCoords,
          targetCoords,
          sourceName: flow.sourceName,
          targetName: flow.targetName,
          normalizedSource,
          normalizedTarget,
        };
      })
      .filter(Boolean);
  }, [flows, marketIntegration, metricType, flowThreshold]);

  if (!processedGeometry) {
    return null;
  }

  return (
    <SpatialErrorBoundary>
      <MapContainer
        center={[15.5, 48]} // Adjust center based on your region
        zoom={6}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />

        <GeoJSON
          data={processedGeometry}
          style={() => regionStyle}
          onEachFeature={(feature, layer) => {
            const displayName =
              feature.properties.originalName || feature.properties.normalizedName;
            layer.bindTooltip(displayName);
          }}
        />

        {/* Render flow lines */}
        <FlowLines flows={filteredFlows} metricType={metricType} />
      </MapContainer>
    </SpatialErrorBoundary>
  );
};

export default React.memo(FlowMap);