import React from 'react';
import { useSelector } from 'react-redux';
import { Fab, Tooltip } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';

const StateExporter = () => {
  const entireState = useSelector(state => state);

  const exportState = () => {
    // Create a sample of the state by taking a subset or first few items
    const sampleState = {};
    
    // For each top level reducer, take a small sample
    Object.entries(entireState).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        // If it's an array, take first 2 items
        sampleState[key] = value.slice(0, 2);
      } else if (typeof value === 'object' && value !== null) {
        // If it's an object, take first 2 key-value pairs
        const entries = Object.entries(value);
        sampleState[key] = Object.fromEntries(entries.slice(0, 2));
      } else {
        // For primitive values, include as is
        sampleState[key] = value;
      }
    });

    // Create downloadable file
    const dataStr = JSON.stringify(sampleState, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.download = 'redux-state-sample.json';
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Tooltip title="Export Sample State" placement="left">
      <Fab
        color="primary"
        onClick={exportState}
        sx={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 1000
        }}
      >
        <DownloadIcon />
      </Fab>
    </Tooltip>
  );
};

export default StateExporter;
