# project/spatial_analysis/spatial_model.py 

import os
import sys
import logging
import json
import yaml
import pandas as pd
import numpy as np
import geopandas as gpd
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor, as_completed
from sklearn.linear_model import Ridge
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.metrics import mean_squared_error
from scipy import stats
from statsmodels.stats.outliers_influence import variance_inflation_factor
from libpysal.weights import KNN
from esda.moran import Moran
import warnings

# Suppress non-critical warnings, including urllib3's NotOpenSSLWarning
warnings.filterwarnings("ignore", category=UserWarning)
warnings.filterwarnings("ignore", category=FutureWarning)
warnings.filterwarnings("ignore", message="urllib3.*")

def load_config(config_path):
    """
    Load the YAML configuration file.
    """
    try:
        with open(config_path, 'r') as f:
            config = yaml.safe_load(f)
        return config
    except Exception as e:
        print(f"Failed to load configuration file: {e}")
        sys.exit(1)

def setup_logging(logs_dir, log_level, log_format):
    """
    Set up logging configuration.
    """
    logs_dir.mkdir(parents=True, exist_ok=True)
    logging.basicConfig(
        level=log_level.upper(),
        format=log_format,
        handlers=[
            logging.FileHandler(logs_dir / "spatial_analysis.log"),
            logging.StreamHandler()
        ]
    )
    logger = logging.getLogger(__name__)
    return logger

# Load configuration
CONFIG_PATH = Path("project/config/config.yaml")
config = load_config(CONFIG_PATH)

# Extract configurations
DATA_DIR = Path(config['directories']['data_dir'])
PROCESSED_DATA_DIR = Path(config['directories']['processed_data_dir'])
RESULTS_DIR = Path(config['directories']['results_dir'])
LOGS_DIR = Path(config['directories']['logs_dir'])
EXTERNAL_DATA_DIR = Path(config['directories']['external_data_dir'])

FILES = config['files']
SPATIAL_GEOJSON = Path(FILES['spatial_geojson'])
ENHANCED_GEOJSON = PROCESSED_DATA_DIR / "enhanced_unified_data_with_residual.geojson"  # Adjusted to match data_prepration_for_spatial_chart.py
SPATIAL_ANALYSIS_RESULTS = Path(FILES['spatial_analysis_results'])
ECM_RESULTS = Path(FILES['ecm_results'])
SPATIAL_WEIGHTS_JSON = RESULTS_DIR / "spatial_weights" / "spatial_weights.json"  # Adjusted path
NATURALEARTH_LOWRES = Path(FILES['naturalearth_lowres'])

PARAMS = config['parameters']
FREQUENCY = PARAMS.get('frequency', 'M')  # Default to monthly if not specified
INITIAL_K = PARAMS['initial_k']
MAX_K = PARAMS['max_k']
MIN_COMMON_DATES = PARAMS['min_common_dates']
LAG_PERIODS = PARAMS['lag_periods']
COINTEGRATION_MAX_LAGS = PARAMS['cointegration_max_lags']
GRANGER_MAX_LAGS = PARAMS['granger_max_lags']
DISTANCE_THRESHOLD = PARAMS['distance_threshold']
REGIMES_TO_UNIFY = PARAMS['regimes_to_unify']
NEW_REGIME_NAME = PARAMS['new_regime_name']
EXCHANGE_RATE_REGIME_COLUMN = PARAMS['exchange_rate_regime_column']
REGION_IDENTIFIER = PARAMS['region_identifier']
TIME_COLUMN = PARAMS['time_column']
LAG_VARIABLE = PARAMS['lag_variable']
COMMODITIES = PARAMS['commodities']
EXCHANGE_RATE_REGIMES = PARAMS['exchange_rate_regimes']
STATIONARITY_SIGNIFICANCE_LEVEL = PARAMS['stationarity_significance_level']
COINTEGRATION_SIGNIFICANCE_LEVEL = PARAMS['cointegration_significance_level']
RIDGE_ALPHA = PARAMS['ridge_alpha']
MAX_EPOCHS = PARAMS['max_epochs']
LEARNING_RATE = PARAMS['learning_rate']
MIN_REGIONS = PARAMS['min_regions']
SPATIAL_WEIGHTS_PARAMS = PARAMS['spatial_weights']
MIN_NEIGHBORS = PARAMS['min_neighbors']

