# project/spatial_analysis/spatial_model_v2.py

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
from statsmodels.tsa.seasonal import seasonal_decompose
from libpysal.weights import KNN
from esda.moran import Moran
import warnings

# --------------------------- Suppress Non-critical Warnings ---------------------------

warnings.filterwarnings("ignore", category=UserWarning)
warnings.filterwarnings("ignore", category=FutureWarning)
warnings.filterwarnings("ignore", message="urllib3.*")

# --------------------------- Configuration and Setup ---------------------------

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
    logger = logging.getLogger(__name__)
    logger.setLevel(log_level.upper())

    # File Handler
    file_handler = logging.FileHandler(logs_dir / "spatial_analysis.log")
    file_handler.setLevel(log_level.upper())
    formatter = logging.Formatter(log_format, datefmt='%Y-%m-%d %H:%M:%S')
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    # Stream Handler
    stream_handler = logging.StreamHandler(sys.stdout)
    stream_handler.setLevel(log_level.upper())
    stream_handler.setFormatter(formatter)
    logger.addHandler(stream_handler)

    return logger

# --------------------------- Seasonal Adjustment Functions ---------------------------

def perform_seasonal_adjustment_on_group(group, freq='M', logger=None):
    """
    Perform seasonal adjustment on a single group.
    Args:
        group (pd.DataFrame): DataFrame group to adjust.
        freq (str): Frequency for seasonal decomposition ('M' for monthly).
        logger (logging.Logger): Logger for logging messages.
    Returns:
        pd.DataFrame: Adjusted DataFrame with seasonality removed from 'usdprice'.
    """
    try:
        # Ensure 'date' column is datetime
        if not pd.api.types.is_datetime64_any_dtype(group['date']):
            group['date'] = pd.to_datetime(group['date'], errors='coerce')
            if group['date'].isnull().all():
                logger.error(f"All dates could not be converted to datetime for Commodity: {group['commodity'].iloc[0]}, Region: {group['admin1'].iloc[0]}.")
                return group  # Return original group without adjustment

        group = group.sort_values('date')
        group.set_index('date', inplace=True)

        # Check if sufficient data points are available
        if group.shape[0] < 2 * 12:  # At least two years of monthly data
            logger.warning(f"Insufficient data points for seasonal adjustment for Commodity: {group['commodity'].iloc[0]}, Region: {group['admin1'].iloc[0]}. Required: >=24, Available: {group.shape[0]}. Skipping adjustment.")
            return group  # Return original group without adjustment

        # Perform seasonal decomposition
        decomposition = seasonal_decompose(group['usdprice'], model='additive', period=12, extrapolate_trend='freq')

        # Adjust the 'usdprice' by removing the seasonal component
        group['usdprice'] = group['usdprice'] - decomposition.seasonal

        group.reset_index(inplace=True)
        logger.debug(f"Seasonal adjustment successful for Commodity: {group['commodity'].iloc[0]}, Region: {group['admin1'].iloc[0]}.")
        return group

    except Exception as e:
        logger.error(f"Seasonal adjustment failed for Commodity: {group['commodity'].iloc[0]}, Region: {group['admin1'].iloc[0]}. Error: {e}")
        return group  # Return original group without adjustment

