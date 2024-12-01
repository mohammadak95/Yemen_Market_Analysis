import React from 'react';
import PropTypes from 'prop-types';
import { Paper, Typography, Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';

const Tooltip = ({
  title,
  content,
  metrics,
  className,
  style
}) => {
  const theme = useTheme();

  return (
    <Paper
      elevation={3}
      className={className}
      sx={{
        padding: 1.5,
        minWidth: 200,
        maxWidth: 300,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 1,
        ...style
      }}
    >
      {title && (
        <Typography 
          variant="subtitle2" 
          sx={{ 
            fontWeight: 'medium',
            color: theme.palette.text.primary,
            mb: content || metrics ? 1 : 0,
            borderBottom: metrics ? `1px solid ${theme.palette.divider}` : 'none',
            pb: metrics ? 0.5 : 0
          }}
        >
          {title}
        </Typography>
      )}

      {content && (
        <Typography 
          variant="body2" 
          color="textSecondary"
          sx={{ mb: metrics ? 1 : 0 }}
        >
          {content}
        </Typography>
      )}

      {metrics && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {metrics.map((metric, index) => (
            <Box 
              key={index}
              sx={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'baseline'
              }}
            >
              <Typography 
                variant="caption" 
                color="textSecondary"
                sx={{ mr: 2 }}
              >
                {metric.label}:
              </Typography>
              <Typography 
                variant="body2"
                sx={{ 
                  fontWeight: 'medium',
                  color: metric.color || theme.palette.text.primary
                }}
              >
                {formatMetricValue(metric)}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </Paper>
  );
};

const formatMetricValue = (metric) => {
  const value = metric.value;
  
  if (typeof value !== 'number') return value;

  switch (metric.format) {
    case 'percentage':
      return `${(value * 100).toFixed(1)}%`;
    case 'currency':
      return `$${value.toFixed(2)}`;
    case 'integer':
      return Math.round(value).toString();
    default:
      return value.toFixed(2);
  }
};

Tooltip.propTypes = {
  title: PropTypes.string,
  content: PropTypes.string,
  metrics: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    format: PropTypes.oneOf(['number', 'percentage', 'currency', 'integer']),
    color: PropTypes.string
  })),
  className: PropTypes.string,
  style: PropTypes.object
};

export default React.memo(Tooltip);
