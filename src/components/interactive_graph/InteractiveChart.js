// src/components/interactive_graph/InteractiveChart.js

import React, { useMemo, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title as ChartTitle,
  Tooltip as ChartTooltip,
  Legend,
  TimeScale,
  Filler,
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import PropTypes from 'prop-types';
import { useTheme, alpha } from '@mui/material/styles';
import {
  Box,
  Paper,
  ToggleButtonGroup,
  ToggleButton,
  Grid,
  Typography,
} from '@mui/material';
import {
  applySeasonalAdjustment,
  applySmoothing,
} from '../../utils/appUtils';
import useMediaQuery from '@mui/material/useMediaQuery';

const capitalizeWords = (str) => {
  return str.replace(/\b\w/g, (char) => char.toUpperCase());
};

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ChartTitle,
  ChartTooltip,
  Legend,
  TimeScale,
  Filler
);

const InteractiveChart = ({ data, selectedCommodity, selectedRegimes }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [showConflictIntensity, setShowConflictIntensity] = useState(true);
  const [priceType, setPriceType] = useState('lcu');
  const [applySeasonalAdj, setApplySeasonalAdj] = useState(false);
  const [applySmooth, setApplySmooth] = useState(false);

  const chartData = useMemo(() => {
    if (!data || !selectedCommodity || selectedRegimes.length === 0)
      return null;

    const dataByRegime = selectedRegimes.map((regime) => ({
      regime,
      data: data.filter(
        (d) =>
          d.commodity.toLowerCase() === selectedCommodity.toLowerCase() &&
          d.regime.toLowerCase() === regime.toLowerCase()
      ),
    }));

    const validDataByRegime = dataByRegime.filter(
      (regimeData) => regimeData.data.length > 0
    );

    if (validDataByRegime.length === 0) return null;

    const datasets = [];

    validDataByRegime.forEach((regimeData, index) => {
      const primaryColors = [
        theme.palette.primary.main,
        theme.palette.secondary.main,
        theme.palette.success.main,
        theme.palette.warning.main,
        theme.palette.error.main,
        theme.palette.info.main,
      ];

      const color = primaryColors[index % primaryColors.length];

      let processedData = regimeData.data;

      if (applySeasonalAdj) {
        processedData = applySeasonalAdjustment(
          processedData,
          [regimeData.regime],
          12,
          priceType === 'lcu'
        );
      }

      if (applySmooth) {
        processedData = applySmoothing(
          processedData,
          [regimeData.regime],
          6,
          priceType === 'lcu'
        );
      }

      // Price Dataset
      datasets.push({
        label: `${capitalizeWords(regimeData.regime)} Price`,
        data: processedData.map((d) => ({
          x: new Date(d.date),
          y: priceType === 'lcu' ? d.price : d.usdprice,
        })),
        borderColor: color,
        backgroundColor: alpha(color, 0.2),
        yAxisID: 'y',
        fill: true,
        tension: 0.3,
        pointRadius: 3,
        pointHoverRadius: 5,
      });

      // Conflict Intensity Dataset
      if (showConflictIntensity) {
        const conflictColor = theme.palette.info.main;
        const conflictColorTransparent = alpha(conflictColor, 0.2);

        datasets.push({
          label: `${capitalizeWords(regimeData.regime)} Conflict Intensity`,
          data: processedData.map((d) => ({
            x: new Date(d.date),
            y: d.conflict_intensity,
          })),
          borderColor: conflictColorTransparent,
          backgroundColor: conflictColorTransparent,
          yAxisID: 'y1',
          fill: 'origin',
          tension: 0.3,
          pointRadius: 0,
          borderWidth: 0,
        });
      }
    });

    return {
      datasets,
    };
  }, [
    data,
    selectedCommodity,
    selectedRegimes,
    priceType,
    showConflictIntensity,
    applySeasonalAdj,
    applySmooth,
    theme.palette,
  ]);

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'month',
          },
          grid: {
            display: true,
            drawBorder: false,
            color: alpha(theme.palette.divider, 0.2),
            lineWidth: 1,
            drawTicks: false,
          },
          border: {
            display: false
          },
          ticks: {
            maxTicksLimit: isMobile ? 5 : 10,
            color: theme.palette.text.primary,
            font: {
              size: 11,
              family: theme.typography.fontFamily,
            },
            padding: 8
          },
          title: {
            display: true,
            text: 'Analysis Period',
            color: theme.palette.text.primary,
            font: {
              size: 11,
              family: theme.typography.fontFamily,
            },
            padding: { top: 5 }
          }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          grid: {
            display: true,
            drawBorder: false,
            color: alpha(theme.palette.divider, 0.2),
            lineWidth: 1,
            drawTicks: false,
          },
          border: {
            display: false
          },
          ticks: {
            color: theme.palette.text.primary,
            font: {
              size: 11,
              family: theme.typography.fontFamily,
            },
            padding: 8
          },
          title: {
            display: true,
            text: priceType === 'lcu' ? 'Price (LCU)' : 'Price (US$)',
            color: theme.palette.text.primary,
            font: {
              size: 11,
              family: theme.typography.fontFamily,
            },
            padding: { bottom: 5 }
          }
        },
        y1: {
          type: 'linear',
          display: showConflictIntensity,
          position: 'right',
          grid: {
            drawOnChartArea: false,
            color: alpha(theme.palette.divider, 0.2),
            lineWidth: 1,
            drawTicks: false,
          },
          border: {
            display: false
          },
          ticks: {
            color: theme.palette.text.primary,
            font: {
              size: 11,
              family: theme.typography.fontFamily,
            },
            padding: 8
          },
          title: {
            display: true,
            text: 'Conflict Intensity',
            color: theme.palette.text.primary,
            font: {
              size: 11,
              family: theme.typography.fontFamily,
            },
            padding: { bottom: 5 }
          }
        },
      },
      plugins: {
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: theme.palette.background.paper,
          titleColor: theme.palette.text.primary,
          bodyColor: theme.palette.text.secondary,
          borderColor: theme.palette.divider,
          borderWidth: 1,
          padding: 8,
          bodyFont: {
            size: 11,
            family: theme.typography.fontFamily,
          },
          titleFont: {
            size: 11,
            family: theme.typography.fontFamily,
            weight: 'bold'
          },
          callbacks: {
            title: (context) => {
              const date = new Date(context[0].parsed.x);
              return date.toLocaleDateString();
            },
            label: (context) => {
              let label = `${context.dataset.label}: `;
              label += context.parsed.y.toLocaleString();
              return label;
            },
          },
        },
        legend: {
          position: 'bottom',
          align: 'start',
          labels: {
            color: theme.palette.text.primary,
            font: {
              size: 11,
              family: theme.typography.fontFamily,
            },
            padding: 8,
            boxWidth: 8,
            usePointStyle: true,
          },
          display: true,
          maxHeight: 40
        },
      },
    }),
    [showConflictIntensity, priceType, theme, isMobile]
  );
  
  const toggleButtonSx = {
    minWidth: 'auto',
    backgroundColor: theme.palette.background.default,
    borderRadius: 1,
    '& .MuiToggleButton-root': {
      fontWeight: 600,
      fontSize: isMobile ? '0.8rem' : '0.9rem',
      padding: isMobile ? '4px 8px' : '6px 12px',
      border: `1px solid ${theme.palette.divider}`,
      color: theme.palette.text.primary,
      '&.Mui-selected': {
        backgroundColor: theme.palette.primary.main,
        color: theme.palette.primary.contrastText,
        '&:hover': {
          backgroundColor: theme.palette.primary.dark,
        },
      },
    },
  };

  if (!chartData) {
    return (
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="body1" color="text.secondary">
          Please select at least one regime and a commodity.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ width: '100%', mb: 3 }}>
      {/* Controls */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <ToggleButtonGroup
              value={priceType}
              exclusive
              onChange={(e, newValue) => {
                if (newValue !== null) setPriceType(newValue);
              }}
              aria-label="Price Type"
              size="small"
              fullWidth
              sx={toggleButtonSx}
            >
              <ToggleButton value="lcu" aria-label="Price in LCU">
                LCU
              </ToggleButton>
              <ToggleButton value="usd" aria-label="Price in US$">
                US$
              </ToggleButton>
            </ToggleButtonGroup>
          </Grid>

          <Grid item xs={12} md={3}>
            <ToggleButtonGroup
              value={applySeasonalAdj}
              exclusive
              onChange={() => setApplySeasonalAdj(!applySeasonalAdj)}
              aria-label="Seasonal Adjustment"
              size="small"
              fullWidth
              sx={toggleButtonSx}
            >
              <ToggleButton value={true} selected={applySeasonalAdj}>
                Seasonal Adjustment
              </ToggleButton>
            </ToggleButtonGroup>
          </Grid>

          <Grid item xs={12} md={3}>
            <ToggleButtonGroup
              value={applySmooth}
              exclusive
              onChange={() => setApplySmooth(!applySmooth)}
              aria-label="Smoothing"
              size="small"
              fullWidth
              sx={toggleButtonSx}
            >
              <ToggleButton value={true} selected={applySmooth}>
                Smoothing
              </ToggleButton>
            </ToggleButtonGroup>
          </Grid>

          <Grid item xs={12} md={3}>
            <ToggleButtonGroup
              value={showConflictIntensity}
              exclusive
              onChange={() => setShowConflictIntensity(!showConflictIntensity)}
              aria-label="Conflict Intensity"
              size="small"
              fullWidth
              sx={toggleButtonSx}
            >
              <ToggleButton value={true} selected={showConflictIntensity}>
                Conflict Intensity
              </ToggleButton>
            </ToggleButtonGroup>
          </Grid>
        </Grid>
      </Paper>

      {/* Chart */}
      <Box
        sx={{
          width: '100%',
          height: { xs: 200, sm: 250, md: 350 },
          position: 'relative',
          bgcolor: theme.palette.background.default,
          borderRadius: 1,
          border: `1px solid ${theme.palette.divider}`,
          overflow: 'hidden',
          mb: 3,
          p: 1
        }}
      >
        <Line 
          options={{
            ...options,
            plugins: {
              ...options.plugins,
              legend: {
                ...options.plugins.legend,
                position: 'bottom',
                align: 'start',
                labels: {
                  ...options.plugins.legend.labels,
                  padding: 4,
                  boxWidth: 8,
                  usePointStyle: true,
                },
                display: true,
                maxHeight: 30
              }
            }
          }} 
          data={chartData} 
        />
      </Box>
    </Box>
  );
}

InteractiveChart.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      date: PropTypes.string.isRequired,
      commodity: PropTypes.string.isRequired,
      regime: PropTypes.string.isRequired,
      price: PropTypes.number.isRequired,
      usdprice: PropTypes.number.isRequired,
      conflict_intensity: PropTypes.number.isRequired,
    })
  ).isRequired,
  selectedCommodity: PropTypes.string.isRequired,
  selectedRegimes: PropTypes.arrayOf(PropTypes.string).isRequired,
};

export default InteractiveChart;
