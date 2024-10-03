import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';

const DashboardContainer = styled.div`
  padding: 20px;
`;

const DashboardLink = styled(Link)`
  display: block;
  margin-bottom: 10px;
  padding: 10px;
  background-color: ${props => props.theme.secondaryBackground};
  color: ${props => props.theme.text};
  text-decoration: none;
  border-radius: 5px;
`;

const Dashboard = () => {
  return (
    <DashboardContainer>
      <h1>Yemen Market Analysis Dashboard</h1>
      <DashboardLink to="/ecm">ECM Analysis</DashboardLink>
      <DashboardLink to="/price-diff">Price Differential Analysis</DashboardLink>
      <DashboardLink to="/spatial">Spatial Analysis</DashboardLink>
    </DashboardContainer>
  );
};

export default Dashboard;