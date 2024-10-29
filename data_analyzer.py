import json
import pandas as pd
import geopandas as gpd
from pathlib import Path
import yaml

class DataAnalyzer:
    def __init__(self, results_dir="output_files"):
        self.results_dir = Path(results_dir)
        self.summary = {
            "data_files": {},
            "structure": {},
            "relationships": {},
            "validation_issues": []
        }

    def analyze_spatial_analysis_results(self):
        """Analyze spatial analysis results JSON"""
        try:
            with open(self.results_dir / "final_spatial_analysis_results.json") as f:
                data = json.load(f)

            # Loop through each commodity's analysis results
            spatial_analysis_summary = []
            for entry in data:
                summary = {
                    "commodity": entry.get("commodity"),
                    "regime": entry.get("regime"),
                    "coefficients": entry.get("coefficients", {}),
                    "intercept": entry.get("intercept"),
                    "p_values": entry.get("p_values", {}),
                    "r_squared": entry.get("r_squared"),
                    "adj_r_squared": entry.get("adj_r_squared"),
                    "mse": entry.get("mse"),
                    "vif": entry.get("vif", []),
                    "moran_i": entry.get("moran_i", {}),
                    "observations": entry.get("observations"),
                    "residuals": entry.get("residual", [])
                }
                spatial_analysis_summary.append(summary)

            self.summary["data_files"]["spatial_analysis"] = {
                "type": "JSON",
                "structure": spatial_analysis_summary
            }

        except Exception as e:
            self.summary["validation_issues"].append(f"Error reading final_spatial_analysis_results.json: {str(e)}")

    def analyze_unified_data(self):
        """Analyze unified GeoJSON data"""
        try:
            gdf = gpd.read_file(self.results_dir / "final_unified_data.geojson")
            
            properties_summary = {
                "columns": list(gdf.columns),
                "date_range": {
                    "min": gdf['Date'].min().strftime('%Y-%m-%d') if 'Date' in gdf.columns and pd.notnull(gdf['Date'].min()) else None,
                    "max": gdf['Date'].max().strftime('%Y-%m-%d') if 'Date' in gdf.columns and pd.notnull(gdf['Date'].max()) else None
                },
                "commodities": list(gdf['commodity'].unique()) if 'commodity' in gdf.columns else [],
                "regimes": list(gdf['exchange_rate_regime'].unique()) if 'exchange_rate_regime' in gdf.columns else [],
                "feature_count": len(gdf)
            }
            
            self.summary["data_files"]["unified_data"] = {
                "type": "GeoJSON",
                "structure": properties_summary
            }

            # Validate required columns exist in GeoJSON data
            required_cols = ['Date', 'commodity', 'exchange_rate_regime', 'price', 'usdprice', 'conflict_intensity']
            missing_cols = [col for col in required_cols if col not in gdf.columns]
            if missing_cols:
                self.summary["validation_issues"].append(f"Missing required columns in final_unified_data.geojson: {missing_cols}")

        except Exception as e:
            self.summary["validation_issues"].append(f"Error reading final_unified_data.geojson: {str(e)}")

    def analyze_flow_data(self):
        """Analyze flow data CSV"""
        try:
            df = pd.read_csv(self.results_dir / "final_time_varying_flows.csv")
            
            df['Date'] = pd.to_datetime(df['Date'], errors='coerce')

            flow_summary = {
                "columns": list(df.columns),
                "date_range": {
                    "min": df['Date'].min().strftime('%Y-%m-%d') if pd.notnull(df['Date'].min()) else None,
                    "max": df['Date'].max().strftime('%Y-%m-%d') if pd.notnull(df['Date'].max()) else None
                },
                "flow_count": len(df),
                "unique_regions": {
                    "source": sorted(list(df['source'].unique())),
                    "target": sorted(list(df['target'].unique()))
                }
            }
            
            self.summary["data_files"]["flow_data"] = {
                "type": "CSV",
                "structure": flow_summary
            }

        except Exception as e:
            self.summary["validation_issues"].append(f"Error reading final_time_varying_flows.csv: {str(e)}")

    def analyze_spatial_weights(self):
        """Analyze spatial weights JSON"""
        try:
            with open(self.results_dir / "final_spatial_weights.json") as f:
                data = json.load(f)
            
            weights_summary = {
                "regions": sorted(list(data.keys())),
                "structure": "region_to_neighbors_mapping",
                "sample_region": list(data.values())[0] if data else None
            }
            
            self.summary["data_files"]["spatial_weights"] = {
                "type": "JSON",
                "structure": weights_summary
            }

        except Exception as e:
            self.summary["validation_issues"].append(f"Error reading final_spatial_weights.json: {str(e)}")

    def analyze_all(self):
        """Run all analyses"""
        self.analyze_spatial_analysis_results()
        self.analyze_unified_data()
        self.analyze_flow_data()
        self.analyze_spatial_weights()
        
        # Add cross-validation checks
        self.validate_relationships()
        
        return self.summary

    def validate_relationships(self):
        """Validate relationships between different data files"""
        try:
            unified_data = self.summary["data_files"].get("unified_data", {})
            flow_data = self.summary["data_files"].get("flow_data", {})
            weights_data = self.summary["data_files"].get("spatial_weights", {})
            
            # Re-read the GeoJSON to get unique regions
            try:
                gdf = gpd.read_file(self.results_dir / "final_unified_data.geojson")
                unified_regions = set(gdf['region'].unique()) if 'region' in gdf.columns else set()
            except Exception as e:
                unified_regions = set()
                self.summary["validation_issues"].append(f"Error extracting regions from final_unified_data.geojson for validation: {str(e)}")

            # Extract regions from flow data
            flow_regions_source = set(flow_data.get("structure", {}).get("unique_regions", {}).get("source", []))
            flow_regions_target = set(flow_data.get("structure", {}).get("unique_regions", {}).get("target", []))
            flow_regions = flow_regions_source.union(flow_regions_target)

            # Extract regions from spatial weights
            weight_regions = set(weights_data.get("structure", {}).get("regions", []))
            
            # Validate that all regions in flow and weights exist in unified_data
            missing_in_unified = (flow_regions | weight_regions) - unified_regions
            if missing_in_unified:
                self.summary["validation_issues"].append(
                    f"Regions missing in unified_data: {sorted(missing_in_unified)}"
                )
        except Exception as e:
            self.summary["validation_issues"].append(f"Error validating relationships: {str(e)}")

    def create_data_summary(self):
        """Run the data analyzer and create a summary"""
        summary = self.analyze_all()
        
        # Save the summary as a YAML file with proper date formatting
        with open("data_analysis_summary.yaml", "w") as f:
            yaml.dump(summary, f, default_flow_style=False)
        
        # Print validation issues
        if self.summary["validation_issues"]:
            print("\nValidation Issues:")
            for issue in summary["validation_issues"]:
                print(f"- {issue}")
        else:
            print("\nNo validation issues detected.")
        
        # Print data structure expectations for React components
        print("\nData Structure Recommendations:")
        print("1. SpatialStatistics component expects:")
        print("   - analysisResults as object, not array")
        print("   - statistics object with specific structure")
        
        print("\n2. DiagnosticsTests component expects:")
        print("   - data as object with specific properties")
        print("   - moran_i, observations, mse, etc.")
        
        print("\n3. RegressionResults component expects:")
        print("   - data object with coefficients")
        print("   - p_values and r_squared values")
        
        print("\n4. TimeSlider component expects:")
        print("   - months array of valid dates")
        print("   - selectedDate as valid date")

if __name__ == "__main__":
    analyzer = DataAnalyzer()
    analyzer.create_data_summary()