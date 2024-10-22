import React, { useEffect, useRef, useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Typography, Paper, Box, Slider, Tooltip as MuiTooltip, FormControl, InputLabel, Select, MenuItem, Switch, FormControlLabel } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import * as d3 from 'd3';

const CombinedFlowNetworkMap = ({ flowMaps, selectedCommodity, dateRange }) => {
  const theme = useTheme();
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const flowLayerGroup = useRef(null);
  const networkLayerGroup = useRef(null);
  const svgRef = useRef(null);

  // Utility function for coordinate validation
  const validateCoordinates = (lat, lng) => {
    const validLat = parseFloat(lat);
    const validLng = parseFloat(lng);
    
    // Basic coordinate validation
    if (isNaN(validLat) || isNaN(validLng)) return null;
    if (validLat < -90 || validLat > 90) return null;
    if (validLng < -180 || validLng > 180) return null;
    
    return [validLat, validLng];
  };

  // Convert dateRange to timestamps for the slider
  const timeRange = useMemo(() => ({
    min: new Date(dateRange[0]).getTime(),
    max: new Date(dateRange[1]).getTime()
  }), [dateRange]);

  // Initialize currentDate with validation
  const [currentDate, setCurrentDate] = useState(() => {
    const date = new Date(dateRange[0]);
    return isNaN(date.getTime()) ? new Date() : date;
  });

  // Get current timestamp for slider
  const currentTimestamp = useMemo(() => 
    currentDate instanceof Date && !isNaN(currentDate.getTime()) 
      ? currentDate.getTime() 
      : timeRange.min,
    [currentDate, timeRange.min]
  );

  const [hoveredFlow] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState('All');
  const [isDebugMode, setIsDebugMode] = useState(false); // New state for debug mode

  // Get unique regions from flow data
  const regions = useMemo(() => {
    const allRegions = new Set();
    flowMaps.forEach(flow => {
      allRegions.add(flow.source);
      allRegions.add(flow.target);
    });
    return ['All', ...Array.from(allRegions)].sort();
  }, [flowMaps]);

  useEffect(() => {
    if (!mapRef.current || !flowMaps || flowMaps.length === 0) return;

    // Initialize map if not already initialized
    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current).setView([15.5527, 48.5164], 6);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapInstance.current);
      
      flowLayerGroup.current = L.layerGroup().addTo(mapInstance.current);
      networkLayerGroup.current = L.layerGroup().addTo(mapInstance.current);

      const svg = d3.select(mapInstance.current.getPanes().overlayPane)
        .append("svg");
      const g = svg.append("g").attr("class", "leaflet-zoom-hide");
      svgRef.current = { svg, g };
    }

    // Filter flows based on date, region, and coordinate validation
    const currentFlows = flowMaps.filter(flow => {
      const flowDate = new Date(flow.date);
      const isBeforeOrEqual = flowDate <= currentDate;
      const isInRegion = selectedRegion === 'All' || 
                        flow.source === selectedRegion || 
                        flow.target === selectedRegion;

      // Validate coordinates
      const sourceCoords = validateCoordinates(flow.source_lat, flow.source_lng);
      const targetCoords = validateCoordinates(flow.target_lat, flow.target_lng);
      
      const hasValidCoords = sourceCoords && targetCoords;

      // Debug log for invalid coordinates
      if (!hasValidCoords && isDebugMode) {
        console.debug('Invalid coordinates found:', {
          flow,
          sourceCoords,
          targetCoords
        });
      }

      return isBeforeOrEqual && isInRegion && hasValidCoords;
    });

    // Aggregated Logging
    if (isDebugMode) {
      console.group('Flow Filtering Summary');
      console.debug(`Total Flows: ${flowMaps.length}`);
      console.debug(`Flows After Filtering: ${currentFlows.length}`);
      console.groupEnd();

      // Log details of the first 5 flows after filtering
      const sampleFlows = currentFlows.slice(0, 5);
      if (sampleFlows.length > 0) {
        console.group('Sample Filtered Flows');
        sampleFlows.forEach((flow, index) => {
          console.debug(`Flow ${index + 1}:`, flow);
        });
        if (currentFlows.length > 5) {
          console.debug(`...and ${currentFlows.length - 5} more flows.`);
        }
        console.groupEnd();
      }
    }

    console.log('Valid flows after filtering:', {
      filteredFlows: currentFlows.length,
      sampleFlow: currentFlows[0] || null
    });

    // Create network nodes with validated coordinates
    const networkNodes = new Set();
    currentFlows.forEach(flow => {
      const sourceCoords = validateCoordinates(flow.source_lat, flow.source_lng);
      const targetCoords = validateCoordinates(flow.target_lat, flow.target_lng);

      if (sourceCoords) {
        networkNodes.add(JSON.stringify({
          name: flow.source,
          lat: sourceCoords[0],
          lng: sourceCoords[1]
        }));
      }

      if (targetCoords) {
        networkNodes.add(JSON.stringify({
          name: flow.target,
          lat: targetCoords[0],
          lng: targetCoords[1]
        }));
      }
    });

    // Clear existing layers
    flowLayerGroup.current.clearLayers();
    networkLayerGroup.current.clearLayers();
    svgRef.current.g.selectAll("*").remove();

    // Add nodes to map with proper coordinate validation
    Array.from(networkNodes).map(JSON.parse).forEach(node => {
      if (isDebugMode) {
        console.debug('Adding node:', node);
      }

      L.circleMarker([node.lat, node.lng], {
        radius: 8, // Increased size
        fillColor: theme.palette.primary.main,
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8
      })
      .addTo(networkLayerGroup.current)
      .bindPopup(`<strong>Market: ${node.name}</strong>`);
    });

    // Draw flow lines with coordinate validation
    const paths = svgRef.current.g.selectAll("path")
      .data(currentFlows)
      .enter()
      .append("path")
      .attr("d", flow => {
        const sourceCoords = validateCoordinates(flow.source_lat, flow.source_lng);
        const targetCoords = validateCoordinates(flow.target_lat, flow.target_lng);
        
        if (!sourceCoords || !targetCoords) return null;

        const source = mapInstance.current.latLngToLayerPoint(sourceCoords);
        const target = mapInstance.current.latLngToLayerPoint(targetCoords);

        // Debug log for the flow being drawn
        if (isDebugMode) {
          console.debug('Drawing flow:', {
            from: flow.source,
            to: flow.target,
            sourceCoords,
            targetCoords,
            screenPoints: { source, target }
          });
        }

        return `M${source.x},${source.y}L${target.x},${target.y}`;
      })
      .style("stroke", theme.palette.secondary.main)
      .style("stroke-width", flow => Math.max(2, Math.sqrt(flow.flow_weight) * 2)) // Increased minimum width
      .style("stroke-opacity", 0.7)
      .style("pointer-events", "all") // Enable mouse events
      .on("mouseover", function(event, flow) {
        tooltipText.text(`From: ${flow.source} → To: ${flow.target}
Price Diff: ${flow.price_differential.toFixed(2)}
Flow Weight: ${flow.flow_weight.toFixed(2)}`);
        
        tooltip
          .style("display", null)
          .attr("transform", `translate(${event.pageX + 10},${event.pageY - 70})`);
      })
      .on("mousemove", function(event) {
        tooltip.attr("transform", `translate(${event.pageX + 10},${event.pageY - 70})`);
      })
      .on("mouseout", function() { // Removed 'flow' parameter
        tooltip.style("display", "none");
      });

    // Tooltip setup
    const tooltip = svgRef.current.g.append("g")
      .attr("class", "tooltip")
      .style("display", "none");

    tooltip.append("rect")
      .attr("width", 200)
      .attr("height", 60)
      .attr("fill", "white")
      .attr("stroke", theme.palette.divider)
      .attr("rx", 4)
      .attr("ry", 4);

    const tooltipText = tooltip.append("text")
      .attr("x", 10)
      .attr("y", 20)
      .style("font-size", "12px")
      .style("fill", theme.palette.text.primary);

    // Move tooltip updates inside the event handlers above
    // (Already handled in the 'mouseover' and 'mousemove' events)

    // Update on zoom/pan
    const updateElements = () => {
      paths.attr("d", flow => {
        const sourceCoords = validateCoordinates(flow.source_lat, flow.source_lng);
        const targetCoords = validateCoordinates(flow.target_lat, flow.target_lng);
        
        if (!sourceCoords || !targetCoords) return null;

        const source = mapInstance.current.latLngToLayerPoint(sourceCoords);
        const target = mapInstance.current.latLngToLayerPoint(targetCoords);
        
        return `M${source.x},${source.y}L${target.x},${target.y}`;
      });

      // Update labels if implemented
      // Assuming labels are managed similarly
    };

    mapInstance.current.on("zoom moveend", updateElements);

    // Fit bounds with validated coordinates
    if (currentFlows.length > 0) {
      const validBounds = currentFlows.reduce((bounds, flow) => {
        const sourceCoords = validateCoordinates(flow.source_lat, flow.source_lng);
        const targetCoords = validateCoordinates(flow.target_lat, flow.target_lng);
        
        if (sourceCoords) bounds.push(sourceCoords);
        if (targetCoords) bounds.push(targetCoords);
        
        return bounds;
      }, []);

      if (validBounds.length > 0) {
        mapInstance.current.fitBounds(L.latLngBounds(validBounds), { padding: [50, 50] });
      }
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.off("zoom moveend", updateElements);
      }
    };
  }, [flowMaps, currentDate, selectedRegion, theme, isDebugMode]); // Added isDebugMode to dependencies

  const handleDateChange = (event, newValue) => {
    const newDate = new Date(Number(newValue));
    if (!isNaN(newDate.getTime())) {
      setCurrentDate(newDate);
    }
  };

  const handleRegionChange = (event) => {
    setSelectedRegion(event.target.value);
  };

  const handleDebugModeToggle = (event) => {
    setIsDebugMode(event.target.checked);
  };

  return (
    <Paper sx={{ p: 2, height: '600px', position: 'relative' }}>
      <Typography variant="h6" gutterBottom>
        Combined Flow and Network Map for {selectedCommodity}
      </Typography>
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
        <FormControl sx={{ minWidth: 120, mr: 2 }}>
          <InputLabel id="region-select-label">Region</InputLabel>
          <Select
            labelId="region-select-label"
            value={selectedRegion}
            onChange={handleRegionChange}
            label="Region"
          >
            {regions.map(region => (
              <MenuItem key={region} value={region}>{region}</MenuItem>
            ))}
          </Select>
        </FormControl>
        {/* Debug Mode Toggle */}
        <FormControlLabel
          control={
            <Switch
              checked={isDebugMode}
              onChange={handleDebugModeToggle}
              color="primary"
            />
          }
          label="Debug Mode"
        />
      </Box>
      <div ref={mapRef} style={{ height: '400px', width: '100%' }} />
      <Box sx={{ mt: 2 }}>
        <Slider
          value={currentTimestamp}
          min={timeRange.min}
          max={timeRange.max}
          onChange={handleDateChange}
          valueLabelDisplay="auto"
          valueLabelFormat={(value) => new Date(Number(value)).toLocaleDateString()}
        />
      </Box>
      {hoveredFlow && (
        <MuiTooltip
          open={true}
          title={`Price Differential: ${hoveredFlow.price_differential.toFixed(2)}`}
          placement="top"
        >
          <Box sx={{ 
            position: 'absolute', 
            top: 10, 
            right: 10, 
            bgcolor: 'background.paper',
            p: 1,
            borderRadius: 1,
            boxShadow: 1
          }}>
            <Typography variant="body2">
              From: {hoveredFlow.source}<br />
              To: {hoveredFlow.target}<br />
              Flow Weight: {hoveredFlow.flow_weight.toFixed(2)}
            </Typography>
          </Box>
        </MuiTooltip>
      )}
    </Paper>
  );
};

CombinedFlowNetworkMap.propTypes = {
  flowMaps: PropTypes.arrayOf(
    PropTypes.shape({
      date: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]).isRequired,
      source: PropTypes.string.isRequired,
      source_lat: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
      source_lng: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
      target: PropTypes.string.isRequired,
      target_lat: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
      target_lng: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
      price_differential: PropTypes.number.isRequired,
      flow_weight: PropTypes.number.isRequired
    })
  ).isRequired,
  selectedCommodity: PropTypes.string.isRequired,
  dateRange: PropTypes.arrayOf(PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.instanceOf(Date)
  ])).isRequired
};

export default CombinedFlowNetworkMap;