// src/components/documentation/TechnicalReference.js

import React from 'react';
import PropTypes from 'prop-types';
import { 
  Paper, 
  Box, 
  Typography, 
  Divider,
  Card,
  CardContent,
} from '@mui/material';
import { useTechnicalHelp } from '@/hooks';;
import EquationWithHelp from '../common/EquationWithHelp';
import TechnicalTooltip from '../common/TechnicalTooltip';
import MethodologyLink from '../common/MethodologyLink';

const TechnicalReference = ({ componentType }) => {
  const { 
    getTechnicalTooltip, 
    getTechnicalEquation, 
    getTechnicalConcept,
    getMethodology 
  } = useTechnicalHelp(componentType);

  const methodology = getMethodology();
  const mainEquation = getTechnicalEquation('main');

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        mb: 2 
      }}>
        <Typography variant="h6">
          Technical Reference
        </Typography>
        <MethodologyLink componentType={componentType} iconOnly />
      </Box>

      {mainEquation && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Model Specification
          </Typography>
          <EquationWithHelp
            latex={mainEquation.latex}
            description={mainEquation.description}
            variables={mainEquation.variables}
            title="Main Equation"
            componentType={componentType}
          />
        </Box>
      )}

      <Divider sx={{ my: 3 }} />

      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Key Concepts
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {Object.entries(getTechnicalEquation('concepts') || {}).map(([key, concept]) => (
            <Card key={key} sx={{ minWidth: 200, flex: 1 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                  <Typography variant="subtitle2" sx={{ flex: 1 }}>
                    {key}
                  </Typography>
                  <TechnicalTooltip
                    componentType={componentType}
                    element={key}
                    tooltipContent={getTechnicalTooltip(key)}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {concept}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Box>

      {methodology && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Further Reading
          </Typography>
          <Typography variant="body2" color="text.secondary">
            For more detailed information, view the full methodology section.
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

TechnicalReference.propTypes = {
  componentType: PropTypes.string.isRequired,
};

export default TechnicalReference;