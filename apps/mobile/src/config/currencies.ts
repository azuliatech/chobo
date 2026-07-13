/**
 * Chobo — Currency Configuration
 * Currency is derived from the country code selected during onboarding.
 * To change currency, the user changes their country in Personal Info.
 */

export const countryCurrencyMap: Record<string, { symbol: string; code: string; name: string; position: 'before' | 'after' }> = {
    NG: { symbol: '₦',   code: 'NGN', name: 'Nigerian Naira',       position: 'before' },
    GB: { symbol: '£',   code: 'GBP', name: 'British Pound',         position: 'before' },
    US: { symbol: '$',   code: 'USD', name: 'US Dollar',             position: 'before' },
    GH: { symbol: 'GH₵', code: 'GHS', name: 'Ghanaian Cedi',        position: 'before' },
    KE: { symbol: 'KSh', code: 'KES', name: 'Kenyan Shilling',       position: 'before' },
    ZA: { symbol: 'R',   code: 'ZAR', name: 'South African Rand',    position: 'before' },
    CA: { symbol: 'CA$', code: 'CAD', name: 'Canadian Dollar',       position: 'before' },
    AU: { symbol: 'A$',  code: 'AUD', name: 'Australian Dollar',     position: 'before' },
    EU: { symbol: '€',   code: 'EUR', name: 'Euro',                  position: 'before' },
    EM: { symbol: '€',   code: 'EUR', name: 'Euro',                  position: 'before' },
    DE: { symbol: '€',   code: 'EUR', name: 'Euro',                  position: 'before' },
    FR: { symbol: '€',   code: 'EUR', name: 'Euro',                  position: 'before' },
    IN: { symbol: '₹',   code: 'INR', name: 'Indian Rupee',          position: 'before' },
    TZ: { symbol: 'TSh', code: 'TZS', name: 'Tanzanian Shilling',    position: 'before' },
    UG: { symbol: 'USh', code: 'UGX', name: 'Ugandan Shilling',      position: 'before' },
    RW: { symbol: 'RF',  code: 'RWF', name: 'Rwandan Franc',         position: 'before' },
    SN: { symbol: 'CFA', code: 'XOF', name: 'West African CFA',      position: 'before' },
    CI: { symbol: 'CFA', code: 'XOF', name: 'West African CFA',      position: 'before' },
    WS: { symbol: 'T',   code: 'WST', name: 'Samoan Tālā',          position: 'before' },
};

export const DEFAULT_CURRENCY = { symbol: '₦', code: 'NGN', name: 'Nigerian Naira', position: 'before' as const };

export const getCurrencyByCountry = (countryCode: string) => {
    return countryCurrencyMap[countryCode] ?? DEFAULT_CURRENCY;
};

export const getCurrencySymbol = (countryCode: string): string => {
    return getCurrencyByCountry(countryCode).symbol;
};
