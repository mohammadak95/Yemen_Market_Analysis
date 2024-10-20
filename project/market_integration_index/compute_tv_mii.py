# File: compute_tv_mii.py

import pandas as pd
import geopandas as gpd
import numpy as np
import logging
from pathlib import Path
from sklearn.preprocessing import MinMaxScaler
import yaml
import json
from concurrent.futures import ProcessPoolExecutor, as_completed
from statsmodels.tsa.statespace.mlemodel import MLEModel
from statsmodels.tsa.seasonal import seasonal_decompose

# Set up logging
def setup_logging(logs_dir, log_level, log_format):
    logs_dir.mkdir(parents=True, exist_ok=True)
    logging.basicConfig(
        level=log_level,
        format=log_format,
        handlers=[
            logging.FileHandler(logs_dir / "tv_mii_analysis.log"),
            logging.StreamHandler()
        ]
    )
    return logging.getLogger(__name__)

# Load configuration
def load_config(config_path='project/config/config.yaml'):
    try:
        with open(config_path, 'r') as f:
            config = yaml.safe_load(f)
        return config
    except Exception as e:
        logger.error(f"Failed to load configuration file: {e}")
        raise

# Initialize configuration and logger
config = load_config()
logger = setup_logging(
    Path(config['directories']['logs_dir']),
    config['logging']['level'].upper(),
    config['logging']['format']
)

# Configuration parameters
DATA_PATH = Path(config['files']['spatial_geojson'])
RESULTS_DIR = Path(config['directories']['results_dir'])
COMMODITIES = config['parameters']['commodities']
WINDOW_SIZE = config['parameters'].get('rolling_window_size', 12)  # e.g., 12 months
MIN_OBSERVATIONS = config['parameters']['min_common_dates']
FREQUENCY = config['parameters'].get('frequency', 'MS')  # Changed from 'M' to 'MS' to avoid FutureWarning
TIME_COLUMN = config['parameters']['time_column']
REGION_IDENTIFIER = config['parameters']['region_identifier']
EXCHANGE_RATE_REGIME_COLUMN = config['parameters']['exchange_rate_regime_column']

# Ensure results directory exists
RESULTS_DIR.mkdir(parents=True, exist_ok=True)

