const axios = require('axios');

// Cache exchange rates for 1 hour to avoid hitting API limits
let rateCache = {
  rates: null,
  base: 'USD',
  fetchedAt: null,
};

const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

/**
 * Fetch latest exchange rates with USD as base
 * Falls back to approximate hardcoded rates if API is unavailable
 */
async function fetchRates() {
  const now = Date.now();
  if (rateCache.rates && now - rateCache.fetchedAt < CACHE_DURATION_MS) {
    return rateCache.rates;
  }

  try {
    const response = await axios.get(
      process.env.EXCHANGE_RATE_API_URL || 'https://open.er-api.com/v6/latest/USD',
      { timeout: 5000 }
    );
    rateCache = {
      rates: response.data.rates,
      base: 'USD',
      fetchedAt: now,
    };
    return rateCache.rates;
  } catch (err) {
    console.warn('⚠️  Exchange rate API unavailable, using fallback rates:', err.message);
    // Fallback approximate rates relative to USD
    return {
      USD: 1,
      PKR: 278.5,
      EUR: 0.92,
      GBP: 0.79,
      AED: 3.67,
      SAR: 3.75,
      INR: 83.1,
      CAD: 1.36,
      AUD: 1.53,
    };
  }
}

/**
 * Convert an amount from one currency to another
 * @param {number} amount - The amount to convert
 * @param {string} fromCurrency - Source currency code (e.g., 'USD')
 * @param {string} toCurrency - Target currency code (e.g., 'PKR')
 * @returns {Promise<number>} Converted amount
 */
async function convertCurrency(amount, fromCurrency, toCurrency) {
  if (fromCurrency === toCurrency) return amount;

  const rates = await fetchRates();
  const fromRate = rates[fromCurrency.toUpperCase()];
  const toRate = rates[toCurrency.toUpperCase()];

  if (!fromRate || !toRate) {
    console.warn(`Unknown currency: ${fromCurrency} or ${toCurrency}, skipping conversion`);
    return amount;
  }

  // Convert: amount -> USD -> toCurrency
  const amountInUSD = amount / fromRate;
  const convertedAmount = amountInUSD * toRate;
  return parseFloat(convertedAmount.toFixed(2));
}

module.exports = { convertCurrency, fetchRates };
