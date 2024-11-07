// src/components/analysis/spatial-analysis/SpatialMap.js

import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  CircleMarker,
  Tooltip as LeafletTooltip,
  useMap,
  ScaleControl,
  Polyline
} from 'react-leaflet';
import { 
  Box, 
  Paper, 
  Typography, 
  Slider, 
  Alert, 
  AlertTitle, 
  IconButton, 
  ButtonGroup, 
  Tooltip as MuiTooltip,
  Chip
} from '@mui/material';
import PropTypes from 'prop-types';
import { scaleSequential } from 'd3-scale';
import { 
  interpolateBlues, 
  interpolateReds, 
  interpolateGreens,
  interpolateOranges 
} from 'd3-scale-chromatic';
import {
  LayersOutlined,
  HubOutlined,
  ShowChartOutlined,
  WarningAmber
} from '@mui/icons-material';
import LoadingSpinner from '../../common/LoadingSpinner';

// Constants
const DEFAULT_CENTER = [15.3694, 44.191];
const DEFAULT_ZOOM = 6;

const VISUALIZATION_MODES = {
  PRICES: 'prices',
  MARKET_INTEGRATION: 'integration',
  CLUSTERS: 'clusters',
  SHOCKS: 'shocks'
};

// Time Controls Component
const TimeControls = ({ 
  selectedMonth, 
  availableMonths, 
  onMonthChange, 
  analysisResults,
  spatialWeights,
  detectedShocks 
}) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric'
    });
  };

  if (
    !availableMonths ||
    !Array.isArray(availableMonths) ||
    availableMonths.length === 0 ||
    !selectedMonth ||
    !availableMonths.includes(selectedMonth)
  ) {
    // Do not render TimeControls if data is not available
    return null;
  }

  return (
    <Paper
      sx={{
        position: 'absolute',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        width: { xs: '90%', sm: '80%', md: '60%' },
        p: 2,
        zIndex: 1000
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="body2">
          Time Period: {formatDate(selectedMonth)}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {detectedShocks?.some(shock => shock.month === selectedMonth) && (
            <MuiTooltip title="Market shock detected in this period">
              <WarningAmber color="warning" />
            </MuiTooltip>
          )}
          {spatialWeights && (
            <MuiTooltip title="Market integration level">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <HubOutlined />
                <Typography variant="body2">
                  {(
                    (Object.values(spatialWeights).reduce((acc, val) => 
                      acc + val.neighbors.length, 0) / 
                      (Object.keys(spatialWeights).length || 1)) * 100
                  ).toFixed(0)}%
                </Typography>
              </Box>
            </MuiTooltip>
          )}
        </Box>
      </Box>

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

      {analysisResults && selectedMonth && (
        <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between' }}>
          <MuiTooltip title="Price transmission efficiency">
            <Typography variant="caption" color="textSecondary">
              Transmission: {
                ((analysisResults.coefficients?.spatial_lag_price || 0) * 100).toFixed(1)
              }%
            </Typography>
          </MuiTooltip>
          <MuiTooltip title="Market integration level">
            <Typography variant="caption" color="textSecondary">
              Integration: {
                ((analysisResults.r_squared || 0) * 100).toFixed(1)
              }%
            </Typography>
          </MuiTooltip>
          <MuiTooltip title="Spatial correlation">
            <Typography variant="caption" color="textSecondary">
              Correlation: {
                ((analysisResults.moran_i?.I || 0) * 100).toFixed(1)
              }%
            </Typography>
          </MuiTooltip>
        </Box>
      )}
    </Paper>
  );
};

// Analysis Panels Component
const AnalysisPanels = ({
  analysisResults,
  visualizationMode,
  marketClusters,
  detectedShocks,
  selectedMonth
}) => {
  return (
    <>
      {/* Analysis Summary */}
      {analysisResults && (
        <Paper 
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
            <AlertTitle>Market Analysis</AlertTitle>
            <Typography variant="body2">
              Integration: {((analysisResults.r_squared || 0) * 100).toFixed(1)}%<br/>
              Transmission: {((analysisResults.coefficients?.spatial_lag_price || 0) * 100).toFixed(1)}%<br/>
              {detectedShocks?.length > 0 && (
                <>Shock Events: {detectedShocks.length}<br/></>
              )}
              {marketClusters?.length > 0 && (
                <>Market Clusters: {marketClusters.length}</>
              )}
            </Typography>
          </Alert>
        </Paper>
      )}

      {/* Market Shock Alerts */}
      {detectedShocks?.length > 0 && (
        <Paper
          sx={{
            position: 'absolute',
            top: 80,
            right: 10,
            zIndex: 1000,
            maxWidth: 300,
            maxHeight: 200,
            overflow: 'auto'
          }}
        >
          <Box sx={{ p: 1 }}>
            {detectedShocks
              .filter(shock => shock.month === selectedMonth)
              .map((shock, index) => (
                <Alert 
                  key={index}
                  severity={shock.severity === 'high' ? "error" : "warning"}
                  sx={{ mb: 1 }}
                >
                  <AlertTitle>{shock.type === 'price_surge' ? 'Price Surge' : 'Price Drop'}</AlertTitle>
                  Region: {shock.region}<br/>
                  Magnitude: {(shock.magnitude * 100).toFixed(1)}%
                </Alert>
              ))}
          </Box>
        </Paper>
      )}

      {/* Market Cluster Information */}
      {visualizationMode === VISUALIZATION_MODES.CLUSTERS && marketClusters?.length > 0 && (
        <Paper
          sx={{
            position: 'absolute',
            top: 80,
            left: 10,
            zIndex: 1000,
            maxWidth: 300
          }}
        >
          <Box sx={{ p: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Market Clusters
            </Typography>
            {marketClusters.map((cluster, index) => (
              <Box key={index} sx={{ mb: 1 }}>
                <Typography variant="caption">
                  Cluster {index + 1}: {cluster.marketCount} markets
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  <Chip
                    label={cluster.mainMarket}
                    size="small"
                    color="primary"
                  />
                  {Array.from(cluster.connectedMarkets).map(market => (
                    <Chip
                      key={market}
                      label={market}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Box>
            ))}
          </Box>
        </Paper>
      )}
    </>
  );
};

// Map Content Component
const MapContent = ({
  geoData,
  flowMaps,
  selectedMonth,
  selectedCommodity,
  spatialWeights,
  showFlows,
  analysis,
  onRegionSelect,
  marketClusters,
  detectedShocks,
  visualizationMode,
  setVisualizationMode,
  setShowFlows
}) => {
  const map = useMap();
  const [hoveredRegion, setHoveredRegion] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const geoJsonLayerRef = useRef();

  // Color scales for different visualization modes
  const colorScales = useMemo(() => {
    if (!geoData?.features) return {};

    const priceValues = geoData.features
      .map(f => f.properties.price)
      .filter(v => v != null);

    const integrationValues = Object.values(spatialWeights || {}).map(w => 
      w.neighbors.length / Object.keys(spatialWeights).length
    );

    const clusterSizes = marketClusters?.map(c => c.marketCount) || [];
    const shockValues = detectedShocks?.map(s => s.magnitude) || [];

    return {
      [VISUALIZATION_MODES.PRICES]: scaleSequential()
        .domain([Math.min(...priceValues) || 0, Math.max(...priceValues) || 1])
        .interpolator(interpolateBlues),
      [VISUALIZATION_MODES.MARKET_INTEGRATION]: scaleSequential()
        .domain([0, Math.max(...integrationValues) || 1])
        .interpolator(interpolateGreens),
      [VISUALIZATION_MODES.CLUSTERS]: scaleSequential()
        .domain([1, Math.max(...clusterSizes) || 2])
        .interpolator(interpolateOranges),
      [VISUALIZATION_MODES.SHOCKS]: scaleSequential()
        .domain([0, Math.max(...shockValues) || 1])
        .interpolator(interpolateReds)
    };
  }, [geoData, spatialWeights, marketClusters, detectedShocks]);

  // Flow line styling
  const flowLineStyle = useCallback((flow) => {
    if (!flow) return null;

    try {
      const baseStyle = {
        weight: Math.max(1, (flow.flow_weight || 0) / 2),
        opacity: 0.6
      };

      switch (visualizationMode) {
        case VISUALIZATION_MODES.MARKET_INTEGRATION:
          return {
            ...baseStyle,
            color: interpolateGreens((flow.flow_weight || 0) / 10),
            dashArray: (flow.flow_weight || 0) > 5 ? '' : '5,5'
          };
        case VISUALIZATION_MODES.CLUSTERS: {
          const cluster = marketClusters?.find(c => 
            c.connectedMarkets?.has(flow.source_region) && 
            c.connectedMarkets?.has(flow.target_region)
          );
          return {
            ...baseStyle,
            color: cluster ? interpolateOranges((cluster.marketCount || 0) / 10) : '#999'
          };
        }
        case VISUALIZATION_MODES.SHOCKS: {
          const shock = detectedShocks?.find(s => 
            s.month === selectedMonth && 
            (s.region === flow.source_region || s.region === flow.target_region)
          );
          return {
            ...baseStyle,
            color: shock ? interpolateReds(shock.magnitude || 0) : '#999'
          };
        }
        default:
          return {
            ...baseStyle,
            color: interpolateBlues((flow.flow_weight || 0) / 10)
          };
      }
    } catch (error) {
      console.error('Error computing flow line style:', error);
      return null;
    }
  }, [visualizationMode, marketClusters, detectedShocks, selectedMonth]);

  // Define getTooltipContent function
  const getTooltipContent = (feature) => {
    const regionId = feature.properties.region_id;
    const regionData = feature.properties;
    let content = '';

    switch (visualizationMode) {
      case VISUALIZATION_MODES.PRICES:
        content += `Price: ${regionData.price?.toFixed(2) || 'N/A'} YER<br/>`;
        break;
      case VISUALIZATION_MODES.MARKET_INTEGRATION:
        const connections = spatialWeights[regionId]?.neighbors?.length || 0;
        content += `Connections: ${connections}<br/>`;
        break;
      case VISUALIZATION_MODES.CLUSTERS:
        const cluster = marketClusters?.find(c => 
          c.mainMarket === regionId || c.connectedMarkets?.has(regionId)
        );
        content += `Cluster Size: ${cluster?.marketCount || 'N/A'}<br/>`;
        break;
      case VISUALIZATION_MODES.SHOCKS:
        const shock = detectedShocks?.find(s => 
          s.month === selectedMonth && s.region === regionId
        );
        content += shock 
          ? `Shock Magnitude: ${(shock.magnitude * 100).toFixed(1)}%<br/>`
          : '';
        break;
      default:
        break;
    }

    return content;
  };

  // Region style
  const getRegionStyle = useCallback((feature) => {
    if (!feature?.properties) return {};

    try {
      const regionId = feature.properties.region_id;
      const isHovered = hoveredRegion === regionId;
      const isSelected = selectedRegion === regionId;

      const baseStyle = {
        weight: isSelected ? 3 : isHovered ? 2 : 1,
        opacity: 1,
        color: isSelected ? '#ff4081' : isHovered ? '#666' : 'white',
        dashArray: isSelected || isHovered ? '' : '3'
      };

      const getVisualizationColor = () => {
        const scale = colorScales[visualizationMode];
        if (!scale) return '#ccc';

        switch (visualizationMode) {
          case VISUALIZATION_MODES.PRICES:
            return scale(feature.properties.price || 0);
          case VISUALIZATION_MODES.MARKET_INTEGRATION: {
            const connections = spatialWeights[regionId]?.neighbors?.length || 0;
            return scale(connections / (Object.keys(spatialWeights).length || 1));
          }
          case VISUALIZATION_MODES.CLUSTERS: {
            const cluster = marketClusters?.find(c => 
              c.mainMarket === regionId || c.connectedMarkets?.has(regionId)
            );
            return cluster ? scale(cluster.marketCount) : '#ccc';
          }
          case VISUALIZATION_MODES.SHOCKS: {
            const shock = detectedShocks?.find(s => 
              s.month === selectedMonth && s.region === regionId
            );
            return shock ? scale(shock.magnitude) : '#ccc';
          }
          default:
            return '#ccc';
        }
      };

      return {
        ...baseStyle,
        fillColor: getVisualizationColor(),
        fillOpacity: isSelected ? 0.9 : isHovered ? 0.8 : 0.6
      };
    } catch (error) {
      console.error('Error computing region style:', error);
      return {};
    }
  }, [
    hoveredRegion,
    selectedRegion,
    visualizationMode,
    colorScales,
    spatialWeights,
    marketClusters,
    detectedShocks,
    selectedMonth
  ]);

  return (
    <>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap contributors'
      />

      {geoData?.features && (
        <GeoJSON
          ref={geoJsonLayerRef}
          data={geoData}
          style={getRegionStyle}
          onEachFeature={(feature, layer) => {
            if (feature?.properties) {
              layer.on({
                mouseover: () => setHoveredRegion(feature.properties.region_id),
                mouseout: () => setHoveredRegion(null),
                click: () => {
                  setSelectedRegion(feature.properties.region_id);
                  onRegionSelect?.(feature.properties.region_id);
                }
              });
              
              // Create tooltip content
              const content = `
                <strong>${feature.properties.shapeName || feature.properties.region_id}</strong><br/>
                ${getTooltipContent(feature)}
              `;
              layer.bindTooltip(content, { sticky: true });
            }
          }}
        />
      )}

      {showFlows && flowMaps?.length > 0 && flowMaps.map((flow, idx) => {
        const style = flowLineStyle(flow);
        if (!style || !flow.source_lat || !flow.source_lng || !flow.target_lat || !flow.target_lng) {
          return null;
        }

        return (
          <Polyline
            key={`flow-${idx}`}
            positions={[
              [flow.source_lat, flow.source_lng],
              [flow.target_lat, flow.target_lng]
            ]}
            pathOptions={style}
          >
            <LeafletTooltip sticky>
              <div>
                <strong>{flow.source} → {flow.target}</strong><br/>
                Flow Weight: {flow.flow_weight?.toFixed(2) || 'N/A'}<br/>
                Price Differential: {flow.price_differential?.toFixed(2) || 'N/A'}
              </div>
            </LeafletTooltip>
          </Polyline>
        );
      })}

      {/* Shock Indicators */}
      {visualizationMode === VISUALIZATION_MODES.SHOCKS && 
       detectedShocks?.filter(shock => shock.month === selectedMonth)
         .map((shock, idx) => (
           <CircleMarker
             key={`shock-${idx}`}
             center={[shock.lat, shock.lng]}
             radius={10 * (shock.magnitude || 0.5)}
             color={shock.severity === 'high' ? '#ff4444' : '#ffbb33'}
             fillOpacity={0.6}
           >
             <LeafletTooltip>
               <div>
                 <strong>Market Shock</strong><br/>
                 Type: {shock.type}<br/>
                 Magnitude: {(shock.magnitude * 100).toFixed(1)}%<br/>
                 Severity: {shock.severity}
               </div>
             </LeafletTooltip>
           </CircleMarker>
         ))}

      <ScaleControl position="bottomleft" />
    </>
  );
};

// Main SpatialMap Component
const SpatialMap = ({
  geoData,
  flowMaps,
  selectedMonth,
  onMonthChange,
  availableMonths,
  spatialWeights,
  showFlows: initialShowFlows = true,
  onToggleFlows,
  analysisResults,
  selectedCommodity,
  marketClusters = [],
  detectedShocks = []
}) => {
  // State management
  const [error, setError] = useState(null);
  const [showFlows, setShowFlows] = useState(initialShowFlows);
  const [visualizationMode, setVisualizationMode] = useState(VISUALIZATION_MODES.PRICES);

  // Data validation
  useEffect(() => {
    try {
      // Validate GeoJSON
      if (geoData && (!geoData.features || !Array.isArray(geoData.features))) {
        throw new Error('Invalid GeoJSON format');
      }

      // Validate flow maps
      if (flowMaps && !Array.isArray(flowMaps)) {
        throw new Error('Invalid flow maps format');
      }

      // Validate spatial weights
      if (spatialWeights && typeof spatialWeights !== 'object') {
        throw new Error('Invalid spatial weights format');
      }

      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Data validation error:', err);
    }
  }, [geoData, flowMaps, spatialWeights]);

  // Process GeoJSON data
  const processedGeoData = useMemo(() => {
    if (!geoData?.features) return null;

    try {
      return {
        ...geoData,
        features: geoData.features.map(feature => ({
          ...feature,
          properties: {
            ...feature.properties,
            price: parseFloat(feature.properties.price) || 0,
          }
        }))
      };
    } catch (err) {
      console.error('Error processing GeoJSON:', err);
      return null;
    }
  }, [geoData]);

  // Error handling
  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        <AlertTitle>Map Error</AlertTitle>
        {error}
      </Alert>
    );
  }

  // Ensure selectedMonth is valid
  const isSelectedMonthValid = useMemo(() => {
    return availableMonths && availableMonths.includes(selectedMonth);
  }, [availableMonths, selectedMonth]);

  if (!availableMonths || availableMonths.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 400
        }}
      >
        <LoadingSpinner />
      </Box>
    );
  }

  if (!isSelectedMonthValid) {
    return (
      <Alert severity="warning" sx={{ m: 2 }}>
        <AlertTitle>Invalid Selected Month</AlertTitle>
        The selected month is not available. Please select a different month.
      </Alert>
    );
  }

  return (
    <Box sx={{ position: 'relative', height: '100%', width: '100%' }}>
      {/* Visualization Mode Controls */}
      <Paper
        elevation={3}
        sx={{
          position: 'absolute',
          top: 10,
          left: 10,
          zIndex: 1000,
          p: 1
        }}
      >
        <ButtonGroup size="small">
          {Object.entries(VISUALIZATION_MODES).map(([key, mode]) => (
            <MuiTooltip 
              key={key} 
              title={key.split('_').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
              ).join(' ')}
            >
              <IconButton
                color={visualizationMode === mode ? 'primary' : 'default'}
                onClick={() => setVisualizationMode(mode)}
                disabled={mode === VISUALIZATION_MODES.SHOCKS && (!detectedShocks || detectedShocks.length === 0)}
              >
                {mode === VISUALIZATION_MODES.PRICES && <ShowChartOutlined />}
                {mode === VISUALIZATION_MODES.MARKET_INTEGRATION && <LayersOutlined />}
                {mode === VISUALIZATION_MODES.CLUSTERS && <HubOutlined />}
                {mode === VISUALIZATION_MODES.SHOCKS && <WarningAmber />}
              </IconButton>
            </MuiTooltip>
          ))}
        </ButtonGroup>
      </Paper>

      {/* Map Container */}
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ height: '100%', width: '100%' }}
      >
        <MapContent
          geoData={processedGeoData}
          flowMaps={flowMaps}
          selectedMonth={selectedMonth}
          selectedCommodity={selectedCommodity}
          spatialWeights={spatialWeights}
          showFlows={showFlows}
          analysis={analysisResults}
          marketClusters={marketClusters}
          detectedShocks={detectedShocks}
          visualizationMode={visualizationMode}
          setVisualizationMode={setVisualizationMode}
          setShowFlows={setShowFlows}
          onRegionSelect={() => {}}
        />
      </MapContainer>

      {/* Time Controls */}
      <TimeControls
        selectedMonth={selectedMonth}
        availableMonths={availableMonths}
        onMonthChange={onMonthChange}
        analysisResults={analysisResults}
        spatialWeights={spatialWeights}
        detectedShocks={detectedShocks}
      />

      {/* Analysis Panels */}
      <AnalysisPanels
        analysisResults={analysisResults}
        visualizationMode={visualizationMode}
        marketClusters={marketClusters}
        detectedShocks={detectedShocks}
        selectedMonth={selectedMonth}
      />
    </Box>
  );
};

