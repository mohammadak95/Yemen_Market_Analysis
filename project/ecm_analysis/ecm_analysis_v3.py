import logging
import json
import warnings
import traceback
from pathlib import Path
import time
import yaml
import pandas as pd
import numpy as np
import geopandas as gpd
from statsmodels.tsa.vector_ar.vecm import VECM, select_order, select_coint_rank
import statsmodels.api as sm
from statsmodels.tsa.stattools import grangercausalitytests, adfuller, kpss
from arch.unitroot import engle_granger
from esda.moran import Moran
from pysal.lib import weights
from scipy.stats import shapiro
from statsmodels.stats.outliers_influence import variance_inflation_factor
import numpy.linalg as LA

# Load configuration
def load_config(path='project/config/config.yaml'):
    try:
        with open(path, 'r') as file:
            return yaml.safe_load(file)
    except Exception as e:
        print(f"Failed to load configuration file: {e}")
        raise

config = load_config()

# Validate configuration
def validate_config(config):
    required_sections = ['directories', 'files', 'parameters', 'logging']
    for section in required_sections:
        if section not in config:
            raise ValueError(f"Missing '{section}' section in configuration.")

validate_config(config)

# Setup logging
log_dir = Path(config['directories']['logs_dir'])
log_dir.mkdir(parents=True, exist_ok=True)
logging.basicConfig(
    level=config['logging']['level'].upper(),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_dir / 'ecm_analysis.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Define base directory
base_dir = Path(__file__).resolve().parents[2]

# Define paths based on config
dirs = {k: base_dir / v for k, v in config['directories'].items()}
files = {k: base_dir / v for k, v in config['files'].items()}

# Parameters
params = config['parameters']
MIN_OBS = params['min_common_dates']
ECM_LAGS = params['lag_periods']
COIN_MAX_LAGS = params['cointegration_max_lags']
GRANGER_MAX_LAGS = params['granger_max_lags']
DIST_THRESH = params['distance_threshold']
COMMODITIES = params['commodities']
EXR_REGIMES = params['exchange_rate_regimes']
STN_SIG = params['stationarity_significance_level']
CIG_SIG = params['cointegration_significance_level']

# Load spatial weights
def load_spatial_weights(path):
    try:
        gdf = gpd.read_file(path)
        w = weights.Queen.from_dataframe(gdf, use_index=False)
        w.transform = 'r'
        return w, gdf
    except Exception as e:
        logger.error(f"Spatial weights loading failed: {e}")
        logger.debug(traceback.format_exc())
        return None, None

spatial_weights, spatial_gdf = load_spatial_weights(files['spatial_geojson'])

# Function to calculate VIF
def calculate_vif(exog_df):
    """
    Calculate Variance Inflation Factor (VIF) for each feature in the DataFrame.
    
    Parameters:
        exog_df (pd.DataFrame): DataFrame containing exogenous variables.
    
    Returns:
        pd.DataFrame: DataFrame with features and their corresponding VIF scores.
    """
    vif_data = pd.DataFrame()
    vif_data["feature"] = exog_df.columns
    vif_data["VIF"] = [variance_inflation_factor(exog_df.values, i) for i in range(exog_df.shape[1])]
    return vif_data

# Function to log correlation matrix
def log_correlation_matrix(exog_df, title="Correlation Matrix of Exogenous Variables"):
    """
    Calculate and log the correlation matrix of the exogenous variables.
    
    Parameters:
        exog_df (pd.DataFrame): DataFrame containing exogenous variables.
        title (str): Title for the log message.
    """
    try:
        corr_matrix = exog_df.corr()
        logger.debug(f"{title}:\n{corr_matrix}")
    except Exception as e:
        logger.error(f"Failed to compute correlation matrix: {e}")
        logger.debug(traceback.format_exc())

# Load and preprocess data
def load_data():
    logger.debug(f"Loading data from {files['spatial_geojson']}")
    try:
        gdf = gpd.read_file(files['spatial_geojson'])
        df = pd.DataFrame(gdf)

        required_columns = {'date', 'commodity', 'exchange_rate_regime', 'usdprice', 'conflict_intensity', 'admin1', 'population'}
        missing = required_columns - set(df.columns)
        if missing:
            raise ValueError(f"Missing required columns: {missing}")

        df['date'] = pd.to_datetime(df['date'], errors='coerce')
        initial_length = len(df)
        df.drop_duplicates(inplace=True)
        df.dropna(subset=['date'], inplace=True)
        logger.info(f"Dropped {initial_length - len(df)} duplicate or NaN rows based on 'date'.")

        df = df[df['admin1'] != 'Amanat Al Asimah']
        logger.info("Excluded records from 'Amanat Al Asimah'.")

        if COMMODITIES:
            df = df[df['commodity'].isin(COMMODITIES)]
            logger.info(f"Filtered data for specified commodities. Number of records: {len(df)}")

        df = df[df['exchange_rate_regime'].isin(['north', 'south'])]
        logger.debug(f"Data filtered for exchange rate regimes: ['north', 'south']")

        df_agg = df.groupby(['commodity', 'exchange_rate_regime', 'date']).agg(
            usdprice=('usdprice', 'mean'),
            conflict_intensity=('conflict_intensity', 'mean'),
            population=('population', 'sum')
        ).reset_index()

        df_pivot = df_agg.pivot_table(index=['commodity', 'date'], columns='exchange_rate_regime', 
                                      values=['usdprice', 'conflict_intensity', 'population'], 
                                      aggfunc='first')

        df_pivot.columns = [f'{var}_{regime}' for var, regime in df_pivot.columns]
        df_pivot = df_pivot.dropna(subset=['usdprice_north', 'usdprice_south'])

        logger.debug(f"Data after pivot and alignment shape: {df_pivot.shape}")

        # Impute missing conflict_intensity values using linear interpolation
        conflict_cols = ['conflict_intensity_north', 'conflict_intensity_south']
        for col in conflict_cols:
            if col in df_pivot.columns:
                df_pivot[col] = df_pivot[col].interpolate(method='linear', limit_direction='both')
                missing_before = df_pivot[col].isna().sum()
                df_pivot[col].fillna(method='bfill', inplace=True)
                df_pivot[col].fillna(method='ffill', inplace=True)
                missing_after = df_pivot[col].isna().sum()
                logger.info(f"Imputed missing values in {col}: before={missing_before}, after={missing_after}")

        # Create indicator variables for imputed data
        for col in conflict_cols:
            indicator_col = f"{col}_imputed"
            df_pivot[indicator_col] = df_pivot[col].isna().astype(int)
            logger.debug(f"Created indicator column {indicator_col}")

        # Group data by commodity for further analysis
        grouped_data = {commodity: df_pivot.xs(commodity, level='commodity') for commodity in df_pivot.index.get_level_values('commodity').unique()}

        logger.debug(f"Data grouped into {len(grouped_data)} groups.")
        return grouped_data

    except Exception as e:
        logger.error(f"Data loading failed: {e}")
        logger.debug(traceback.format_exc())
        raise

# Stationarity Tests
def apply_transformations(series):
    transformations = {'original': series}
    if series.isnull().all():
        return transformations
    if (series > 0).all():
        transformations.update({
            'log': np.log(series.replace(0, np.nan)).dropna(),
            'diff': series.diff().dropna(),
            'log_diff': np.log(series.replace(0, np.nan)).diff().dropna()
        })
    else:
        transformations.update({
            'diff': series.diff().dropna()
        })
    return transformations

def run_stationarity_tests(series, variable):
    logger.debug(f"Running stationarity tests for {variable}")
    results = {}
    transformations = apply_transformations(series)
    
    selected_transformation = None
    for name, transformed in transformations.items():
        logger.debug(f"Testing transformation: {name}")
        try:
            if len(transformed) < 10:
                logger.warning(f"Not enough data points for transformation {name} of {variable}. Skipping.")
                continue
            
            adf_stat, adf_p, _, _, critical_values, _ = adfuller(transformed, autolag='AIC')
            kpss_stat, kpss_p, _, _ = kpss(transformed, regression='c', nlags='auto')

            adf_stationary = adf_p < STN_SIG
            kpss_stationary = kpss_p > STN_SIG

            results[name] = {
                'ADF': {
                    'Statistic': adf_stat,
                    'p-value': adf_p,
                    'Critical Values': critical_values,
                    'Stationary': adf_stationary
                },
                'KPSS': {
                    'Statistic': kpss_stat,
                    'p-value': kpss_p,
                    'Stationary': kpss_stationary
                }
            }

            logger.debug(f"ADF p={adf_p}, KPSS p={kpss_p} for {name}")

            if adf_stationary and kpss_stationary:
                selected_transformation = name
                logger.debug(f"Selected transformation: {name}")
                break
        except Exception as e:
            logger.error(f"Stationarity test failed for {name}: {e}")
            logger.debug(traceback.format_exc())

    if not selected_transformation:
        selected_transformation = 'original'
        logger.warning(f"No stationary transformation found for {variable}. Using 'original'.")

    return {
        'transformation': selected_transformation,
        'series': transformations[selected_transformation].tolist(),
        'results': results.get(selected_transformation, {})
    }

# Cointegration Tests
def run_cointegration_tests(y, x, stationarity_results):
    logger.debug("Running cointegration tests")
    try:
        y_transformed = pd.Series(stationarity_results['usdprice']['series'])
        x_transformed = pd.Series(stationarity_results['conflict_intensity']['series'])
        
        combined = pd.concat([y_transformed, x_transformed], axis=1).dropna()
        if combined.empty or len(combined) < 2:
            raise ValueError("Insufficient data for cointegration test.")

        eg = engle_granger(combined.iloc[:, 0], combined.iloc[:, 1])
        coint_result = {
            'engle_granger': {
                'cointegration_statistic': eg.stat,
                'p_value': eg.pvalue,
                'critical_values': eg.critical_values.tolist(),
                'cointegrated': eg.pvalue < CIG_SIG,
                'rho': eg.rho
            },
            'price_transformation': stationarity_results.get('usdprice', {}).get('transformation', 'original'),
            'conflict_transformation': stationarity_results.get('conflict_intensity', {}).get('transformation', 'original')
        }
        logger.debug(f"Engle-Granger p={eg.pvalue}, cointegrated={eg.pvalue < CIG_SIG}")
        return coint_result
    except Exception as e:
        logger.error(f"Cointegration test failed: {e}")
        logger.debug(traceback.format_exc())
        return None

# Estimate ECM with Multicollinearity Checks and Enhanced Debugging
def estimate_ecm(price, conflict_intensity, other_exog=None, max_lags=COIN_MAX_LAGS, ecm_lags=ECM_LAGS):
    logger.debug(f"Estimating ECM with max_lags={max_lags}, ecm_lags={ecm_lags}")
    try:
        # Combine price and conflict intensity as endogenous variables
        endog = pd.concat([price, conflict_intensity], axis=1).dropna()
        
        # Check if we have enough data points after cleaning
        if len(endog) < 2:
            logger.warning("Insufficient data points after cleaning. Skipping ECM estimation.")
            return None, None
        
        # Handle exogenous variables
        if other_exog is not None and not other_exog.empty:
            exog = other_exog.dropna()
            # Align exog with endog
            endog, exog = endog.align(exog, join='inner', axis=0)
            logger.debug(f"Including exogenous variables: {exog.columns.tolist()}")
        else:
            exog = None
            logger.debug("No exogenous variables provided or all were NaN.")
        
        # Check again if we have enough data points after alignment
        if len(endog) < 2:
            logger.warning("Insufficient data points after aligning with exogenous variables. Skipping ECM estimation.")
            return None, None

        # Multicollinearity Check using VIF
        if exog is not None and exog.shape[1] > 1:
            logger.debug("Calculating VIF for exogenous variables.")
            vif_df = calculate_vif(exog)
            logger.debug(f"VIF before removing multicollinearity issues:\n{vif_df}")
            
            # Log correlation matrix
            log_correlation_matrix(exog, title="Correlation Matrix of Exogenous Variables Before VIF Adjustment")
            
            # Define a VIF threshold
            vif_threshold = 5.0
            
            # Iteratively remove variables with VIF > threshold
            while vif_df['VIF'].max() > vif_threshold:
                max_vif = vif_df['VIF'].max()
                feature_to_remove = vif_df.loc[vif_df['VIF'].idxmax(), 'feature']
                logger.warning(f"High VIF detected: {feature_to_remove} has VIF={max_vif:.2f}. Removing this feature to reduce multicollinearity.")
                
                # Drop the feature with the highest VIF
                exog = exog.drop(columns=[feature_to_remove])
                
                # Recalculate VIF
                vif_df = calculate_vif(exog)
                logger.debug(f"VIF after removing {feature_to_remove}:\n{vif_df}")
                
                # Log correlation matrix after removal
                log_correlation_matrix(exog, title=f"Correlation Matrix After Removing {feature_to_remove}")
            
            logger.info(f"Final exogenous variables after VIF checks: {exog.columns.tolist()}")
            
            # Log final correlation matrix
            log_correlation_matrix(exog, title="Final Correlation Matrix of Exogenous Variables After VIF Adjustment")
        else:
            exog = exog if exog is not None else None

        # Log properties of endog and exog
        logger.debug(f"Endogenous variables shape: {endog.shape}")
        logger.debug(f"Exogenous variables shape: {exog.shape if exog is not None else 'None'}")
        
        if exog is not None and not exog.empty:
            # Compute condition number for exog
            try:
                condition_number = LA.cond(exog)
                logger.debug(f"Condition number of exogenous variables matrix: {condition_number}")
                if condition_number > 30:
                    logger.warning(f"High condition number detected: {condition_number}. This indicates potential multicollinearity issues.")
            except Exception as e:
                logger.error(f"Failed to compute condition number: {e}")
                logger.debug(traceback.format_exc())
            
            # Compute matrix rank
            try:
                rank = LA.matrix_rank(exog)
                logger.debug(f"Rank of exogenous variables matrix: {rank}")
            except Exception as e:
                logger.error(f"Failed to compute matrix rank: {e}")
                logger.debug(traceback.format_exc())
        else:
            logger.debug("No exogenous variables to compute condition number or rank.")

        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            lag_order_result = select_order(endog, exog=exog, maxlags=min(max_lags, len(endog) // 2 - 1), deterministic='ci')

        optimal_lags = lag_order_result.aic if hasattr(lag_order_result, 'aic') else ecm_lags
        optimal_lags = max(1, min(optimal_lags, ecm_lags, len(endog) // 2 - 1))
        logger.debug(f"Optimal lag order by AIC: {optimal_lags}")

        coint_rank_result = select_coint_rank(endog, det_order=0, k_ar_diff=optimal_lags)
        coint_rank = max(1, min(coint_rank_result.rank, len(endog.columns) - 1))
        logger.debug(f"Selected cointegration rank: {coint_rank}")

        if coint_rank == 0:
            logger.warning("No cointegration found based on selected rank.")
            return None, None

        # Only pass exog to VECM if it's not None and not empty
        if exog is not None and not exog.empty:
            model = VECM(endog, exog=exog, k_ar_diff=optimal_lags, coint_rank=coint_rank, deterministic='ci')
        else:
            model = VECM(endog, k_ar_diff=optimal_lags, coint_rank=coint_rank, deterministic='ci')
        
        # Log model parameters before fitting
        logger.debug(f"VECM Model Parameters:\nEndogenous Variables: {endog.columns.tolist()}\nExogenous Variables: {exog.columns.tolist() if exog is not None else 'None'}\nLag Order: {optimal_lags}\nCointegration Rank: {coint_rank}")

        try:
            results = model.fit()
            logger.info("ECM model estimated successfully")
            return model, results
        except np.linalg.LinAlgError as e:
            logger.error(f"Linear algebra error (likely due to singular matrix): {e}")
            # Additional debugging: Check condition number
            if exog is not None and not exog.empty:
                try:
                    condition_number = LA.cond(exog)
                    logger.debug(f"Condition number of exogenous variables matrix: {condition_number}")
                except Exception as cn_e:
                    logger.error(f"Failed to compute condition number: {cn_e}")
                    logger.debug(traceback.format_exc())
    except Exception as e:
        logger.error(f"Unexpected error in ECM estimation: {e}")
        logger.debug(traceback.format_exc())
    return None, None

# Compute Model Criteria
def compute_model_criteria(results, model):
    logger.debug("Computing model criteria (AIC, BIC, HQIC)")
    try:
        n = len(results.resid) if hasattr(results, 'resid') else 0
        k_params = (getattr(model, 'k_ar', 0) + 
                    getattr(model, 'k_trend', 0) + 
                    (results.rank if hasattr(results, 'rank') else 0))
        llf = results.llf if hasattr(results, 'llf') else None

        if llf is not None and n > k_params:
            aic = -2 * llf + 2 * k_params
            bic = -2 * llf + np.log(n) * k_params
            hqic = -2 * llf + 2 * np.log(np.log(n)) * k_params
        else:
            aic = bic = hqic = np.nan

        logger.debug(f"AIC: {aic}, BIC: {bic}, HQIC: {hqic}")
        return aic, bic, hqic
    except Exception as e:
        logger.error(f"Model criteria computation failed: {e}")
        logger.debug(traceback.format_exc())
        return np.nan, np.nan, np.nan

# Granger Causality Tests
def compute_granger_causality(y, x):
    logger.debug("Computing Granger causality")
    gc_results = {}
    try:
        max_lag = GRANGER_MAX_LAGS
        data = pd.concat([y, x], axis=1).dropna()
        for col in x.columns:
            test_result = grangercausalitytests(data[[y.name, col]], max_lag, verbose=False)
            gc_metrics = {}
            for lag, res in test_result.items():
                ftest_p = res[0]['ssr_ftest'][1]
                gc_metrics[lag] = {'ssr_ftest_pvalue': ftest_p}
            gc_results[col] = gc_metrics
        return gc_results
    except Exception as e:
        logger.error(f"Granger causality tests failed: {e}")
        logger.debug(traceback.format_exc())
        return gc_results

# Spatial Autocorrelation
def compute_spatial_autocorrelation(residuals, spatial_weights, gdf, filter_indices):
    if spatial_weights is None:
        logger.warning("Spatial weights not loaded. Skipping spatial autocorrelation tests.")
        return None

    try:
        residuals_series = pd.Series(residuals, index=filter_indices)
        residuals_series = residuals_series.dropna()
        valid_indices = residuals_series.index.intersection(spatial_weights.weights.keys())
        
        filtered_residuals = residuals_series.loc[valid_indices]
        filtered_weights = weights.W(
            {key: [neigh for neigh in spatial_weights.neighbors[key] if neigh in filtered_residuals.index]
             for key in filtered_residuals.index if key in spatial_weights.neighbors}
        )
        filtered_weights.transform = 'r'

        moran = Moran(filtered_residuals, filtered_weights)
        
        return {
            'Moran_I': moran.I,
            'Moran_p_value': moran.p_sim
        }
    except Exception as e:
        logger.error(f"Spatial autocorrelation test failed: {e}")
        logger.debug(traceback.format_exc())
        return None

# Diagnostics
def run_diagnostics(results):
    if results is None:
        return {}
    try:
        logger.debug(f"Original resid shape: {results.resid.shape}")
        resid = results.resid
        
        if resid.ndim == 2 and resid.shape[1] > 1:
            logger.debug("Handling multivariate residuals")
            diagnostics = {}
            for i in range(resid.shape[1]):
                col_resid = resid[:, i]
                col_diagnostics = run_univariate_diagnostics(col_resid, getattr(results.model, 'exog', None))
                diagnostics[f'Variable_{i+1}'] = col_diagnostics
            return diagnostics
        else:
            return run_univariate_diagnostics(resid, getattr(results.model, 'exog', None))
    except Exception as e:
        logger.error(f"Diagnostic tests failed: {e}")
        logger.debug(traceback.format_exc())
        return {}

def run_univariate_diagnostics(resid, exog):
    resid = resid.squeeze()
    
    class MockResults:
        def __init__(self, resid, model):
            self.resid = resid
            self.model = model

    if exog is None:
        exog = np.ones((len(resid), 1))
    
    mock_results = MockResults(resid, sm.OLS(resid, exog))
    
    bg_result = sm.stats.diagnostic.acorr_breusch_godfrey(mock_results, nlags=5)
    bg_stat = bg_result[0] if isinstance(bg_result, tuple) else bg_result.statistic
    bg_p = bg_result[1] if isinstance(bg_result, tuple) else bg_result.pvalue

    arch_result = sm.stats.diagnostic.het_arch(resid)
    arch_stat = arch_result[0] if isinstance(arch_result, tuple) else arch_result.statistic
    arch_p = arch_result[1] if isinstance(arch_result, tuple) else arch_result.pvalue

    jb_result = sm.stats.stattools.jarque_bera(resid)
    jb_stat = jb_result[0] if isinstance(jb_result, tuple) else jb_result.statistic
    jb_p = jb_result[1] if isinstance(jb_result, tuple) else jb_result.pvalue

    dw_stat = sm.stats.stattools.durbin_watson(resid)
    
    if exog.shape[1] > 1:
        white_result = sm.stats.diagnostic.het_white(resid, exog)
        white_stat = white_result[0] if isinstance(white_result, tuple) else white_result.statistic
        white_p = white_result[1] if isinstance(white_result, tuple) else white_result.pvalue
    else:
        white_stat, white_p = np.nan, np.nan
    
    shapiro_stat, shapiro_p = shapiro(resid)
    acf_vals = sm.tsa.acf(resid, nlags=20).tolist()
    pacf_vals = sm.tsa.pacf(resid, nlags=20).tolist()

    return {
        'breusch_godfrey_stat': float(bg_stat),
        'breusch_godfrey_pvalue': float(bg_p),
        'arch_test_stat': float(arch_stat),
        'arch_test_pvalue': float(arch_p),
        'jarque_bera_stat': float(jb_stat),
        'jarque_bera_pvalue': float(jb_p),
        'durbin_watson_stat': float(dw_stat),
        'white_test_stat': float(white_stat),
        'white_test_pvalue': float(white_p),
        'shapiro_wilk_stat': float(shapiro_stat),
        'shapiro_wilk_pvalue': float(shapiro_p),
        'acf': acf_vals,
        'pacf': pacf_vals
    }

# Impulse Response Functions
def compute_irfs(results):
    try:
        irf = results.irf(10)
        irf_data = {
            'impulse_response': {
                'irf': irf.irfs.tolist(),
                'lower': irf.ci[:, :, 0].tolist() if hasattr(irf, 'ci') else None,
                'upper': irf.ci[:, :, 1].tolist() if hasattr(irf, 'ci') else None
            }
        }
        logger.debug("IRF computation successful")
        return irf_data
    except Exception as e:
        logger.error(f"IRF computation failed: {e}")
        logger.debug(traceback.format_exc())
        return None

# JSON Encoder for Numpy and Pandas types
class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (np.ndarray, pd.Series, pd.DataFrame)):
            return obj.tolist()
        if isinstance(obj, (np.number, bool)):
            return obj.item()
        return super().default(obj)

# Convert keys to strings recursively
def convert_keys_to_str(data):
    if isinstance(data, dict):
        return {str(k): convert_keys_to_str(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [convert_keys_to_str(i) for i in data]
    else:
        return data

def save_results(ecm_results, residuals_storage, direction):
    try:
        flattened = convert_keys_to_str(ecm_results)
        residuals_converted = {commodity: v.tolist() for commodity, v in residuals_storage.items()}
        combined_results = {
            'ecm_analysis': flattened,
            'residuals': residuals_converted
        }

        result_file = files['ecm_results_v3'].with_name(f"{files['ecm_results_v3'].stem}_{direction}.json")
        result_file.parent.mkdir(parents=True, exist_ok=True)

        with open(result_file, 'w') as f:
            json.dump(combined_results, f, indent=4, cls=NumpyEncoder)
        logger.info(f"Results saved to {result_file}")
    except Exception as e:
        logger.error(f"Saving results failed: {e}")
        logger.debug(traceback.format_exc())
        raise

# Run ECM Analysis with Enhanced Debugging
def run_ecm_analysis(data, stationarity_results, cointegration_results, gdf, direction='north-to-south'):
    all_results = []
    residuals_storage = {}
    
    for commodity, df in data.items():
        try:
            if direction == 'north-to-south':
                y = df['usdprice_north']
                x = df['conflict_intensity_south']
                exog_vars = ['usdprice_south', 'conflict_intensity_north_imputed']
            elif direction == 'south-to-north':
                y = df['usdprice_south']
                x = df['conflict_intensity_north']
                exog_vars = ['usdprice_north', 'conflict_intensity_south_imputed']
            else:
                logger.error(f"Unknown direction: {direction}")
                continue

            exog = df[exog_vars] if exog_vars else None

            y, x = y.align(x, join='inner')
            if exog is not None:
                exog = exog.loc[y.index]

            logger.debug(f"Aligned data length for {direction}: {len(y)}")
            logger.debug(f"Y series: {y.head()}")
            logger.debug(f"X series: {x.head()}")
            if exog is not None:
                logger.debug(f"Exogenous variables:\n{exog.head()}")

            if len(y) < MIN_OBS:
                logger.warning(f"Not enough aligned observations for {commodity}. Skipping.")
                continue

            model, results = estimate_ecm(y, x, other_exog=exog)
            if model is None or results is None:
                logger.warning(f"ECM estimation failed for {commodity}. Skipping.")
                continue

            aic, bic, hqic = compute_model_criteria(results, model)
            diagnostics = run_diagnostics(results)
            irf = compute_irfs(results)
            gc = compute_granger_causality(y, x)

            residuals_storage[commodity] = results.resid

            filter_indices = df.index.tolist()
            spatial = compute_spatial_autocorrelation(results.resid, spatial_weights, gdf, filter_indices)

            all_results.append({
                'commodity': commodity,
                'aic': aic,
                'bic': bic,
                'hqic': hqic,
                'diagnostics': diagnostics,
                'irf': irf,
                'granger_causality': gc,
                'spatial_autocorrelation': spatial,
            })

        except Exception as e:
            logger.error(f"ECM analysis failed for {commodity}: {e}")
            logger.debug(traceback.format_exc())
    
    return all_results, residuals_storage

# Logging with timestamps
def timed_log(msg):
    logger.info(f"{msg} at {time.strftime('%Y-%m-%d %H:%M:%S')}")

# Main Workflow with Enhanced Debugging
def main():
    timed_log("Starting ECM analysis workflow")
    try:
        start_time = time.time()
        
        timed_log("Loading data")
        data = load_data()
        timed_log(f"Data loaded with {len(data)} groups, took {time.time() - start_time:.2f} seconds")
        
        stationarity_results, cointegration_results = {}, {}
        
        for commodity, df in data.items():
            if len(df) < MIN_OBS:
                logger.warning(f"Insufficient data for {commodity}. Skipping stationarity and cointegration tests.")
                continue
            # Assuming 'north-to-south' direction for stationarity and cointegration
            key = f"{commodity}_north-to-south"
            stationarity_results[key] = {
                'usdprice': run_stationarity_tests(df['usdprice_north'], 'usdprice'),
                'conflict_intensity': run_stationarity_tests(df['conflict_intensity_south'], 'conflict_intensity')
            }
            
            coint = run_cointegration_tests(df['usdprice_north'], df['conflict_intensity_south'], stationarity_results[key])
            if coint:
                cointegration_results[key] = coint

        # Run ECM analysis in both directions
        try:
            ecm_results_north_south, residuals_north_south = run_ecm_analysis(
                data, stationarity_results, cointegration_results, spatial_gdf, direction="north-to-south"
            )
            save_results(ecm_results_north_south, residuals_north_south, direction="north-to-south")
        except Exception as e:
            logger.error(f"ECM analysis north-to-south failed: {e}")
        
        try:
            ecm_results_south_north, residuals_south_north = run_ecm_analysis(
                data, stationarity_results, cointegration_results, spatial_gdf, direction="south-to-north"
            )
            save_results(ecm_results_south_north, residuals_south_north, direction="south-to-north")
        except Exception as e:
            logger.error(f"ECM analysis south-to-north failed: {e}")
        
        logger.info(f"ECM analysis workflow completed successfully in {time.time() - start_time:.2f} seconds")
    except Exception as e:
        logger.error(f"ECM analysis workflow failed: {e}")
        logger.debug(traceback.format_exc())

if __name__ == '__main__':
    warnings.simplefilter('ignore')
    main()