LOGGING_CONFIG = config['logging']
LOG_LEVEL = LOGGING_CONFIG.get('level', 'INFO')
LOG_FORMAT = LOGGING_CONFIG.get('format', '%(asctime)s - %(levelname)s - %(message)s')

# Setup logging
logger = setup_logging(LOGS_DIR, LOG_LEVEL, LOG_FORMAT)

# Constants
MIN_OBSERVATIONS = PARAMS.get('min_regions', 5)  # Set from config

def load_geojson(file_path):
    """
    Load the GeoJSON data and assign 'region_id' using the specified region identifier.
    """
    try:
        logger.info(f"Loading GeoJSON data from {file_path}.")
        gdf = gpd.read_file(file_path)
        gdf[TIME_COLUMN] = pd.to_datetime(gdf[TIME_COLUMN])
        logger.debug(f"Converted '{TIME_COLUMN}' to datetime.")

        # Assign 'region_id' using the specified region identifier
        if REGION_IDENTIFIER in gdf.columns:
            gdf = gdf.rename(columns={REGION_IDENTIFIER: 'region_id'})
            logger.info(f"'region_id' column assigned using '{REGION_IDENTIFIER}'.")
        else:
            logger.error(f"'{REGION_IDENTIFIER}' column not found in GeoJSON data.")
            sys.exit(1)

        # Check for missing 'region_id's
        if gdf['region_id'].isnull().any():
            logger.error("Some 'region_id' values are missing. Please check the data.")
            sys.exit(1)

        # Drop duplicate rows
        gdf = gdf.drop_duplicates()
        logger.info("Duplicate rows dropped.")

        logger.info(f"GeoJSON data loaded with {len(gdf)} records.")
        return gdf
    except Exception as e:
        logger.error(f"Failed to load GeoJSON data from {file_path}: {e}")
        sys.exit(1)

def create_unified_regime(gdf):
    """
    Create a unified regime by combining specified regimes.
    """
    try:
        unified_df = gdf[gdf[EXCHANGE_RATE_REGIME_COLUMN].isin(REGIMES_TO_UNIFY)].copy()
        unified_df[EXCHANGE_RATE_REGIME_COLUMN] = NEW_REGIME_NAME
        logger.info(f"Unified regime created with {len(unified_df)} records.")
        return unified_df
    except Exception as e:
        logger.error(f"Failed to create unified regime: {e}")
        sys.exit(1)

def create_spatial_weights(gdf, k=INITIAL_K):
    """
    Create a spatial weights matrix using K-Nearest Neighbors.
    """
    try:
        w = KNN.from_dataframe(gdf, k=k)
        logger.debug(f"Spatial weights matrix created using KNN with k={k}.")
        return w
    except Exception as e:
        logger.error(f"Failed to create spatial weights matrix: {e}")
        raise

def save_spatial_weights(gdf, w, output_path):
    """
    Save the spatial weights matrix in JSON format.
    """
    spatial_weights = {}
    try:
        for region_idx, neighbors in w.neighbors.items():
            region_id = gdf.iloc[region_idx]['region_id']
            spatial_weights[region_id] = []
            for neighbor_idx in neighbors:
                neighbor_id = gdf.iloc[neighbor_idx]['region_id']
                spatial_weights[region_id].append(neighbor_id)

        with open(output_path, 'w') as f:
            json.dump(spatial_weights, f, indent=2)
        logger.info(f"Spatial weights saved to {output_path}.")
    except Exception as e:
        logger.error(f"Failed to save spatial weights to '{output_path}': {e}")

def save_flow_map(gdf, w, output_path):
    """
    Save flow map data in CSV format.
    """
    flow_data = []
    try:
        for region_idx, neighbors in w.neighbors.items():
            source_id = gdf.iloc[region_idx]['region_id']
            source_geom = gdf.iloc[region_idx].geometry.centroid
            for neighbor_idx in neighbors:
                target_id = gdf.iloc[neighbor_idx]['region_id']
                target_geom = gdf.iloc[neighbor_idx].geometry.centroid
                weight = w.weights[region_idx][neighbors.index(neighbor_idx)]
                flow_data.append({
                    'source': source_id,
                    'source_lat': source_geom.y,
                    'source_lng': source_geom.x,
                    'target': target_id,
                    'target_lat': target_geom.y,
                    'target_lng': target_geom.x,
                    'weight': weight
                })

        pd.DataFrame(flow_data).to_csv(output_path, index=False)
        logger.info(f"Flow map saved to {output_path}.")
    except Exception as e:
        logger.error(f"Failed to save flow map to '{output_path}': {e}")

