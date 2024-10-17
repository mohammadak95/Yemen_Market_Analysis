// src/components/spatial-analysis/SpatialNetworkGraph.js

import React, { useEffect, useRef, useState, useMemo } from "react";
import PropTypes from "prop-types";
import * as d3 from "d3";
import { Box, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";

const SpatialNetworkGraph = ({ selectedCommodity, flowMaps, geoData }) => {
  const theme = useTheme();
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Filter flow maps based on selectedCommodity
  const filteredFlowMaps = useMemo(() => {
    if (!flowMaps || !selectedCommodity || !geoData) return [];

    // Get unique region IDs for the selected commodity from GeoJSON data
    const commodityRegions = new Set(
      geoData.features.map((feature) => feature.properties.region_id)
    );

    // Filter flow maps to include only those where both source and target are in the commodityRegions set
    return flowMaps.filter(
      (flow) =>
        commodityRegions.has(flow.source) && commodityRegions.has(flow.target)
    );
  }, [flowMaps, selectedCommodity, geoData]);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setDimensions({
          width: clientWidth,
          height: clientHeight,
        });
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!filteredFlowMaps || filteredFlowMaps.length === 0) {
      return;
    }

    const { width, height } = dimensions;
    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height);

    svg.selectAll("*").remove(); // Clear previous drawings

    const projection = d3
      .geoMercator()
      .fitSize(
        [width - 100, height - 100],
        {
          type: "FeatureCollection",
          features: filteredFlowMaps.flatMap((d) => [
            {
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates: [d.source_lng, d.source_lat],
              },
            },
            {
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates: [d.target_lng, d.target_lat],
              },
            },
          ]),
        },
      );

    const getX = (d) => projection([d.lng, d.lat])[0];
    const getY = (d) => projection([d.lng, d.lat])[1];

    // Draw lines representing flows
    svg
      .selectAll("line")
      .data(filteredFlowMaps)
      .enter()
      .append("line")
      .attr("x1", (d) => getX({ lng: d.source_lng, lat: d.source_lat }))
      .attr("y1", (d) => getY({ lng: d.source_lng, lat: d.source_lat }))
      .attr("x2", (d) => getX({ lng: d.target_lng, lat: d.target_lat }))
      .attr("y2", (d) => getY({ lng: d.target_lng, lat: d.target_lat }))
      .attr("stroke", theme.palette.primary.main)
      .attr("stroke-width", (d) => Math.sqrt(d.weight) / 2)
      .attr("opacity", 0.6);

    // Prepare unique points for circles and labels
    const allPoints = filteredFlowMaps.flatMap((d) => [
      { name: d.source, lng: d.source_lng, lat: d.source_lat },
      { name: d.target, lng: d.target_lng, lat: d.target_lat },
    ]);

    const uniquePoints = Array.from(
      new Map(allPoints.map((item) => [item.name, item])).values(),
    );

    // Draw circles representing regions
    svg
      .selectAll("circle")
      .data(uniquePoints)
      .enter()
      .append("circle")
      .attr("cx", (d) => getX(d))
      .attr("cy", (d) => getY(d))
      .attr("r", 5)
      .attr("fill", theme.palette.secondary.main)
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5);

    // Draw labels for regions
    svg
      .selectAll("text")
      .data(uniquePoints)
      .enter()
      .append("text")
      .attr("x", (d) => getX(d) + 8)
      .attr("y", (d) => getY(d))
      .text((d) => d.name)
      .attr("font-size", "10px")
      .attr("fill", "#333");
  }, [filteredFlowMaps, dimensions, theme]);

  if (!filteredFlowMaps || filteredFlowMaps.length === 0) {
    return (
      <Box sx={{ p: 2, mt: 4 }}>
        <Typography>
          No network data available for <strong>{selectedCommodity}</strong>.
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      ref={containerRef}
      sx={{ width: '100%', height: '100%', minHeight: '600px' }}
    >
      <svg ref={svgRef}></svg>
    </Box>
  );
};

SpatialNetworkGraph.propTypes = {
  selectedCommodity: PropTypes.string.isRequired,
  flowMaps: PropTypes.arrayOf(
    PropTypes.shape({
      source: PropTypes.string.isRequired,
      source_lat: PropTypes.number.isRequired,
      source_lng: PropTypes.number.isRequired,
      target: PropTypes.string.isRequired,
      target_lat: PropTypes.number.isRequired,
      target_lng: PropTypes.number.isRequired,
      weight: PropTypes.number.isRequired,
    })
  ).isRequired,
  geoData: PropTypes.shape({
    features: PropTypes.arrayOf(PropTypes.object).isRequired,
  }).isRequired,
};

export default SpatialNetworkGraph;
