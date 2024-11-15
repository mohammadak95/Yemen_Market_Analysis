import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { Button, Stack, Tooltip, useTheme } from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import SchoolIcon from '@mui/icons-material/School';
import TimelineIcon from '@mui/icons-material/Timeline';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import MapIcon from '@mui/icons-material/Map';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';


export const ANALYSIS_TYPES = {
    ECM: 'ecm',
    PRICE_DIFF: 'priceDiff',
    SPATIAL: 'spatial',
    TVMII: 'tvmii',
  };
  
  export const BUTTON_VARIANTS = {
    METHODOLOGY: 'error',
    TUTORIALS: 'info',
    HOW_TO_USE: 'success',
  };
  
  export const TRANSITION_DURATION = {
    SHORTEST: 150,
    SHORTER: 200,
    SHORT: 250,
    STANDARD: 300,
    COMPLEX: 375,
    ENTERING: 225,
    LEAVING: 195,
  };


const AnalysisButton = memo(({ type, selected, onClick, label, icon: Icon }) => {
  const styles = useButtonStyles();
  
  return (
    <Tooltip title={`View ${label}`} placement="right">
      <Button
        variant={selected ? 'contained' : 'outlined'}
        color="primary"
        fullWidth
        onClick={() => onClick(type)}
        sx={styles.analysisButton}
        startIcon={Icon && <Icon />}
      >
        {label}
      </Button>
    </Tooltip>
  );
});

// src/components/sidebar/styles.js

import { makeStyles } from '@mui/styles';

export const useButtonStyles = () => ({
  analysisButton: {
    height: 48,
    textTransform: 'none',
    fontWeight: 500,
    transition: 'all 0.2s ease-in-out',
    '&:hover': {
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
    },
  },
  
  actionButton: {
    height: 48,
    textTransform: 'none',
    fontWeight: 500,
    transition: 'all 0.2s ease-in-out',
    '&:hover': {
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
    },
    '&.MuiButton-contained': {
      color: 'white',
    },
  },
});

export const buttonTheme = {
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontSize: '0.9rem',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
          },
        },
        outlined: {
          borderWidth: 2,
          '&:hover': {
            borderWidth: 2,
          },
        },
      },
    },
  },
};

AnalysisButton.propTypes = {
  type: PropTypes.string.isRequired,
  selected: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
  label: PropTypes.string.isRequired,
  icon: PropTypes.elementType,
};

const ActionButton = memo(({ variant, onClick, label, icon: Icon }) => {
  const styles = useButtonStyles();
  const theme = useTheme();
  
  return (
    <Tooltip title={label} placement="right">
      <Button
        variant="contained"
        sx={{
          ...styles.actionButton,
          backgroundColor: theme.palette[variant].main,
          '&:hover': {
            backgroundColor: theme.palette[variant].dark,
          },
        }}
        fullWidth
        onClick={onClick}
        startIcon={Icon && <Icon />}
      >
        {label}
      </Button>
    </Tooltip>
  );
});

ActionButton.propTypes = {
  variant: PropTypes.oneOf(['primary', 'secondary', 'error', 'info', 'success']).isRequired,
  onClick: PropTypes.func.isRequired,
  label: PropTypes.string.isRequired,
  icon: PropTypes.elementType,
};

const SidebarButtons = ({
  selectedAnalysis,
  handleAnalysisChange,
  onMethodologyClick,
  onTutorialsClick,
  onOpenWelcomeModal,
}) => {
  const analysisButtons = [
    {
      type: ANALYSIS_TYPES.ECM,
      label: 'ECM Analysis',
      icon: TimelineIcon,
    },
    {
      type: ANALYSIS_TYPES.PRICE_DIFF,
      label: 'Price Differential Analysis',
      icon: CompareArrowsIcon,
    },
    {
      type: ANALYSIS_TYPES.SPATIAL,
      label: 'Spatial Analysis',
      icon: MapIcon,
    },
    {
      type: ANALYSIS_TYPES.TVMII,
      label: 'TV-MII Analysis',
      icon: TrendingUpIcon,
    },
  ];

  const actionButtons = [
    {
      variant: 'error',
      onClick: onMethodologyClick,
      label: 'Methodology',
      icon: InfoIcon,
    },
    {
      variant: 'info',
      onClick: onTutorialsClick,
      label: 'Tutorials',
      icon: MenuBookIcon,
    },
    {
      variant: 'success',
      onClick: onOpenWelcomeModal,
      label: 'How to Use',
      icon: SchoolIcon,
    },
  ];

  return (
    <Stack spacing={2}>
      {/* Analysis Buttons Section */}
      <Stack spacing={1}>
        {analysisButtons.map((button) => (
          <AnalysisButton
            key={button.type}
            type={button.type}
            selected={selectedAnalysis === button.type}
            onClick={handleAnalysisChange}
            label={button.label}
            icon={button.icon}
          />
        ))}
      </Stack>

      <div style={{ height: '1px', backgroundColor: 'rgba(0, 0, 0, 0.12)' }} />

      {/* Action Buttons Section */}
      <Stack spacing={1}>
        {actionButtons.map((button) => (
          <ActionButton
            key={button.label}
            {...button}
          />
        ))}
      </Stack>
    </Stack>
  );
};

SidebarButtons.propTypes = {
  selectedAnalysis: PropTypes.string.isRequired,
  handleAnalysisChange: PropTypes.func.isRequired,
  onMethodologyClick: PropTypes.func.isRequired,
  onTutorialsClick: PropTypes.func.isRequired,
  onOpenWelcomeModal: PropTypes.func.isRequired,
};

export default memo(SidebarButtons);