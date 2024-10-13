// src/components/CustomTooltip.js

import React from 'react';
import { Tooltip as MuiTooltip, Typography, Box } from '@mui/material';
import PropTypes from 'prop-types';

const CustomTooltip = React.memo(({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <MuiTooltip
        open
        title={
          <Box sx={{ p: 1 }}>
            <Typography variant="subtitle2">{`Region: ${data.region_id}`}</Typography>
            <Typography variant="body2">{`Date: ${new Date(data.date).toLocaleDateString()}`}</Typography>
            <Typography variant="body2">{`Residual: ${data.residual.toFixed(4)}`}</Typography>
          </Box>
        }
        placement="top"
        arrow
        disableFocusListener
        disableHoverListener
        disableTouchListener
      >
        <span aria-label={`Tooltip for region ${data.region_id}`}></span>
      </MuiTooltip>
    );
  }

  return null;
});

CustomTooltip.propTypes = {
  active: PropTypes.bool,
  payload: PropTypes.arrayOf(
    PropTypes.shape({
      payload: PropTypes.shape({
        region_id: PropTypes.string,
        date: PropTypes.string,
        residual: PropTypes.number,
      }),
    })
  ),
};

export default CustomTooltip;