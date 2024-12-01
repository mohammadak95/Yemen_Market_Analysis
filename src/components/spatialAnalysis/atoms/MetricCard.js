import React from 'react';
import PropTypes from 'prop-types';
import { Card, CardContent, Typography, Box, Tooltip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import InfoIcon from '@mui/icons-material/Info';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

const MetricCard = ({
  title,
  value,
  trend,
  format = 'number',
  description,
  tooltip
}) => {
  const theme = useTheme();

  const formatValue = (val) => {
    if (typeof val !== 'number') return val;
    
    switch (format) {
      case 'percentage':
        return `${(val * 100).toFixed(1)}%`;
      case 'currency':
        return `$${val.toFixed(2)}`;
      case 'integer':
        return Math.round(val).toString();
      default:
        return val.toFixed(2);
    }
  };

  const getTrendColor = () => {
    if (!trend) return theme.palette.text.secondary;
    return trend > 0 ? theme.palette.success.main : theme.palette.error.main;
  };

  const TrendIcon = trend > 0 ? TrendingUpIcon : TrendingDownIcon;

  return (
    <Card 
      elevation={1}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        '&:hover': {
          boxShadow: theme.shadows[3]
        }
      }}
    >
      <CardContent>
        <Box display="flex" alignItems="center" mb={1}>
          <Typography variant="subtitle2" color="textSecondary">
            {title}
          </Typography>
          {tooltip && (
            <Tooltip title={tooltip} placement="top">
              <InfoIcon 
                sx={{ 
                  ml: 1, 
                  fontSize: '1rem',
                  color: theme.palette.text.secondary
                }} 
              />
            </Tooltip>
          )}
        </Box>

        <Box display="flex" alignItems="baseline" mb={1}>
          <Typography 
            variant="h4" 
            component="div"
            sx={{ fontWeight: 'medium' }}
          >
            {formatValue(value)}
          </Typography>
          {trend !== undefined && (
            <Box 
              display="flex" 
              alignItems="center" 
              ml={1}
              sx={{ color: getTrendColor() }}
            >
              <TrendIcon sx={{ fontSize: '1rem' }} />
              <Typography variant="body2" component="span" ml={0.5}>
                {Math.abs(trend)}%
              </Typography>
            </Box>
          )}
        </Box>

        {description && (
          <Typography 
            variant="body2" 
            color="textSecondary"
            sx={{ 
              mt: 1,
              minHeight: '2.5em',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
          >
            {description}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

MetricCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  trend: PropTypes.number,
  format: PropTypes.oneOf(['number', 'percentage', 'currency', 'integer']),
  description: PropTypes.string,
  tooltip: PropTypes.string
};

export default React.memo(MetricCard);
