import React, { useEffect, useRef, useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Typography, Paper, Box, Slider, Tooltip as MuiTooltip, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import * as d3 from 'd3';

const CombinedFlowNetworkMap = ({ flowMaps, networkData, selectedCommodity, dateRange }) => {
  console.debug('CombinedFlowNetworkMap initialized', { flowMaps, networkData, selectedCommodity, dateRange });

  const theme = useTheme();
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const flowLayerGroup = useRef(null);
  const networkLayerGroup = useRef(null);
  const svgRef = useRef(null);
  
  const [currentDate, setCurrentDate] = useState(dateRange[0]);
  console.debug('Initial currentDate set', { currentDate });

  const [hoveredFlow, setHoveredFlow] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState('All');
  console.debug('Initial selectedRegion set', { selectedRegion });

  const regions = useMemo(() => {
    console.log('Calculating unique regions for region selection dropdown');
    const allRegions = new Set(networkData.map(node => node.region));
    const regionList = ['All', ...Array.from(allRegions)];
    console.debug('Unique regions derived from networkData', { regionList });
    return regionList;
  }, [networkData]);

  useEffect(() => {
    console.log('CombinedFlowNetworkMap useEffect triggered for map initialization and data filtering');
    
    if (!mapRef.current) {
      console.warn('Map container element not found');
      return;
    }

    // Initialize Leaflet map if not already initialized
    if (!mapInstance.current) {
      console.log('Initializing Leaflet map instance');
      try {
        mapInstance.current = L.map(mapRef.current).setView([15.5527, 48.5164], 6); // Yemen coordinates
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
        }).addTo(mapInstance.current);
        console.log('Leaflet tile layer added to the map');

        flowLayerGroup.current = L.layerGroup().addTo(mapInstance.current);
        networkLayerGroup.current = L.layerGroup().addTo(mapInstance.current);
        console.debug('Flow and Network layer groups initialized and added to the map');

        // Create SVG overlay for D3
        const svg = d3.select(mapInstance.current.getPanes().overlayPane).append("svg");
        const g = svg.append("g").attr("class", "leaflet-zoom-hide");
        svgRef.current = { svg, g };
        console.debug('SVG overlay created for D3 rendering');
      } catch (initError) {
        console.error('Error initializing Leaflet map:', initError);
      }
    } else {
      console.debug('Leaflet map instance already initialized');
    }

    // Clear previous layers and D3 elements
    console.log('Clearing previous layers and D3 elements');
    try {
      flowLayerGroup.current.clearLayers();
      networkLayerGroup.current.clearLayers();
      svgRef.current.g.selectAll("*").remove();
      console.debug('Previous layers and SVG elements cleared');
    } catch (clearError) {
      console.error('Error clearing layers or SVG elements:', clearError);
    }

    console.log('Filtering data based on current date and selected region', { currentDate, selectedRegion });
    const currentFlows = flowMaps.filter(flow => {
      const flowDate = new Date(flow.date);
      const isBeforeOrEqual = flowDate <= currentDate;
      const isInRegion = selectedRegion === 'All' || flow.source_region === selectedRegion || flow.target_region === selectedRegion;
      if (!isBeforeOrEqual) {
        console.debug('Flow excluded by date', { flow, flowDate, currentDate });
      }
      if (!isInRegion) {
        console.debug('Flow excluded by region', { flow, selectedRegion });
      }
      return isBeforeOrEqual && isInRegion;
    });
    
    const currentNetworkNodes = networkData.filter(node => {
      const nodeDate = new Date(node.date);
      const isBeforeOrEqual = nodeDate <= currentDate;
      const isInRegion = selectedRegion === 'All' || node.region === selectedRegion;
      if (!isBeforeOrEqual) {
        console.debug('Node excluded by date', { node, nodeDate, currentDate });
      }
      if (!isInRegion) {
        console.debug('Node excluded by region', { node, selectedRegion });
      }
      return isBeforeOrEqual && isInRegion;
    });

    console.debug('Filtered flow and network data', { currentFlows, currentNetworkNodes });

    // Add network nodes to Leaflet layer
    currentNetworkNodes.forEach(node => {
      console.debug('Adding network node to map', { node });
      try {
        const marker = L.circleMarker([node.lat, node.lng], {
          radius: 5,
          fillColor: theme.palette.primary.main,
          color: '#fff',
          weight: 1,
          opacity: 1,
          fillOpacity: 0.8,
        }).addTo(networkLayerGroup.current)
          .bindPopup(`Market: ${node.name}<br>Region: ${node.region}`);
        console.debug('Network node added to layer group', { node, marker });
      } catch (nodeError) {
        console.error('Error adding network node to map:', nodeError, { node });
      }
    });

    // Define D3 projection tied to Leaflet map
    const transform = d3.geoTransform({
      point: function(x, y) {
        const point = mapInstance.current.latLngToLayerPoint(new L.LatLng(y, x));
        this.stream.point(point.x, point.y);
      }
    });

    const path = d3.geoPath().projection(transform);

    const update = () => {
      console.debug('Updating D3 paths after map interaction');
      try {
        svgRef.current.g.selectAll("path").attr("d", path);
        console.debug('D3 paths updated');
      } catch (updateError) {
        console.error('Error updating D3 paths:', updateError);
      }
    };

    console.log('Rendering flow lines on map using D3');
    try {
      const paths = svgRef.current.g.selectAll("path")
        .data(currentFlows, flow => `${flow.source}-${flow.target}-${flow.date}`); // Unique key for data binding

      // Enter selection and append paths
      paths.enter()
        .append("path")
        .attr("d", flow => {
          try {
            const source = mapInstance.current.latLngToLayerPoint([flow.source_lat, flow.source_lng]);
            const target = mapInstance.current.latLngToLayerPoint([flow.target_lat, flow.target_lng]);
            console.debug('Drawing flow line', { flow, source, target });
            return `M${source.x},${source.y}L${target.x},${target.y}`;
          } catch (coordError) {
            console.error('Error converting coordinates for flow line:', coordError, { flow });
            return '';
          }
        })
        .style("stroke", theme.palette.secondary.main)
        .style("stroke-width", flow => Math.sqrt(flow.weight))
        .style("stroke-opacity", 0.6)
        .on("mouseover", (event, flow) => {
          console.debug('Mouse over flow line', { flow });
          try {
            d3.select(event.target)
              .style("stroke", theme.palette.error.main)
              .style("stroke-width", Math.sqrt(flow.weight) * 1.5)
              .style("stroke-opacity", 1);
            setHoveredFlow(flow);
          } catch (mouseoverError) {
            console.error('Error handling mouseover event:', mouseoverError, { flow });
          }
        })
        .on("mouseout", (event, flow) => {
          console.debug('Mouse out from flow line', { flow });
          try {
            d3.select(event.target)
              .style("stroke", theme.palette.secondary.main)
              .style("stroke-width", Math.sqrt(flow.weight))
              .style("stroke-opacity", 0.6);
            setHoveredFlow(null);
          } catch (mouseoutError) {
            console.error('Error handling mouseout event:', mouseoutError, { flow });
          }
        })
        .on("click", (event, flow) => {
          console.debug('Flow line clicked', { flow });
          try {
            L.popup()
              .setLatLng([flow.source_lat, flow.source_lng])
              .setContent(`
                <strong>Flow Details:</strong><br>
                From: ${flow.source}<br>
                To: ${flow.target}<br>
                Volume: ${flow.weight.toFixed(2)}<br>
                Date: ${new Date(flow.date).toLocaleDateString()}
              `)
              .openOn(mapInstance.current);
            console.debug('Popup opened for flow line', { flow });
          } catch (clickError) {
            console.error('Error handling click event on flow line:', clickError, { flow });
          }
        });

      // Update existing paths
      paths
        .attr("d", path)
        .style("stroke", theme.palette.secondary.main)
        .style("stroke-width", flow => Math.sqrt(flow.weight))
        .style("stroke-opacity", 0.6);

      // Remove old paths
      paths.exit().remove();
      console.debug('Flow lines rendered successfully');

      console.debug('Setting up map event listeners for view reset and zoom');
      mapInstance.current.on("viewreset", update);
      mapInstance.current.on("zoomend", update);
      update();

      // Fit map bounds
      console.log('Fitting map bounds based on available data');
      try {
        const allLatLngs = [
          ...currentFlows.map(f => [[f.source_lat, f.source_lng], [f.target_lat, f.target_lng]]).flat(),
          ...currentNetworkNodes.map(n => [n.lat, n.lng]),
        ];
        if (allLatLngs.length > 0) {
          console.debug('Fitting map to bounds', { allLatLngs });
          mapInstance.current.fitBounds(L.latLngBounds(allLatLngs));
          console.debug('Map bounds fitted');
        } else {
          console.warn('No LatLngs available to fit map bounds');
        }
      } catch (fitError) {
        console.error('Error fitting map bounds:', fitError);
      }

    } catch (renderError) {
      console.error('Error rendering flow lines:', renderError);
    }

    // Cleanup function to remove event listeners and D3 elements
    return () => {
      console.debug('Cleaning up CombinedFlowNetworkMap component');
      try {
        mapInstance.current.off("viewreset", update);
        mapInstance.current.off("zoomend", update);
        svgRef.current.g.selectAll("path").remove();
        flowLayerGroup.current.clearLayers();
        networkLayerGroup.current.clearLayers();
        console.debug('Event listeners removed and layers cleared');
      } catch (cleanupError) {
        console.error('Error during cleanup:', cleanupError);
      }
    };
    
  }, [flowMaps, networkData, currentDate, selectedRegion, theme]);

  const handleDateChange = (event, newValue) => {
    console.log('Date slider changed', { newValue });
    const newDate = new Date(newValue);
    if (isNaN(newDate.getTime())) {
      console.warn('Invalid date selected from slider', { newValue });
      return;
    }
    setCurrentDate(newDate);
    console.debug('Updated currentDate', { currentDate: newDate });
  };

  const handleRegionChange = (event) => {
    const newRegion = event.target.value;
    console.log('Region selection changed', { newRegion });
    setSelectedRegion(newRegion);
    console.debug('Updated selectedRegion', { selectedRegion: newRegion });
  };

  console.debug('Rendering CombinedFlowNetworkMap component', { hoveredFlow });

  return (
    <Paper sx={{ p: 2, height: '600px', position: 'relative' }}>
      <Typography variant="h6" gutterBottom>
        Combined Flow and Network Map for {selectedCommodity}
      </Typography>
      <Box sx={{ mb: 2 }}>
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
      </Box>
      <div ref={mapRef} style={{ height: '400px', width: '100%' }} />
      <Box sx={{ mt: 2 }}>
        <Slider
          value={currentDate.getTime()}
          min={dateRange[0].getTime()}
          max={dateRange[1].getTime()}
          onChange={handleDateChange}
          valueLabelDisplay="auto"
          valueLabelFormat={(value) => new Date(value).toLocaleDateString()}
        />
      </Box>
      <Typography variant="body2" sx={{ mt: 1 }}>
        Current Date: {currentDate.toLocaleDateString()}
      </Typography>
      {hoveredFlow && (
        <MuiTooltip
          title={`Click for more details about the flow from ${hoveredFlow.source} to ${hoveredFlow.target}`}
          open={true}
          placement="top"
        >
          <Box sx={{ position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(255,255,255,0.8)', p: 1, borderRadius: 1 }}>
            <Typography variant="body2">
              From: {hoveredFlow.source}<br />
              To: {hoveredFlow.target}<br />
              Volume: {hoveredFlow.weight.toFixed(2)}
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
      source: PropTypes.string.isRequired,
      target: PropTypes.string.isRequired,
      source_lat: PropTypes.number.isRequired,
      source_lng: PropTypes.number.isRequired,
      target_lat: PropTypes.number.isRequired,
      target_lng: PropTypes.number.isRequired,
      weight: PropTypes.number.isRequired,
      date: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.instanceOf(Date)
      ]).isRequired,
      source_region: PropTypes.string.isRequired,
      target_region: PropTypes.string.isRequired,
    })
  ).isRequired,
  networkData: PropTypes.arrayOf(
    PropTypes.shape({
      lat: PropTypes.number.isRequired,
      lng: PropTypes.number.isRequired,
      name: PropTypes.string.isRequired,
      region: PropTypes.string.isRequired,
    })
  ).isRequired,
  selectedCommodity: PropTypes.string.isRequired,
  dateRange: PropTypes.arrayOf(PropTypes.instanceOf(Date)).isRequired,
};

export default CombinedFlowNetworkMap;
