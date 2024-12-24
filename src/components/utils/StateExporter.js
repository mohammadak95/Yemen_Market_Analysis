import React from 'react';
import { useSelector } from 'react-redux';
import { Fab, Tooltip } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { 
  selectSpatialData,
  selectFlowData,
  selectGeometryData 
} from '../../selectors/optimizedSelectors';

const StateExporter = () => {
  // Replace selecting entire state with specific selectors
  const spatialData = useSelector(selectSpatialData);
  const flowData = useSelector(selectFlowData);
  const geometryData = useSelector(selectGeometryData);

  const exportState = () => {
    const exportData = {
      spatial: spatialData,
      flows: flowData,
      geometry: geometryData
    };

    const blob = new Blob(
      [JSON.stringify(exportData, null, 2)], 
      { type: 'application/json' }
    );
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `market-analysis-export-${new Date().toISOString()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Tooltip title="Export Analysis Data">
      <Fab 
        color="primary" 
        onClick={exportState}
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
      >
        <DownloadIcon />
      </Fab>
    </Tooltip>
  );
};

export default StateExporter;
