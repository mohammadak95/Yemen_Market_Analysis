// src/components/common/ChartContainer.js

import React from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Card,
  CardContent,
  useTheme,
} from '@mui/material';
import { analysisStyles, chartStyles } from '../../styles/analysisStyles';

const ChartContainer = ({
  children,
  height = 400,
}) => {
  const theme = useTheme();
  const styles = analysisStyles(theme);

  return (
    <Card sx={{
      ...styles.chartContainer,
      mb: 3,
      minHeight: height,
    }}>
      <CardContent>
        <Box 
          sx={{ 
            position: 'relative',
            '& .recharts-responsive-container': {
              '& .recharts-surface': {
                borderRadius: '8px',
              }
            },
            '& .recharts-tooltip-wrapper': {
              ...chartStyles.tooltip,
            },
            '& .recharts-cartesian-grid-horizontal line, .recharts-cartesian-grid-vertical line': {
              stroke: theme.palette.divider,
              strokeDasharray: '3 3',
              strokeOpacity: 0.5,
            },
            '& .recharts-cartesian-axis-line': {
              stroke: theme.palette.divider,
              strokeWidth: 2,
            },
            '& .recharts-cartesian-axis-tick-line': {
              stroke: theme.palette.text.secondary,
            },
            '& .recharts-cartesian-axis-tick-value': {
              fill: theme.palette.text.secondary,
              fontSize: '0.75rem',
            },
            '& .recharts-legend-item-text': {
              fontSize: '0.875rem',
              color: theme.palette.text.primary,
            }
          }}
        >
          {children}
        </Box>
      </CardContent>
    </Card>
  );
};

ChartContainer.propTypes = {
  children: PropTypes.node.isRequired,
  height: PropTypes.number,
};

export default ChartContainer;