def load_data():
    """
    Load and preprocess the data, including seasonal adjustment and smoothing.
    """
    try:
        logger.info(f"Loading data from {DATA_PATH}")
        gdf = gpd.read_file(DATA_PATH)  # Adjusted to read GeoJSON format
        gdf[TIME_COLUMN] = pd.to_datetime(gdf[TIME_COLUMN], errors='coerce')
        gdf.sort_values(by=[EXCHANGE_RATE_REGIME_COLUMN, TIME_COLUMN], inplace=True)
        logger.info("Data loaded and sorted successfully.")

        # Filter commodities if specified
        if COMMODITIES:
            gdf = gdf[gdf['commodity'].isin(COMMODITIES)]
            logger.info(f"Filtered data for commodities: {COMMODITIES}")

        # Apply seasonal adjustment and smoothing to 'usdprice'
        logger.info("Applying seasonal adjustment and smoothing to 'usdprice'.")

        # Function to perform seasonal adjustment and smoothing on each group
        def adjust_and_smooth(group):
            # Sort the group by the TIME_COLUMN
            group = group.sort_values(TIME_COLUMN)

            # Aggregate by TIME_COLUMN to remove duplicates
            group = group.groupby(TIME_COLUMN).agg({'usdprice': 'mean'}).reset_index()

            # Set the TIME_COLUMN as the index
            group.set_index(TIME_COLUMN, inplace=True)

            # Ensure the index is a DateTimeIndex with the specified frequency
            try:
                group = group.asfreq(FREQUENCY)
            except ValueError as ve:
                logger.error(f"Frequency '{FREQUENCY}' is invalid: {ve}")
                return group

            # Interpolate missing values to handle NaNs introduced by asfreq()
            group['usdprice'] = group['usdprice'].interpolate(method='linear').ffill().bfill()

            # Check if there are enough data points for seasonal adjustment
            if len(group) < 24:  # Less than 2 years of monthly data
                logger.warning(f"Not enough data for seasonal adjustment for group: {group.name}")
                group['usdprice_adjusted'] = group['usdprice']
            else:
                # Perform seasonal decomposition
                decomposition = seasonal_decompose(group['usdprice'], model='additive', period=12, extrapolate_trend='freq')
                group['usdprice_adjusted'] = group['usdprice'] - decomposition.seasonal

            # Apply moving average smoothing
            group['usdprice_smoothed'] = group['usdprice_adjusted'].rolling(window=3, min_periods=1, center=True).mean()

            # Reset index before returning the group
            group.reset_index(inplace=True)
            return group

        # Apply adjustments per 'commodity' and 'exchange_rate_regime'
        gdf = gdf.groupby(['commodity', EXCHANGE_RATE_REGIME_COLUMN]).apply(adjust_and_smooth).reset_index(drop=True)

        logger.info("Seasonal adjustment and smoothing applied successfully.")

        # Use the smoothed and adjusted 'usdprice' for further analysis
        gdf['usdprice'] = gdf['usdprice_smoothed']

        # Aggregate data by exchange rate regime, date, and commodity
        gdf = gdf.groupby([EXCHANGE_RATE_REGIME_COLUMN, TIME_COLUMN, 'commodity']).agg({'usdprice': 'mean'}).reset_index()
        logger.info("Aggregated data by exchange rate regime, date, and commodity.")

        # Check for any remaining missing values
        if gdf['usdprice'].isnull().any():
            logger.warning("There are still missing values in 'usdprice' after preprocessing. These will be filled with the median value.")
            median_price = gdf['usdprice'].median()
            gdf['usdprice'].fillna(median_price, inplace=True)

        return gdf
    except Exception as e:
        logger.error(f"Error loading and preprocessing data: {e}")
        raise

def prepare_market_pairs(gdf):
    """
    Prepare the north and south as two market pairs with sufficient common data.
    """
    try:
        commodities = gdf['commodity'].unique()
        market_pairs = []

        for commodity in commodities:
            commodity_data = gdf[gdf['commodity'] == commodity]
            north_data = commodity_data[commodity_data[EXCHANGE_RATE_REGIME_COLUMN] == 'north']
            south_data = commodity_data[commodity_data[EXCHANGE_RATE_REGIME_COLUMN] == 'south']

            # Find common dates
            common_dates = np.intersect1d(north_data[TIME_COLUMN].unique(), south_data[TIME_COLUMN].unique())

            if len(common_dates) >= MIN_OBSERVATIONS:
                market_pairs.append({
                    'commodity': commodity,
                    'region_i': 'north',
                    'region_j': 'south',
                    'common_dates': common_dates
                })

        logger.info(f"Prepared {len(market_pairs)} market pairs with sufficient data.")
        return market_pairs
    except Exception as e:
        logger.error(f"Error preparing market pairs: {e}")
        raise

def compute_price_differential(data_i, data_j, common_dates):
    """
    Compute the log price differential between two markets.
    """
    try:
        data_i = data_i[data_i[TIME_COLUMN].isin(common_dates)].set_index(TIME_COLUMN)
        data_j = data_j[data_j[TIME_COLUMN].isin(common_dates)].set_index(TIME_COLUMN)

        # Reindex to ensure alignment
        data_i = data_i.reindex(common_dates)
        data_j = data_j.reindex(common_dates)

        price_i = data_i['usdprice']
        price_j = data_j['usdprice']

        # Ensure no zero or negative prices
        valid_mask = (price_i > 0) & (price_j > 0)
        price_i = price_i[valid_mask]
        price_j = price_j[valid_mask]
        dates = price_i.index

        if len(price_i) == 0 or len(price_j) == 0:
            return None, None

        price_diff = np.log(price_i) - np.log(price_j)
        return price_diff, dates
    except Exception as e:
        logger.error(f"Error computing price differential: {e}")
        return None, None