def save_average_prices(gdf, output_path):
    """
    Save average prices for each region and date in CSV format.
    """
    try:
        average_prices = gdf.groupby(['region_id', TIME_COLUMN])['usdprice'].mean().reset_index().rename(columns={'usdprice': 'avg_usdprice'})
        average_prices.to_csv(output_path, index=False)
        logger.info(f"Average prices saved to {output_path}.")
    except Exception as e:
        logger.error(f"Failed to save average prices to '{output_path}': {e}")

def calculate_spatial_lag(gdf, w, variable):
    """
    Calculate the spatial lag of a specified variable.
    """
    try:
        lag = w.sparse.dot(gdf[variable])
        logger.debug(f"Spatial lag calculated for variable '{variable}'.")
        return lag
    except Exception as e:
        logger.error(f"Failed to calculate spatial lag for '{variable}': {e}")
        raise

def run_ridge_regression(X, y, alpha=RIDGE_ALPHA):
    """
    Perform Ridge regression on the provided features and target.
    """
    try:
        model = Ridge(alpha=alpha)
        model.fit(X, y)
        logger.debug("Ridge regression model fitted successfully.")
        return model
    except Exception as e:
        logger.error(f"Ridge regression failed: {e}")
        raise

def calculate_p_values(model, X, y):
    """
    Calculate p-values for Ridge regression coefficients.
    Note: Ridge regression does not provide p-values directly. This is an approximation.
    """
    try:
        mse = mean_squared_error(y, model.predict(X))
        var_b = mse * (np.linalg.inv((X.T @ X) + np.eye(X.shape[1]) * model.alpha).diagonal())
        t_stat = model.coef_ / np.sqrt(var_b)
        p_values = 2 * (1 - stats.t.cdf(np.abs(t_stat), y.shape[0] - X.shape[1]))
        logger.debug("P-values calculated for Ridge regression coefficients.")
        return p_values
    except Exception as e:
        logger.error(f"Failed to calculate p-values: {e}")
        raise

def calculate_vif(X):
    """
    Calculate Variance Inflation Factor (VIF) for the features to assess multicollinearity.
    """
    try:
        if X.shape[1] <= 1:
            # VIF is not defined for a single predictor; set to 1.0
            vif_data = pd.DataFrame({
                'Variable': X.columns,
                'VIF': [1.0] * X.shape[1]
            })
            logger.debug("Single predictor detected. VIF set to 1.0.")
        else:
            vif_data = pd.DataFrame({
                'Variable': X.columns,
                'VIF': [variance_inflation_factor(X.values, i) for i in range(X.shape[1])]
            })
            logger.debug("Variance Inflation Factor (VIF) calculated successfully.")
        return vif_data
    except Exception as e:
        logger.error(f"Failed to calculate VIF: {e}")
        raise

def calculate_moran(residual, w):
    """
    Calculate Moran's I statistic for spatial autocorrelation of residual.
    """
    try:
        moran = Moran(residual, w)
        logger.debug("Moran's I calculated for residual.")
        return {
            'I': moran.I,
            'p-value': moran.p_sim
        }
    except Exception as e:
        logger.error(f"Failed to calculate Moran's I: {e}")
        raise

def resample_data(gdf, frequency):
    """
    Resample the GeoDataFrame to the specified frequency.
    Aggregates numeric columns using the mean and retains the first geometry per group.
    Excludes 'region_id' from aggregation to prevent duplication errors.
    """
    try:
        logger.info(f"Resampling data to '{frequency}' frequency.")
        gdf = gdf.set_index(TIME_COLUMN)

        # Define aggregation methods for each column, excluding 'region_id'
        agg_dict = {}
        for col in gdf.columns:
            if col == 'geometry':
                agg_dict[col] = 'first'  # Retain the first geometry in each group
            elif pd.api.types.is_numeric_dtype(gdf[col]):
                agg_dict[col] = 'mean'   # Aggregate numeric columns using mean
            elif col != 'region_id':
                agg_dict[col] = 'first'  # For non-numeric columns, retain the first entry

        # Perform resampling with the defined aggregation methods
        gdf_resampled = gdf.groupby('region_id').resample(frequency).agg(agg_dict).reset_index()

        logger.info(f"Data resampled to '{frequency}' frequency.")
        return gdf_resampled
    except Exception as e:
        logger.error(f"Failed to resample data: {e}")
        sys.exit(1)

