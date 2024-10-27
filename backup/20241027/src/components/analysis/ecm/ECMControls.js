// src/components/analysis/ecm/ECMControls.js

import React from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  ToggleButtonGroup,
  ToggleButton,
  Button,
} from '@mui/material';
import {
  North as NorthIcon,
  South as SouthIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';

// Common styles for ToggleButtons
const toggleButtonStyles = (selectedColor) => ({
  fontSize: '0.8rem',
  padding: '4px 8px',
  '&.Mui-selected': {
    backgroundColor: selectedColor.main,
    color: selectedColor.contrastText,
    '&:hover': {
      backgroundColor: selectedColor.dark,
    },
  },
});

const ECMControls = ({
  analysisType,
  direction = 'northToSouth', // Default direction
  onAnalysisTypeChange,
  onDirectionChange = () => {}, // Default no-op function
  onDownload,
  isMobile = false, // Default to false for mobile check
}) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
      flexWrap: 'wrap',
      mb: 2,
    }}
  >
    <ToggleButtonGroup
      value={analysisType}
      exclusive
      onChange={onAnalysisTypeChange}
      aria-label="ECM analysis type"
      size="small"
    >
      <ToggleButton 
        value="unified" 
        aria-label="Unified ECM"
        sx={toggleButtonStyles({
          main: 'primary.main',
          contrastText: 'primary.contrastText',
          dark: 'primary.dark',
        })}
      >
        Unified ECM
      </ToggleButton>
      <ToggleButton 
        value="directional" 
        aria-label="Directional ECM"
        sx={toggleButtonStyles({
          main: 'primary.main',
          contrastText: 'primary.contrastText',
          dark: 'primary.dark',
        })}
      >
        Directional ECM
      </ToggleButton>
    </ToggleButtonGroup>

    {analysisType === 'directional' && (
      <ToggleButtonGroup
        value={direction}
        exclusive
        onChange={onDirectionChange}
        aria-label="ECM direction"
        size="small"
      >
        <ToggleButton 
          value="northToSouth" 
          aria-label="North to South"
          sx={toggleButtonStyles({
            main: 'secondary.main',
            contrastText: 'secondary.contrastText',
            dark: 'secondary.dark',
          })}
        >
          <NorthIcon sx={{ mr: 0.5, fontSize: '1rem' }} />
          North to South
        </ToggleButton>
        <ToggleButton 
          value="southToNorth" 
          aria-label="South to North"
          sx={toggleButtonStyles({
            main: 'secondary.main',
            contrastText: 'secondary.contrastText',
            dark: 'secondary.dark',
          })}
        >
          <SouthIcon sx={{ mr: 0.5, fontSize: '1rem' }} />
          South to North
        </ToggleButton>
      </ToggleButtonGroup>
    )}

    <Button
      variant="contained"
      color="primary"
      startIcon={<DownloadIcon />}
      onClick={onDownload}
      size="medium"
      sx={{
        minWidth: '140px',
        height: '36px',
        fontSize: '0.9rem',
        padding: '6px 16px',
        boxShadow: 2,
        '&:hover': {
          boxShadow: 4,
        },
      }}
      aria-label="Download CSV"
    >
      Download CSV
    </Button>
  </Box>
);

ECMControls.propTypes = {
  analysisType: PropTypes.oneOf(['unified', 'directional']).isRequired,
  direction: PropTypes.oneOf(['northToSouth', 'southToNorth']),
  onAnalysisTypeChange: PropTypes.func.isRequired,
  onDirectionChange: PropTypes.func,
  onDownload: PropTypes.func.isRequired,
  isMobile: PropTypes.bool,
};

export default ECMControls;
