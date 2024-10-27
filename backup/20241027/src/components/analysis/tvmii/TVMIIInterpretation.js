import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
  Alert,
  AlertTitle,
  Divider,
  Tooltip,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  AlertTriangle,
  Info,
  BarChart2,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { useTechnicalHelp } from '../../../hooks/useTechnicalHelp';

const TVMIIInterpretation = ({ 
  data, 
  selectedCommodity,
}) => {
  const { getTechnicalTooltip } = useTechnicalHelp('tvmii');

  const analysis = useMemo(() => {
    if (!data || !data.tv_mii) return null;

    const values = data.tv_mii.map(d => d.value);
    const dates = data.tv_mii.map(d => new Date(d.date));
    
    // Calculate basic statistics
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const sorted = [...values].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const min = Math.min(...values);
    const max = Math.max(...values);

    // Calculate trend
    const firstValue = values[0];
    const lastValue = values[values.length - 1];
    const trendChange = lastValue - firstValue;
    const trendPercentage = (trendChange / firstValue) * 100;

    // Identify volatility periods
    const volatilityThreshold = mean * 0.2; // 20% of mean
    const volatilePeriods = values.reduce((acc, val, idx) => {
      if (idx > 0) {
        const change = Math.abs(val - values[idx - 1]);
        if (change > volatilityThreshold) {
          acc.push({
            date: dates[idx],
            change: change,
            increasing: val > values[idx - 1]
          });
        }
      }
      return acc;
    }, []);

    // Identify stability patterns
    const stabilityThreshold = mean * 0.1; // 10% of mean
    let stablePeriods = 0;
    for (let i = 1; i < values.length; i++) {
      if (Math.abs(values[i] - values[i-1]) < stabilityThreshold) {
        stablePeriods++;
      }
    }
    const stabilityPercentage = (stablePeriods / values.length) * 100;

    return {
      mean,
      median,
      min,
      max,
      trend: {
        change: trendChange,
        percentage: trendPercentage,
        direction: trendChange > 0 ? 'increasing' : 'decreasing'
      },
      volatilePeriods,
      stability: {
        periods: stablePeriods,
        percentage: stabilityPercentage
      }
    };
  }, [data]);

  const getIntegrationLevel = (value) => {
    if (value >= 0.7) return { level: 'High', color: 'success.main' };
    if (value >= 0.3) return { level: 'Moderate', color: 'warning.main' };
    return { level: 'Low', color: 'error.main' };
  };

  if (!analysis) {
    return (
      <Alert severity="info">
        No TV-MII data available for interpretation.
      </Alert>
    );
  }

  const integrationStatus = getIntegrationLevel(analysis.mean);

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          TV-MII Analysis Interpretation
          <Tooltip title={getTechnicalTooltip('interpretation')}>
            <IconButton size="small">
              <Info />
            </IconButton>
          </Tooltip>
        </Typography>
        
        <Alert 
          severity={integrationStatus.level === 'High' ? 'success' : 'info'}
          sx={{ mb: 2 }}
        >
          <AlertTitle>Overall Market Integration Assessment</AlertTitle>
          <Typography variant="body2">
            {selectedCommodity} markets show <strong>{integrationStatus.level.toLowerCase()}</strong> integration 
            with an average TV-MII of {analysis.mean.toFixed(3)}. The integration level has been 
            {analysis.trend.direction} by {Math.abs(analysis.trend.percentage).toFixed(1)}% over the observed period.
          </Typography>
        </Alert>
      </Box>

      <Grid container spacing={3}>
        {/* Key Statistics */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BarChart2 size={20} />
                Key Statistics
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <Activity size={20} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Mean Integration"
                    secondary={`${analysis.mean.toFixed(3)} (${getIntegrationLevel(analysis.mean).level})`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    {analysis.trend.change > 0 ? 
                      <TrendingUp size={20} color="green" /> : 
                      <TrendingDown size={20} color="red" />
                    }
                  </ListItemIcon>
                  <ListItemText 
                    primary="Overall Trend"
                    secondary={`${analysis.trend.direction} by ${Math.abs(analysis.trend.percentage).toFixed(1)}%`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <AlertTriangle size={20} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Volatility"
                    secondary={`${analysis.volatilePeriods.length} significant changes detected`}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Market Integration Patterns */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Activity size={20} />
                Integration Patterns
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <Info size={20} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Stability"
                    secondary={`${analysis.stability.percentage.toFixed(1)}% of periods show stable integration`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    {analysis.max >= 0.7 ? 
                      <ArrowUp color="success" /> : 
                      <ArrowDown color="error" />
                    }
                  </ListItemIcon>
                  <ListItemText 
                    primary="Peak Integration"
                    secondary={`Maximum: ${analysis.max.toFixed(3)}, Minimum: ${analysis.min.toFixed(3)}`}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Detailed Analysis */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Detailed Analysis
              </Typography>
              <Divider sx={{ my: 1 }} />
              
              {/* Integration Level Analysis */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Integration Level Analysis
                </Typography>
                <Typography variant="body2">
                  The TV-MII values indicate {integrationStatus.level.toLowerCase()} market integration 
                  for {selectedCommodity}. {analysis.mean >= 0.7 ? (
                    "This suggests efficient price transmission between markets and effective market functioning."
                  ) : analysis.mean >= 0.3 ? (
                    "This indicates partial market integration with room for improvement in price transmission."
                  ) : (
                    "This suggests significant barriers to market integration that may need policy intervention."
                  )}
                </Typography>
              </Box>

              {/* Trend Analysis */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Trend Analysis
                </Typography>
                <Typography variant="body2">
                  Market integration has been {analysis.trend.direction} over time, with a 
                  {Math.abs(analysis.trend.percentage).toFixed(1)}% change. 
                  {analysis.trend.change > 0 ? (
                    " This positive trend suggests improving market conditions and reduced barriers to trade."
                  ) : (
                    " This negative trend may indicate emerging challenges in market integration."
                  )}
                </Typography>
              </Box>

              {/* Volatility Assessment */}
              {analysis.volatilePeriods.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Volatility Assessment
                  </Typography>
                  <Typography variant="body2">
                    {`Detected ${analysis.volatilePeriods.length} periods of significant integration changes. `}
                    {analysis.stability.percentage > 70 ? (
                      "Overall market integration shows high stability, suggesting resilient market structures."
                    ) : analysis.stability.percentage > 40 ? (
                      "Moderate stability in market integration, with some periods of volatility."
                    ) : (
                      "High volatility in market integration, possibly indicating structural market challenges."
                    )}
                  </Typography>
                </Box>
              )}

              {/* Policy Implications */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Policy Implications
                </Typography>
                <Typography variant="body2">
                  {analysis.mean < 0.3 ? (
                    "Significant intervention may be needed to improve market integration. Consider addressing infrastructure, information flow, and trade barriers."
                  ) : analysis.mean < 0.7 ? (
                    "Moderate improvements in market integration could be achieved through targeted interventions in market infrastructure and trade facilitation."
                  ) : (
                    "Maintain current market conditions while monitoring for potential disruptions. Focus on sustaining effective market integration."
                  )}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Paper>
  );
};

TVMIIInterpretation.propTypes = {
  data: PropTypes.shape({
    tv_mii: PropTypes.arrayOf(PropTypes.shape({
      date: PropTypes.string.isRequired,
      value: PropTypes.number.isRequired,
    })).isRequired,
  }).isRequired,
  selectedCommodity: PropTypes.string.isRequired,
  selectedPeriod: PropTypes.string,
  isMobile: PropTypes.bool,
};

export default TVMIIInterpretation;