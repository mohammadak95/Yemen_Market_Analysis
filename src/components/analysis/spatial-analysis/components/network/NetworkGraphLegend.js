// src/components/analysis/spatial-analysis/components/network/NetworkGraphLegend.js

import React from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent,
  List,
  ListItem,
  ListItemText,
  Divider,
  Tooltip,
  IconButton
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';

const NetworkGraphLegend = ({ 
  metrics, 
  analysisMetric, 
  colorScales,
  keyMarkets 
}) => {
  const getMetricDescription = (metric) => {
    switch(metric) {
      case 'market_integration':
        return 'Measures how well each market is integrated with others based on price correlations and accessibility';
      case 'centrality':
        return 'Indicates the importance of markets in the network based on their connections and flow patterns';
      case 'flow_volume':
        return 'Shows the relative volume of trade flows through each market';
      default:
        return '';
    }
  };

  const getColorGradient = (scale) => {
    const steps = 5;
    const gradient = [];
    for (let i = 0; i < steps; i++) {
      gradient.push(scale(i / (steps - 1)));
    }
    return gradient;
  };

  const renderColorScale = () => {
    const gradient = getColorGradient(colorScales[analysisMetric]);
    
    return (
      <Box sx={{ mt: 2, mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          {analysisMetric.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' ')}
          <Tooltip title={getMetricDescription(analysisMetric)}>
            <IconButton size="small" sx={{ ml: 0.5 }}>
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Typography>
        <Box sx={{ 
          display: 'flex', 
          height: 20, 
          width: '100%', 
          borderRadius: 1,
          overflow: 'hidden'
        }}>
          {gradient.map((color, i) => (
            <Box 
              key={i} 
              sx={{ 
                flex: 1,
                bgcolor: color
              }} 
            />
          ))}
        </Box>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          mt: 0.5
        }}>
          <Typography variant="caption">Low</Typography>
          <Typography variant="caption">High</Typography>
        </Box>
      </Box>
    );
  };

  const renderKeyMarkets = () => {
    if (!keyMarkets?.length) return null;

    return (
      <Box sx={{ mt: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          Key Markets
          <Tooltip title="Markets with significant influence on price transmission and trade flows">
            <IconButton size="small" sx={{ ml: 0.5 }}>
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Typography>
        <List dense>
          {keyMarkets
            .sort((a, b) => b.metrics.integration - a.metrics.integration)
            .slice(0, 5)
            .map((market, i) => (
              <ListItem key={i} sx={{ py: 0.5 }}>
                <ListItemText
                  primary={market.market}
                  secondary={`${market.role} (${(market.metrics.integration * 100).toFixed(1)}% integration)`}
                />
              </ListItem>
            ))}
        </List>
      </Box>
    );
  };

  const renderNetworkMetrics = () => {
    if (!metrics?.centrality) return null;

    const { metrics: centralityMetrics } = metrics.centrality;
    
    return (
      <Box sx={{ mt: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          Network Metrics
          <Tooltip title="Statistical measures of network structure and market relationships">
            <IconButton size="small" sx={{ ml: 0.5 }}>
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Typography>
        <List dense>
          <ListItem sx={{ py: 0.5 }}>
            <ListItemText 
              primary="Average Centrality"
              secondary={centralityMetrics.avgCentrality.toFixed(3)}
            />
          </ListItem>
          <ListItem sx={{ py: 0.5 }}>
            <ListItemText 
              primary="Centralization"
              secondary={((centralityMetrics.maxCentrality - centralityMetrics.minCentrality) / 
                centralityMetrics.maxCentrality).toFixed(3)}
            />
          </ListItem>
        </List>
      </Box>
    );
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Legend
        </Typography>
        
        {renderColorScale()}
        
        <Divider sx={{ my: 2 }} />
        
        {renderKeyMarkets()}
        
        <Divider sx={{ my: 2 }} />
        
        {renderNetworkMetrics()}

        <Box sx={{ mt: 3 }}>
          <Typography variant="caption" color="text.secondary">
            Node size indicates market size
            <br />
            Edge thickness indicates flow volume
            <br />
            Particle speed indicates flow rate
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default NetworkGraphLegend;
