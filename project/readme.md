# Econometric Models

This section provides an overview of the econometric models used in the Yemen Market Analysis Platform. These models are designed to analyze market integration, price transmission, and spatial relationships across Yemen's commodity markets.

## 📊 Error Correction Model (ECM)

### Overview
The Error Correction Model (ECM) is used to analyze the long-run equilibrium relationships and short-term adjustments between commodity prices across different markets. The ECM helps in understanding how prices adjust to deviations from the long-run equilibrium.

### Implementation
The ECM is implemented in the `ecm_v2.5_directional.py` and `v2.5_unified.py` scripts. The model is applied to time series data of commodity prices, and the results are saved in JSON format.

#### Key Functions:
- **`handle_duplicates(df)`**: Handles duplicate data points by averaging numeric columns and keeping the first non-numeric value.
- **`apply_seasonal_adjustment(df, frequency='M')`**: Applies seasonal adjustment to the `usdprice` column for each commodity-regime group.
- **`run_cointegration_tests(y, x, stationarity_results)`**: Runs cointegration tests to check for long-run equilibrium relationships.
- **`compute_granger_causality(y, x)`**: Computes Granger causality to determine if one time series can predict another.
- **`compute_model_criteria(results, model)`**: Computes model selection criteria such as AIC, BIC, and HQIC.
- **`save_results(ecm_results, residuals_storage)`**: Saves the ECM results and residuals to JSON files.

### Output Schema
```json
{
  "model_metadata": {
    "version": "2.5",
    "timestamp": "2024-01-28T10:00:00Z",
    "commodity": "string",
    "market_pair": ["string", "string"]
  },
  "long_run_equilibrium": {
    "coefficient": "float",
    "std_error": "float",
    "t_statistic": "float",
    "p_value": "float",
    "confidence_interval": ["float", "float"]
  },
  "short_run_dynamics": {
    "error_correction_term": {
      "coefficient": "float",
      "std_error": "float",
      "t_statistic": "float",
      "p_value": "float"
    },
    "lagged_differences": [
      {
        "lag": "integer",
        "coefficient": "float",
        "std_error": "float",
        "t_statistic": "float",
        "p_value": "float"
      }
    ]
  },
  "diagnostics": {
    "r_squared": "float",
    "adj_r_squared": "float",
    "aic": "float",
    "bic": "float",
    "residual_diagnostics": {
      "jarque_bera": {
        "statistic": "float",
        "p_value": "float"
      },
      "ljung_box": {
        "statistic": "float",
        "p_value": "float"
      }
    }
  }
}
```

## 📈 Price Differential Analysis

### Overview
The Price Differential Analysis examines the price gaps between different markets. This analysis helps in understanding the extent of market fragmentation and the factors influencing price disparities.

### Implementation
The Price Differential Analysis is implemented in the `price_differential_model_v2.py` script. The model generates CSV files with price comparisons between markets.

#### Key Functions:
- **`compute_price_gaps(df)`**: Computes the price gaps between markets.
- **`compute_market_integration_scores(df)`**: Computes integration scores based on price differentials.

### Output Schema
```json
{
  "metadata": {
    "analysis_date": "ISO-8601 date",
    "version": "string",
    "parameters": {
      "window_size": "integer",
      "threshold": "float"
    }
  },
  "market_pairs": [
    {
      "source_market": "string",
      "target_market": "string",
      "commodity": "string",
      "price_differential": {
        "mean": "float",
        "std_dev": "float",
        "min": "float",
        "max": "float",
        "percentiles": {
          "25": "float",
          "50": "float",
          "75": "float"
        }
      },
      "integration_metrics": {
        "correlation": "float",
        "cointegration_test": {
          "statistic": "float",
          "p_value": "float",
          "critical_values": {
            "1%": "float",
            "5%": "float",
            "10%": "float"
          }
        }
      }
    }
  ]
}
```

## 🌍 Spatial Analysis

### Overview
The Spatial Analysis model investigates geographic price dependencies and spatial relationships between markets. This model uses geospatial data to analyze how prices in one market affect prices in neighboring markets.

### Implementation
The Spatial Analysis is implemented in the `spatial_model_v2.py` script. The model processes geospatial data and saves enhanced GeoJSON files and spatial weights.