// PropTypes
SpatialMap.propTypes = {
  geoData: PropTypes.shape({
    type: PropTypes.string,
    features: PropTypes.arrayOf(PropTypes.shape({
      type: PropTypes.string,
      properties: PropTypes.shape({
        region_id: PropTypes.string,
        shapeName: PropTypes.string,
        price: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      }),
      geometry: PropTypes.object
    }))
  }),
  flowMaps: PropTypes.arrayOf(PropTypes.shape({
    source_lat: PropTypes.number,
    source_lng: PropTypes.number,
    target_lat: PropTypes.number,
    target_lng: PropTypes.number,
    source: PropTypes.string,
    target: PropTypes.string,
    flow_weight: PropTypes.number,
    price_differential: PropTypes.number,
  })),
  selectedMonth: PropTypes.string.isRequired,
  onMonthChange: PropTypes.func.isRequired,
  availableMonths: PropTypes.arrayOf(PropTypes.string).isRequired,
  spatialWeights: PropTypes.object,
  showFlows: PropTypes.bool,
  onToggleFlows: PropTypes.func,
  analysisResults: PropTypes.shape({
    coefficients: PropTypes.object,
    r_squared: PropTypes.number,
    moran_i: PropTypes.shape({
      I: PropTypes.number,
      'p-value': PropTypes.number
    })
  }),
  selectedCommodity: PropTypes.string.isRequired,
  marketClusters: PropTypes.arrayOf(PropTypes.shape({
    mainMarket: PropTypes.string.isRequired,
    connectedMarkets: PropTypes.instanceOf(Set).isRequired,
    marketCount: PropTypes.number.isRequired,
  })),
  detectedShocks: PropTypes.arrayOf(PropTypes.shape({
    month: PropTypes.string.isRequired,
    region: PropTypes.string.isRequired,
    magnitude: PropTypes.number.isRequired,
    type: PropTypes.string.isRequired,
    severity: PropTypes.string.isRequired,
    lat: PropTypes.number,
    lng: PropTypes.number
  }))
};

// Default Props
SpatialMap.defaultProps = {
  showFlows: true,
  onToggleFlows: () => {},
  spatialWeights: {},
  analysisResults: null,
  marketClusters: [],
  detectedShocks: []
};

export default React.memo(SpatialMap);