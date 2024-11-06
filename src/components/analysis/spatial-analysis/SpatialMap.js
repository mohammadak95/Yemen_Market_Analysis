import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Tooltip as LeafletTooltip,
  useMap,
  CircleMarker,
  ScaleControl
} from 'react-leaflet';
import { Box, Paper, Typography, Slider, Alert, AlertTitle } from '@mui/material';
import L from 'leaflet';
import { scaleSequential, scaleLinear } from 'd3-scale';
import { interpolateBlues, interpolateReds } from 'd3-scale-chromatic';
import MapLegend from './MapLegend';
import MapControls from './MapControls';
import 'leaflet/dist/leaflet.css';

const DEFAULT_CENTER = [15.552727, 48.516388];
const DEFAULT_ZOOM = 6;

const MapContent = ({
  geoData,
  flowMaps,
  selectedMonth,
  selectedCommodity,
  spatialWeights,
  showFlows,
  analysis,
  onRegionSelect
}) => {
  const map = useMap();
  const [hoveredRegion, setHoveredRegion] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const geoJsonLayerRef = useRef();

  // Initialize color scale
  const colorScale = useMemo(() => {
    if (!geoData?.features) return null;

    const values = geoData.features
      .map(f => f.properties.price)
      .filter(v => v != null && !isNaN(v));

    if (!values.length) return null;

    return scaleSequential()
      .domain([Math.min(...values), Math.max(...values)])
      .interpolator(interpolateBlues);
  }, [geoData]);

  // Fit map to bounds
  useEffect(() => {
    if (geoData?.features?.length > 0) {
      try {
        const bounds = L.geoJSON(geoData).getBounds();
        map.fitBounds(bounds, { padding: [20, 20] });
      } catch (error) {
        console.warn('Error fitting bounds:', error);
        map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
      }
    }
  }, [geoData, map]);

  // Style function for regions
  const style = useCallback((feature) => {
    const value = feature.properties?.price;
    const isHovered = hoveredRegion === feature.properties.region_id;
    const isSelected = selectedRegion === feature.properties.region_id;
    const spatialCorrelation = Math.abs(analysis?.moran_i?.I || 0);
    const baseOpacity = spatialCorrelation * 0.7 + 0.3;

    return {
      fillColor: value != null && colorScale ? colorScale(value) : '#ccc',
      weight: isSelected ? 4 : isHovered ? 3 : 1,
      opacity: 1,
      color: isSelected ? '#ff4081' : isHovered ? '#666' : 'white',
      fillOpacity: isSelected ? 0.9 : isHovered ? baseOpacity + 0.2 : baseOpacity,
      dashArray: isSelected || isHovered ? '' : '3'
    };
  }, [colorScale, hoveredRegion, selectedRegion, analysis]);

  // Flow lines visualization
  const flowLines = useMemo(() => {
    if (!showFlows || !flowMaps?.length) return null;

    try {
      const currentDate = new Date(selectedMonth).toISOString().split('T')[0];
      const currentFlows = flowMaps.filter(flow => {
        const flowDate = new Date(flow.date).toISOString().split('T')[0];
        return flowDate === currentDate;
      });

      if (!currentFlows.length) return null;

      const maxFlow = Math.max(...currentFlows.map(f => f.flow_weight || 0));
      const flowScale = scaleLinear().domain([0, maxFlow]).range([1, 8]);
      const opacityScale = scaleLinear().domain([0, maxFlow]).range([0.3, 0.8]);

      return currentFlows.map((flow, idx) => {
        if (!flow.source_lat || !flow.source_lng || !flow.target_lat || !flow.target_lng) {
          return null;
        }

        const source = [flow.source_lat, flow.source_lng];
        const target = [flow.target_lat, flow.target_lng];
        const offset = (flow.flow_weight || 0) / maxFlow * 0.1;

        const midPoint = L.latLng(
          (source[0] + target[0]) / 2 + offset,
          (source[1] + target[1]) / 2 + offset
        );

        return (
          <GeoJSON
            key={`flow-${idx}`}
            data={{
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: [source, [midPoint.lat, midPoint.lng], target]
              },
              properties: flow
            }}
            style={() => ({
              color: interpolateBlues((flow.flow_weight || 0) / maxFlow),
              weight: flowScale(flow.flow_weight || 0),
              opacity: opacityScale(flow.flow_weight || 0),
              lineCap: 'round',
              lineJoin: 'round'
            })}
            onEachFeature={(feature, layer) => {
              const props = feature.properties;
              layer.bindTooltip(
                `<div style="min-width: 200px;">
                  <strong>${props.source} → ${props.target}</strong><br/>
                  Flow Weight: ${(props.flow_weight || 0).toFixed(2)}<br/>
                  Price Differential: ${(props.price_differential || 0).toFixed(2)}<br/>
                  Source Price: ${props.source_price?.toFixed(2) || 'N/A'}<br/>
                  Target Price: ${props.target_price?.toFixed(2) || 'N/A'}
                </div>`,
                { sticky: true }
              );
            }}
          />
        );
      }).filter(Boolean);
    } catch (error) {
      console.error('Error rendering flows:', error);
      return null;
    }
  }, [showFlows, flowMaps, selectedMonth]);

  // Updated onEachFeature function with correct layer handling
  const onEachFeature = useCallback((feature, layer) => {
    const props = feature.properties;
    const neighbors = spatialWeights?.[props.region_id]?.neighbors || [];

    layer.on({
      mouseover: (e) => {
        setHoveredRegion(props.region_id);
        const layer = e.target;
        if (layer.setStyle) {
          layer.setStyle({
            weight: 3,
            fillOpacity: 0.9,
            dashArray: ''
          });
        }
      },
      mouseout: (e) => {
        setHoveredRegion(null);
        const layer = e.target;
        if (layer.setStyle) {
          layer.setStyle(style(feature));
        }
      },
      click: (e) => {
        setSelectedRegion(prev => prev === props.region_id ? null : props.region_id);
        onRegionSelect?.(props.region_id);

        // Handle highlighting of connected regions
        const targetLayer = e.target;
        if (geoJsonLayerRef.current) {
          geoJsonLayerRef.current.eachLayer((layer) => {
            if (layer.feature) {
              const isNeighbor = neighbors.includes(layer.feature.properties.region_id);
              if (layer.setStyle) {
                layer.setStyle(isNeighbor ? {
                  weight: 3,
                  fillOpacity: 0.9,
                  dashArray: ''
                } : style(layer.feature));
              }
            }
          });
        }
      }
    });

    const analysisCoef = analysis?.coefficients?.spatial_lag_price || 0;
    const popupContent = `
      <div style="min-width: 200px;">
        <h4>${props.shapeName || props.region_id || 'Unknown Region'}</h4>
        <p><strong>Price:</strong> ${props.price?.toFixed(2) || 'N/A'}</p>
        <p><strong>Spatial Effect:</strong> ${(analysisCoef * 100).toFixed(1)}%</p>
        <p><strong>Connected Regions:</strong> ${neighbors.join(', ') || 'None'}</p>
        ${props.conflict_intensity ? 
          `<p><strong>Conflict Intensity:</strong> ${props.conflict_intensity.toFixed(2)}</p>` 
          : ''}
      </div>
    `;
    layer.bindPopup(popupContent);
  }, [spatialWeights, analysis, style, onRegionSelect]);

  return (
    <>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap contributors'
      />
      {geoData && (
        <GeoJSON 
          ref={geoJsonLayerRef}
          data={geoData} 
          style={style} 
          onEachFeature={onEachFeature}
        />
      )}
      {flowLines}
      <ScaleControl position="bottomleft" />
      
      {colorScale && (
        <MapLegend
          colorScale={colorScale}
          variable="Price"
          position="bottomright"
          unit=" YER"
          description="Distribution of prices across regions"
        />
      )}
      
      <MapControls
        availableLayers={[{
          id: 'flows',
          name: 'Show Trade Flows',
          active: showFlows
        }]}
        onLayerToggle={() => setShowFlows(prev => !prev)}
      />
    </>
  );
};