#### Key Functions:
- **`compute_spatial_autocorrelation(residuals, spatial_weights, gdf, filter_indices)`**: Computes spatial autocorrelation metrics such as Moran's I.
- **`run_spatial_autocorrelation(residuals, spatial_weights, gdf, filter_indices)`**: Runs spatial autocorrelation tests on residuals.

### Output Schema
```json
{
  "metadata": {
    "analysis_date": "ISO-8601 date",
    "spatial_weights_type": "string",
    "parameters": {
      "k_neighbors": "integer",
      "distance_threshold": "float"
    }
  },
  "global_metrics": {
    "morans_i": {
      "statistic": "float",
      "p_value": "float",
      "z_score": "float"
    },
    "gearys_c": {
      "statistic": "float",
      "p_value": "float",
      "z_score": "float"
    }
  },
  "local_metrics": {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "geometry": {
          "type": "Point",
          "coordinates": ["float", "float"]
        },
        "properties": {
          "market_id": "string",
          "lisa_statistic": "float",
          "p_value": "float",
          "cluster_type": "string"
        }
      }
    ]
  }
}
```

## ⏳ Time-Varying Market Integration Index (TV-MII)

### Overview
The Time-Varying Market Integration Index (TV-MII) is a dynamic measure of market integration over time. The index helps in understanding how market integration levels change in response to external shocks and policy changes.

### Implementation
The TV-MII is implemented in the `compute_tv_mii.py` script. The model calculates daily integration indices and classifies market regimes.

#### Key Functions:
- **`compute_tv_mii(df)`**: Computes the Time-Varying Market Integration Index.
- **`classify_market_regimes(df)`**: Classifies market regimes based on integration scores.

### Output Schema
```json
{
  "metadata": {
    "analysis_date": "ISO-8601 date",
    "version": "string",
    "parameters": {
      "window_size": "integer",
      "smoothing_factor": "float"
    }
  },
  "daily_indices": [
    {
      "date": "ISO-8601 date",
      "integration_score": "float",
      "confidence_interval": ["float", "float"],
      "regime": {
        "classification": "string",
        "probability": "float"
      },
      "component_scores": {
        "price_convergence": "float",
        "volatility_sync": "float",
        "trade_intensity": "float"
      }
    }
  ],
  "summary_statistics": {
    "mean_integration": "float",
    "trend_coefficient": "float",
    "regime_transitions": "integer",
    "stability_score": "float"
  }
}
```

## 📊 Visualization Data

### Overview
The visualization data is prepared for interactive maps and network graphs. This data is used to create choropleth maps and economic flow networks.

### Implementation
The visualization data is prepared using the `project_documentation.md` script. The data is saved in JSON format for use in the frontend.

#### Key Functions:
- **`prepare_choropleth_data(df)`**: Prepares data for choropleth maps.
- **`prepare_network_data(df)`**: Prepares data for network graphs.

### Output Schema
```json
{
  "choropleth_data": {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "geometry": {
          "type": "MultiPolygon",
          "coordinates": "array"
        },
        "properties": {
          "market_id": "string",
          "commodity_prices": {
            "wheat": "float",
            "rice": "float"
          },
          "integration_scores": {
            "overall": "float",
            "by_commodity": {
              "wheat": "float",
              "rice": "float"
            }
          }
        }
      }
    ]
  },
  "network_data": {
    "nodes": [
      {
        "id": "string",
        "name": "string",
        "coordinates": ["float", "float"],
        "metrics": {
          "centrality": "float",
          "volume": "float"
        }
      }
    ],
    "edges": [
      {
        "source": "string",
        "target": "string",
        "weight": "float",
        "flow_volume": "float"
      }
    ]
  }
}
```

## 📝 Output Interpretation

| Metric          | Range      | Interpretation                          |
|-----------------|------------|------------------------------------------|
| TV-MII Score    | 0.0 - 1.0  | Higher = More integrated markets         |
| ECM β-coefficient | (-∞, ∞)   | Negative = Mean-reverting behavior       |
| Moran's I       | -1 - 1     | >0 = Clustered, <0 = Dispersed           |
| Price Gap       | % change   | >10% = Significant market fragmentation  |

## 🗄️ Output Versioning

All results include metadata with:
- Git commit hash
- Parameter configuration snapshot
- Processing timestamp
- Dependency versions
