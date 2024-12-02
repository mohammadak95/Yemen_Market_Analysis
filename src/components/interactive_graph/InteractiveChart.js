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

const InteractiveChart = ({
  data,
  selectedCommodity,
  selectedRegimes,
}) => {
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
      // Define primary colors from the theme palette
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
        backgroundColor: color,
        yAxisID: 'y',
        fill: false,
        tension: 0.3,
      });

      // Conflict Intensity Dataset (Transparent)
      if (showConflictIntensity) {
        const conflictColor = theme.palette.info.main; // Choose an appropriate color
        const conflictColorTransparent = alpha(conflictColor, 0.2); // 20% opacity

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
    theme.palette, // Include theme.palette in dependencies
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
          title: {
            display: true,
            text: 'Date',
            color: theme.palette.text.primary,
            font: {
              size: isMobile ? 12 : 14,
              weight: 'bold',
              family: theme.typography.fontFamily,
            },
          },
          ticks: {
            maxTicksLimit: isMobile ? 5 : 10,
            color: theme.palette.text.primary,
            font: {
              size: isMobile ? 10 : 12,
              family: theme.typography.fontFamily,
            },
          },
          grid: {
            color: theme.palette.divider,
          },
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: priceType === 'lcu' ? 'Price (LCU)' : 'Price (US$)',
            color: theme.palette.text.primary,
            font: {
              size: isMobile ? 12 : 14,
              weight: 'bold',
              family: theme.typography.fontFamily,
            },
          },
          ticks: {
            color: theme.palette.text.primary,
            font: {
              size: isMobile ? 10 : 12,
              family: theme.typography.fontFamily,
            },
            callback: (value) => {
              return value.toLocaleString();
            },
          },
          grid: {
            color: theme.palette.divider,
          },
        },
        y1: {
          type: 'linear',
          display: showConflictIntensity,
          position: 'right',
          title: {
            display: true,
            text: 'Conflict Intensity',
            color: theme.palette.text.primary,
            font: {
              size: isMobile ? 12 : 14,
              weight: 'bold',
              family: theme.typography.fontFamily,
            },
          },
          ticks: {
            beginAtZero: true,
            color: theme.palette.text.primary,
            font: {
              size: isMobile ? 10 : 12,
              family: theme.typography.fontFamily,
            },
            callback: (value) => {
              return value.toLocaleString();
            },
          },
          grid: {
            drawOnChartArea: false,
          },
        },
      },
      plugins: {
        tooltip: {
          callbacks: {
            title: (context) => {
              const date = new Date(context[0].parsed.x);
              return date.toLocaleDateString();
            },
            label: (context) => {
              let label = `${context.dataset.label}: `;
              label +=
                context.parsed.y !== null
                  ? context.parsed.y.toLocaleString()
                  : '';
              return label;
            },
          },
          backgroundColor: theme.palette.background.paper,
          titleColor: theme.palette.text.primary,
          bodyColor: theme.palette.text.secondary,
          borderColor: theme.palette.divider,
          borderWidth: 1,
        },
        legend: {
          position: 'bottom',
          align: 'center',
          labels: {
            boxWidth: 12,
            padding: isMobile ? 10 : 15,
            color: theme.palette.text.primary,
            font: {
              size: isMobile ? 10 : 12,
              family: theme.typography.fontFamily,
            },
          },
        },
        title: {
          display: false,
        },
      },
    }),
    [
      showConflictIntensity,
      priceType,
      theme,
      isMobile,
    ]
  );

  if (!chartData)
    return (
      <Typography>
        Please select at least one regime and a commodity.
      </Typography>
    );

  return (
    <Box>
      <Paper
        elevation={1}
        sx={{
          p: 2,
          mb: 2,
          borderRadius: theme.shape.borderRadius,
          backgroundColor: theme.palette.background.paper,
          boxShadow: theme.shadows[1],
        }}
      >
        <Grid
          container
          spacing={1}
          alignItems="center"
          justifyContent="center"
        >
          <Grid item>
            <ToggleButtonGroup
              value={priceType}
              exclusive
              onChange={(e, newValue) => {
                if (newValue !== null) setPriceType(newValue);
              }}
              aria-label="Price Type"
              size="small"
              sx={{
                minWidth: 'auto',
                backgroundColor: theme.palette.background.paper,
                borderRadius: theme.shape.borderRadius,
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
              }}
            >
              <ToggleButton value="lcu" aria-label="Price in LCU">
                LCU
              </ToggleButton>
              <ToggleButton value="usd" aria-label="Price in US$">
                US$
              </ToggleButton>
            </ToggleButtonGroup>
          </Grid>

          <Grid item>
            <ToggleButtonGroup
              value={applySeasonalAdj}
              exclusive
              onChange={() => setApplySeasonalAdj(!applySeasonalAdj)}
              aria-label="Seasonal Adjustment"
              size="small"
              sx={{
                minWidth: 'auto',
                backgroundColor: theme.palette.background.paper,
                borderRadius: theme.shape.borderRadius,
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
              }}
            >
              <ToggleButton value={true} selected={applySeasonalAdj}>
                Seasonal Adjustment
              </ToggleButton>
            </ToggleButtonGroup>
          </Grid>

          <Grid item>
            <ToggleButtonGroup
              value={applySmooth}
              exclusive
              onChange={() => setApplySmooth(!applySmooth)}
              aria-label="Smoothing"
              size="small"
              sx={{
                minWidth: 'auto',
                backgroundColor: theme.palette.background.paper,
                borderRadius: theme.shape.borderRadius,
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
              }}
            >
              <ToggleButton value={true} selected={applySmooth}>
                Smoothing
              </ToggleButton>
            </ToggleButtonGroup>
          </Grid>

          <Grid item>
            <ToggleButtonGroup
              value={showConflictIntensity}
              exclusive
              onChange={() =>
                setShowConflictIntensity(!showConflictIntensity)
              }
              aria-label="Conflict Intensity"
              size="small"
              sx={{
                minWidth: 'auto',
                backgroundColor: theme.palette.background.paper,
                borderRadius: theme.shape.borderRadius,
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
              }}
            >
              <ToggleButton value={true} selected={showConflictIntensity}>
                Conflict Intensity
              </ToggleButton>
            </ToggleButtonGroup>
          </Grid>
        </Grid>
      </Paper>

      <Box
        sx={{
          width: '100%',
          height: { xs: '250px', sm: '300px', md: '400px' },
          position: 'relative',
          mb: 2,
          backgroundColor: theme.palette.background.paper,
          borderRadius: theme.shape.borderRadius,
          boxShadow: theme.shadows[1],
          p: 2,
        }}
      >
        <Line options={options} data={chartData} />
      </Box>
    </Box>
  );
};

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