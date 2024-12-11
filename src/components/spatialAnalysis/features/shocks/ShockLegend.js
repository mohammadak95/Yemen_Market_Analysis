import React from 'react';
import {
  Paper,
  Typography,
  Box,
  Divider
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

import { 
  SHOCK_COLORS, 
  SHOCK_THRESHOLDS
} from './types';

const ShockLegend = () => {
  const theme = useTheme();

  const shockTypes = [
    {
      type: 'Price Surge',
      icon: <TrendingUpIcon sx={{ color: SHOCK_COLORS.PRICE_SURGE }} />,
      color: SHOCK_COLORS.PRICE_SURGE,
      levels: [
        { label: 'Severe', value: `>${(SHOCK_THRESHOLDS.SEVERE * 100).toFixed(0)}%`, opacity: 1 },
        { label: 'Moderate', value: `>${(SHOCK_THRESHOLDS.MODERATE * 100).toFixed(0)}%`, opacity: 0.7 }
      ]
    },
    {
      type: 'Price Drop',
      icon: <TrendingDownIcon sx={{ color: SHOCK_COLORS.PRICE_DROP }} />,
      color: SHOCK_COLORS.PRICE_DROP,
      levels: [
        { label: 'Severe', value: `>${(SHOCK_THRESHOLDS.SEVERE * 100).toFixed(0)}%`, opacity: 1 },
        { label: 'Moderate', value: `>${(SHOCK_THRESHOLDS.MODERATE * 100).toFixed(0)}%`, opacity: 0.7 }
      ]
    }
  ];

  return (
    <Paper
      elevation={2}
      sx={{
        position: 'absolute',
        top: theme.spacing(2),
        right: theme.spacing(2),
        width: 200,
        p: 1.5,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        zIndex: 400,
        border: `1px solid ${theme.palette.divider}`,
        boxShadow: theme.shadows[2]
      }}
    >
      <Typography variant="subtitle2" gutterBottom>
        Price Shocks
      </Typography>

      {shockTypes.map((shockType, index) => (
        <React.Fragment key={index}>
          {index > 0 && <Divider sx={{ my: 1 }} />}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            {shockType.icon}
            <Typography variant="body2">
              {shockType.type}
            </Typography>
          </Box>
          {shockType.levels.map((level, levelIndex) => (
            <Box
              key={levelIndex}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                ml: 3,
                mt: 0.5
              }}
            >
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  backgroundColor: shockType.color,
                  borderRadius: '2px',
                  opacity: level.opacity
                }}
              />
              <Typography variant="caption" color="textSecondary">
                {level.label} ({level.value})
              </Typography>
            </Box>
          ))}
        </React.Fragment>
      ))}

      <Divider sx={{ my: 1 }} />
      
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box
          sx={{
            width: 12,
            height: 12,
            backgroundColor: SHOCK_COLORS.PROPAGATION,
            borderRadius: '2px'
          }}
        />
        <Typography variant="caption" color="textSecondary">
          Affected Region
        </Typography>
      </Box>
    </Paper>
  );
};

export default React.memo(ShockLegend);
