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
  IconButton,
  Chip,
  Alert
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

const NetworkGraphLegend = ({ 
  metrics, 
  analysisMetric, 
  colorScales,
  keyMarkets 
}) => {
  // Validate input data
  const hasValidMetrics = metrics?.centrality?.metrics;
  const hasValidColorScale = colorScales?.[analysisMetric];
  const hasValidKeyMarkets = Array.isArray(keyMarkets) && keyMarkets.length > 0;

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
    if (!scale) return [];
    try {
      const steps = 5;
      const gradient = [];
      for (let i = 0; i < steps; i++) {
        const color = scale(i / (steps - 1));
        if (color && typeof color.hex === 'function') {
          gradient.push(color);
        }
      }
      return gradient;
    } catch (error) {
      console.error('Error generating color gradient:', error);
      return [];
    }
  };

  const renderColorScale = () => {
    if (!hasValidColorScale) return null;
    
    const gradient = getColorGradient(colorScales[analysisMetric]);
    if (!gradient.length) return null;
    
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
                bgcolor: color.hex()
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
    if (!hasValidKeyMarkets) return null;

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
            .filter(market => market && typeof market.significance === 'number')
            .sort((a, b) => b.significance - a.significance)
            .slice(0, 5)
            .map((market, i) => (
              <ListItem key={i} sx={{ py: 0.5 }}>
                <ListItemText
                  primary={market.market}
                  secondary={
                    <React.Fragment>
                      {market.role?.charAt(0).toUpperCase() + market.role?.slice(1) || 'Unknown Role'}
                      <br />
                      <Typography variant="caption" color="text.secondary">
                        Significance: {(market.significance * 100).toFixed(1)}%
                      </Typography>
                    </React.Fragment>
                  }
                />
              </ListItem>
            ))}
        </List>
      </Box>
    );
  };

  const renderNetworkMetrics = () => {
    if (!hasValidMetrics) return null;

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
        
        <Box sx={{ mb: 1 }}>
          <Chip
            size="small"
            icon={centralityMetrics.converged ? <CheckCircleIcon /> : <ErrorIcon />}
            label={centralityMetrics.converged ? "Converged" : "Not Converged"}
            color={centralityMetrics.converged ? "success" : "warning"}
            sx={{ mr: 1 }}
          />
          <Typography variant="caption" color="text.secondary">
            {centralityMetrics.iterations} iterations
          </Typography>
        </Box>

        <List dense>
          <ListItem sx={{ py: 0.5 }}>
            <ListItemText 
              primary="Average Centrality"
              secondary={!isNaN(centralityMetrics.avgCentrality) ? 
                centralityMetrics.avgCentrality.toFixed(3) : 'N/A'}
            />
          </ListItem>
          <ListItem sx={{ py: 0.5 }}>
            <ListItemText 
              primary="Centrality Range"
              secondary={!isNaN(centralityMetrics.minCentrality) && !isNaN(centralityMetrics.maxCentrality) ?
                `${centralityMetrics.minCentrality.toFixed(3)} - ${centralityMetrics.maxCentrality.toFixed(3)}` : 'N/A'}
            />
          </ListItem>
          {centralityMetrics.maxDiff && !isNaN(centralityMetrics.maxDiff) && (
            <ListItem sx={{ py: 0.5 }}>
              <ListItemText 
                primary="Convergence Error"
                secondary={centralityMetrics.maxDiff.toExponential(2)}
              />
            </ListItem>
          )}
        </List>
      </Box>
    );
  };

  if (!hasValidMetrics && !hasValidColorScale && !hasValidKeyMarkets) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            No valid network analysis data available
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Legend
        </Typography>
        
        {renderColorScale()}
        
        {(hasValidKeyMarkets || hasValidMetrics) && (
          <Divider sx={{ my: 2 }} />
        )}
        
        {renderKeyMarkets()}
        
        {hasValidMetrics && (
          <Divider sx={{ my: 2 }} />
        )}
        
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
