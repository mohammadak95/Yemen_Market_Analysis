// src/components/analysis/spatial/components/StatCard.js

import React from 'react';
import PropTypes from 'prop-types';
import { Paper, Typography, Box, useTheme, useMediaQuery } from '@mui/material';
import { formatNumber, formatPValue } from '../utils/mapUtils';

const StatCard = ({ title, value, subvalue, format = 'decimal', mini = false }) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const formatValue = (val) => {
    if (val === null || val === undefined) return 'N/A';
    
    switch (format) {
      case 'percentage':
        return `${formatNumber(val * 100)}%`;
      case 'pvalue':
        return formatPValue(val);
      case 'number':
        return val.toLocaleString();
      default:
        return formatNumber(val);
    }
  };

  return (
    <Paper
      sx={{
        p: mini ? 1.5 : { xs: 1.5, sm: 2 },
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: theme.palette.background.paper,
        borderRadius: 2,
        boxShadow: theme.shadows[2],
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          boxShadow: theme.shadows[4],
          transform: 'translateY(-2px)'
        }
      }}
    >
      <Typography 
        variant={mini || isSmallScreen ? "body2" : "subtitle1"} 
        component="div"
        color="textSecondary"
        gutterBottom
        sx={{
          fontSize: mini ? '0.875rem' : { xs: '0.875rem', sm: '1rem' },
          fontWeight: 500
        }}
      >
        {title}
      </Typography>
      
      <Box sx={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center' 
      }}>
        <Typography 
          variant={mini || isSmallScreen ? "h6" : "h4"} 
          component="div"
          sx={{ 
            fontWeight: 'bold', 
            my: 1,
            fontSize: mini ? '1.25rem' : { 
              xs: '1.5rem', 
              sm: '2rem' 
            }
          }}
        >
          {formatValue(value)}
        </Typography>
        
        {subvalue && (
          <Typography 
            variant="body2" 
            color="textSecondary"
            sx={{
              fontSize: mini ? '0.75rem' : {
                xs: '0.75rem',
                sm: '0.875rem'
              },
              mt: 'auto',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical'
            }}
          >
            {subvalue}
          </Typography>
        )}
      </Box>
    </Paper>
  );
};

StatCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.number,
  subvalue: PropTypes.string,
  format: PropTypes.oneOf(['decimal', 'percentage', 'number', 'pvalue']),
  mini: PropTypes.bool
};

export default StatCard;