def apply_seasonal_adjustment(gdf, frequency='M', commodity_col='commodity', region_col='admin1', logger=None):
    """
    Apply seasonal adjustment to the 'usdprice' column for each commodity-region group.
    Args:
        gdf (pd.DataFrame): GeoDataFrame containing the data.
        frequency (str): Frequency for seasonal decomposition.
        commodity_col (str): Column name for commodities.
        region_col (str): Column name for regions.
        logger (logging.Logger): Logger for logging messages.
    Returns:
        pd.DataFrame: DataFrame with seasonal adjustment applied.
    """
    adjusted_groups = []

    # Verify that the required columns exist
    required_columns = [commodity_col, region_col, 'usdprice', 'date']
    for col in required_columns:
        if col not in gdf.columns:
            logger.error(f"Required column '{col}' not found in DataFrame.")
            raise KeyError(f"Required column '{col}' not found in DataFrame.")

    # Group by commodity and region
    grouped = gdf.groupby([commodity_col, region_col])
    total_groups = len(grouped)
    processed_groups = 0

    logger.info(f"Total groups to process for seasonal adjustment: {total_groups}")

    for (commodity, region), group in grouped:
        logger.debug(f"Processing Commodity: {commodity}, Region: {region}, Records: {len(group)}")
        
        # Drop rows with null 'usdprice' or 'date'
        group = group.dropna(subset=['usdprice', 'date'])
        if group.empty:
            logger.warning(f"All records have null 'usdprice' or 'date' for Commodity: {commodity}, Region: {region}. Skipping adjustment.")
            continue

        try:
            adjusted = perform_seasonal_adjustment_on_group(group, freq=frequency, logger=logger)

            if adjusted is not None and not adjusted.empty:
                adjusted_groups.append(adjusted)
                logger.debug(f"Adjusted Commodity: {commodity}, Region: {region}")
            else:
                logger.warning(f"No adjustment performed for Commodity: {commodity}, Region: {region}.")
        
        except Exception as e:
            logger.error(f"Error adjusting Commodity: {commodity}, Region: {region}. Error: {e}")
            adjusted_groups.append(group)  # Append the original group without adjustment
        
        processed_groups += 1

    logger.info(f"Processed {processed_groups} out of {total_groups} groups.")

    if not adjusted_groups:
        logger.error("No groups were adjusted. 'adjusted_groups' is empty.")
        raise ValueError("No objects to concatenate")

    # Concatenate all adjusted groups
    try:
        gdf_adjusted = pd.concat(adjusted_groups, ignore_index=True)
        logger.info("Seasonal adjustment concatenated successfully.")
        return gdf_adjusted
    except Exception as e:
        logger.error(f"Failed to concatenate adjusted groups. Error: {e}")
        raise

# --------------------------- Smoothing Function ---------------------------

def apply_smoothing(gdf, window=3, commodity_col='commodity', region_col='region_id', logger=None):
    """
    Apply moving average smoothing to the 'usdprice' column.
    Args:
        gdf (pd.DataFrame): GeoDataFrame containing the data.
        window (int): Window size for the moving average.
        commodity_col (str): Column name for commodities.
        region_col (str): Column name for regions.
        logger (logging.Logger): Logger for logging messages.
    Returns:
        pd.DataFrame: DataFrame with smoothed 'usdprice'.
    """
    try:
        logger.info(f"Applying moving average smoothing with window size {window}.")
        gdf = gdf.sort_values(['commodity', 'region_id', 'date'])
        gdf['usdprice'] = gdf.groupby(['commodity', 'region_id'])['usdprice'].transform(lambda x: x.rolling(window, min_periods=1, center=True).mean())
        logger.info("Smoothing applied successfully.")
        return gdf
    except Exception as e:
        logger.error(f"Failed to apply smoothing: {e}")
        raise

# --------------------------- Data Processing Functions ---------------------------

def load_and_debug_geojson(filepath, logger):
    try:
        logger.info(f"Loading GeoJSON data from {filepath}.")
        gdf = gpd.read_file(filepath)

        # Convert date column to datetime
        gdf['date'] = pd.to_datetime(gdf['date'], errors='coerce')
        logger.debug("Converted 'date' to datetime.")

        # Assign region_id from 'admin1'
        if 'admin1' in gdf.columns:
            gdf['region_id'] = gdf['admin1']
            logger.info("'region_id' column assigned using 'admin1'.")
        else:
            logger.error("'admin1' column not found in GeoJSON data.")
            sys.exit(1)

        # Drop duplicates
        initial_count = len(gdf)
        gdf.drop_duplicates(inplace=True)
        final_count = len(gdf)
        logger.info(f"Dropped {initial_count - final_count} duplicate rows.")
        logger.info(f"GeoJSON data loaded with {len(gdf)} records.")

        # Debug: Print out the columns present in the dataset
        logger.debug(f"Columns in the dataset: {gdf.columns}")

        # Check if 'admin1' and 'commodity' exist
        if 'admin1' not in gdf.columns or 'commodity' not in gdf.columns:
            raise KeyError("Required columns 'admin1' or 'commodity' are missing from the dataset.")

        return gdf

    except KeyError as e:
        logger.error(f"Column missing in data: {e}")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Failed to load GeoJSON data: {e}")
        sys.exit(1)

