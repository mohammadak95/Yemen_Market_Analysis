import React from 'react';
import PropTypes from 'prop-types';
import { 
  Box, 
  Typography, 
  LinearProgress, 
  CircularProgress,
  Tooltip,
  Paper
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import InfoIcon from '@mui/icons-material/Info';

const MetricProgress = ({
  title,
  value,
  target,
  trend,
  format = 'percentage',
  description,
  tooltip,
  type = 'linear',
  size = 'medium',
  showTarget = true,
  className,
  style
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

  const progress = target ? (value / target) * 100 : value * 100;
  const progressColor = getProgressColor(progress, theme);
  
  const TrendIcon = trend > 0 ? TrendingUpIcon : TrendingDownIcon;
  const trendColor = trend > 0 ? theme.palette.success.main : theme.palette.error.main;

  return (
    <Paper
      elevation={1}
      className={className}
      sx={{
        p: 2,
        height: '100%',
        ...style
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Typography 
          variant={size === 'small' ? 'body2' : 'subtitle2'} 
          color="textSecondary"
        >
          {title}
        </Typography>
        {tooltip && (
          <Tooltip title={tooltip} placement="top">
            <InfoIcon 
              sx={{ 
                ml: 1, 
                fontSize: size === 'small' ? '0.875rem' : '1rem',
                color: theme.palette.text.secondary
              }} 
            />
          </Tooltip>
        )}
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'baseline', mb: 1 }}>
        <Typography 
          variant={size === 'small' ? 'h6' : 'h5'} 
          component="div"
          sx={{ fontWeight: 'medium' }}
        >
          {formatValue(value)}
        </Typography>
        {trend !== undefined && (
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              ml: 1,
              color: trendColor
            }}
          >
            <TrendIcon sx={{ fontSize: size === 'small' ? '0.875rem' : '1rem' }} />
            <Typography 
              variant={size === 'small' ? 'caption' : 'body2'} 
              component="span" 
              sx={{ ml: 0.5 }}
            >
              {Math.abs(trend)}%
            </Typography>
          </Box>
        )}
      </Box>

      {type === 'linear' ? (
        <Box sx={{ width: '100%', position: 'relative' }}>
          <LinearProgress
            variant="determinate"
            value={Math.min(progress, 100)}
            sx={{
              height: size === 'small' ? 4 : 6,
              borderRadius: size === 'small' ? 2 : 3,
              backgroundColor: theme.palette.grey[200],
              '& .MuiLinearProgress-bar': {
                backgroundColor: progressColor
              }
            }}
          />
          {showTarget && target && (
            <Typography 
              variant="caption" 
              color="textSecondary"
              sx={{ 
                position: 'absolute',
                right: 0,
                top: '100%',
                mt: 0.5
              }}
            >
              Target: {formatValue(target)}
            </Typography>
          )}
        </Box>
      ) : (
        <Box 
          sx={{ 
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <CircularProgress
            variant="determinate"
            value={Math.min(progress, 100)}
            size={size === 'small' ? 40 : 56}
            sx={{
              color: progressColor,
              '& .MuiCircularProgress-circle': {
                strokeLinecap: 'round'
              }
            }}
          />
          <Typography
            variant={size === 'small' ? 'caption' : 'body2'}
            component="div"
            color="textSecondary"
            sx={{
              position: 'absolute',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {formatValue(value)}
          </Typography>
        </Box>
      )}

      {description && (
        <Typography 
          variant={size === 'small' ? 'caption' : 'body2'} 
          color="textSecondary"
          sx={{ mt: 1 }}
        >
          {description}
        </Typography>
      )}
    </Paper>
  );
};

const getProgressColor = (progress, theme) => {
  if (progress >= 90) return theme.palette.success.main;
  if (progress >= 60) return theme.palette.warning.main;
  return theme.palette.error.main;
};

MetricProgress.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  target: PropTypes.number,
  trend: PropTypes.number,
  format: PropTypes.oneOf(['number', 'percentage', 'currency', 'integer']),
  description: PropTypes.string,
  tooltip: PropTypes.string,
  type: PropTypes.oneOf(['linear', 'circular']),
  size: PropTypes.oneOf(['small', 'medium']),
  showTarget: PropTypes.bool,
  className: PropTypes.string,
  style: PropTypes.object
};

export default React.memo(MetricProgress);
