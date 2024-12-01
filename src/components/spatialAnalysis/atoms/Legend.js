import React from 'react';
import PropTypes from 'prop-types';
import { Paper, Typography, Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';

const Legend = ({
  items,
  title,
  orientation = 'vertical',
  position = { bottom: 20, right: 20 }
}) => {
  const theme = useTheme();

  return (
    <Paper
      elevation={2}
      sx={{
        position: 'absolute',
        padding: 2,
        zIndex: 1000,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 1,
        ...position
      }}
    >
      {title && (
        <Typography variant="subtitle2" gutterBottom>
          {title}
        </Typography>
      )}
      
      <Box 
        sx={{ 
          display: 'flex',
          flexDirection: orientation === 'vertical' ? 'column' : 'row',
          gap: 1,
          flexWrap: orientation === 'horizontal' ? 'wrap' : 'nowrap'
        }}
      >
        {items.map((item, index) => (
          <Box 
            key={index}
            sx={{ 
              display: 'flex', 
              alignItems: 'center',
              gap: 1,
              minWidth: orientation === 'horizontal' ? '120px' : 'auto'
            }}
          >
            <Box
              sx={{
                width: 20,
                height: 20,
                backgroundColor: item.color,
                borderRadius: '2px',
                border: `1px solid ${theme.palette.grey[300]}`,
                ...(item.style || {})
              }}
            />
            <Typography variant="caption">
              {item.label}
            </Typography>
          </Box>
        ))}
      </Box>
    </Paper>
  );
};

Legend.propTypes = {
  items: PropTypes.arrayOf(PropTypes.shape({
    color: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    style: PropTypes.object
  })).isRequired,
  title: PropTypes.string,
  orientation: PropTypes.oneOf(['vertical', 'horizontal']),
  position: PropTypes.shape({
    top: PropTypes.number,
    right: PropTypes.number,
    bottom: PropTypes.number,
    left: PropTypes.number
  })
};

export default React.memo(Legend);
