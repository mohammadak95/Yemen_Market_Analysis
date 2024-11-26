import React, { useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Tooltip } from 'react-leaflet';
import { useTheme } from '@mui/material/styles';
import { safeGeoJSONProcessor } from '../../../../../utils/geoJSONProcessor';
import { transformRegionName } from '../../utils/spatialUtils';
import SpatialErrorBoundary from '../../SpatialErrorBoundary';

const FlowMap = ({ 
  geometry, 
  flows, 
  markets, 
  metricType = 'totalFlow',
  marketCoordinates 
}) => {
  const theme = useTheme();

  const regionStyle = {
    fillColor: theme.palette.background.default,
    weight: 1,
    opacity: 0.7,
    color: theme.palette.divider,
    fillOpacity: 0.3
  };

  // Process GeoJSON with safe preprocessing and name normalization
  const processedGeometry = useMemo(() => {
    if (!geometry) return null;
    
    const processed = safeGeoJSONProcessor(geometry, 'flows');
    if (!processed?.features) return null;

    return {
      ...processed,
      features: processed.features.map(feature => {
        const originalName = feature.properties.originalName || 
                           feature.properties.region_id || 
                           feature.properties.name;
        const normalizedName = transformRegionName(originalName);

        return {
          ...feature,
          properties: {
            ...feature.properties,
            originalName,
            normalizedName
          }
        };
      })
    };
  }, [geometry]);

  // Calculate flow line properties with normalized names
  const flowLines = useMemo(() => {
    if (!flows || !marketCoordinates) return [];

    return flows
      .filter(flow => flow[metricType] > 0)
      .map(flow => {
        const normalizedSource = transformRegionName(flow.source);
        const normalizedTarget = transformRegionName(flow.target);
        const sourceCoords = marketCoordinates[normalizedSource];
        const targetCoords = marketCoordinates[normalizedTarget];

        if (!sourceCoords || !targetCoords) return null;

        return {
          ...flow,
          sourceCoords,
          targetCoords,
          sourceName: markets?.[normalizedSource]?.originalName || flow.source,
          targetName: markets?.[normalizedTarget]?.originalName || flow.target,
          normalizedSource,
          normalizedTarget
        };
      })
      .filter(Boolean);
  }, [flows, marketCoordinates, metricType, markets]);

  // Render flow lines with tooltips using original names
  const renderFlowLines = () => {
    return flowLines.map((flow, index) => {
      const lineWidth = Math.log(flow[metricType] + 1) * 2;
      
      return (
        <React.Fragment key={index}>
          <CircleMarker
            center={flow.sourceCoords}
            radius={3}
            color={theme.palette.primary.main}
            fillColor={theme.palette.primary.light}
            fillOpacity={0.7}
          >
            <Tooltip>
              {flow.sourceName}
            </Tooltip>
          </CircleMarker>
          <CircleMarker
            center={flow.targetCoords}
            radius={3}
            color={theme.palette.secondary.main}
            fillColor={theme.palette.secondary.light}
            fillOpacity={0.7}
          >
            <Tooltip>
              {flow.targetName}
            </Tooltip>
          </CircleMarker>
          <svg>
            <line
              x1={flow.sourceCoords[0]}
              y1={flow.sourceCoords[1]}
              x2={flow.targetCoords[0]}
              y2={flow.targetCoords[1]}
              stroke={theme.palette.primary.main}
              strokeWidth={lineWidth}
              strokeOpacity={0.6}
            />
          </svg>
        </React.Fragment>
      );
    });
  };

  if (!processedGeometry) {
    return null;
  }

  return (
    <SpatialErrorBoundary>
      <MapContainer
        center={[15.5, 48]} // Yemen's approximate center
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
            const displayName = feature.properties.originalName || feature.properties.normalizedName;
            layer.bindTooltip(displayName);
          }}
        />
        
        {renderFlowLines()}
      </MapContainer>
    </SpatialErrorBoundary>
  );
};

export default React.memo(FlowMap);
