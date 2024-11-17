//src/utils/MarketDataProcessor.js

import Papa from 'papaparse';
import _ from 'lodash';
import { monitoringSystem } from './MonitoringSystem';
import { dataTransformationSystem } from './DataTransformationSystem';
import { spatialSystem } from './SpatialSystem';

/**
 * Integrated data processing system for Yemen market analysis
 */
class MarketDataProcessor {
  constructor() {
    this.monitor = monitoringSystem;
  }

  /**
   * Process commodity time series data with spatial integration
   */
  async processCommodityData(commodity, options = {}) {
    const metric = this.monitor.startMetric('process-commodity-data');
    
    try {
      // Read and parse time varying flows
      const flowsResponse = await fetch('time_varying_flows.csv');
      const flowsText = await flowsResponse.text();
      const flows = await new Promise((resolve) => {
        Papa.parse(flowsText, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results) => resolve(results.data)
        });
      });

      // Filter flows for selected commodity
      const commodityFlows = flows.filter(flow => 
        flow.commodity.toLowerCase() === commodity.toLowerCase()
      );

      // Process TVMII data
      const tvmiiResponse = await fetch('tv_mii_results.json');
      const tvmiiText = await tvmiiResponse.text();
      const tvmiiData = JSON.parse(tvmiiText);
      
      // Filter and transform TVMII data
      const processedTVMII = tvmiiData.filter(item =>
        item.commodity.toLowerCase() === commodity.toLowerCase()
      ).map(item => ({
        ...item,
        date: new Date(item.date),
        tv_mii: Number(item.tv_mii)
      }));

      // Process spatial analysis results
      const spatialResponse = await fetch('spatial_analysis_results.json');
      const spatialText = await spatialResponse.text();
      const spatialData = JSON.parse(spatialText);
      
      // Extract relevant spatial metrics
      const spatialMetrics = _.get(spatialData, [commodity, 'spatial_metrics'], {});

      // Calculate market integration metrics
      const integrationMetrics = this.calculateIntegrationMetrics(
        commodityFlows,
        processedTVMII,
        spatialMetrics
      );

      // Process price differentials if available
      let priceDifferentials = null;
      try {
        const diffResponse = await fetch('price_differential_results.json');
        const diffText = await diffResponse.text();
        const diffData = JSON.parse(diffText);
        priceDifferentials = this.processPriceDifferentials(diffData, commodity);
      } catch (error) {
        this.monitor.warn('Price differential data unavailable:', error);
      }

      // Combine processed data
      const result = {
        timeSeriesData: await this.processTimeSeriesData(commodityFlows),
        marketIntegration: integrationMetrics,
        spatialDependence: await spatialSystem.processSpatialDependence(spatialMetrics),
        priceDifferentials,
        metadata: {
          commodity,
          processedAt: new Date().toISOString(),
          options
        }
      };

      metric.finish({ status: 'success' });
      return result;

    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      throw error;
    }
  }

  /**
   * Calculate market integration metrics from multiple sources
   */
  calculateIntegrationMetrics(flows, tvmiiData, spatialMetrics) {
    // Group flows by month to calculate temporal patterns
    const monthlyFlows = _.groupBy(flows, flow => 
      new Date(flow.date).toISOString().slice(0, 7)
    );

    // Calculate average flow weights
    const flowMetrics = Object.values(monthlyFlows).map(monthFlows => ({
      month: monthFlows[0].date,
      avgFlowWeight: _.meanBy(monthFlows, 'flow_weight'),
      totalFlows: monthFlows.length,
      uniqueMarkets: new Set([
        ...monthFlows.map(f => f.source),
        ...monthFlows.map(f => f.target)
      ]).size
    }));

    // Combine with TVMII metrics
    const integrationMetrics = flowMetrics.map(metrics => {
      const monthTVMII = tvmiiData.find(t => 
        new Date(t.date).toISOString().slice(0, 7) === 
        new Date(metrics.month).toISOString().slice(0, 7)
      );

      return {
        ...metrics,
        tvmii: monthTVMII?.tv_mii || null,
        spatialAutocorrelation: spatialMetrics.moran_i || null
      };
    });

    return {
      monthlyMetrics: integrationMetrics,
      summary: {
        avgIntegration: _.meanBy(integrationMetrics, 'tvmii'),
        avgFlowWeight: _.meanBy(integrationMetrics, 'avgFlowWeight'),
        marketCoverage: _.maxBy(integrationMetrics, 'uniqueMarkets')?.uniqueMarkets || 0,
        spatialDependence: spatialMetrics.moran_i || null
      }
    };
  }

  /**
   * Process price differential data for given commodity
   */
  processPriceDifferentials(diffData, commodity) {
    if (!diffData.markets) return null;

    const processedDiffs = {};
    Object.entries(diffData.markets).forEach(([market, data]) => {
      const commodityResults = data.commodity_results[commodity];
      if (commodityResults) {
        processedDiffs[market] = commodityResults.map(result => ({
          otherMarket: result.other_market,
          priceDiff: {
            dates: result.price_differential.dates,
            values: result.price_differential.values
          },
          regression: {
            coefficient: result.regression_results.coefficient,
            rSquared: result.regression_results.r_squared,
            pValue: result.regression_results.p_value
          },
          diagnostics: {
            distance: result.diagnostics.distance_km,
            conflictCorrelation: result.diagnostics.conflict_correlation
          }
        }));
      }
    });

    return processedDiffs;
  }

  /**
   * Process time series data with transformations
   */
  async processTimeSeriesData(flows) {
    // Group by market and date
    const marketData = _.groupBy(flows, 'source');
    
    const processedSeries = await Promise.all(
      Object.entries(marketData).map(async ([market, data]) => {
        // Sort by date
        const sortedData = _.sortBy(data, 'date');
        
        // Calculate statistics
        const prices = sortedData.map(d => d.price);
        const priceStats = {
          mean: _.mean(prices),
          std: Math.sqrt(_.sum(prices.map(p => Math.pow(p - _.mean(prices), 2))) / prices.length),
          min: _.min(prices),
          max: _.max(prices)
        };

        // Transform using DataTransformationSystem
        const transformed = await dataTransformationSystem.transformTimeSeriesData(
          sortedData,
          {
            timeUnit: 'month',
            aggregationType: 'mean',
            smoothing: true
          }
        );

        return {
          market,
          data: transformed,
          statistics: priceStats
        };
      })
    );

    return processedSeries;
  }
}

// Export singleton instance
export const marketDataProcessor = new MarketDataProcessor();