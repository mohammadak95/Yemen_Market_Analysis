import React from 'react';
import PropTypes from 'prop-types';
import {
  Paper,
  Typography,
  Box,
  Divider,
  LinearProgress
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { useMemo } from 'react';


const SeasonalLegend = ({
  seasonalMetrics,
  selectedMonth,
  selectedRegion,
  timeSeriesData
}) => {
  const theme = useTheme();

  // Get month name from selected month
  const monthName = selectedMonth ? 
    new Date(selectedMonth).toLocaleString('default', { month: 'long' }) : '';

  // Create seasonal pattern categories
  const seasonalPatterns = [
    {
      label: 'Strong Seasonal',
      color: '#08519c',
      description: 'Clear and consistent annual patterns',
      threshold: '> 70%'
    },
    {
      label: 'Moderate Seasonal',
      color: '#3182bd',
      description: 'Notable but variable patterns',
      threshold: '40-70%'
    },
    {
      label: 'Weak Seasonal',
      color: '#9ecae1',
      description: 'Limited seasonal influence',
      threshold: '20-40%'
    },
    {
      label: 'Non-Seasonal',
      color: '#f7fbff',
      description: 'No clear seasonal patterns',
      threshold: '< 20%'
    }
  ];

  // Create price variation categories
  const priceCategories = [
    {
      label: 'High Price',
      color: '#006d2c',
      description: 'Above average prices'
    },
    {
      label: 'Moderate Price',
      color: '#74c476',
      description: 'Average price range'
    },
    {
      label: 'Low Price',
      color: '#edf8e9',
      description: 'Below average prices'
    }
  ];

  // Calculate peak and trough months if not provided
  const { peakMonth, troughMonth } = useMemo(() => {
    if (!timeSeriesData?.length) {
      return {
        peakMonth: { month: 0, avgPrice: 0 },
        troughMonth: { month: 0, avgPrice: 0 }
      };
    }

    // Group data by month
    const monthlyData = timeSeriesData.reduce((acc, data) => {
      const month = new Date(data.month).getMonth();
      if (!acc[month]) acc[month] = [];
      acc[month].push(data.usdPrice || 0);
      return acc;
    }, {});

    // Calculate monthly averages
    const monthlyAverages = Object.entries(monthlyData).map(([month, prices]) => ({
      month: parseInt(month),
      avgPrice: prices.reduce((sum, p) => sum + p, 0) / prices.length
    }));

    // Find peak and trough
    const peak = monthlyAverages.reduce((max, curr) => 
      curr.avgPrice > max.avgPrice ? curr : max, monthlyAverages[0]);
    const trough = monthlyAverages.reduce((min, curr) => 
      curr.avgPrice < min.avgPrice ? curr : min, monthlyAverages[0]);

    return {
      peakMonth: peak,
      troughMonth: trough
    };
  }, [timeSeriesData]);

  return (
    <Paper
      elevation={2}
      sx={{
        height: '100%',
        p: 2,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Current Period */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Selected Period
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CalendarTodayIcon color="primary" />
          <Typography>
            {monthName || 'No month selected'}
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ my: 1.5 }} />

      {/* Seasonal Patterns */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Seasonal Patterns
        </Typography>
        {seasonalPatterns.map((pattern, index) => (
          <Box
            key={index}
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 1,
              mt: 1
            }}
          >
            <Box
              sx={{
                width: 20,
                height: 20,
                backgroundColor: pattern.color,
                borderRadius: '2px',
                border: `1px solid ${theme.palette.divider}`,
                flexShrink: 0,
                mt: 0.5
              }}
            />
            <Box>
              <Typography variant="body2">
                {pattern.label}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {pattern.description}
              </Typography>
              <Typography variant="caption" sx={{ display: 'block' }}>
                Seasonality: {pattern.threshold}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>

      <Divider sx={{ my: 1.5 }} />

      {/* Price Variations */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Price Variations
        </Typography>
        {priceCategories.map((category, index) => (
          <Box
            key={index}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              mt: 1
            }}
          >
            <Box
              sx={{
                width: 20,
                height: 20,
                backgroundColor: category.color,
                borderRadius: '2px',
                border: `1px solid ${theme.palette.divider}`
              }}
            />
            <Box>
              <Typography variant="body2">
                {category.label}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {category.description}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>

      <Divider sx={{ my: 1.5 }} />

      {/* Seasonal Strength */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Overall Seasonal Strength
        </Typography>
        <Box sx={{ mt: 1 }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            mb: 0.5
          }}>
            <Typography variant="caption" color="textSecondary">
              Weak
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Strong
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={(seasonalMetrics?.seasonalStrength || 0) * 100}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: theme.palette.grey[200],
              '& .MuiLinearProgress-bar': {
                backgroundColor: '#08519c'
              }
            }}
          />
          <Typography 
            variant="body2" 
            align="center"
            sx={{ mt: 0.5 }}
          >
            {((seasonalMetrics?.seasonalStrength || 0) * 100).toFixed(1)}%
          </Typography>
        </Box>
      </Box>

      {/* Monthly Trends */}
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Monthly Price Trends
        </Typography>
        <Box sx={{ 
          display: 'flex',
          justifyContent: 'space-between',
          mt: 1
        }}>
          <Box>
            <Typography variant="caption" color="textSecondary">
              Peak Month
            </Typography>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center',
              color: theme.palette.error.main
            }}>
              <TrendingUpIcon sx={{ mr: 0.5 }} fontSize="small" />
              <Typography variant="body2">
                {getMonthName(peakMonth.month)}
              </Typography>
            </Box>
          </Box>
          <Box>
            <Typography variant="caption" color="textSecondary">
              Trough Month
            </Typography>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center',
              color: theme.palette.success.main
            }}>
              <TrendingDownIcon sx={{ mr: 0.5 }} fontSize="small" />
              <Typography variant="body2">
                {getMonthName(troughMonth.month)}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Legend Note */}
      <Box
        sx={{
          mt: 'auto',
          pt: 2,
          borderTop: `1px solid ${theme.palette.divider}`
        }}
      >
        <Typography variant="caption" color="textSecondary">
          Click on regions to view detailed seasonal patterns and price trends.
          Use the time control to explore monthly variations.
        </Typography>
      </Box>
    </Paper>
  );
};

// Helper function to get month name
const getMonthName = (monthIndex) => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[monthIndex];
};

SeasonalLegend.propTypes = {
  seasonalMetrics: PropTypes.shape({
    seasonalStrength: PropTypes.number,
    trendStrength: PropTypes.number,
    seasonalPattern: PropTypes.arrayOf(PropTypes.number),
    regionalPatterns: PropTypes.object
  }),
  selectedMonth: PropTypes.string,
  selectedRegion: PropTypes.string,
  timeSeriesData: PropTypes.arrayOf(PropTypes.shape({
    month: PropTypes.string.isRequired,
    usdPrice: PropTypes.number
  }))
};

export default React.memo(SeasonalLegend);
