// src/components/common/AnalysisContainer.js

import React from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Info as InfoIcon } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { analysisStyles } from '../../styles/analysisStyles';

const AnalysisContainer = ({
  title,
  infoTooltip,
  loading,
  error,
  controls,
  children,
  noDataMessage,
  hasData = true,
  selectedCommodity,
}) => {
  const theme = useTheme();
  const styles = analysisStyles(theme);

  if (loading) {
    return (
      <Paper elevation={3} sx={styles.root}>
        <Box sx={styles.loadingContainer}>
          <CircularProgress size={60} />
          <Typography variant="h6" color="textSecondary">
            Loading {title}...
          </Typography>
        </Box>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper elevation={3} sx={styles.root}>
        <Box sx={styles.errorContainer}>
          <Alert severity="error" variant="outlined">
            {error}
          </Alert>
        </Box>
      </Paper>
    );
  }

  if (!hasData) {
    return (
      <Paper elevation={3} sx={styles.root}>
        <Alert severity="info" variant="outlined">
          {noDataMessage || `No ${title} data available for ${selectedCommodity}`}
        </Alert>
      </Paper>
    );
  }

  return (
    <Paper 
      elevation={3} 
      sx={{
        ...styles.root,
        width: '100%',
      }}
    >
      {/* Header Section */}
      <Box sx={{
        ...styles.header,
        mb: 3,
      }}>
        <Typography variant="h4" sx={styles.title}>
          {title}
          {infoTooltip && (
            <Tooltip title={infoTooltip}>
              <IconButton size="small" sx={styles.infoIcon}>
                <InfoIcon />
              </IconButton>
            </Tooltip>
          )}
        </Typography>
        {controls && (
          <Box sx={styles.controlsContainer}>
            {controls}
          </Box>
        )}
      </Box>

      {/* Content Section */}
      <Box sx={{
        ...styles.contentSection,
        width: '100%',
      }}>
        {children}
      </Box>
    </Paper>
  );
};

AnalysisContainer.propTypes = {
  title: PropTypes.string.isRequired,
  infoTooltip: PropTypes.string,
  loading: PropTypes.bool,
  error: PropTypes.string,
  controls: PropTypes.node,
  children: PropTypes.node,
  noDataMessage: PropTypes.string,
  hasData: PropTypes.bool,
  selectedCommodity: PropTypes.string.isRequired,
};

export default AnalysisContainer;
