import React, { useMemo } from 'react';
import { Card, CardContent, Typography, Box, useTheme } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

const MetricCard = ({ title, value, description, format = 'number', trend = null }) => {
  const theme = useTheme();

  const formattedValue = useMemo(() => {
    if (format === 'number') {
      return typeof value === 'number' ? value.toFixed(2) : value;
    }
    if (format === 'percentage') {
      return typeof value === 'number' ? `${(value * 100).toFixed(1)}%` : value;
    }
    return value;
  }, [value, format]);

  return (
    <Card 
      sx={{ 
        height: '100%',
        backgroundColor: theme.palette.background.paper,
        boxShadow: theme.shadows[2],
        '&:hover': {
          boxShadow: theme.shadows[4],
        },
      }}
    >
      <CardContent>
        <Typography variant="h6" component="div" color="primary" gutterBottom>
          {title}
        </Typography>
        <Box display="flex" alignItems="center" mb={1}>
          <Typography variant="h4" component="div">
            {formattedValue}
          </Typography>
          {trend !== null && (
            <Box ml={1} display="flex" alignItems="center">
              {trend > 0 ? (
                <TrendingUpIcon sx={{ color: theme.palette.success.main }} />
              ) : (
                <TrendingDownIcon sx={{ color: theme.palette.error.main }} />
              )}
            </Box>
          )}
        </Box>
        {description && (
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default MetricCard;
