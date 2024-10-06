import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import styled from '@emotion/styled';

const Card = styled.div`
  padding: 20px;
  border: 1px solid ${props => props.theme.borderColor};
  border-radius: 8px;
  background-color: ${props => props.theme.cardBackground};
`;

const PriceSummaryCard = ({ selectedCommodity, selectedRegimes, data, loading, error }) => {
  const summary = useMemo(() => {
    if (!data || !data.features || !selectedCommodity || selectedRegimes.length === 0) {
      return null;
    }

    const filteredData = data.features.filter(feature =>
      feature.properties.commodity === selectedCommodity &&
      selectedRegimes.includes(feature.properties.regime)
    );

    if (filteredData.length === 0) {
      return null;
    }

    const latestEntry = filteredData.reduce((latest, current) => {
      return new Date(current.properties.date) > new Date(latest.properties.date) ? current : latest;
    });

    return {
      commodity: selectedCommodity,
      regimes: selectedRegimes.join(', '),
      latestPrice: latestEntry.properties.price,
      latestUSDPrice: latestEntry.properties.usdprice,
      latestConflictIndex: latestEntry.properties.conflict_intensity,
      date: new Date(latestEntry.properties.date).toLocaleDateString(),
    };
  }, [data, selectedCommodity, selectedRegimes]);

  if (loading) return <Card>Loading price summary...</Card>;
  if (error) return <Card>Error loading price summary: {error.message}</Card>;
  if (!summary) return <Card>No data available for the selected commodity and regimes.</Card>;

  return (
    <Card>
      <h2>Price Summary</h2>
      <p>Commodity: {summary.commodity}</p>
      <p>Regimes: {summary.regimes}</p>
      <p>Latest Price: {summary.latestPrice}</p>
      <p>Latest USD Price: {summary.latestUSDPrice}</p>
      <p>Conflict Intensity Index: {summary.latestConflictIndex}</p>
      <p>Date: {summary.date}</p>
    </Card>
  );
};

PriceSummaryCard.propTypes = {
  selectedCommodity: PropTypes.string.isRequired,
  selectedRegimes: PropTypes.array.isRequired,
  data: PropTypes.object,
  loading: PropTypes.bool,
  error: PropTypes.object,
};

export default PriceSummaryCard;