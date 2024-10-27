// sr./components/common/ResultTable.js

import React from 'react';
import PropTypes from 'prop-types';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Paper,
  Typography,
  Tooltip,
  IconButton,
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';

const ResultTable = ({ title, data, columns }) => {
  return (
    <TableContainer component={Paper} sx={{ mb: 2 }}>
      {title && (
        <Typography variant="h6" sx={{ p: 2 }}>
          {title}
        </Typography>
      )}
      <Table>
        <TableBody>
          {data.map((row, index) => (
            <TableRow key={index}>
              {columns.map((col) => (
                <TableCell key={col.field}>
                  {col.tooltip ? (
                    <Tooltip title={col.tooltip} arrow>
                      <span>
                        {row[col.field]}
                        <IconButton size="small" sx={{ ml: 1 }} aria-label={`${col.field} info`}>
                          <InfoIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  ) : (
                    row[col.field]
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

ResultTable.propTypes = {
  title: PropTypes.string,
  data: PropTypes.arrayOf(PropTypes.object).isRequired,
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      field: PropTypes.string.isRequired,
      tooltip: PropTypes.string,
    })
  ).isRequired,
};

export default ResultTable;