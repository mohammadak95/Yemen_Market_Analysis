// src/components/spatial-analysis/CombinedFlowNetworkMap.js

import React, { useEffect, useRef, useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Typography,
  Paper,
  Box,
  Slider,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import * as d3 from 'd3';
import { useTechnicalHelp } from '../../../hooks/useTechnicalHelp';
import InfoIcon from '@mui/icons-material/Info'; // Added Import


const CombinedFlowNetworkMap = ({ flowMaps, dateRange }) => {
  const theme = useTheme();
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const flowLayerGroup = useRef(null);
  const networkLayerGroup = useRef(null);
  const svgRef = useRef(null);

  // Ref to store the current top-left point of the SVG overlay
  const overlayTopLeft = useRef({ x: 0, y: 0 });

  // Ref to store D3 flows selection
  const flowsRef = useRef(null);

  // State for controls
  const [hoveredFlow, setHoveredFlow] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState('All');
  const [isDebugMode, setIsDebugMode] = useState(false);
  const [showFlows, setShowFlows] = useState(true);
  const [showNodes, setShowNodes] = useState(true);

  const { getTechnicalTooltip } = useTechnicalHelp('spatial');

  // Get current timestamp for slider
  const timeRange = useMemo(() => ({
    min: new Date(dateRange[0]).getTime(),
    max: new Date(dateRange[1]).getTime()
  }), [dateRange]);

  const [currentTimestamp, setCurrentTimestamp] = useState(timeRange.min);

  // Utility function for coordinate validation
  const validateCoordinates = (lat, lng) => {
    const validLat = parseFloat(lat);
    const validLng = parseFloat(lng);
    
    if (isNaN(validLat) || isNaN(validLng)) return null;
    if (validLat < -90 || validLat > 90) return null;
    if (validLng < -180 || validLng > 180) return null;
    
    return [validLat, validLng];
  };

  // Function to set SVG overlay size and position
  const setSVGOverlay = () => {
    if (!mapInstance.current || !svgRef.current) return;
    
    const bounds = mapInstance.current.getBounds();
    const topLeftPoint = mapInstance.current.latLngToLayerPoint(bounds.getNorthWest());
    const bottomRightPoint = mapInstance.current.latLngToLayerPoint(bounds.getSouthEast());

    overlayTopLeft.current = {
      x: topLeftPoint.x,
      y: topLeftPoint.y
    };

    svgRef.current.svg
      .attr("width", bottomRightPoint.x - topLeftPoint.x)
      .attr("height", bottomRightPoint.y - topLeftPoint.y)
      .style("left", `${topLeftPoint.x}px`)
      .style("top", `${topLeftPoint.y}px`);
  };

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

      // Initialize SVG overlay
      const svg = d3.select(mapInstance.current.getPanes().overlayPane)
        .append("svg")
        .attr("class", "flow-overlay")
        .style("position", "absolute");
      const g = svg.append("g").attr("class", "leaflet-zoom-hide");
      svgRef.current = { svg, g };

      setSVGOverlay();

      // Define updateFlowLines outside the if block to ensure it's always defined
      const updateFlowLines = () => {
        if (!showFlows || !flowsRef.current) return;
        flowsRef.current.attr("d", flow => {
          const sourceCoords = validateCoordinates(flow.source_lat, flow.source_lng);
          const targetCoords = validateCoordinates(flow.target_lat, flow.target_lng);
          
          if (!sourceCoords || !targetCoords) return null;

          const sourcePoint = mapInstance.current.latLngToLayerPoint(sourceCoords);
          const targetPoint = mapInstance.current.latLngToLayerPoint(targetCoords);

          const relativeSource = {
            x: sourcePoint.x - overlayTopLeft.current.x,
            y: sourcePoint.y - overlayTopLeft.current.y
          };
          const relativeTarget = {
            x: targetPoint.x - overlayTopLeft.current.x,
            y: targetPoint.y - overlayTopLeft.current.y
          };

          return `M${relativeSource.x},${relativeSource.y}L${relativeTarget.x},${relativeTarget.y}`;
        });
      };

      // Attach event listeners
      mapInstance.current.on("zoomend moveend resize", () => {
        setSVGOverlay();
        updateFlowLines();
      });

      // Cleanup function to remove event listeners on unmount
      return () => {
        if (mapInstance.current) {
          mapInstance.current.off("zoomend moveend resize");
        }
      };
    }

    // Filter flows based on date and region
    const currentDate = new Date(currentTimestamp);
    const filteredFlows = flowMaps.filter(flow => {
      const flowDate = new Date(flow.date);
      const isBeforeOrEqual = flowDate <= currentDate;
      const isInRegion = selectedRegion === 'All' || 
                        flow.source === selectedRegion || 
                        flow.target === selectedRegion;

      const sourceCoords = validateCoordinates(flow.source_lat, flow.source_lng);
      const targetCoords = validateCoordinates(flow.target_lat, flow.target_lng);
      
      return isBeforeOrEqual && isInRegion && sourceCoords && targetCoords;
    });

    // Debug logging
    if (isDebugMode) {
      console.debug('Flow Filtering Summary:', {
        total: flowMaps.length,
        filtered: filteredFlows.length,
        date: currentDate,
        region: selectedRegion
      });
    }

    // Clear existing layers
    flowLayerGroup.current.clearLayers();
    networkLayerGroup.current.clearLayers();
    svgRef.current.g.selectAll("*").remove();

    // Create network nodes
    if (showNodes) {
      const networkNodes = new Set();
      filteredFlows.forEach(flow => {
        const sourceCoords = validateCoordinates(flow.source_lat, flow.source_lng);
        const targetCoords = validateCoordinates(flow.target_lat, flow.target_lng);

        if (sourceCoords) {
          networkNodes.add(JSON.stringify({
            name: flow.source,
            lat: sourceCoords[0],
            lng: sourceCoords[1],
            weight: flow.flow_weight
          }));
        }

        if (targetCoords) {
          networkNodes.add(JSON.stringify({
            name: flow.target,
            lat: targetCoords[0],
            lng: targetCoords[1],
            weight: flow.flow_weight
          }));
        }
      });

      // Add nodes to map
      Array.from(networkNodes).map(JSON.parse).forEach(node => {
        if (isDebugMode) {
          console.debug('Adding node:', node);
        }

        const radius = Math.max(5, Math.sqrt(node.weight) * 3);
        
        L.circleMarker([node.lat, node.lng], {
          radius,
          fillColor: theme.palette.primary.main,
          color: '#fff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.8
        })
        .addTo(networkLayerGroup.current)
        .bindPopup(`
          <strong>Market: ${node.name}</strong><br>
          Flow Weight: ${node.weight.toFixed(2)}
        `);
      });
    }

    // Draw flow lines
    if (showFlows) {
      flowsRef.current = svgRef.current.g.selectAll("path")
        .data(filteredFlows)
        .enter()
        .append("path")
        .attr("d", flow => {
          const sourceCoords = validateCoordinates(flow.source_lat, flow.source_lng);
          const targetCoords = validateCoordinates(flow.target_lat, flow.target_lng);
          
          if (!sourceCoords || !targetCoords) return null;

          const sourcePoint = mapInstance.current.latLngToLayerPoint(sourceCoords);
          const targetPoint = mapInstance.current.latLngToLayerPoint(targetCoords);

          const relativeSource = {
            x: sourcePoint.x - overlayTopLeft.current.x,
            y: sourcePoint.y - overlayTopLeft.current.y
          };
          const relativeTarget = {
            x: targetPoint.x - overlayTopLeft.current.x,
            y: targetPoint.y - overlayTopLeft.current.y
          };

          return `M${relativeSource.x},${relativeSource.y}L${relativeTarget.x},${relativeTarget.y}`;
        })
        .style("stroke", theme.palette.secondary.main)
        .style("stroke-width", flow => Math.max(1, Math.sqrt(flow.flow_weight)))
        .style("stroke-opacity", 0.6)
        .on("mouseover", (event, flow) => {
          setHoveredFlow(flow);
          d3.select(event.currentTarget)
            .style("stroke-opacity", 1)
            .style("stroke-width", d => Math.max(2, Math.sqrt(d.flow_weight) * 1.5));
        })
        .on("mouseout", (event) => {
          setHoveredFlow(null);
          d3.select(event.currentTarget)
            .style("stroke-opacity", 0.6)
            .style("stroke-width", d => Math.max(1, Math.sqrt(d.flow_weight)));
        });

      // Define updateFlowLines function inside useEffect
      const updateFlowLines = () => {
        if (!showFlows || !flowsRef.current) return;
        flowsRef.current.attr("d", flow => {
          const sourceCoords = validateCoordinates(flow.source_lat, flow.source_lng);
          const targetCoords = validateCoordinates(flow.target_lat, flow.target_lng);
          
          if (!sourceCoords || !targetCoords) return null;

          const sourcePoint = mapInstance.current.latLngToLayerPoint(sourceCoords);
          const targetPoint = mapInstance.current.latLngToLayerPoint(targetCoords);

          const relativeSource = {
            x: sourcePoint.x - overlayTopLeft.current.x,
            y: sourcePoint.y - overlayTopLeft.current.y
          };
          const relativeTarget = {
            x: targetPoint.x - overlayTopLeft.current.x,
            y: targetPoint.y - overlayTopLeft.current.y
          };

          return `M${relativeSource.x},${relativeSource.y}L${relativeTarget.x},${relativeTarget.y}`;
        });
      };

      // Update flow lines initially
      updateFlowLines();
    }

  }, [flowMaps, currentTimestamp, selectedRegion, theme.palette, isDebugMode, showFlows, showNodes]);

  return (
    <Paper sx={{ p: 2, position: 'relative' }}>
      <Typography variant="h6" gutterBottom>
        Market Flow Network
        <Tooltip title={getTechnicalTooltip('flow_network')}>
          <InfoIcon fontSize="small" sx={{ ml: 1 }} /> {/* InfoIcon Now Imported */}
        </Tooltip>
      </Typography>

      <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Region Filter</InputLabel>
          <Select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            label="Region Filter"
            size="small"
          >
            {regions.map(region => (
              <MenuItem key={region} value={region}>{region}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={showFlows}
                onChange={(e) => setShowFlows(e.target.checked)}
              />
            }
            label="Show Flows"
          />
          <FormControlLabel
            control={
              <Switch
                checked={showNodes}
                onChange={(e) => setShowNodes(e.target.checked)}
              />
            }
            label="Show Nodes"
          />
          <FormControlLabel
            control={
              <Switch
                checked={isDebugMode}
                onChange={(e) => setIsDebugMode(e.target.checked)}
              />
            }
            label="Debug Mode"
          />
        </Box>
      </Box>

      <Box sx={{ height: '500px', position: 'relative' }}>
        <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
        
        {hoveredFlow && (
          <Paper 
            sx={{ 
              position: 'absolute',
              top: 10,
              right: 10,
              p: 1,
              zIndex: 1000,
            }}
          >
            <Typography variant="subtitle2">
              {hoveredFlow.source} → {hoveredFlow.target}
            </Typography>
            <Typography variant="body2">
              Flow Weight: {hoveredFlow.flow_weight.toFixed(2)}
            </Typography>
          </Paper>
        )}
      </Box>

      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Time Period
        </Typography>
        <Slider
          value={currentTimestamp}
          min={timeRange.min}
          max={timeRange.max}
          onChange={(_, value) => setCurrentTimestamp(value)}
          valueLabelDisplay="auto"
          valueLabelFormat={value => new Date(value).toLocaleDateString()}
        />
      </Box>
    </Paper>
  );
};

CombinedFlowNetworkMap.propTypes = {
  flowMaps: PropTypes.arrayOf(PropTypes.shape({
    date: PropTypes.string.isRequired,
    source: PropTypes.string.isRequired,
    source_lat: PropTypes.number.isRequired,
    source_lng: PropTypes.number.isRequired,
    target: PropTypes.string.isRequired,
    target_lat: PropTypes.number.isRequired,
    target_lng: PropTypes.number.isRequired,
    flow_weight: PropTypes.number.isRequired,
  })).isRequired,
  selectedCommodity: PropTypes.string.isRequired,
  dateRange: PropTypes.arrayOf(PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.instanceOf(Date)
  ])).isRequired
};

export default CombinedFlowNetworkMap;