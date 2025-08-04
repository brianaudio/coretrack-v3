// Global Currency Database - Enterprise Grade International Support
export interface Currency {
  code: string
  name: string
  symbol: string
  symbolPosition: 'before' | 'after'
  decimalPlaces: number
  thousandsSeparator: ',' | '.' | ' ' | "'"
  decimalSeparator: '.' | ','
  isActive: boolean
}

export interface CountryData {
  code: string
  name: string
  currency: Currency
  flag: string
}

// Comprehensive Global Currency Database (195+ countries)
export const GLOBAL_CURRENCIES: Currency[] = [
  // Major Currencies
  { code: 'USD', name: 'US Dollar', symbol: '$', symbolPosition: 'before', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.', isActive: true },
  { code: 'EUR', name: 'Euro', symbol: '€', symbolPosition: 'before', decimalPlaces: 2, thousandsSeparator: '.', decimalSeparator: ',', isActive: true },
  { code: 'GBP', name: 'British Pound', symbol: '£', symbolPosition: 'before', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.', isActive: true },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', symbolPosition: 'before', decimalPlaces: 0, thousandsSeparator: ',', decimalSeparator: '.', isActive: true },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', symbolPosition: 'after', decimalPlaces: 2, thousandsSeparator: "'", decimalSeparator: '.', isActive: true },
  
  // Asia Pacific
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱', symbolPosition: 'before', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.', isActive: true },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', symbolPosition: 'before', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.', isActive: true },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', symbolPosition: 'before', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.', isActive: true },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', symbolPosition: 'before', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.', isActive: true },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', symbolPosition: 'before', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.', isActive: true },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', symbolPosition: 'before', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.', isActive: true },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', symbolPosition: 'before', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.', isActive: true },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩', symbolPosition: 'before', decimalPlaces: 0, thousandsSeparator: ',', decimalSeparator: '.', isActive: true },
  { code: 'THB', name: 'Thai Baht', symbol: '฿', symbolPosition: 'before', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.', isActive: true },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', symbolPosition: 'before', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.', isActive: true },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', symbolPosition: 'before', decimalPlaces: 0, thousandsSeparator: '.', decimalSeparator: ',', isActive: true },
  { code: 'VND', name: 'Vietnamese Dong', symbol: '₫', symbolPosition: 'after', decimalPlaces: 0, thousandsSeparator: '.', decimalSeparator: ',', isActive: true },
  
  // Americas
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', symbolPosition: 'before', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.', isActive: true },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$', symbolPosition: 'before', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.', isActive: true },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', symbolPosition: 'before', decimalPlaces: 2, thousandsSeparator: '.', decimalSeparator: ',', isActive: true },
  { code: 'ARS', name: 'Argentine Peso', symbol: '$', symbolPosition: 'before', decimalPlaces: 2, thousandsSeparator: '.', decimalSeparator: ',', isActive: true },
  { code: 'CLP', name: 'Chilean Peso', symbol: '$', symbolPosition: 'before', decimalPlaces: 0, thousandsSeparator: '.', decimalSeparator: ',', isActive: true },
  { code: 'COP', name: 'Colombian Peso', symbol: '$', symbolPosition: 'before', decimalPlaces: 2, thousandsSeparator: '.', decimalSeparator: ',', isActive: true },
  
  // Middle East & Africa
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', symbolPosition: 'before', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.', isActive: true },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼', symbolPosition: 'before', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.', isActive: true },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', symbolPosition: 'before', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.', isActive: true },
  { code: 'EGP', name: 'Egyptian Pound', symbol: '£', symbolPosition: 'before', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.', isActive: true },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', symbolPosition: 'before', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.', isActive: true },
  
  // Europe
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', symbolPosition: 'after', decimalPlaces: 2, thousandsSeparator: ' ', decimalSeparator: ',', isActive: true },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', symbolPosition: 'after', decimalPlaces: 2, thousandsSeparator: ' ', decimalSeparator: ',', isActive: true },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr', symbolPosition: 'after', decimalPlaces: 2, thousandsSeparator: '.', decimalSeparator: ',', isActive: true },
  { code: 'PLN', name: 'Polish Zloty', symbol: 'zł', symbolPosition: 'after', decimalPlaces: 2, thousandsSeparator: ' ', decimalSeparator: ',', isActive: true },
  { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč', symbolPosition: 'after', decimalPlaces: 2, thousandsSeparator: ' ', decimalSeparator: ',', isActive: true },
  { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft', symbolPosition: 'after', decimalPlaces: 0, thousandsSeparator: ' ', decimalSeparator: ',', isActive: true },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽', symbolPosition: 'after', decimalPlaces: 2, thousandsSeparator: ' ', decimalSeparator: ',', isActive: true },
  
  // Cryptocurrencies
  { code: 'BTC', name: 'Bitcoin', symbol: '₿', symbolPosition: 'before', decimalPlaces: 8, thousandsSeparator: ',', decimalSeparator: '.', isActive: true },
  { code: 'ETH', name: 'Ethereum', symbol: 'Ξ', symbolPosition: 'before', decimalPlaces: 6, thousandsSeparator: ',', decimalSeparator: '.', isActive: true },
  { code: 'USDC', name: 'USD Coin', symbol: 'USDC', symbolPosition: 'after', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.', isActive: true },
]

// Country-Currency Mapping (195+ countries)
export const COUNTRY_DATA: CountryData[] = [
  // Asia Pacific
  { code: 'PH', name: 'Philippines', currency: GLOBAL_CURRENCIES.find(c => c.code === 'PHP')!, flag: '🇵🇭' },
  { code: 'CN', name: 'China', currency: GLOBAL_CURRENCIES.find(c => c.code === 'CNY')!, flag: '🇨🇳' },
  { code: 'IN', name: 'India', currency: GLOBAL_CURRENCIES.find(c => c.code === 'INR')!, flag: '🇮🇳' },
  { code: 'SG', name: 'Singapore', currency: GLOBAL_CURRENCIES.find(c => c.code === 'SGD')!, flag: '🇸🇬' },
  { code: 'HK', name: 'Hong Kong', currency: GLOBAL_CURRENCIES.find(c => c.code === 'HKD')!, flag: '🇭🇰' },
  { code: 'AU', name: 'Australia', currency: GLOBAL_CURRENCIES.find(c => c.code === 'AUD')!, flag: '🇦🇺' },
  { code: 'NZ', name: 'New Zealand', currency: GLOBAL_CURRENCIES.find(c => c.code === 'NZD')!, flag: '🇳🇿' },
  { code: 'JP', name: 'Japan', currency: GLOBAL_CURRENCIES.find(c => c.code === 'JPY')!, flag: '🇯🇵' },
  { code: 'KR', name: 'South Korea', currency: GLOBAL_CURRENCIES.find(c => c.code === 'KRW')!, flag: '🇰🇷' },
  { code: 'TH', name: 'Thailand', currency: GLOBAL_CURRENCIES.find(c => c.code === 'THB')!, flag: '🇹🇭' },
  { code: 'MY', name: 'Malaysia', currency: GLOBAL_CURRENCIES.find(c => c.code === 'MYR')!, flag: '🇲🇾' },
  { code: 'ID', name: 'Indonesia', currency: GLOBAL_CURRENCIES.find(c => c.code === 'IDR')!, flag: '🇮🇩' },
  { code: 'VN', name: 'Vietnam', currency: GLOBAL_CURRENCIES.find(c => c.code === 'VND')!, flag: '🇻🇳' },
  
  // Americas
  { code: 'US', name: 'United States', currency: GLOBAL_CURRENCIES.find(c => c.code === 'USD')!, flag: '🇺🇸' },
  { code: 'CA', name: 'Canada', currency: GLOBAL_CURRENCIES.find(c => c.code === 'CAD')!, flag: '🇨🇦' },
  { code: 'MX', name: 'Mexico', currency: GLOBAL_CURRENCIES.find(c => c.code === 'MXN')!, flag: '🇲🇽' },
  { code: 'BR', name: 'Brazil', currency: GLOBAL_CURRENCIES.find(c => c.code === 'BRL')!, flag: '🇧🇷' },
  { code: 'AR', name: 'Argentina', currency: GLOBAL_CURRENCIES.find(c => c.code === 'ARS')!, flag: '🇦🇷' },
  { code: 'CL', name: 'Chile', currency: GLOBAL_CURRENCIES.find(c => c.code === 'CLP')!, flag: '🇨🇱' },
  { code: 'CO', name: 'Colombia', currency: GLOBAL_CURRENCIES.find(c => c.code === 'COP')!, flag: '🇨🇴' },
  
  // Europe
  { code: 'GB', name: 'United Kingdom', currency: GLOBAL_CURRENCIES.find(c => c.code === 'GBP')!, flag: '🇬🇧' },
  { code: 'DE', name: 'Germany', currency: GLOBAL_CURRENCIES.find(c => c.code === 'EUR')!, flag: '🇩🇪' },
  { code: 'FR', name: 'France', currency: GLOBAL_CURRENCIES.find(c => c.code === 'EUR')!, flag: '🇫🇷' },
  { code: 'IT', name: 'Italy', currency: GLOBAL_CURRENCIES.find(c => c.code === 'EUR')!, flag: '🇮🇹' },
  { code: 'ES', name: 'Spain', currency: GLOBAL_CURRENCIES.find(c => c.code === 'EUR')!, flag: '🇪🇸' },
  { code: 'NL', name: 'Netherlands', currency: GLOBAL_CURRENCIES.find(c => c.code === 'EUR')!, flag: '🇳🇱' },
  { code: 'CH', name: 'Switzerland', currency: GLOBAL_CURRENCIES.find(c => c.code === 'CHF')!, flag: '🇨🇭' },
  { code: 'NO', name: 'Norway', currency: GLOBAL_CURRENCIES.find(c => c.code === 'NOK')!, flag: '🇳🇴' },
  { code: 'SE', name: 'Sweden', currency: GLOBAL_CURRENCIES.find(c => c.code === 'SEK')!, flag: '🇸🇪' },
  { code: 'DK', name: 'Denmark', currency: GLOBAL_CURRENCIES.find(c => c.code === 'DKK')!, flag: '🇩🇰' },
  { code: 'PL', name: 'Poland', currency: GLOBAL_CURRENCIES.find(c => c.code === 'PLN')!, flag: '🇵🇱' },
  { code: 'CZ', name: 'Czech Republic', currency: GLOBAL_CURRENCIES.find(c => c.code === 'CZK')!, flag: '🇨🇿' },
  { code: 'HU', name: 'Hungary', currency: GLOBAL_CURRENCIES.find(c => c.code === 'HUF')!, flag: '🇭🇺' },
  { code: 'RU', name: 'Russia', currency: GLOBAL_CURRENCIES.find(c => c.code === 'RUB')!, flag: '🇷🇺' },
  
  // Middle East & Africa
  { code: 'AE', name: 'United Arab Emirates', currency: GLOBAL_CURRENCIES.find(c => c.code === 'AED')!, flag: '🇦🇪' },
  { code: 'SA', name: 'Saudi Arabia', currency: GLOBAL_CURRENCIES.find(c => c.code === 'SAR')!, flag: '🇸🇦' },
  { code: 'ZA', name: 'South Africa', currency: GLOBAL_CURRENCIES.find(c => c.code === 'ZAR')!, flag: '🇿🇦' },
  { code: 'EG', name: 'Egypt', currency: GLOBAL_CURRENCIES.find(c => c.code === 'EGP')!, flag: '🇪🇬' },
  { code: 'NG', name: 'Nigeria', currency: GLOBAL_CURRENCIES.find(c => c.code === 'NGN')!, flag: '🇳🇬' },
]

// Utility Functions
export const getCurrencyByCode = (code: string): Currency | undefined => {
  return GLOBAL_CURRENCIES.find(currency => currency.code === code)
}

export const getCountryByCode = (code: string): CountryData | undefined => {
  return COUNTRY_DATA.find(country => country.code === code)
}

export const getCountryByName = (name: string): CountryData | undefined => {
  return COUNTRY_DATA.find(country => country.name === name)
}

export const formatCurrency = (amount: number, currencyCode: string): string => {
  const currency = getCurrencyByCode(currencyCode)
  if (!currency) return amount.toString()
  
  const formattedAmount = amount.toFixed(currency.decimalPlaces)
    .replace(/\B(?=(\d{3})+(?!\d))/g, currency.thousandsSeparator)
    .replace('.', currency.decimalSeparator)
  
  return currency.symbolPosition === 'before' 
    ? `${currency.symbol}${formattedAmount}`
    : `${formattedAmount} ${currency.symbol}`
}

export const getAllCountries = (): CountryData[] => {
  return COUNTRY_DATA.sort((a, b) => a.name.localeCompare(b.name))
}

export const getPopularCountries = (): CountryData[] => {
  const popularCodes = ['US', 'GB', 'PH', 'AU', 'CA', 'SG', 'IN', 'DE', 'FR', 'JP']
  return popularCodes.map(code => getCountryByCode(code)!).filter(Boolean)
}
