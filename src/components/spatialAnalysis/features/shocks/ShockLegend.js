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
import TimelineIcon from '@mui/icons-material/Timeline';

const ShockLegend = () => {
  const theme = useTheme();

  const shockTypes = [
    {
      type: 'Positive',
      icon: <TrendingUpIcon sx={{ color: theme.palette.success.main }} />,
      description: 'Price increase beyond normal volatility',
      color: theme.palette.success.light
    },
    {
      type: 'Negative',
      icon: <TrendingDownIcon sx={{ color: theme.palette.error.main }} />,
      description: 'Price decrease beyond normal volatility',
      color: theme.palette.error.light
    },
    {
      type: 'Propagation',
      icon: <TimelineIcon sx={{ color: theme.palette.secondary.main }} />,
      description: 'Shock transmission between markets',
      color: theme.palette.secondary.light
    }
  ];

  const magnitudeScale = [
    { label: 'Severe', color: '#a50f15', value: '> 50%' },
    { label: 'High', color: '#de2d26', value: '30-50%' },
    { label: 'Moderate', color: '#fb6a4a', value: '15-30%' },
    { label: 'Low', color: '#fcae91', value: '5-15%' },
    { label: 'Minimal', color: '#fee5d9', value: '< 5%' }
  ];

  return (
    <Paper
      elevation={2}
      sx={{
        position: 'absolute',
        top: 20,
        right: 20,
        width: 280,
        p: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        zIndex: 1000
      }}
    >
      <Typography variant="subtitle2" gutterBottom>
        Price Shock Analysis
      </Typography>

      {/* Shock Types */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="caption" color="textSecondary">
          Shock Types
        </Typography>
        {shockTypes.map((shock, index) => (
          <Box
            key={index}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              mt: 1
            }}
          >
            {shock.icon}
            <Box>
              <Typography variant="body2">
                {shock.type}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {shock.description}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>

      <Divider sx={{ my: 1.5 }} />

      {/* Magnitude Scale */}
      <Box>
        <Typography variant="caption" color="textSecondary">
          Magnitude Scale
        </Typography>
        {magnitudeScale.map((level, index) => (
          <Box
            key={index}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              mt: 1
            }}
          >
            <Box
              sx={{
                width: 20,
                height: 20,
                backgroundColor: level.color,
                borderRadius: '2px',
                border: `1px solid ${theme.palette.divider}`
              }}
            />
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2">
                {level.label}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {level.value}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>

      <Divider sx={{ my: 1.5 }} />

      {/* Propagation Patterns */}
      <Box>
        <Typography variant="caption" color="textSecondary">
          Propagation Patterns
        </Typography>
        <Box sx={{ mt: 1 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              mb: 1
            }}
          >
            <Box
              sx={{
                width: 20,
                height: 2,
                backgroundColor: theme.palette.secondary.main
              }}
            />
            <Typography variant="body2">
              Direct Impact
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}
          >
            <Box
              sx={{
                width: 20,
                height: 0,
                borderTop: `2px dashed ${theme.palette.secondary.main}`
              }}
            />
            <Typography variant="body2">
              Secondary Impact
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          mt: 2,
          p: 1,
          bgcolor: theme.palette.info.light,
          borderRadius: 1
        }}
      >
        <Typography variant="caption" sx={{ color: theme.palette.info.contrastText }}>
          Click on regions to view detailed shock metrics and propagation patterns.
          Use the time control to explore shock evolution.
        </Typography>
      </Box>
    </Paper>
  );
};

export default React.memo(ShockLegend);
