// src/components/spatial-analysis/RegionDetailsModal.js

import React from "react";
import PropTypes from "prop-types";
import {
  Modal,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";

const RegionDetailsModal = ({ regionData, onClose }) => {
  if (!regionData) {
    return null;
  }

  const {
    region_id,
    date,
    residual,
    usdprice,
    // ... other properties you want to display
  } = regionData;

  return (
    <Modal open={!!regionData} onClose={onClose}>
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 400,
          maxWidth: '90%',
          bgcolor: "background.paper",
          boxShadow: 24,
          p: 4,
          borderRadius: 2,
        }}
      >
        <Typography variant="h6" component="h2" gutterBottom>
          Region Details: {region_id}
        </Typography>
        <Typography variant="subtitle2" gutterBottom>
          Date: {new Date(date).toLocaleDateString()}
        </Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Property</TableCell>
                <TableCell align="right">Value</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>Residual</TableCell>
                <TableCell align="right">{residual.toFixed(4)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>USD Price</TableCell>
                <TableCell align="right">{usdprice.toFixed(2)}</TableCell>
              </TableRow>
              {/* Add more rows for other properties */}
            </TableBody>
          </Table>
        </TableContainer>
        {/* Additional visualizations or information can be added here */}
      </Box>
    </Modal>
  );
};

RegionDetailsModal.propTypes = {
  regionData: PropTypes.shape({
    region_id: PropTypes.string.isRequired,
    date: PropTypes.string.isRequired,
    residual: PropTypes.number.isRequired,
    usdprice: PropTypes.number.isRequired,
    // ... other properties
  }),
  onClose: PropTypes.func.isRequired,
};

export default RegionDetailsModal;