def identify_duplicates(gdf, logger):
    # Check for duplicates in the data based on 'admin1', 'commodity', and 'date'
    duplicate_entries = gdf[gdf.duplicated(subset=['admin1', 'commodity', 'date'], keep=False)]
    if not duplicate_entries.empty:
        logger.info(f"Found {len(duplicate_entries)} duplicate entries.")
        logger.debug(f"Duplicate entries:\n{duplicate_entries}")
    else:
        logger.info("No duplicate entries found.")

    return duplicate_entries

def handle_duplicates(gdf, logger):
    # Separate numeric and non-numeric columns, excluding 'admin1', 'date', and 'commodity' from non-numeric columns
    numeric_cols = gdf.select_dtypes(include=['number']).columns
    non_numeric_cols = gdf.select_dtypes(exclude=['number']).columns.difference(['admin1', 'date', 'commodity'])

    # Group by 'admin1', 'commodity', and 'date', calculate mean for numeric columns
    gdf_numeric = gdf.groupby(['admin1', 'commodity', 'date'])[numeric_cols].mean().reset_index()

    # For non-numeric columns, take the first value
    gdf_non_numeric = gdf.groupby(['admin1', 'commodity', 'date'])[non_numeric_cols].first().reset_index()

    # Merge numeric and non-numeric data back together
    gdf = pd.merge(gdf_numeric, gdf_non_numeric, on=['admin1', 'commodity', 'date'])

    logger.info("Handled duplicates by averaging numeric columns and keeping first non-numeric values.")
    return gdf

def create_unified_regime(gdf, exchange_rate_regime_column, regimes_to_unify, new_regime_name, logger):
    """
    Create a unified regime by combining specified regimes.
    """
    try:
        gdf['regime'] = gdf[exchange_rate_regime_column].replace(regimes_to_unify, new_regime_name)
        logger.info(f"Unified regime '{new_regime_name}' created.")
        return gdf
    except Exception as e:
        logger.error(f"Failed to create unified regime: {e}")
        sys.exit(1)

def create_spatial_weights(gdf, k, logger):
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

def save_spatial_weights(gdf, w, output_path, logger):
    """
    Save the spatial weights matrix in JSON format.
    """
    spatial_weights = {}
    try:
        for region_idx, neighbors in w.neighbors.items():
            region_id = gdf.iloc[region_idx]['region_id']
            spatial_weights[region_id] = [gdf.iloc[n]['region_id'] for n in neighbors]

        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, 'w') as f:
            json.dump(spatial_weights, f, indent=2)
        logger.info(f"Spatial weights saved to {output_path}.")
    except Exception as e:
        logger.error(f"Failed to save spatial weights to '{output_path}': {e}")

def save_flow_map(gdf, w, output_path, logger):
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
                flow_data.append({
                    'source': source_id,
                    'source_lat': source_geom.y,
                    'source_lng': source_geom.x,
                    'target': target_id,
                    'target_lat': target_geom.y,
                    'target_lng': target_geom.x,
                    'weight': 1  # Assuming binary weights; adjust if weights have different meaning
                })

        output_path.parent.mkdir(parents=True, exist_ok=True)
        pd.DataFrame(flow_data).to_csv(output_path, index=False)
        logger.info(f"Flow map saved to {output_path}.")
    except Exception as e:
        logger.error(f"Failed to save flow map to '{output_path}': {e}")

def save_average_prices(gdf, output_path, time_column, logger):
    """
    Save average prices for each region and date in CSV format.
    """
    try:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        average_prices = gdf.groupby(['region_id', time_column])['usdprice'].mean().reset_index().rename(columns={'usdprice': 'avg_usdprice'})
        average_prices.to_csv(output_path, index=False)
        logger.info(f"Average prices saved to {output_path}.")
    except Exception as e:
        logger.error(f"Failed to save average prices to '{output_path}': {e}")

def calculate_spatial_lag(gdf, w, variable, logger):
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

def run_ridge_regression(X, y, alpha, logger):
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

def calculate_p_values(model, X, y, logger):
    """
    Calculate p-values for Ridge regression coefficients.
    Note: Ridge regression does not provide p-values directly. This is an approximation.
    """
    try:
        mse = mean_squared_error(y, model.predict(X))
        X_with_const = np.hstack([np.ones((X.shape[0], 1)), X])
        inv = np.linalg.inv(X_with_const.T @ X_with_const)
        var_b = mse * inv.diagonal()
        t_stat = model.coef_ / np.sqrt(var_b[1:])  # Exclude intercept
        p_values = 2 * (1 - stats.t.cdf(np.abs(t_stat), df=len(y) - X.shape[1] - 1))
        logger.debug("P-values calculated for Ridge regression coefficients.")
        return p_values
    except Exception as e:
        logger.error(f"Failed to calculate p-values: {e}")
        raise

