/**
 * WHO Global Health Observatory (GHO) API client.
 * Free, no API key required.
 * https://www.who.int/data/gho/info/gho-odata-api
 *
 * Registered in OpenMetadata as "who-gho-api" data source.
 */

export interface WhoCountryData {
  countryIso3: string;
  dengueCases: { year: number; cases: number }[];   // annual reported dengue cases
  malariaIncidence: { year: number; rate: number }[]; // per 1000 pop at risk
  dengueAvg5yr: number;    // 5-year average cases
  malariaAvg5yr: number;   // 5-year average incidence rate
  fetched: boolean;        // false = using fallback data
}

// Hardcoded fallback from WHO 2019–2023 reports (used when API is unavailable)
const FALLBACK: Record<string, Pick<WhoCountryData, 'dengueAvg5yr' | 'malariaAvg5yr'>> = {
  IDN: { dengueAvg5yr: 190000, malariaAvg5yr: 0.9  },  // Indonesia
  THA: { dengueAvg5yr: 120000, malariaAvg5yr: 0.1  },  // Thailand
  PHL: { dengueAvg5yr: 180000, malariaAvg5yr: 0.2  },  // Philippines
  VNM: { dengueAvg5yr: 200000, malariaAvg5yr: 0.1  },  // Vietnam
  MYS: { dengueAvg5yr: 100000, malariaAvg5yr: 0.05 },  // Malaysia
  BGD: { dengueAvg5yr: 50000,  malariaAvg5yr: 0.5  },  // Bangladesh
  IND: { dengueAvg5yr: 200000, malariaAvg5yr: 1.5  },  // India
  PAK: { dengueAvg5yr: 40000,  malariaAvg5yr: 2.1  },  // Pakistan
  NGA: { dengueAvg5yr: 5000,   malariaAvg5yr: 180  },  // Nigeria (malaria-endemic)
  COD: { dengueAvg5yr: 2000,   malariaAvg5yr: 230  },  // DRC
  TZA: { dengueAvg5yr: 8000,   malariaAvg5yr: 140  },  // Tanzania
  KEN: { dengueAvg5yr: 6000,   malariaAvg5yr: 55   },  // Kenya
  GHA: { dengueAvg5yr: 3000,   malariaAvg5yr: 180  },  // Ghana
  BRA: { dengueAvg5yr: 1400000, malariaAvg5yr: 6.2 },  // Brazil (world's highest dengue burden)
  COL: { dengueAvg5yr: 80000,  malariaAvg5yr: 4.1  },  // Colombia
  PER: { dengueAvg5yr: 60000,  malariaAvg5yr: 8.0  },  // Peru
  EGY: { dengueAvg5yr: 200,    malariaAvg5yr: 0.0  },  // Egypt
  GBR: { dengueAvg5yr: 200,    malariaAvg5yr: 0.0  },  // UK (imported only)
  USA: { dengueAvg5yr: 2000,   malariaAvg5yr: 0.0  },  // USA (imported only)
};

// City → ISO3 country code
export const CITY_ISO3: Record<string, string> = {
  'jakarta': 'IDN', 'bangkok': 'THA', 'manila': 'PHL', 'ho-chi-minh': 'VNM',
  'kuala-lumpur': 'MYS', 'dhaka': 'BGD', 'mumbai': 'IND', 'delhi': 'IND',
  'kolkata': 'IND', 'karachi': 'PAK', 'lagos': 'NGA', 'kinshasa': 'COD',
  'dar-es-salaam': 'TZA', 'nairobi': 'KEN', 'accra': 'GHA', 'sao-paulo': 'BRA',
  'rio-de-janeiro': 'BRA', 'bogota': 'COL', 'lima': 'PER', 'cairo': 'EGY',
  'london': 'GBR', 'new-york': 'USA',
};

const WHO_BASE = 'https://ghoapi.azureedge.net/api';

async function fetchWhoSeries(indicator: string, iso3: string): Promise<{ year: number; value: number }[]> {
  try {
    const url = `${WHO_BASE}/${indicator}?$filter=SpatialDim eq '${iso3}' and TimeDimType eq 'YEAR'&$orderby=TimeDim desc&$top=6`;
    const res = await fetch(url, { next: { revalidate: 86400 } }); // cache 24h
    if (!res.ok) return [];
    const data = await res.json();
    return (data.value || [])
      .filter((r: { NumericValue?: number }) => r.NumericValue != null)
      .map((r: { TimeDim: number; NumericValue: number }) => ({ year: r.TimeDim, value: r.NumericValue }));
  } catch {
    return [];
  }
}

const cache = new Map<string, WhoCountryData>();

export async function getWhoData(iso3: string): Promise<WhoCountryData> {
  if (cache.has(iso3)) return cache.get(iso3)!;

  const fallback = FALLBACK[iso3];

  const [dengueRows, malariaRows] = await Promise.all([
    fetchWhoSeries('DENGUE_0000000001', iso3),
    fetchWhoSeries('MALARIA_EST_INCIDENCE', iso3),
  ]);

  const avg = (nums: number[]) => nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;

  const dengueCases = dengueRows.map(r => ({ year: r.year, cases: r.value }));
  const malariaIncidence = malariaRows.map(r => ({ year: r.year, rate: r.value }));

  const result: WhoCountryData = {
    countryIso3: iso3,
    dengueCases,
    malariaIncidence,
    dengueAvg5yr:   dengueRows.length  ? avg(dengueRows.slice(0,5).map(r => r.value))   : (fallback?.dengueAvg5yr   ?? 0),
    malariaAvg5yr:  malariaRows.length ? avg(malariaRows.slice(0,5).map(r => r.value))  : (fallback?.malariaAvg5yr  ?? 0),
    fetched: dengueRows.length > 0 || malariaRows.length > 0,
  };

  cache.set(iso3, result);
  return result;
}

export function formatCases(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${Math.round(n / 1_000)}k`;
  return n.toFixed(0);
}