def align_frequency(gdf, frequency):
    """
    Align all data to the specified frequency, filling missing periods as needed.
    """
    try:
        logger.info(f"Aligning data to '{frequency}' frequency.")
        gdf = gdf.set_index(TIME_COLUMN)
        gdf = gdf.groupby('region_id').resample(frequency).asfreq().reset_index()
        logger.info(f"Data aligned to '{frequency}' frequency.")
        return gdf
    except Exception as e:
        logger.error(f"Failed to align data frequency: {e}")
        sys.exit(1)

def run_spatial_analysis(gdf, commodity, regime):
    """
    Perform spatial analysis for a specific commodity and exchange rate regime.
    """
    try:
        # Subset the data for the given commodity and regime
        gdf_subset = gdf[
            (gdf['commodity'].str.lower() == commodity.lower()) & 
            (gdf[EXCHANGE_RATE_REGIME_COLUMN].str.lower() == regime.lower())
        ].copy()

        if len(gdf_subset) < MIN_OBSERVATIONS:
            logger.warning(f"Insufficient observations for '{commodity}' in '{regime}' regime. Skipping.")
            return None

        # Ensure data is sorted by region and time
        gdf_subset = gdf_subset.sort_values(['region_id', TIME_COLUMN])

        # Create spatial weights
        w = create_spatial_weights(gdf_subset, k=INITIAL_K)

        # Calculate spatial lag of 'usdprice'
        gdf_subset['spatial_lag_price'] = calculate_spatial_lag(gdf_subset, w, 'usdprice')

        # Define independent variables and dependent variable
        X = gdf_subset[['spatial_lag_price']]
        y = gdf_subset['usdprice']

        # Handle missing values by imputing with median
        imputer = SimpleImputer(strategy='median')
        X_imputed = imputer.fit_transform(X)
        X = pd.DataFrame(X_imputed, columns=X.columns, index=X.index)
        logger.debug("Missing values imputed using median strategy.")

        # Standardize the features
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        X_scaled = pd.DataFrame(X_scaled, columns=X.columns, index=X.index)
        logger.debug("Features standardized using StandardScaler.")

        # Run Ridge regression
        model = run_ridge_regression(X_scaled, y)

        # Calculate additional metrics
        p_values = calculate_p_values(model, X_scaled, y)
        vif = calculate_vif(X)
        residual = y - model.predict(X_scaled)
        moran_i = calculate_moran(residual, w)

        # Prepare the residual DataFrame
        residual_df = gdf_subset[['region_id', TIME_COLUMN]].copy()
        residual_df['residual'] = residual

        # Prepare the results dictionary
        results = {
            'commodity': commodity,
            'regime': regime,
            'coefficients': dict(zip(X.columns, model.coef_)),
            'intercept': model.intercept_,
            'p_values': dict(zip(X.columns, p_values)),
            'r_squared': model.score(X_scaled, y),
            'adj_r_squared': 1 - (1 - model.score(X_scaled, y)) * (len(y) - 1) / (len(y) - X_scaled.shape[1] - 1),
            'mse': mean_squared_error(y, model.predict(X_scaled)),
            'vif': vif.to_dict('records'),
            'moran_i': moran_i,
            'observations': len(y),
            'residual': residual_df.to_dict(orient='records')  # List of dicts with 'region_id', 'date', 'residual'
        }

        logger.info(f"Spatial analysis completed for '{commodity}' in '{regime}' regime.")
        return results
    except Exception as e:
        logger.error(f"Error in spatial analysis for '{commodity}' in '{regime}': {e}")
        return None

def process_commodity_regime(args):
    """
    Wrapper function to process a single commodity-regime combination.
    """
    gdf, commodity, regime = args
    return run_spatial_analysis(gdf, commodity, regime)

