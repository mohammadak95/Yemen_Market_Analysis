// src/components/analysis/ecm/ECMEquations.js

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import { ChevronDown } from 'lucide-react';
import { useTechnicalHelp } from '../../../hooks/useTechnicalHelp';
import EquationWithHelp from '../../common/EquationWithHelp';

const ECMEquations = () => {
  const { getTechnicalEquation } = useTechnicalHelp('ecm');
  const [expanded, setExpanded] = useState('');

  const handleChange = (panel) => (event, newExpanded) => {
    setExpanded(newExpanded ? panel : false);
  };

  const equations = [
    {
      id: 'main',
      title: 'Main Model',
      equation: getTechnicalEquation('main')
    },
    {
      id: 'diagnostics',
      title: 'Diagnostic Tests',
      equations: {
        moransI: getTechnicalEquation('diagnostics.moransI'),
        jarqueBera: getTechnicalEquation('diagnostics.jarqueBera')
      }
    }
  ];

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Technical Details
      </Typography>

      {equations.map((section) => (
        <Accordion
          key={section.id}
          expanded={expanded === section.id}
          onChange={handleChange(section.id)}
        >
          <AccordionSummary expandIcon={<ChevronDown />}>
            <Typography>{section.title}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            {section.equation ? (
              <EquationWithHelp
                latex={section.equation.latex}
                description={section.equation.description}
                variables={section.equation.variables}
                title={section.title}
                componentType="ecm"
              />
            ) : (
              Object.entries(section.equations).map(([key, equation]) => (
                <EquationWithHelp
                  key={key}
                  latex={equation.latex}
                  description={equation.description}
                  variables={equation.variables}
                  title={key}
                  componentType="ecm"
                />
              ))
            )}
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
};

export default ECMEquations;