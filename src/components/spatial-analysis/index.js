// src/components/spatial-analysis/index.js

const renderAnalysisComponent = (analysis, commodity, regimes) => {
    switch (analysis) {
      case 'ecm':
        return (
          <ECMAnalysis
            selectedCommodity={commodity}
            selectedRegime="unified" // Always 'unified'
          />
        );
      case 'priceDiff':
        return (
          <PriceDifferentialAnalysis
            selectedCommodity={commodity}
            selectedRegime="unified" // Always 'unified'
          />
        );
      case 'spatial':
        return (
          <SpatialAnalysis
            selectedCommodity={commodity}
            selectedRegime="unified" // Pass 'unified' as a string
          />
        );
      default:
        return <ErrorMessage message="Invalid analysis selected." />;
    }
  };
  