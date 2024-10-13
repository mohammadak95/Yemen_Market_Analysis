// src/components/spatial-analysis/ResidualsList.js

import React from 'react';
import PropTypes from 'prop-types';
import { FixedSizeList as List } from 'react-window';
import { ListItem, ListItemText } from '@mui/material';

// Named function for Row component
function Row({ index, style, data }) {
  const { residuals } = data;
  return (
    <ListItem style={style} key={index} divider>
      <ListItemText
        primary={`Region: ${residuals[index].region_id}`}
        secondary={`Date: ${new Date(residuals[index].date).toLocaleDateString()} | Residual: ${residuals[index].residual}`}
      />
    </ListItem>
  );
}

Row.propTypes = {
  index: PropTypes.number.isRequired,
  style: PropTypes.object.isRequired,
  data: PropTypes.shape({
    residuals: PropTypes.arrayOf(
      PropTypes.shape({
        region_id: PropTypes.string.isRequired,
        date: PropTypes.string.isRequired,
        residual: PropTypes.number.isRequired,
      })
    ).isRequired,
  }).isRequired,
};

const ResidualsList = ({ residuals }) => {
  return (
    <List
      height={400}
      itemCount={residuals.length}
      itemSize={50}
      width="100%"
      itemData={{ residuals }}
    >
      {Row}
    </List>
  );
};

ResidualsList.propTypes = {
  residuals: PropTypes.arrayOf(
    PropTypes.shape({
      region_id: PropTypes.string.isRequired,
      date: PropTypes.string.isRequired,
      residual: PropTypes.number.isRequired,
    })
  ).isRequired,
};

export default ResidualsList;