const SpatialMap = ({
  geoData,
  flowMaps,
  selectedMonth,
  onMonthChange,
  availableMonths,
  spatialWeights,
  analysisResults,
  selectedCommodity
}) => {
  const [showFlows, setShowFlows] = useState(true);

  const formatDate = useCallback((dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric'
    });
  }, []);

  return (
    <Box sx={{ position: 'relative', height: '100%', width: '100%' }}>
      {analysisResults && (
        <Paper 
          elevation={3}
          sx={{
            position: 'absolute',
            top: 10,
            right: 10,
            zIndex: 1000,
            p: 2,
            maxWidth: 300
          }}
        >
          <Alert 
            severity={analysisResults.moran_i?.['p-value'] < 0.05 ? "success" : "info"}
          >
            <AlertTitle>Spatial Analysis</AlertTitle>
            <Typography variant="body2">
              Spatial Correlation: {((analysisResults.moran_i?.I || 0) * 100).toFixed(1)}%<br/>
              Model Fit: {((analysisResults.r_squared || 0) * 100).toFixed(1)}%<br/>
              Price Transmission: {((analysisResults.coefficients?.spatial_lag_price || 0) * 100).toFixed(1)}%
            </Typography>
          </Alert>
        </Paper>
      )}

      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ height: '100%', width: '100%' }}
      >
        <MapContent
          geoData={geoData}
          flowMaps={flowMaps}
          selectedMonth={selectedMonth}
          selectedCommodity={selectedCommodity}
          spatialWeights={spatialWeights}
          showFlows={showFlows}
          analysis={analysisResults}
          onRegionSelect={(regionId) => console.log('Selected region:', regionId)}
        />
      </MapContainer>

      {availableMonths?.length > 0 && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            width: { xs: '90%', sm: '80%', md: '60%' },
            bgcolor: 'background.paper',
            p: 2,
            borderRadius: 1,
            boxShadow: 2,
            zIndex: 1000,
          }}
        >
          <Typography variant="body2" gutterBottom>
            Time Period: {formatDate(selectedMonth)}
          </Typography>
          <Slider
            value={availableMonths.indexOf(selectedMonth)}
            min={0}
            max={availableMonths.length - 1}
            step={1}
            onChange={(_, value) => onMonthChange(availableMonths[value])}
            valueLabelDisplay="auto"
            valueLabelFormat={value => formatDate(availableMonths[value])}
            marks={availableMonths.map((date, index) => ({
              value: index,
              label: index % 3 === 0 ? formatDate(date) : ''
            }))}
          />
        </Box>
      )}
    </Box>
  );
};

export default React.memo(SpatialMap);