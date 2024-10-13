// src/components/CustomTooltip.js

import React from 'react';
import { Box, Typography } from '@mui/material';

const CustomTooltip = ({ position, content }) => {
  if (!position || !content) return null;

  return (
    <Box
      sx={{
        position: 'absolute',
        top: position.y,
        left: position.x,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        padding: '8px',
        borderRadius: '4px',
        pointerEvents: 'none',
        transform: 'translate(-50%, -100%)',
        whiteSpace: 'pre-line',
        zIndex: 1000,
      }}
    >
      <Typography variant="body2">{content}</Typography>
    </Box>
  );
};

export default CustomTooltip;