class BayesianStateSpaceModel(MLEModel):
    def __init__(self, endog):
        super(BayesianStateSpaceModel, self).__init__(endog, k_states=1)
        self['design'] = np.array([[1]])
        self['transition'] = np.array([[1]])
        self['selection'] = np.array([[1]])
        self['state_cov'] = np.array([[1e-5]])
        self.initialize_statespace()  # Initialize statespace properly

    def update(self, params, **kwargs):
        self['obs_cov'] = np.array([[params[0]]])  # Ensure obs_cov is 2D

def estimate_tv_mii(price_diff_series):
    """
    Estimate the Time-Variant Market Integration Index using a Bayesian state-space model.
    """
    try:
        # Drop NaN values (if any)
        price_diff_series = price_diff_series.dropna()
        if len(price_diff_series) == 0:
            return None

        # Initialize the Bayesian state-space model
        model = BayesianStateSpaceModel(price_diff_series)
        initial_params = [np.var(price_diff_series)]  # Initial variance estimate
        results = model.fit(initial_params, method='bfgs', disp=False)

        # Extract the smoothed state estimates
        smoothed_state = results.smoothed_state[0]

        return smoothed_state
    except Exception as e:
        logger.error(f"Error estimating TV-MII: {e}")
        return None

def normalize_index(index_series):
    """
    Normalize the index to a 0–1 range.
    """
    try:
        scaler = MinMaxScaler(feature_range=(0, 1))
        index_series = index_series.reshape(-1, 1)
        index_normalized = scaler.fit_transform(index_series).flatten()
        return index_normalized
    except Exception as e:
        logger.error(f"Error normalizing index: {e}")
        return None

def process_market_pair(pair, gdf):
    """
    Process a single market pair to compute the TV-MII.
    """
    try:
        commodity = pair['commodity']
        region_i = pair['region_i']
        region_j = pair['region_j']
        common_dates = pair['common_dates']

        # Get data for each region
        data_i = gdf[(gdf[EXCHANGE_RATE_REGIME_COLUMN] == region_i) & (gdf['commodity'] == commodity)]
        data_j = gdf[(gdf[EXCHANGE_RATE_REGIME_COLUMN] == region_j) & (gdf['commodity'] == commodity)]

        # Compute price differential
        price_diff, dates = compute_price_differential(data_i, data_j, common_dates)
        if price_diff is None or len(price_diff) < WINDOW_SIZE:
            logger.info(f"Insufficient data for market pair {region_i} and {region_j} for commodity {commodity}")
            return None

        # Estimate time-varying coefficients using Bayesian state-space model
        beta_t = estimate_tv_mii(price_diff)

        if beta_t is None:
            logger.info(f"Failed to estimate TV-MII for {commodity} between {region_i} and {region_j}")
            return None

        # Normalize the index
        tv_mii = normalize_index(beta_t)

        if tv_mii is None:
            return None

        # Prepare results
        result = {
            'commodity': commodity,
            'region_i': region_i,
            'region_j': region_j,
            'dates': dates.strftime('%Y-%m-%d').tolist(),
            'tv_mii': tv_mii.tolist()
        }
        return result
    except Exception as e:
        logger.error(f"Error processing market pair {region_i}-{region_j} for commodity {commodity}: {e}")
        return None

def main():
    # Load data
    gdf = load_data()

    # Prepare market pairs
    market_pairs = prepare_market_pairs(gdf)

    if not market_pairs:
        logger.error("No market pairs with sufficient data to process.")
        return

    # Process each market pair in parallel
    results = []
    with ProcessPoolExecutor() as executor:
        futures = [executor.submit(process_market_pair, pair, gdf) for pair in market_pairs]
        for future in as_completed(futures):
            res = future.result()
            if res:
                results.append(res)

    if not results:
        logger.error("No results were generated.")
        return

    # Save results to JSON
    output_file = RESULTS_DIR / 'tv_mii_results.json'
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=4)
    logger.info(f"TV-MII results saved to {output_file}")

if __name__ == "__main__":
    main()
