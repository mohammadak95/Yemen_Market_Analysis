// src/components/spatial-analysis/ResidualsList.js

import React from 'react';
import PropTypes from 'prop-types';
import { FixedSizeList as List } from 'react-window';
import { ListItem, ListItemText, Typography } from '@mui/material';

const Row = ({ index, style, data }) => {
  const { residuals } = data;
  const residual = residuals[index];

  return (
    <ListItem style={style} key={index} divider>
      <ListItemText
        primary={`Region: ${residual.region_id}`}
        secondary={
          <>
            <Typography variant="body2">{`Date: ${new Date(residual.date).toLocaleDateString()}`}</Typography>
            <Typography variant="body2">{`Residual: ${residual.residual.toFixed(4)}`}</Typography>
          </>
        }
      />
    </ListItem>
  );
};

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
      itemSize={80}
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