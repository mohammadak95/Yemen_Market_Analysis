// src/components/ecm-analysis/ECMAnalysis.js
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchData } from '../../features/ecmSlice';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';
import SummaryTable from './SummaryTable';
import DiagnosticsTable from './DiagnosticsTable';
import IRFChart from './IRFChart';
import DownloadReportButton from './DownloadReportButton';
import styled from 'styled-components';

// Styled Components
const Container = styled.div`
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
`;

const Title = styled.h1`
  text-align: center;
  margin-bottom: 30px;
`;

const Filters = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 30px;

  label {
    margin-right: 10px;
    font-size: 18px;
  }

  select {
    padding: 8px;
    font-size: 16px;
  }
`;

const Section = styled.section`
  margin-bottom: 40px;
`;

const ECMAnalysis = () => {
  const dispatch = useDispatch();
  const { data: ecmData, status, error } = useSelector((state) => state.ecm);
  const [selectedCommodity, setSelectedCommodity] = useState('');

  // Refs for capturing sections
  const summaryRef = useRef(null);
  const diagnosticsRef = useRef(null);

  // Fetch data on component mount
  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchData());
    }
  }, [dispatch, status]);

  // Set initial selected commodity when data is loaded
  useEffect(() => {
    if (ecmData && ecmData.length > 0 && !selectedCommodity) {
      setSelectedCommodity(ecmData[0].commodity);
    }
  }, [ecmData, selectedCommodity]);

  // Find the selected commodity's data
  const selectedData = useMemo(() => {
    return ecmData?.find(item => item.commodity === selectedCommodity);
  }, [ecmData, selectedCommodity]);

  if (status === 'loading') return <LoadingSpinner />;
  if (status === 'failed') return <ErrorMessage message={error} />;
  if (!ecmData || ecmData.length === 0) return <div>No ECM data available.</div>;

  return (
    <Container>
      <Title>ECM Analysis Dashboard for Commodity Markets</Title>

      <Filters>
        <label htmlFor="commodity-select">Select Commodity:</label>
        <select
          id="commodity-select"
          value={selectedCommodity}
          onChange={(e) => setSelectedCommodity(e.target.value)}
        >
          {ecmData.map((item) => (
            <option key={item.commodity} value={item.commodity}>
              {item.commodity}
            </option>
          ))}
        </select>
      </Filters>

      <DownloadReportButton
        summaryRef={summaryRef}
        diagnosticsRef={diagnosticsRef}
        commodity={selectedCommodity}
      />

      {selectedData && (
        <>
          <Section ref={summaryRef}>
            <h2>Summary Table</h2>
            <SummaryTable data={selectedData} />
          </Section>

          <Section>
            <h2>Impulse Response Function (IRF)</h2>
            <IRFChart irfData={selectedData.irf} />
          </Section>

          <Section ref={diagnosticsRef}>
            <h2>Diagnostics</h2>
            <DiagnosticsTable diagnostics={selectedData.diagnostics} />
          </Section>
        </>
      )}
    </Container>
  );
};

export default ECMAnalysis;