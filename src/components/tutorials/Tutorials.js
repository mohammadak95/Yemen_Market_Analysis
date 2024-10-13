// src/components/tutorials/Tutorials.js
import React from 'react';
import PropTypes from 'prop-types';
import { Box, Typography, Paper, Stack, Accordion, AccordionSummary, AccordionDetails, List, ListItem, ListItemText } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const TutorialSection = ({ title, content }) => (
  <Accordion>
    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
      <Typography variant="h6">{title}</Typography>
    </AccordionSummary>
    <AccordionDetails>
      <Typography variant="body1">{content}</Typography>
    </AccordionDetails>
  </Accordion>
);

TutorialSection.propTypes = {
  title: PropTypes.string.isRequired,
  content: PropTypes.oneOfType([PropTypes.string, PropTypes.node]).isRequired,
};

const Tutorials = ({ selectedCommodity, selectedRegime }) => {
  const theme = useTheme();

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Tutorials
      </Typography>
      <Paper
        elevation={3}
        sx={{
          p: 3,
          backgroundColor: theme.palette.background.paper,
        }}
      >
        <Stack spacing={2}>
          <TutorialSection
            title="Getting Started"
            content="Welcome to the Yemen Market Analysis dashboard! This tutorial will guide you through the various features and how to use them effectively."
          />

          <TutorialSection
            title="Selecting a Commodity"
            content={`
              Use the Commodity selector in the sidebar to choose the commodity you want to analyze. 
              The available options include wheat, corn, and rice. 
              Currently selected commodity: ${selectedCommodity || 'None'}
            `}
          />

          <TutorialSection
            title="Choosing Regimes"
            content={`
              Select one or more regimes from the Regime selector to filter the data displayed in the charts and analyses. 
              This allows you to compare market dynamics across different regions.
              Currently selected regime: ${selectedRegime || 'None'}
            `}
          />

          <TutorialSection
            title="Understanding the Charts"
            content={
              <>
                <Typography>
                  The Interactive Chart provides a visual representation of price trends and conflict intensity over time. 
                  Use the toggles above the chart to customize the display:
                </Typography>
                <List>
                  <ListItem>
                    <ListItemText 
                      primary="Currency Toggle" 
                      secondary="Switch between local currency (LCU) and US dollars (USD)"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Seasonal Adjustment" 
                      secondary="Apply seasonal adjustments to smooth out cyclical variations"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Smoothing" 
                      secondary="Apply additional smoothing to highlight long-term trends"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Conflict Intensity" 
                      secondary="Toggle visibility of conflict intensity data"
                    />
                  </ListItem>
                </List>
              </>
            }
          />

          <TutorialSection
            title="Performing Analyses"
            content={
              <>
                <Typography>
                  Navigate to different analysis sections using the buttons in the sidebar:
                </Typography>
                <List>
                  <ListItem>
                    <ListItemText 
                      primary="ECM Analysis" 
                      secondary="Detailed economic conflict modeling, showing short-term dynamics and long-term equilibrium relationships"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Price Differential Analysis" 
                      secondary="Compare price variations across regimes, helping identify market inefficiencies or arbitrage opportunities"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Spatial Analysis" 
                      secondary="Geographic distribution of market trends, visualizing how prices and conflict intensity vary across regions"
                    />
                  </ListItem>
                </List>
              </>
            }
          />

          <TutorialSection
            title="Interpreting Results"
            content={
              <>
                <Typography>When interpreting the results, consider the following:</Typography>
                <List>
                  <ListItem>
                    <ListItemText 
                      primary="Price Trends" 
                      secondary="Look for patterns in price movements over time. Sharp increases might indicate supply shortages or increased demand."
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Conflict Correlation" 
                      secondary="Observe how conflict intensity correlates with price changes. Higher conflict often leads to market disruptions."
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Regional Differences" 
                      secondary="Compare trends across different regimes to identify areas of stability or volatility."
                    />
                  </ListItem>
                </List>
              </>
            }
          />

          <TutorialSection
            title="Methodology"
            content="Learn about the methodologies used in data processing and analysis by clicking the 'Methodology' button in the sidebar. This section provides detailed explanations of statistical techniques, data sources, and analytical approaches used in the dashboard."
          />

          <TutorialSection
            title="Tips for Effective Use"
            content={
              <List>
                <ListItem>
                  <ListItemText 
                    primary="Compare Multiple Commodities" 
                    secondary="Analyze different commodities to understand broader market trends."
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Use Date Ranges" 
                    secondary="Focus on specific time periods to analyze particular events or seasonal patterns."
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Combine Analyses" 
                    secondary="Use insights from different analysis types to form a comprehensive understanding of market dynamics."
                  />
                </ListItem>
              </List>
            }
          />
        </Stack>
      </Paper>
    </Box>
  );
};

Tutorials.propTypes = {
  selectedCommodity: PropTypes.string,
  selectedRegime: PropTypes.string,
};

export default Tutorials;