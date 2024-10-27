// sr./components/common/ECMTabs.js

import React from 'react';
import PropTypes from 'prop-types';
import { Tabs, Tab } from '@mui/material';
import TabPanel from './TabPanel';

const ECMTabs = ({ activeTab, handleTabChange, tabLabels, children }) => (
  <>
    <Tabs
      value={activeTab}
      onChange={handleTabChange}
      variant="scrollable" // Choose either 'scrollable' or 'standard'/'fullWidth'
      scrollButtons="auto"
      aria-label="ECM Analysis Tabs"
      sx={{ bgcolor: 'background.paper' }}
    >
      {tabLabels.map((label, index) => (
        <Tab
          key={`tab-${index}`}
          label={label}
          id={`ecm-tab-${index}`}
          aria-controls={`ecm-tabpanel-${index}`}
        />
      ))}
    </Tabs>
    {React.Children.map(children, (child, index) => (
      <TabPanel key={`tabpanel-${index}`} value={activeTab} index={index}>
        {child}
      </TabPanel>
    ))}
  </>
);

ECMTabs.propTypes = {
  activeTab: PropTypes.number.isRequired,
  handleTabChange: PropTypes.func.isRequired,
  tabLabels: PropTypes.arrayOf(PropTypes.string).isRequired,
  children: PropTypes.node.isRequired, // Allows single or multiple children
};

export default ECMTabs;