/**
 * Legend Component
 * 
 * Displays a legend for the map visualization
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Box, Typography, Paper } from '@mui/material';
import { useTheme } from '@mui/material/styles';

const Legend = ({
  title,
  items = [],
  position = { bottom: 32, right: 10 }
}) => {
  const theme = useTheme();

  return (
    <Paper
      elevation={2}
      sx={{
        position: 'absolute',
        ...position,
        zIndex: 1000,
        backgroundColor: 'background.paper',
        borderRadius: 1,
        p: 1.5,
        minWidth: 180,
        maxWidth: 280
      }}
    >
      {title && (
        <Typography 
          variant="subtitle2" 
          sx={{ 
            mb: 1,
            fontWeight: 500,
            color: 'text.primary'
          }}
        >
          {title}
        </Typography>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {items.map((item, index) => (
          <Box 
            key={index}
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1.5 
            }}
          >
            <Box
              sx={{
                width: 16,
                height: 16,
                backgroundColor: item.color,
                flexShrink: 0,
                ...item.style,
                border: item.style?.border || 'none'
              }}
            />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography 
                variant="body2"
                sx={{ 
                  fontWeight: 500,
                  color: 'text.primary',
                  lineHeight: 1.2
                }}
              >
                {item.label}
              </Typography>
              {item.description && (
                <Typography 
                  variant="caption"
                  sx={{ 
                    display: 'block',
                    color: 'text.secondary',
                    mt: 0.25,
                    lineHeight: 1.2
                  }}
                >
                  {item.description}
                </Typography>
              )}
            </Box>
          </Box>
        ))}
      </Box>
    </Paper>
  );
};

Legend.propTypes = {
  title: PropTypes.string,
  items: PropTypes.arrayOf(PropTypes.shape({
    color: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    description: PropTypes.string,
    style: PropTypes.object
  })).isRequired,
  position: PropTypes.shape({
    top: PropTypes.number,
    right: PropTypes.number,
    bottom: PropTypes.number,
    left: PropTypes.number
  })
};

export default React.memo(Legend);