def calculate_vif(X, logger):
    """
    Calculate Variance Inflation Factor (VIF) for the features to assess multicollinearity.
    """
    try:
        if X.shape[1] <= 1:
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

def calculate_moran(residual, w, logger):
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

def run_spatial_analysis(gdf, commodity, regime, params, logger):
    """
    Perform spatial analysis for a specific commodity and exchange rate regime.
    """
    try:
        # Subset the data for the given commodity and regime
        gdf_subset = gdf[
            (gdf['commodity'].str.lower() == commodity.lower()) & 
            (gdf['regime'].str.lower() == regime.lower())
        ].copy()

        if len(gdf_subset) < params['min_regions']:
            logger.warning(f"Insufficient observations for '{commodity}' in '{regime}' regime. Skipping.")
            return None

        # Ensure data is sorted by region and time
        gdf_subset = gdf_subset.sort_values(['region_id', params['time_column']])

        # Create spatial weights
        w = create_spatial_weights(gdf_subset, params['initial_k'], logger)

        # Calculate spatial lag of 'usdprice' (seasonally adjusted price)
        gdf_subset['spatial_lag_price'] = calculate_spatial_lag(gdf_subset, w, 'usdprice', logger)

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
        model = run_ridge_regression(X_scaled, y, params['ridge_alpha'], logger)

        # Calculate additional metrics
        p_values = calculate_p_values(model, X_scaled, y, logger)
        vif = calculate_vif(X, logger)
        residual = y - model.predict(X_scaled)
        moran_i = calculate_moran(residual, w, logger)

        # Prepare the residual DataFrame
        residual_df = gdf_subset[['region_id', params['time_column']]].copy()
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
    gdf, commodity, regime, params, logger = args
    return run_spatial_analysis(gdf, commodity, regime, params, logger)

def aggregate_residuals(results, time_column, logger):
    """
    Aggregate residuals from all analysis results.
    """
    try:
        residual_list = []
        for r in results:
            commodity = r['commodity']
            regime = r['regime']
            for res in r['residual']:
                residual_list.append({
                    'region_id': res['region_id'],
                    time_column: res[time_column],
                    'commodity': commodity,
                    'regime': regime,
                    'residual': res['residual']
                })

        residual_df = pd.DataFrame(residual_list)

        # Aggregate residual by taking the mean to ensure uniqueness
        residual_agg = residual_df.groupby(['region_id', time_column, 'commodity', 'regime']).agg({
            'residual': 'mean'
        }).reset_index()

        logger.info("Residuals aggregated successfully.")
        return residual_agg
    except Exception as e:
        logger.error(f"Failed to aggregate residuals: {e}")
        raise

def simplify_geometries(gdf, tolerance, logger):
    """
    Simplify geometries to reduce GeoJSON size.
    """
    try:
        logger.info("Simplifying geometries to reduce GeoJSON size.")
        gdf['geometry'] = gdf['geometry'].simplify(tolerance=tolerance, preserve_topology=True)
        logger.info("Geometries simplified successfully.")
    except Exception as e:
        logger.error(f"Failed to simplify geometries: {e}")

def optimize_data_types(gdf, logger):
    """
    Optimize data types for memory efficiency.
    """
    try:
        logger.info("Optimizing data types for memory efficiency.")
        # Downcast float columns
        float_cols = gdf.select_dtypes(include=['float64']).columns
        gdf[float_cols] = gdf[float_cols].astype('float32')

        # Downcast integer columns
        int_cols = gdf.select_dtypes(include=['int64']).columns
        gdf[int_cols] = gdf[int_cols].astype('int32')

        logger.info("Data types optimized successfully.")
    except Exception as e:
        logger.error(f"Failed to optimize data types: {e}")

