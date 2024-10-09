// src/components/common/ECMTabs.js

import React from 'react';
import PropTypes from 'prop-types';
import { Tabs, Tab } from '@mui/material'; // Removed Box from imports
import TabPanel from './TabPanel';

const ECMTabs = ({ activeTab, handleTabChange, tabLabels, children }) => (
  <>
    <Tabs
      value={activeTab}
      onChange={handleTabChange}
      centered
      variant="scrollable"
      scrollButtons="auto"
      sx={{ bgcolor: 'background.paper' }}
    >
      {tabLabels.map((label, index) => (
        <Tab key={`tab-${index}`} label={label} />
      ))}
    </Tabs>
    {children.map((child, index) => (
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
  children: PropTypes.arrayOf(PropTypes.node).isRequired,
};

export default ECMTabs;
