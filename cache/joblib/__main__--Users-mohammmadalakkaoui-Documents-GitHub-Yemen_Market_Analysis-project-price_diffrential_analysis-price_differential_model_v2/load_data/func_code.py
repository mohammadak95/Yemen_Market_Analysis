# first line: 111
@memory.cache  # Cached to optimize repeated data loading
def load_data(file_path):
    """Load data from GeoJSON file using GeoPandas and preprocess it."""
    logger.info(f"Loading data from {file_path}")
    try:
        gdf = gpd.read_file(file_path)
        df = pd.DataFrame(gdf.drop(columns='geometry'))
        logger.info(f"Loaded GeoJSON with {len(df)} records.")

        # Convert 'date' to datetime and set as index
        df[TIME_COLUMN] = pd.to_datetime(df[TIME_COLUMN])
        df.set_index(TIME_COLUMN, inplace=True)

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

        return df
    except Exception as e:
        logger.error(f"Error loading data: {e}")
        logger.debug(f"Detailed error information: {traceback.format_exc()}")
        raise
