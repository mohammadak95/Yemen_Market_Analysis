# project/price_differential_analysis/price_differential_model_v2.py

import json
import pandas as pd
import numpy as np
import geopandas as gpd
from statsmodels.tsa.stattools import adfuller, kpss, coint
import statsmodels.api as sm
import logging
from pathlib import Path
import multiprocessing as mp
import warnings
from scipy.spatial.distance import euclidean
from scipy.stats import pearsonr
import yaml
import traceback
from datetime import datetime

# Additional Imports for Enhanced Functionality
from linearmodels.panel import RandomEffects
from linearmodels.iv import IV2SLS
from joblib import Memory
from statsmodels.stats.diagnostic import het_breuschpagan, linear_reset
from statsmodels.stats.stattools import jarque_bera, durbin_watson
from statsmodels.stats.outliers_influence import variance_inflation_factor
from statsmodels.tsa.seasonal import seasonal_decompose

# --------------------------- Configuration and Setup ---------------------------

# Load configuration
def load_config(config_path='project/config/config.yaml'):
    try:
        with open(config_path, 'r') as file:
            config = yaml.safe_load(file)
        return config
    except Exception as e:
        print(f"Failed to load configuration file: {e}")
        raise

config = load_config()

# Suppress warnings for cleaner logs
warnings.filterwarnings("ignore")

# Setup caching
memory = Memory(location='cache', verbose=0)

# Setup logging based on config
directories = config.get('directories', {})
files = config.get('files', {})
parameters = config.get('parameters', {})
logging_config = parameters.get('logging', {})

# Extract logging parameters
log_level = logging_config.get('level', 'DEBUG').upper()  # Set to 'DEBUG' for detailed logs
log_format = logging_config.get('format', '%(asctime)s - %(levelname)s - %(message)s')

# Define directory paths from config
data_dir = Path(directories.get('data_dir', 'project/data/'))
processed_data_dir = Path(directories.get('processed_data_dir', 'project/data/processed/'))
results_dir = Path(directories.get('results_dir', 'results/'))
log_dir = Path(directories.get('logs_dir', 'results/logs/'))
external_data_dir = Path(directories.get('external_data_dir', 'external_data/'))

# Create necessary directories
log_dir.mkdir(parents=True, exist_ok=True)
price_diff_results_dir = results_dir / 'price_diff_results'
price_diff_results_dir.mkdir(parents=True, exist_ok=True)

# Define file paths from config
spatial_geojson = Path(files.get('spatial_geojson', 'project/data/processed/unified_data.geojson'))
enhanced_geojson = Path(files.get('enhanced_geojson', 'project/data/processed/enhanced_unified_data_with_residuals.geojson'))
spatial_analysis_results = Path(files.get('spatial_analysis_results', 'results/spatial_analysis_results.json'))
ecm_results = Path(files.get('ecm_results', 'results/ecm/ecm_analysis_results.json'))
spatial_weights_json = Path(files.get('spatial_weights_json', 'results/spatial_weights/spatial_weights.json'))
naturalearth_lowres = Path(files.get('naturalearth_lowres', 'external_data/naturalearth_lowres/ne_110m_admin_0_countries.shp'))

