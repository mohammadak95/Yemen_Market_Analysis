//src/components/interactive_graph/InteractiveChart.js

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
import { useTheme } from '@mui/material/styles';
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

const COLORS = [
  'rgba(75, 192, 192, 1)',
  'rgba(255, 99, 132, 1)',
  'rgba(54, 162, 235, 1)',
  'rgba(255, 206, 86, 1)',
  'rgba(153, 102, 255, 1)',
  'rgba(255, 159, 64, 1)',
];

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
      const color = COLORS[index % COLORS.length];
      const conflictColor = color.replace('1)', '0.2)');

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

      if (showConflictIntensity) {
        datasets.push({
          label: `${capitalizeWords(regimeData.regime)} Conflict Intensity`,
          data: processedData.map((d) => ({
            x: new Date(d.date),
            y: d.conflict_intensity,
          })),
          borderColor: conflictColor,
          backgroundColor: conflictColor,
          yAxisID: 'y1',
          fill: 'origin',
          tension: 0.3,
          pointRadius: 0,
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
            },
          },
          ticks: {
            maxTicksLimit: isMobile ? 5 : 10,
            color: theme.palette.text.primary,
            font: {
              size: isMobile ? 10 : 12,
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
            text:
              priceType === 'lcu' ? 'Price (LCU)' : 'Price (US$)',
            color: theme.palette.text.primary,
            font: {
              size: isMobile ? 12 : 14,
              weight: 'bold',
            },
          },
          ticks: {
            color: theme.palette.text.primary,
            font: {
              size: isMobile ? 10 : 12,
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
            },
          },
          ticks: {
            beginAtZero: true,
            color: theme.palette.text.primary,
            font: {
              size: isMobile ? 10 : 12,
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
            },
          },
        },
        title: {
          display: false,
        },
      },
    }),
    [showConflictIntensity, priceType, theme.palette, isMobile]
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
          borderRadius: 2,
          backgroundColor: theme.palette.background.paper,
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
              }}
            >
              <ToggleButton
                value="lcu"
                aria-label="Price in LCU"
                sx={{
                  fontSize: isMobile ? '0.8rem' : '0.9rem',
                  padding: isMobile ? '4px 8px' : '6px 12px',
                }}
              >
                LCU
              </ToggleButton>
              <ToggleButton
                value="usd"
                aria-label="Price in US$"
                sx={{
                  fontSize: isMobile ? '0.8rem' : '0.9rem',
                  padding: isMobile ? '4px 8px' : '6px 12px',
                }}
              >
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
              }}
            >
              <ToggleButton
                value={true}
                selected={applySeasonalAdj}
                sx={{
                  fontSize: isMobile ? '0.8rem' : '0.9rem',
                  padding: isMobile ? '4px 8px' : '6px 12px',
                }}
              >
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
              }}
            >
              <ToggleButton
                value={true}
                selected={applySmooth}
                sx={{
                  fontSize: isMobile ? '0.8rem' : '0.9rem',
                  padding: isMobile ? '4px 8px' : '6px 12px',
                }}
              >
                Smoothing
              </ToggleButton>
            </ToggleButtonGroup>
          </Grid>

          <Grid item>
            <ToggleButtonGroup
              value={showConflictIntensity}
              exclusive
              onChange={() => setShowConflictIntensity(!showConflictIntensity)}
              aria-label="Conflict Intensity"
              size="small"
              sx={{
                minWidth: 'auto',
              }}
            >
              <ToggleButton
                value={true}
                selected={showConflictIntensity}
                sx={{
                  fontSize: isMobile ? '0.8rem' : '0.9rem',
                  padding: isMobile ? '4px 8px' : '6px 12px',
                }}
              >
                Conflict Intensity
              </ToggleButton>
            </ToggleButtonGroup>
          </Grid>
        </Grid>
      </Paper>

      <Box sx={{
        width: '100%',
        height: { xs: '250px', sm: '300px', md: '400px' }, // Reduced height for mobile
        position: 'relative',
        mb: 2 // Add bottom margin
      }}>
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