def main():
    # Ensure necessary output directories exist
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    (RESULTS_DIR / "ecm").mkdir(parents=True, exist_ok=True)
    (RESULTS_DIR / "spatial_weights").mkdir(parents=True, exist_ok=True)
    (RESULTS_DIR / "choropleth_data").mkdir(parents=True, exist_ok=True)
    (RESULTS_DIR / "network_data").mkdir(parents=True, exist_ok=True)
    PROCESSED_DATA_DIR.mkdir(parents=True, exist_ok=True)  # Ensure processed data directory exists

    # Step 1: Load the GeoJSON data
    gdf = load_geojson(SPATIAL_GEOJSON)

    # Step 2: Resample or align frequency
    # You can choose to resample or align based on your data requirements
    # Uncomment one of the following lines based on your needs

    # Option A: Resample data by aggregating using the mean
    gdf = resample_data(gdf, FREQUENCY)

    # Option B: Align data to the specified frequency without aggregation
    # gdf = align_frequency(gdf, FREQUENCY)

    # Step 3: Create and append the unified regime
    unified_df = create_unified_regime(gdf)
    gdf = pd.concat([gdf, unified_df], ignore_index=True)
    logger.info(f"Total records after adding unified regime: {len(gdf)}.")

    # Step 4: Expand gdf to include all commodity-regime combinations
    # Assuming you have separate rows per commodity and regime
    gdf_expanded = pd.concat([
        gdf.assign(commodity=commodity, regime=regime)
        for commodity in COMMODITIES
        for regime in EXCHANGE_RATE_REGIMES
    ], ignore_index=True)

    logger.info(f"Total records after expanding for commodities and regimes: {len(gdf_expanded)}.")

    # Step 5: Prepare arguments for parallel processing
    args_list = [
        (gdf_expanded, commodity, regime) 
        for commodity in COMMODITIES 
        for regime in EXCHANGE_RATE_REGIMES
    ]

    # Step 6: Run spatial analysis in parallel
    results = []
    max_workers = os.cpu_count() - 1 if os.cpu_count() > 1 else 1  # Reserve one core
    with ProcessPoolExecutor(max_workers=max_workers) as executor:
        future_to_args = {executor.submit(process_commodity_regime, args): args for args in args_list}
        for future in as_completed(future_to_args):
            args = future_to_args[future]
            commodity, regime = args[1], args[2]
            try:
                result = future.result()
                if result is not None:
                    results.append(result)
            except Exception as exc:
                logger.error(f"Analysis for '{commodity}' in '{regime}' regime generated an exception: {exc}")

    # Step 7: Aggregate residual
    if results:
        # Adjust residual aggregation to prevent duplicates by taking the mean
        residual_list = []
        for r in results:
            commodity = r['commodity']
            regime = r['regime']
            for res in r['residual']:
                residual_list.append({
                    'region_id': res['region_id'],
                    TIME_COLUMN: res[TIME_COLUMN],
                    'commodity': commodity,
                    'regime': regime,
                    'residual': res['residual']
                })

        residual_df = pd.DataFrame(residual_list)

        # Aggregate residual by taking the mean to ensure uniqueness
        residual_agg = residual_df.groupby(['region_id', TIME_COLUMN, 'commodity', 'regime']).agg({
            'residual': 'mean'
        }).reset_index()

        # Merge aggregated residual into gdf_expanded
        gdf_merged = gdf_expanded.merge(
            residual_agg,
            on=['region_id', TIME_COLUMN, 'commodity', 'regime'],
            how='left'
        )

        # Convert merged DataFrame to GeoDataFrame
        gdf_merged = gpd.GeoDataFrame(gdf_merged, geometry='geometry')

        # Replace NaN residual with 0 or another appropriate value
        gdf_merged['residual'] = gdf_merged['residual'].fillna(0)

        # Verify the merge
        original_count = len(gdf_expanded)
        merged_count = len(gdf_merged)
        if original_count != merged_count:
            logger.warning(f"Record count mismatch: {original_count} vs {merged_count}")
        duplicates = gdf_merged.duplicated(subset=['region_id', TIME_COLUMN, 'commodity', 'regime']).sum()
        if duplicates > 0:
            logger.warning(f"There are {duplicates} duplicate residual entries after aggregation.")
        else:
            logger.info("No duplicate residual entries found after aggregation.")

        logger.info(f"Residual aggregated and merged back to GeoDataFrame.")

    else:
        logger.error("No residual to process.")
        gdf_merged = gdf_expanded.copy()
        gdf_merged['residual'] = np.nan
        gdf_merged = gpd.GeoDataFrame(gdf_merged, geometry='geometry')

    # Optional: Simplify geometries with a tolerance (adjust as needed)
    try:
        logger.info("Simplifying geometries to reduce GeoJSON size.")
        gdf_merged['geometry'] = gdf_merged['geometry'].simplify(tolerance=0.01, preserve_topology=True)
        logger.info("Geometries simplified successfully.")
    except Exception as e:
        logger.error(f"Failed to simplify geometries: {e}")

    # Optional: Convert data types to optimize size
    try:
        logger.info("Optimizing data types for memory efficiency.")
        # Downcast float columns
        float_cols = gdf_merged.select_dtypes(include=['float64']).columns
        gdf_merged[float_cols] = gdf_merged[float_cols].astype('float32')

        # Downcast integer columns
        int_cols = gdf_merged.select_dtypes(include=['int64']).columns
        gdf_merged[int_cols] = gdf_merged[int_cols].astype('int32')

        logger.info("Data types optimized successfully.")
    except Exception as e:
        logger.error(f"Failed to optimize data types: {e}")

    # Step 8: Select essential columns for the final GeoJSON
    try:
        logger.info("Selecting essential columns for the final GeoJSON.")
        # Retain required columns as per data_prepration_for_spatial_chart.py
        required_columns = ['region_id', TIME_COLUMN, 'usdprice', 'conflict_intensity', 'residual', 'commodity', 'regime', 'geometry']
        # Check for missing columns
        missing_columns = [col for col in required_columns if col not in gdf_merged.columns]
        if missing_columns:
            logger.warning(f"The following required columns are missing and will be filled with default values: {missing_columns}")
            for col in missing_columns:
                if col in ['usdprice', 'conflict_intensity']:
                    gdf_merged[col] = np.nan  # Assign NaN for missing numerical columns
                elif col in ['commodity', 'regime']:
                    gdf_merged[col] = 'Unknown'  # Assign 'Unknown' for missing categorical columns
                elif col == 'residual':
                    gdf_merged[col] = 0  # Assign 0 for missing residual
        # Ensure 'residual' is numeric
        gdf_merged['residual'] = pd.to_numeric(gdf_merged['residual'], errors='coerce').fillna(0)
        # Select columns
        gdf_final = gdf_merged[required_columns]
        logger.info("Essential columns selected.")

        # Ensure 'gdf_final' is a GeoDataFrame
        gdf_final = gpd.GeoDataFrame(gdf_final, geometry='geometry')
    except Exception as e:
        logger.error(f"Failed to select essential columns: {e}")

    # Step 9: Save the modified GeoDataFrame with residual to a new GeoJSON file
    try:
        logger.info(f"Saving enhanced GeoJSON to '{ENHANCED_GEOJSON}'.")
        gdf_final.to_file(ENHANCED_GEOJSON, driver='GeoJSON')
        logger.info(f"Enhanced GeoJSON saved successfully.")
    except Exception as e:
        logger.error(f"Failed to save enhanced GeoJSON to '{ENHANCED_GEOJSON}': {e}")

    # Step 10: Save spatial weights, flow maps, and average prices
    try:
        # Create spatial weights for the entire dataset if needed
        w_full = create_spatial_weights(gdf_final, k=INITIAL_K)
        save_spatial_weights(gdf_final, w_full, SPATIAL_WEIGHTS_JSON)
    except Exception as e:
        logger.error(f"Failed to save spatial weights: {e}")

    try:
        # Create flow maps for the entire dataset if needed
        save_flow_map(gdf_final, w_full, RESULTS_DIR / "network_data" / "flow_maps.csv")
    except Exception as e:
        logger.error(f"Failed to save flow maps: {e}")

    try:
        save_average_prices(gdf_final, RESULTS_DIR / "choropleth_data" / "average_prices.csv")
    except Exception as e:
        logger.error(f"Failed to save average prices to '{RESULTS_DIR / 'choropleth_data' / 'average_prices.csv'}': {e}")

    # Step 11: Save the analysis results to JSON
    try:
        # Convert Timestamps to strings
        def convert_timestamps(obj):
            if isinstance(obj, pd.Timestamp):
                return obj.isoformat()
            if isinstance(obj, dict):
                return {k: convert_timestamps(v) for k, v in obj.items()}
            if isinstance(obj, list):
                return [convert_timestamps(i) for i in obj]
            return obj

        results_with_str_timestamps = convert_timestamps(results)

        # Save results to JSON
        with open(SPATIAL_ANALYSIS_RESULTS, 'w') as f:
            json.dump(results_with_str_timestamps, f, indent=4)
        logger.info(f"Results saved to {SPATIAL_ANALYSIS_RESULTS}.")
    except Exception as e:
        logger.error(f"Failed to save results to '{SPATIAL_ANALYSIS_RESULTS}': {e}")


if __name__ == "__main__":
    main()