# Initialize logging
logging.basicConfig(
    level=log_level,  # Use level from config
    format=log_format,
    handlers=[
        logging.FileHandler(log_dir / 'price_differential_analysis.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Configuration parameters from config.yaml
MIN_COMMON_DATES = parameters.get('min_common_dates', 20)
LAG_PERIODS = parameters.get('lag_periods', 2)
GRANGER_MAX_LAGS = parameters.get('granger_max_lags', 4)
DISTANCE_THRESHOLD = parameters.get('distance_threshold', 200)
COMMODITIES = parameters.get('commodities', [])
EXCHANGE_RATE_REGIMES = parameters.get('exchange_rate_regimes', ['north', 'south', 'unified'])
STATIONARITY_SIGNIFICANCE_LEVEL = parameters.get('stationarity_significance_level', 0.05)
COINTEGRATION_SIGNIFICANCE_LEVEL = parameters.get('cointegration_significance_level', 0.05)
RIDGE_ALPHA = parameters.get('ridge_alpha', 1.0)
MAX_EPOCHS = parameters.get('max_epochs', 1000)
LEARNING_RATE = parameters.get('learning_rate', 0.01)
MIN_REGIONS = parameters.get('min_regions', 5)
SPATIAL_THRESHOLD_MULTIPLIER = parameters.get('spatial_weights', {}).get('threshold_multiplier', 1)
MIN_NEIGHBORS = parameters.get('min_neighbors', 2)
REGIMES_TO_UNIFY = parameters.get('regimes_to_unify', ['north', 'south'])
NEW_REGIME_NAME = parameters.get('new_regime_name', 'unified')
EXCHANGE_RATE_REGIME_COLUMN = parameters.get('exchange_rate_regime_column', 'exchange_rate_regime')
REGION_IDENTIFIER = parameters.get('region_identifier', 'admin1')
TIME_COLUMN = parameters.get('time_column', 'date')
LAG_VARIABLE = parameters.get('lag_variable', 'usdprice')

# --------------------------- Data Transformation Functions ---------------------------

def handle_duplicates(df):
    """
    Handle duplicates by averaging numeric columns.
    """
    try:
        # Identify numeric and non-numeric columns
        numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
        non_numeric_cols = df.select_dtypes(exclude=['number']).columns.tolist()
        
        # Exclude grouping columns from non-numeric columns
        grouping_cols = [REGION_IDENTIFIER, 'commodity', TIME_COLUMN, EXCHANGE_RATE_REGIME_COLUMN]
        non_numeric_cols = [col for col in non_numeric_cols if col not in grouping_cols]
        
        # Group by the specified columns and calculate mean for numeric columns
        df_numeric = df.groupby(grouping_cols)[numeric_cols].mean().reset_index()
        
        # For non-numeric columns, take the first value
        df_non_numeric = df.groupby(grouping_cols)[non_numeric_cols].first().reset_index()
        
        # Merge numeric and non-numeric data back together
        df = pd.merge(df_numeric, df_non_numeric, on=grouping_cols, how='left')
        
        logger.info("Handled duplicates by averaging numeric columns and keeping first non-numeric values.")
        return df
    except Exception as e:
        logger.error(f"Failed to handle duplicates: {e}")
        raise

def perform_seasonal_adjustment_on_group(group, freq='M'):
    """
    Perform seasonal adjustment on a single group.
    """
    try:
        group = group.sort_values(TIME_COLUMN)
        group.set_index(TIME_COLUMN, inplace=True)

        # Check if sufficient data points are available
        if group.shape[0] < 2 * 12:  # At least two years of monthly data
            logger.warning(f"Insufficient data points for seasonal adjustment for Commodity: {group['commodity'].iloc[0]}, Region: {group[REGION_IDENTIFIER].iloc[0]}. Required: >=24, Available: {group.shape[0]}. Skipping adjustment.")
            return group.reset_index()

        # Perform seasonal decomposition
        decomposition = seasonal_decompose(group['usdprice'], model='additive', period=12, extrapolate_trend='freq')

        # Adjust the 'usdprice' by removing the seasonal component
        group['usdprice'] = group['usdprice'] - decomposition.seasonal

        group.reset_index(inplace=True)
        logger.debug(f"Seasonal adjustment successful for Commodity: {group['commodity'].iloc[0]}, Region: {group[REGION_IDENTIFIER].iloc[0]}.")
        return group

    except Exception as e:
        logger.error(f"Seasonal adjustment failed for Commodity: {group['commodity'].iloc[0]}, Region: {group[REGION_IDENTIFIER].iloc[0]}. Error: {e}")
        return group.reset_index()  # Return the original group without adjustment

def apply_seasonal_adjustment(df, frequency='M'):
    """
    Apply seasonal adjustment to the 'usdprice' column for each commodity-region group.
    """
    try:
        adjusted_groups = []
        grouped = df.groupby(['commodity', REGION_IDENTIFIER])
        total_groups = len(grouped)
        processed_groups = 0

        logger.info(f"Total groups to process for seasonal adjustment: {total_groups}")

        for (commodity, region), group in grouped:
            logger.debug(f"Processing Commodity: {commodity}, Region: {region}, Records: {len(group)}")

            # Drop rows with null 'usdprice' or 'date'
            group = group.dropna(subset=['usdprice', TIME_COLUMN])
            if group.empty:
                logger.warning(f"All records have null 'usdprice' or 'date' for Commodity: {commodity}, Region: {region}. Skipping adjustment.")
                continue

            adjusted = perform_seasonal_adjustment_on_group(group, freq=frequency)

            adjusted_groups.append(adjusted)
            processed_groups += 1

        logger.info(f"Processed {processed_groups} out of {total_groups} groups.")

        if not adjusted_groups:
            logger.error("No groups were adjusted. 'adjusted_groups' is empty.")
            raise ValueError("No groups to concatenate.")

        df_adjusted = pd.concat(adjusted_groups, ignore_index=True)
        logger.info("Seasonal adjustment applied successfully.")
        return df_adjusted

    except Exception as e:
        logger.error(f"Failed to apply seasonal adjustment: {e}")
        raise

def apply_smoothing(df, window=3):
    """
    Apply moving average smoothing to the 'usdprice' column.
    """
    try:
        logger.info(f"Applying moving average smoothing with window size {window}.")
        df = df.sort_values(['commodity', REGION_IDENTIFIER, TIME_COLUMN])
        df['usdprice'] = df.groupby(['commodity', REGION_IDENTIFIER])['usdprice'].transform(lambda x: x.rolling(window, min_periods=1, center=True).mean())
        logger.info("Smoothing applied successfully.")
        return df
    except Exception as e:
        logger.error(f"Failed to apply smoothing: {e}")
        raise

# --------------------------- Data Loading and Preprocessing ---------------------------

@memory.cache  # Cached to optimize repeated data loading
def load_data(file_path):
    """Load data from GeoJSON file using GeoPandas and preprocess it."""
    logger.info(f"Loading data from {file_path}")
    try:
        gdf = gpd.read_file(file_path)
        df = pd.DataFrame(gdf.drop(columns='geometry'))
        logger.info(f"Loaded GeoJSON with {len(df)} records.")

        # Convert 'date' to datetime
        df[TIME_COLUMN] = pd.to_datetime(df[TIME_COLUMN])

        # Exclude 'Amanat Al Asimah' in a case-insensitive manner
        amanat_mask = df[REGION_IDENTIFIER].str.lower() != 'amanat al asimah'
        if amanat_mask.sum() < len(df):
            excluded_count = len(df) - amanat_mask.sum()
            df = df[amanat_mask]
            logger.info(f"Excluded {excluded_count} records from 'Amanat Al Asimah'.")
        else:
            logger.info("No records found for 'Amanat Al Asimah'.")

        # Filter commodities based on config
        if COMMODITIES:
            initial_count = len(df)
            # Ensure case-insensitive matching by converting both to lower case
            df['commodity_lower'] = df['commodity'].str.lower()
            commodities_lower = [c.lower() for c in COMMODITIES]
            df = df[df['commodity_lower'].isin(commodities_lower)]
            filtered_count = len(df)
            logger.info(f"Filtered data for specified commodities. Number of records: {filtered_count} (filtered out {initial_count - filtered_count})")
            # Drop the auxiliary lower case column
            df = df.drop(columns=['commodity_lower'])
        else:
            logger.warning("No commodities specified in config. Using all available commodities.")

        # Unify exchange rate regimes
        if REGIMES_TO_UNIFY and NEW_REGIME_NAME:
            logger.info(f"Unifying exchange rate regimes: {REGIMES_TO_UNIFY} into '{NEW_REGIME_NAME}'")
            original_unique_regimes = df[EXCHANGE_RATE_REGIME_COLUMN].unique().tolist()
            df.loc[df[EXCHANGE_RATE_REGIME_COLUMN].isin(REGIMES_TO_UNIFY), EXCHANGE_RATE_REGIME_COLUMN] = NEW_REGIME_NAME
            unified_unique_regimes = df[EXCHANGE_RATE_REGIME_COLUMN].unique().tolist()
            logger.info(f"Exchange rate regimes before unification: {original_unique_regimes}")
            logger.info(f"Exchange rate regimes after unification: {unified_unique_regimes}")

        # Filter exchange rate regimes based on config
        initial_count = len(df)
        df = df[df[EXCHANGE_RATE_REGIME_COLUMN].isin(EXCHANGE_RATE_REGIMES)]
        filtered_count = len(df)
        logger.info(f"Filtered data for exchange rate regimes: {EXCHANGE_RATE_REGIMES}. Number of records: {filtered_count} (filtered out {initial_count - filtered_count})")

        # Log available commodities after filtering
        available_commodities = df['commodity'].unique().tolist()
        logger.info(f"Available commodities after filtering: {available_commodities}")

        # **New Logging: Log DataFrame Columns and Sample Data**
        logger.debug(f"DataFrame columns after filtering: {df.columns.tolist()}")
        logger.debug(f"Sample data:\n{df.head()}")

        # **New Step: Handle duplicates by averaging numeric columns**
        df = handle_duplicates(df)

        # **New Step: Apply seasonal adjustment**
        df = apply_seasonal_adjustment(df, frequency='M')

        # **New Step: Apply smoothing**
        df = apply_smoothing(df, window=3)

        # Reset index to TIME_COLUMN if not already
        if df.index.name != TIME_COLUMN:
            df.set_index(TIME_COLUMN, inplace=True)

        return df
    except Exception as e:
        logger.error(f"Failed to load and preprocess data: {e}")
        raise

# --------------------------- Analysis Functions ---------------------------

def prepare_market_data(df, base_market):
    """Prepare market data for analysis for a specific base market."""
    logger.info(f"Preparing market data for base market: {base_market}")
    # Ensure exchange_rate_regime is unified
    df = df[df[EXCHANGE_RATE_REGIME_COLUMN] == NEW_REGIME_NAME]

    base_data = df[df[REGION_IDENTIFIER] == base_market]
    other_markets = df[df[REGION_IDENTIFIER] != base_market]

    market_data = {}
    for admin1 in [base_market] + other_markets[REGION_IDENTIFIER].unique().tolist():
        market_df = df[df[REGION_IDENTIFIER] == admin1]
        for commodity in market_df['commodity'].unique():
            commodity_df = market_df[market_df['commodity'] == commodity]
            if not commodity_df.empty:
                # Group by date and aggregate to ensure unique dates
                commodity_df = commodity_df.groupby(commodity_df.index).agg({
                    'usdprice': 'mean',  # Aggregating usdprice
                    'conflict_intensity': 'mean',  # Aggregating conflict_intensity
                    'longitude': 'first',  # Assuming longitude is consistent
                    'latitude': 'first'  # Assuming latitude is consistent
                })
                key = (admin1, commodity)
                market_data[key] = {
                    'date': commodity_df.index.to_numpy(),
                    'usdprice': commodity_df['usdprice'].to_numpy(),
                    'conflict_intensity': commodity_df['conflict_intensity'].to_numpy(),
                    'longitude': commodity_df['longitude'].iloc[0],
                    'latitude': commodity_df['latitude'].iloc[0]
                }
                logger.debug(f"Prepared data for {key}: {len(commodity_df)} records")

    logger.info(f"Prepared market data for {len(market_data)} (market, commodity) pairs")
    return market_data

def run_stationarity_tests(series):
    """Run ADF and KPSS tests on a time series."""
    logger.debug("Running stationarity tests")
    try:
        # Convert to pandas Series if it's a NumPy array
        if isinstance(series, np.ndarray):
            series = pd.Series(series)
            logger.debug("Converted NumPy array to pandas Series for stationarity tests.")

        # Remove NaN and infinite values
        series = series.replace([np.inf, -np.inf], np.nan).dropna()
        if series.empty:
            logger.warning("Series is empty after removing NaNs and infinite values.")
            return None

        adf_result = adfuller(series, autolag='AIC')
        kpss_result = kpss(series, regression='c', nlags='auto')

        return {
            'ADF': {'statistic': float(adf_result[0]), 'p-value': float(adf_result[1])},
            'KPSS': {'statistic': float(kpss_result[0]), 'p-value': float(kpss_result[1])}
        }
    except Exception as e:
        logger.warning(f"Error in stationarity tests: {str(e)}")
        logger.debug(f"Detailed error information: {traceback.format_exc()}")
        return None

def calculate_price_differential(price_i, price_j):
    """Calculate price differential between two markets."""
    # Ensure no zero or negative prices
    valid_mask = (price_i > 0) & (price_j > 0)
    price_i = price_i[valid_mask]
    price_j = price_j[valid_mask]
    logger.debug(f"Calculated valid price differentials: {len(price_i)} pairs")
    if len(price_i) == 0:
        return np.array([]), np.array([])
    price_diff = np.log(price_i) - np.log(price_j)
    return price_diff, valid_mask

def calculate_distance(coord1, coord2):
    """Calculate Euclidean distance between two coordinates."""
    try:
        distance = euclidean(coord1, coord2)
        logger.debug(f"Calculated distance: {distance}")
        return distance
    except Exception as e:
        logger.error(f"Error calculating distance between {coord1} and {coord2}: {e}")
        return np.nan

def analyze_market_pair(args):
    """Analyze a pair of markets."""
    try:
        base_market, base_data, other_market, other_data, commodity = args

        if base_data is None or other_data is None:
            logger.warning(f"Missing data for {base_market} or {other_market} on {commodity}. Skipping.")
            return None

        common_dates = np.intersect1d(base_data['date'], other_data['date'])
        logger.debug(f"Found {len(common_dates)} common dates for {base_market} and {other_market} on {commodity}")

        if len(common_dates) < MIN_COMMON_DATES:
            logger.warning(f"Insufficient common dates ({len(common_dates)}) for {base_market} and {other_market} on {commodity}. Skipping.")
            return None

        mask_base = np.isin(base_data['date'], common_dates)
        mask_other = np.isin(other_data['date'], common_dates)

        price_i = base_data['usdprice'][mask_base]
        price_j = other_data['usdprice'][mask_other]

        logger.debug(f"Price_i length: {len(price_i)}, Price_j length: {len(price_j)}")

        # Ensure both price arrays have the same length
        if len(price_i) != len(price_j):
            logger.warning(f"Mismatched price array lengths for {base_market} and {other_market} on {commodity}: {len(price_i)} vs {len(price_j)}. Skipping.")
            return None

        # Perform Cointegration Test between price_i and price_j
        try:
            coint_t, p_value_coint, critical_values = coint(price_i, price_j)
            cointegration_results = {
                'test_statistic': float(coint_t),
                'p_value': float(p_value_coint),
                'critical_values': {
                    '1%': critical_values[0],
                    '5%': critical_values[1],
                    '10%': critical_values[2]
                }
            }
            logger.debug(f"Cointegration test results: {cointegration_results}")
        except Exception as e:
            logger.error(f"Error performing cointegration test for {base_market} and {other_market} on {commodity}: {e}")
            cointegration_results = None

        price_diff, valid_mask = calculate_price_differential(price_i, price_j)

        if len(price_diff) == 0:
            logger.warning(f"No valid price differentials for {base_market} and {other_market} on {commodity}. Skipping.")
            return None

        # Collect the dates corresponding to the price differentials
        common_dates_prices = common_dates[valid_mask]

        stationarity_results = run_stationarity_tests(price_diff)

        if stationarity_results is None:
            logger.warning(f"Stationarity tests failed for {base_market} and {other_market} on {commodity}. Skipping.")
            return None

        # Ensure conflict_intensity arrays align with common dates
        conflict_base = base_data['conflict_intensity'][mask_base][valid_mask]
        conflict_other = other_data['conflict_intensity'][mask_other][valid_mask]

        logger.debug(f"Conflict_base length: {len(conflict_base)}, Conflict_other length: {len(conflict_other)}")

        # Since price_diff is derived from valid price_i and price_j, conflict arrays should match
        if len(conflict_base) != len(conflict_other):
            logger.warning(f"Conflict intensity arrays do not align for {base_market} and {other_market} on {commodity}. Skipping.")
            return None

        correlation, _ = pearsonr(conflict_base, conflict_other)
        logger.debug(f"Pearson correlation between conflict intensities: {correlation}")

        distance = calculate_distance(
            (base_data['longitude'], base_data['latitude']),
            (other_data['longitude'], other_data['latitude'])
        )

        # Validate distance and correlation
        if not np.isfinite(distance):
            logger.warning(f"Non-finite distance for {base_market} and {other_market} on {commodity}. Skipping.")
            return None
        if not np.isfinite(correlation):
            logger.warning(f"Non-finite conflict correlation for {base_market} and {other_market} on {commodity}. Skipping.")
            return None

        # Extract p-value from ADF test for significance
        p_value_stationarity = stationarity_results['ADF']['p-value']

        # Prepare data for regression
        # Since the price differential is over time, we can perform a simple linear regression over time
        X_reg = np.arange(len(price_diff)).reshape(-1, 1)  # Time index
        y_reg = price_diff

        # Add constant to X_reg
        X_reg = sm.add_constant(X_reg)

        # Run regression
        regression_model = sm.OLS(y_reg, X_reg).fit()

        regression_results = {
            'intercept': float(regression_model.params[0]),
            'slope': float(regression_model.params[1]),
            'r_squared': float(regression_model.rsquared),
            'p_value': float(regression_model.pvalues[1]),  # p-value for slope
            'aic': float(regression_model.aic),
            'bic': float(regression_model.bic)
        }

        # Collect all required data for output
        return {
            'base_market': base_market,
            'other_market': other_market,
            'commodity': commodity,
            'price_differential': {
                'dates': [str(date) for date in common_dates_prices],
                'values': price_diff.tolist()
            },
            'regression_results': regression_results,
            'stationarity_results': stationarity_results,
            'cointegration_results': cointegration_results,
            'diagnostics': {
                'conflict_correlation': float(correlation),
                'common_dates': int(len(common_dates_prices)),
                'distance_km': float(distance)
            }
        }
    except Exception as e:
        logger.error(f"Error in analyze_market_pair: {str(e)}")
        logger.debug(f"Detailed error information: {traceback.format_exc()}")
        return None

def main(file_path):
    logger.info("Starting Price Differential Analysis")

    # Load all data
    df = load_data(file_path)
    logger.info(f"Loaded {len(df)} records from the GeoJSON file")

    # Define the base markets
    desired_base_markets = ['aden', "sana'a"]
    available_base_markets = [market for market in desired_base_markets if market in df[REGION_IDENTIFIER].unique()]

    if not available_base_markets:
        logger.error(f"No desired base markets {desired_base_markets} found in data. Exiting.")
        return

    logger.info(f"Using base markets: {available_base_markets}")

    # Log available commodities for each base market
    available_commodities = df['commodity'].unique().tolist()
    logger.info(f"Available commodities in data: {available_commodities}")

    all_results = {}

    for base_market in available_base_markets:
        logger.info(f"Processing base market: {base_market}")
        market_data = prepare_market_data(df, base_market)
        base_market_data = {k: v for k, v in market_data.items() if k[0] == base_market}
        other_market_data = {k: v for k, v in market_data.items() if k[0] != base_market}

        analysis_args = [
            (base_market, base_market_data.get((base_market, commodity)), other_market, other_data, commodity)
            for (other_market, commodity), other_data in other_market_data.items()
            if (base_market, commodity) in base_market_data
        ]

        # Remove any None entries in analysis_args
        analysis_args = [arg for arg in analysis_args if arg[1] is not None]

        logger.debug(f"First 5 analysis_args entries: {analysis_args[:5]}")

        logger.info(f"Prepared {len(analysis_args)} market pairs for analysis for base market {base_market}")

        if len(analysis_args) == 0:
            logger.warning(f"No valid market pairs for base market {base_market}. Skipping.")
            continue

        # Use all available cores, but limit to number of analysis_args to prevent overuse
        num_cores = min(mp.cpu_count(), len(analysis_args))
        logger.info(f"Using {num_cores} cores for parallel processing")

        # Run analysis in parallel
        with mp.Pool(num_cores) as pool:
            results = pool.map(analyze_market_pair, analysis_args)

        # Filter out None results
        results = [r for r in results if r is not None]
        logger.info(f"Analyzed {len(results)} market pairs for base market {base_market}")

        if len(results) == 0:
            logger.warning(f"No valid analysis results for base market {base_market}. Skipping.")
            continue

        # Organize results by commodity
        commodity_results = {}
        for result in results:
            commodity = result['commodity']
            if commodity not in commodity_results:
                commodity_results[commodity] = []
            commodity_results[commodity].append(result)

        # Indicate which model was used as selected
        selected_model = 'Simple Time Regression with Cointegration Analysis'  # Updated model description

        all_results[base_market] = {
            "commodity_results": commodity_results,
            "selected_model": selected_model
        }

    if not all_results:
        logger.error("No analysis results generated for any base markets. Exiting.")
        return

    # Prepare results without redundant data
    final_results = {
        "markets": all_results
    }

    # Custom default function to handle serialization
    def default(o):
        if isinstance(o, (np.integer, int)):
            return int(o)
        elif isinstance(o, (np.floating, float)):
            return float(o)
        elif isinstance(o, (np.ndarray, list, tuple)):
            return o.tolist()
        elif isinstance(o, (pd.Series, pd.DataFrame)):
            return o.to_dict()
        elif isinstance(o, datetime):
            return o.isoformat()
        else:
            return str(o)
            # raise TypeError(f"Object of type {type(o).__name__} is not JSON serializable")

    # Save all results in a plain JSON file with indentation and sorted keys
    output_file = price_diff_results_dir / "price_differential_results.json"
    try:
        with open(output_file, "w") as f:
            json.dump(final_results, f, default=default, indent=4, sort_keys=True)
        logger.info(f"All results saved to {output_file}")
    except Exception as e:
        logger.error(f"Error saving results to {output_file}: {e}")
        logger.debug(f"Detailed error information: {traceback.format_exc()}")

    # Optionally, validate the JSON output
    try:
        with open(output_file, "r") as f:
            data = json.load(f)
        logger.info("JSON output successfully validated.")
    except json.JSONDecodeError as e:
        logger.error(f"JSON validation failed: {e}")

    logger.info("Price Differential Analysis completed")

if __name__ == "__main__":
    file_path = spatial_geojson  # Correctly get from config
    main(file_path)