def select_essential_columns(gdf, required_columns, logger):
    """
    Select essential columns for the final GeoJSON.
    """
    try:
        logger.info("Selecting essential columns for the final GeoJSON.")
        missing_columns = [col for col in required_columns if col not in gdf.columns]
        if missing_columns:
            logger.warning(f"The following required columns are missing and will be filled with default values: {missing_columns}")
            for col in missing_columns:
                if col in ['usdprice', 'conflict_intensity']:
                    gdf[col] = np.nan  # Assign NaN for missing numerical columns
                elif col in ['commodity', 'regime']:
                    gdf[col] = 'Unknown'  # Assign 'Unknown' for missing categorical columns
                elif col == 'residual':
                    gdf[col] = 0  # Assign 0 for missing residual

        # Ensure 'residual' is numeric
        gdf['residual'] = pd.to_numeric(gdf['residual'], errors='coerce').fillna(0)

        # Select columns
        gdf_final = gdf[required_columns].copy()
        logger.info("Essential columns selected.")

        return gdf_final
    except Exception as e:
        logger.error(f"Failed to select essential columns: {e}")
        raise

def save_enhanced_geojson(gdf, output_path, logger):
    """
    Save the modified GeoDataFrame with residuals to a new GeoJSON file.
    """
    try:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        logger.info(f"Saving enhanced GeoJSON to '{output_path}'.")
        gdf.to_file(output_path, driver='GeoJSON')
        logger.info(f"Enhanced GeoJSON saved successfully.")
    except Exception as e:
        logger.error(f"Failed to save enhanced GeoJSON to '{output_path}': {e}")

def save_analysis_results(results, output_path, logger):
    """
    Save the analysis results to a JSON file.
    """
    try:
        output_path.parent.mkdir(parents=True, exist_ok=True)
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
        with open(output_path, 'w') as f:
            json.dump(results_with_str_timestamps, f, indent=4)
        logger.info(f"Results saved to {output_path}.")

        # Validate that residuals are present
        residuals_present = any(
            analysis.get('residual') for analysis in results_with_str_timestamps
        )
        if residuals_present:
            logger.info("Residuals are present in the analysis results.")
        else:
            logger.warning("No residuals found in the analysis results.")

    except Exception as e:
        logger.error(f"Failed to save results to '{output_path}': {e}")

# --------------------------- Main Function ---------------------------

