// src/types/spatialTypes.ts

export interface PrecomputedData {
    timeSeriesData: TimeSeriesEntry[];
    marketShocks: MarketShock[];
    marketClusters: MarketCluster[];
    flowAnalysis: FlowAnalysis[];
    spatialAutocorrelation: SpatialAutocorrelation;
    metadata: DataMetadata;
  }
  
  export interface TimeSeriesEntry {
    month: string;
    avgUsdPrice: number;
    volatility: number;
    sampleSize: number;
  }
  
  export interface MarketShock {
    region: string;
    date: string;
    magnitude: number;
    type: 'price_surge' | 'price_drop';
    severity: 'high' | 'medium' | 'low';
    price_change: number;
    previous_price: number;
    current_price: number;
  }
  
  export interface MarketCluster {
    cluster_id: number;
    main_market: string;
    connected_markets: string[];
    market_count: number;
    metrics: {
      totalFlow: number;
      avgFlow: number;
      flowDensity: number;
    };
  }
  
  export interface FlowAnalysis {
    source: string;
    target: string;
    total_flow: number;
    avg_flow: number;
    flow_count: number;
    avg_price_differential: number;
  }
  
  export interface SpatialAutocorrelation {
    moran_i: number;
    p_value: number;
    significance: boolean;
  }
  
  export interface DataMetadata {
    commodity: string;
    data_source: string;
    processed_date: string;
    total_clusters: number;
  }
  
  export interface SpatialViewConfig {
    center: [number, number];
    zoom: number;
  }
  
  export interface AnalysisMetrics {
    marketCoverage: number;
    integrationLevel: number;
    stability: number;
    observations: number;
  }