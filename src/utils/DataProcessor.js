// src/utils/DataProcessor.js

import { backgroundMonitor } from './backgroundMonitor-cancelled';

export class DataProcessor {
    constructor() {
        this.metrics = {
            processingTimes: [],
            batchCounts: [],
            errorCounts: 0
        };
    }

    /**
     * Process time series data
     */
    async processTimeSeriesData(data, options = {}) {
        const metric = backgroundMonitor.startMetric('process-time-series');
        const startTime = performance.now();

        try {
            // Process in batches if data is large
            if (data.length > 100) {
                return await this.processBatches(data, this.processTimeSeriesEntry.bind(this));
            }

            const processed = data.map(entry => this.processTimeSeriesEntry(entry));
            
            // Sort by date
            processed.sort((a, b) => new Date(a.month) - new Date(b.month));

            this.metrics.processingTimes.push(performance.now() - startTime);
            metric.finish({ status: 'success' });
            return processed;

        } catch (error) {
            this.metrics.errorCounts++;
            metric.finish({ status: 'error', error: error.message });
            throw error;
        }
    }

    /**
     * Process single time series entry
     */
    processTimeSeriesEntry(entry) {
        return {
            month: entry.month,
            date: new Date(entry.month),
            avgUsdPrice: this.cleanNumber(entry.avgUsdPrice),
            volatility: this.cleanNumber(entry.volatility),
            conflict_intensity: this.cleanNumber(entry.conflict_intensity),
            price_stability: Math.min(1, Math.max(0, this.cleanNumber(entry.price_stability))),
            region: this.normalizeRegionName(entry.region)
        };
    }

    /**
     * Process market clusters
     */
    async processMarketClusters(clusters, options = {}) {
        const metric = backgroundMonitor.startMetric('process-clusters');
        const startTime = performance.now();

        try {
            const processed = clusters.map(cluster => ({
                cluster_id: cluster.cluster_id,
                main_market: this.normalizeRegionName(cluster.main_market),
                connected_markets: cluster.connected_markets.map(market => 
                    this.normalizeRegionName(market)
                ),
                market_count: cluster.market_count,
                efficiency: this.processEfficiencyMetrics(cluster.efficiency || {})
            }));

            this.metrics.processingTimes.push(performance.now() - startTime);
            metric.finish({ status: 'success' });
            return processed;

        } catch (error) {
            this.metrics.errorCounts++;
            metric.finish({ status: 'error', error: error.message });
            throw error;
        }
    }

    /**
     * Process flow analysis
     */
    async processFlowAnalysis(flows, options = {}) {
        const metric = backgroundMonitor.startMetric('process-flows');
        const startTime = performance.now();

        try {
            const processed = flows.map(flow => ({
                source: this.normalizeRegionName(flow.source),
                target: this.normalizeRegionName(flow.target),
                total_flow: this.cleanNumber(flow.total_flow),
                avg_flow: this.cleanNumber(flow.avg_flow),
                flow_count: flow.flow_count,
                avg_price_differential: this.cleanNumber(flow.avg_price_differential)
            }));

            this.metrics.processingTimes.push(performance.now() - startTime);
            metric.finish({ status: 'success' });
            return processed;

        } catch (error) {
            this.metrics.errorCounts++;
            metric.finish({ status: 'error', error: error.message });
            throw error;
        }
    }

    /**
     * Process efficiency metrics
     */
    processEfficiencyMetrics(efficiency) {
        return {
            internal_connectivity: this.cleanNumber(efficiency.internal_connectivity),
            market_coverage: this.cleanNumber(efficiency.market_coverage),
            price_convergence: this.cleanNumber(efficiency.price_convergence),
            stability: this.cleanNumber(efficiency.stability),
            efficiency_score: this.cleanNumber(efficiency.efficiency_score)
        };
    }

    /**
     * Process data in batches
     */
    async processBatches(data, processFn, batchSize = 100) {
        const batches = [];
        for (let i = 0; i < data.length; i += batchSize) {
            batches.push(data.slice(i, i + batchSize));
        }

        this.metrics.batchCounts.push(batches.length);

        const processedBatches = await Promise.all(
            batches.map(batch => 
                Promise.all(batch.map(item => processFn(item)))
            )
        );

        return processedBatches.flat();
    }

    /**
     * Clean numeric values
     */
    cleanNumber(value) {
        if (value === null || value === undefined || value === '') return 0;
        if (typeof value === 'string') {
            value = value.replace(/[^\d.-]/g, '');
        }
        const num = Number(value);
        return isNaN(num) ? 0 : num;
    }

    /**
     * Normalize region names
     */
    normalizeRegionName(region) {
        if (!region) return '';
        return region
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');
    }

    /**
     * Get processing metrics
     */
    getMetrics() {
        return {
            averageProcessingTime: this.calculateAverage(this.metrics.processingTimes),
            totalBatches: this.metrics.batchCounts.reduce((a, b) => a + b, 0),
            errorCount: this.metrics.errorCounts,
            successRate: this.calculateSuccessRate()
        };
    }

    /**
     * Calculate average
     */
    calculateAverage(numbers) {
        return numbers.length > 0 ? 
            numbers.reduce((a, b) => a + b, 0) / numbers.length : 0;
    }

    /**
     * Calculate success rate
     */
    calculateSuccessRate() {
        const total = this.metrics.processingTimes.length + this.metrics.errorCounts;
        return total > 0 ? 
            (this.metrics.processingTimes.length / total) * 100 : 0;
    }
}