def main():
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
    ENHANCED_GEOJSON = PROCESSED_DATA_DIR / "enhanced_unified_data_with_residual.geojson"
    SPATIAL_ANALYSIS_RESULTS = Path(FILES['spatial_analysis_results'])
    SPATIAL_WEIGHTS_JSON = RESULTS_DIR / "spatial_weights" / "spatial_weights.json"

    PARAMS = config['parameters']
    FREQUENCY = PARAMS.get('frequency', 'M')  # Default to monthly if not specified

    LOGGING_CONFIG = config['logging']
    LOG_LEVEL = LOGGING_CONFIG.get('level', 'INFO')
    LOG_FORMAT = LOGGING_CONFIG.get('format', '%(asctime)s - %(levelname)s - %(message)s')

    # Setup logging
    logger = setup_logging(LOGS_DIR, LOG_LEVEL, LOG_FORMAT)

    # Ensure necessary output directories exist
    for directory in [
        RESULTS_DIR / "ecm",
        RESULTS_DIR / "spatial_weights",
        RESULTS_DIR / "choropleth_data",
        RESULTS_DIR / "network_data",
        PROCESSED_DATA_DIR
    ]:
        directory.mkdir(parents=True, exist_ok=True)

    # Step 1: Load the GeoJSON data
    gdf = load_and_debug_geojson(SPATIAL_GEOJSON, logger)

    # Identify duplicates
    duplicate_entries = identify_duplicates(gdf, logger)

    # Handle duplicates (averaging numeric columns)
    if not duplicate_entries.empty:
        gdf = handle_duplicates(gdf, logger)

    # Step 2: Apply seasonal adjustment and align frequency
    gdf = apply_seasonal_adjustment(gdf, frequency=FREQUENCY, logger=logger)

    # Step 3: Apply smoothing to reduce volatility
    gdf = apply_smoothing(gdf, window=3, logger=logger)  # You can adjust the window size as needed

    # Step 4: Create the unified regime
    gdf = create_unified_regime(
        gdf,
        PARAMS['exchange_rate_regime_column'],
        PARAMS['regimes_to_unify'],
        PARAMS['new_regime_name'],
        logger
    )

    # Only keep the unified regime
    gdf = gdf[gdf['regime'] == PARAMS['new_regime_name']].copy()
    logger.info(f"Working exclusively with the unified regime: {PARAMS['new_regime_name']}")

    # Step 5: Prepare arguments for parallel processing
    unique_combinations = gdf[['commodity']].drop_duplicates()

    logger.info(f"Found {len(unique_combinations)} unique commodities for the unified regime.")

    args_list = [
        (gdf, row['commodity'], PARAMS['new_regime_name'], PARAMS, logger)
        for _, row in unique_combinations.iterrows()
    ]

    # Step 6: Run spatial analysis in parallel
    results = []
    max_workers = os.cpu_count() - 1 if os.cpu_count() > 1 else 1  # Reserve one core
    with ProcessPoolExecutor(max_workers=max_workers) as executor:
        future_to_args = {executor.submit(run_spatial_analysis, *args): args for args in args_list}
        for future in as_completed(future_to_args):
            args = future_to_args[future]
            commodity = args[1]
            try:
                result = future.result()
                if result is not None:
                    results.append(result)
            except Exception as exc:
                logger.error(f"Analysis for '{commodity}' in unified regime generated an exception: {exc}")

    # Step 7: Aggregate residuals
    if results:
        residual_agg = aggregate_residuals(results, PARAMS['time_column'], logger)

        # Merge aggregated residual into gdf
        gdf_merged = gdf.merge(
            residual_agg,
            on=['region_id', PARAMS['time_column'], 'commodity', 'regime'],
            how='left'
        )

        # Convert merged DataFrame to GeoDataFrame
        gdf_merged = gpd.GeoDataFrame(gdf_merged, geometry='geometry')

        # Replace NaN residual with 0 or another appropriate value
        gdf_merged['residual'] = gdf_merged['residual'].fillna(0)

        # Verify the merge
        original_count = len(gdf)
        merged_count = len(gdf_merged)
        if original_count != merged_count:
            logger.warning(f"Record count mismatch: {original_count} vs {merged_count}")
        duplicates = gdf_merged.duplicated(subset=['region_id', PARAMS['time_column'], 'commodity', 'regime']).sum()
        if duplicates > 0:
            logger.warning(f"There are {duplicates} duplicate residual entries after aggregation.")
        else:
            logger.info("No duplicate residual entries found after aggregation.")
    else:
        logger.error("No residual to process.")
        gdf_merged = gdf.copy()
        gdf_merged['residual'] = np.nan
        gdf_merged = gpd.GeoDataFrame(gdf_merged, geometry='geometry')

    # Step 8: Simplify geometries and optimize data types
    simplify_geometries(gdf_merged, tolerance=0.01, logger=logger)
    optimize_data_types(gdf_merged, logger)

    # Step 9: Select essential columns for the final GeoJSON
    required_columns = [
        'region_id', PARAMS['time_column'], 'usdprice', 
        'conflict_intensity', 'residual', 'commodity', 'regime', 'geometry'
    ]
    gdf_final = select_essential_columns(gdf_merged, required_columns, logger)

    # Step 10: Save the modified GeoDataFrame with residuals to a new GeoJSON file
    save_enhanced_geojson(gdf_final, ENHANCED_GEOJSON, logger)

    # Step 11: Save spatial weights, flow maps, and average prices
    try:
        # Create spatial weights for the entire dataset
        w_full = create_spatial_weights(gdf_final, PARAMS['initial_k'], logger)
        save_spatial_weights(gdf_final, w_full, SPATIAL_WEIGHTS_JSON, logger)
    except Exception as e:
        logger.error(f"Failed to save spatial weights: {e}")

    try:
        save_flow_map(gdf_final, w_full, RESULTS_DIR / "network_data" / "flow_maps.csv", logger)
    except Exception as e:
        logger.error(f"Failed to save flow maps: {e}")

    try:
        save_average_prices(gdf_final, RESULTS_DIR / "choropleth_data" / "average_prices.csv", PARAMS['time_column'], logger)
    except Exception as e:
        logger.error(f"Failed to save average prices: {e}")

    # Step 12: Save the analysis results to JSON
    save_analysis_results(results, SPATIAL_ANALYSIS_RESULTS, logger)

    logger.info("Spatial analysis pipeline completed successfully.")

if __name__ == "__main__":
    main()
