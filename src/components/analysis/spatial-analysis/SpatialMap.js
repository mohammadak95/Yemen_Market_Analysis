import React, { useCallback, useMemo, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  CircleMarker,
  Tooltip as LeafletTooltip,
  useMap,
  ScaleControl,
  Polyline,
} from 'react-leaflet';
import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import L from 'leaflet';
import debounce from 'lodash.debounce';

const DEFAULT_CENTER = [15.3694, 44.191];
const DEFAULT_ZOOM = 6;
const MIN_ZOOM = 5;
const MAX_ZOOM = 10;

const FlowLines = React.memo(({ flows, getFlowStyle }) => {
  // Add validation for flow data
  const validFlows = useMemo(() => {
    return flows?.filter(flow => {
      // Ensure all required coordinates exist and are numbers
      return (
        typeof flow?.source_lat === 'number' &&
        typeof flow?.source_lng === 'number' &&
        typeof flow?.target_lat === 'number' &&
        typeof flow?.target_lng === 'number'
      );
    }) || [];
  }, [flows]);

  if (!validFlows.length) return null;

  return (
    <>
      {validFlows.map((flow, idx) => {
        const coordinates = [
          [flow.source_lat, flow.source_lng],
          [flow.target_lat, flow.target_lng]
        ];

        const style = getFlowStyle?.(flow) || {
          color: '#2196f3',
          weight: Math.max(1, (flow.flow_weight || 1) * 2),
          opacity: 0.6
        };

        return (
          <Polyline
            key={`flow-${idx}-${flow.source}-${flow.target}`}
            positions={coordinates}
            pathOptions={style}
          >
            <LeafletTooltip sticky>
              <div>
                <strong>{flow.source} → {flow.target}</strong><br />
                Flow: {flow.flow_weight?.toFixed(2) || 'N/A'}
              </div>
            </LeafletTooltip>
          </Polyline>
        );
      })}
    </>
  );
});

const SpatialMap = ({
  geoData,
  flowMaps = [],
  selectedDate,
  spatialWeights = {},
  showFlows = true,
  analysisResults = null,
  selectedCommodity,
  marketClusters = [],
  detectedShocks = [],
  visualizationMode,
  colorScales,
  onRegionSelect,
}) => {
  const theme = useTheme();
  const mapRef = useRef(null);
  const geoJsonRef = useRef(null);

  const getRegionStyle = useCallback((feature) => {
    return {
      fillColor: colorScales?.getColor(feature) || '#cccccc',
      weight: 1,
      opacity: 1,
      color: '#666666',
      fillOpacity: 0.7,
    };
  }, [colorScales]);

  const highlightFeature = useCallback((e) => {
    const layer = e.target;
    if (layer.setStyle) {
      layer.setStyle({
        weight: 3,
        color: theme.palette.primary.main,
        dashArray: '',
        fillOpacity: 0.9,
      });
      layer.bringToFront();
    }
  }, [theme]);

  const resetHighlight = useCallback((e, feature) => {
    const layer = e.target;
    if (layer.setStyle) {
      layer.setStyle(getRegionStyle(feature));
    }
  }, [getRegionStyle]);

  const onFeatureClick = useCallback((feature) => {
    if (onRegionSelect && feature.properties?.region_id) {
      onRegionSelect(feature.properties.region_id);
    }
  }, [onRegionSelect]);

  const onEachFeature = useCallback((feature, layer) => {
    if (!feature?.properties) return;
    
    layer.on({
      mouseover: highlightFeature,
      mouseout: (e) => resetHighlight(e, feature),
      click: () => onFeatureClick(feature),
    });

    // Tooltip content
    const tooltipContent = `
      <strong>${feature.properties.region || feature.properties.region_id || 'Unknown Region'}</strong>
      ${feature.properties.priceData ? 
        `<br/>Price: $${feature.properties.priceData.avgUsdPrice?.toFixed(2) || 'N/A'}` : ''}
    `;
    
    layer.bindTooltip(tooltipContent, { 
      sticky: true,
      direction: 'top',
      offset: [0, -10],
    });
  }, [highlightFeature, resetHighlight, onFeatureClick]);

  useEffect(() => {
    if (!geoData || !geoJsonRef.current) return;

    geoJsonRef.current.clearLayers();
    
    L.geoJSON(geoData, {
      style: getRegionStyle,
      onEachFeature
    }).addTo(geoJsonRef.current);
  }, [geoData, getRegionStyle, onEachFeature]);

  const getFlowStyle = useCallback((flow) => {
    if (!flow?.flow_weight) return null;

    return {
      color: theme.palette.primary.main,
      weight: Math.max(1, flow.flow_weight * 2),
      opacity: 0.6,
      dashArray: null,
      lineCap: 'round',
      lineJoin: 'round'
    };
  }, [theme]);

  if (!geoData) {
    return (
      <Box sx={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Typography>No spatial data available</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', position: 'relative' }}>
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />

        <GeoJSON
          ref={geoJsonRef}
          data={geoData}
          style={getRegionStyle}
          onEachFeature={onEachFeature}
        />

        {showFlows && flowMaps && flowMaps.length > 0 && (
          <FlowLines 
            flows={flowMaps} 
            getFlowStyle={getFlowStyle}
          />
        )}

        <ScaleControl position="bottomleft" />
      </MapContainer>
    </Box>
  );
};

SpatialMap.propTypes = {
  geoData: PropTypes.object.isRequired,
  flowMaps: PropTypes.array,
  selectedDate: PropTypes.string,
  spatialWeights: PropTypes.object,
  showFlows: PropTypes.bool,
  analysisResults: PropTypes.object,
  selectedCommodity: PropTypes.string,
  marketClusters: PropTypes.array,
  detectedShocks: PropTypes.array,
  visualizationMode: PropTypes.string,
  colorScales: PropTypes.object,
  onRegionSelect: PropTypes.func,
};

export default React.memo(SpatialMap);