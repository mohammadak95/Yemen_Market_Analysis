//src/components/spatial-analysis/MarketClustering.js

import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
  Tooltip,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Divider,
} from '@mui/material';
import { Info as InfoIcon } from 'lucide-react';
import ForceGraph2D from 'react-force-graph-2d';
import { scaleLinear } from 'd3-scale';
import { useTechnicalHelp } from '../../../hooks/useTechnicalHelp';

const MarketClustering = ({ data, selectedCommodity, isMobile }) => {
  const [selectedCluster, setSelectedCluster] = useState('all');
  const [selectedMetric, setSelectedMetric] = useState('integration');
  
  const { getTechnicalTooltip } = useTechnicalHelp('spatial');

  // Process cluster data for visualization
  const graphData = useMemo(() => {
    if (!data?.features) return { nodes: [], links: [] };

    const nodes = [];
    const links = [];
    const nodeMap = new Map();

    // Process features into nodes
    data.features.forEach(feature => {
      const props = feature.properties;
      if (!props?.region_id) return;

      if (!nodeMap.has(props.region_id)) {
        nodeMap.set(props.region_id, {
          id: props.region_id,
          name: props.name || props.region_id,
          cluster: props.cluster || 'unclustered',
          integration: props.integration_score || 0,
          centrality: props.centrality_score || 0,
          size: props.market_size || 1
        });
        nodes.push(nodeMap.get(props.region_id));
      }
    });

    // Create links based on spatial relationships
    data.features.forEach(feature => {
      const props = feature.properties;
      if (!props?.connections) return;

      props.connections.forEach(conn => {
        if (
          nodeMap.has(conn.source) && 
          nodeMap.has(conn.target) &&
          (selectedCluster === 'all' || 
           props.cluster === parseInt(selectedCluster))
        ) {
          links.push({
            source: conn.source,
            target: conn.target,
            value: conn.strength || 1
          });
        }
      });
    });

    return { nodes, links };
  }, [data, selectedCluster]);

  // Calculate cluster statistics
  const clusterStats = useMemo(() => {
    if (!data?.features) return [];

    const clusters = new Map();
    
    data.features.forEach(feature => {
      const props = feature.properties;
      const clusterId = props.cluster || 'unclustered';
      
      if (!clusters.has(clusterId)) {
        clusters.set(clusterId, {
          id: clusterId,
          marketCount: 0,
          totalIntegration: 0,
          markets: [],
          density: 0
        });
      }

      const cluster = clusters.get(clusterId);
      cluster.marketCount++;
      cluster.totalIntegration += props.integration_score || 0;
      cluster.markets.push({
        name: props.name || props.region_id,
        centrality: props.centrality_score || 0
      });
    });

    return Array.from(clusters.values()).map(cluster => ({
      id: cluster.id,
      marketCount: cluster.marketCount,
      avgIntegration: cluster.totalIntegration / cluster.marketCount,
      density: cluster.density,
      centralMarket: cluster.markets.reduce((max, market) => 
        market.centrality > (max?.centrality || 0) ? market : max
      , null)?.name
    }));
  }, [data]);

  // Node color scale based on selected metric
  const colorScale = useMemo(() => {
    if (!graphData.nodes.length) return () => '#ccc';

    const values = graphData.nodes.map(node => node[selectedMetric]);
    return scaleLinear()
      .domain([Math.min(...values), Math.max(...values)])
      .range(['#ff9999', '#990000']);
  }, [graphData.nodes, selectedMetric]);

  if (!data?.features?.length) {
    return (
      <Alert severity="info">
        No clustering data available for analysis
      </Alert>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Market Clustering Analysis
          <Tooltip title={getTechnicalTooltip('market_clustering')}>
            <IconButton size="small">
              <InfoIcon size={16} />
            </IconButton>
          </Tooltip>
        </Typography>

        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Cluster Filter</InputLabel>
              <Select
                value={selectedCluster}
                onChange={(e) => setSelectedCluster(e.target.value)}
                label="Cluster Filter"
              >
                <MenuItem value="all">All Clusters</MenuItem>
                {clusterStats.map((cluster) => (
                  <MenuItem key={cluster.id} value={cluster.id}>
                    Cluster {cluster.id}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Color By</InputLabel>
              <Select
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value)}
                label="Color By"
              >
                <MenuItem value="integration">Integration Level</MenuItem>
                <MenuItem value="centrality">Market Centrality</MenuItem>
                <MenuItem value="size">Market Size</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Clustering Summary for {selectedCommodity}
          </Typography>
          <Typography variant="body2">
            Identified {clusterStats.length} distinct market clusters with varying levels of integration.
            {selectedCluster !== 'all' && clusterStats[parseInt(selectedCluster) - 1] && 
              ` Selected cluster contains ${clusterStats[parseInt(selectedCluster) - 1].marketCount} markets 
              with average integration of ${clusterStats[parseInt(selectedCluster) - 1].avgIntegration.toFixed(2)}.`
            }
          </Typography>
        </Alert>
      </Box>

      <Grid container spacing={3}>
        {/* Network Visualization */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box sx={{ height: isMobile ? 300 : 500 }}>
                <ForceGraph2D
                  graphData={graphData}
                  nodeColor={node => colorScale(node[selectedMetric])}
                  nodeLabel={node => `${node.name}\n${selectedMetric}: ${node[selectedMetric].toFixed(2)}`}
                  linkWidth={link => Math.sqrt(link.value) * 2}
                  linkColor={() => '#999'}
                  nodeRelSize={6}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Cluster Statistics */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Cluster Statistics
              </Typography>
              {clusterStats.map((stat) => (
                <Box key={stat.id} sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Cluster {stat.id}
                  </Typography>
                  <Box sx={{ pl: 2 }}>
                    <Typography variant="body2">
                      Markets: {stat.marketCount}
                    </Typography>
                    <Typography variant="body2">
                      Avg. Integration: {stat.avgIntegration.toFixed(2)}
                    </Typography>
                    <Typography variant="body2">
                      Network Density: {stat.density.toFixed(2)}
                    </Typography>
                    <Typography variant="body2">
                      Central Market: {stat.centralMarket}
                    </Typography>
                  </Box>
                  <Divider sx={{ mt: 1 }} />
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Paper>
  );
};

MarketClustering.propTypes = {
  data: PropTypes.shape({
    features: PropTypes.arrayOf(PropTypes.shape({
      properties: PropTypes.shape({
        region_id: PropTypes.string,
        name: PropTypes.string,
        cluster: PropTypes.number,
        integration_score: PropTypes.number,
        centrality_score: PropTypes.number,
        market_size: PropTypes.number,
        connections: PropTypes.arrayOf(PropTypes.shape({
          source: PropTypes.string,
          target: PropTypes.string,
          strength: PropTypes.number,
        })),
      }),
    })),
  }),
  selectedCommodity: PropTypes.string.isRequired,
  isMobile: PropTypes.bool,
};

export default React.memo(MarketClustering);