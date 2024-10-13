// src/components/spatial-analysis/FlowMapsWithMap.js

import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import * as d3 from 'd3';

const FlowMapsWithMap = ({ flowMaps }) => {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Handle responsive sizing
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

    // Initial size
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!flowMaps || flowMaps.length === 0) return;

    const { width, height } = dimensions;

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    svg.selectAll("*").remove();

    // Extract all longitude and latitude values

    // Define a geographic projection
    const projection = d3.geoMercator()
      .fitSize([width - 100, height - 100], {
        type: "FeatureCollection",
        features: flowMaps.flatMap(d => [
          { type: "Feature", geometry: { type: "Point", coordinates: [d.source_lng, d.source_lat] } },
          { type: "Feature", geometry: { type: "Point", coordinates: [d.target_lng, d.target_lat] } }
        ])
      });

    // Helper functions to get projected coordinates
    const getX = d => projection([d.lng, d.lat])[0];
    const getY = d => projection([d.lng, d.lat])[1];

    // Draw flow lines
    svg.selectAll('line')
      .data(flowMaps)
      .enter()
      .append('line')
      .attr('x1', d => getX({ lng: d.source_lng, lat: d.source_lat }))
      .attr('y1', d => getY({ lng: d.source_lng, lat: d.source_lat }))
      .attr('x2', d => getX({ lng: d.target_lng, lat: d.target_lat }))
      .attr('y2', d => getY({ lng: d.target_lng, lat: d.target_lat }))
      .attr('stroke', '#0077be')
      .attr('stroke-width', d => Math.sqrt(d.weight) / 2)
      .attr('opacity', 0.6);

    // Draw nodes
    const allPoints = flowMaps.flatMap(d => [
      { name: d.source, lng: d.source_lng, lat: d.source_lat },
      { name: d.target, lng: d.target_lng, lat: d.target_lat }
    ]);

    const uniquePoints = Array.from(
      new Map(allPoints.map(item => [item.name, item])).values()
    );

    svg.selectAll('circle')
      .data(uniquePoints)
      .enter()
      .append('circle')
      .attr('cx', d => getX(d))
      .attr('cy', d => getY(d))
      .attr('r', 5)
      .attr('fill', '#ff7f00')
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5);

    svg.selectAll('text')
      .data(uniquePoints)
      .enter()
      .append('text')
      .attr('x', d => getX(d) + 8)
      .attr('y', d => getY(d))
      .text(d => d.name)
      .attr('font-size', '10px')
      .attr('fill', '#333');

  }, [flowMaps, dimensions]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: '600px' }}>
      <svg ref={svgRef}></svg>
    </div>
  );
};

FlowMapsWithMap.propTypes = {
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
  geoCoordinates: PropTypes.object.isRequired,
};

export default FlowMapsWithMap;