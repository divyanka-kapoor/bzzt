/**
 * Single source of truth for all shared configuration.
 * Previously scattered across Map.tsx, route.ts, load_districts_l2.py, google-trends.ts.
 */

// Countries with GADM level-2 district data loaded in Supabase
export const L2_COUNTRIES = new Set([
  'India', 'Nigeria', 'Kenya', 'Bangladesh',
]);

// Google Trends timezone offset: minutes WEST of UTC (negative = ahead of UTC)
// Google Trends tz param convention: UTC+5:30 → tz=-330, UTC-3 → tz=180
export const COUNTRY_TZ: Record<string, number> = {
  NGA: -60,   // UTC+1  West Africa Time
  GHA: -60,   // UTC+1
  CMR: -60,   // UTC+1
  COD: -60,   // UTC+1 (most of DRC)
  KEN: -180,  // UTC+3  East Africa Time
  TZA: -180,  // UTC+3
  ETH: -180,  // UTC+3
  UGA: -180,  // UTC+3
  MOZ: -120,  // UTC+2
  ZMB: -120,  // UTC+2
  ZWE: -120,  // UTC+2
  SOM: -180,  // UTC+3
  SDN: -120,  // UTC+2
  IND: -330,  // UTC+5:30
  BGD: -360,  // UTC+6
  PAK: -300,  // UTC+5
  NPL: -345,  // UTC+5:45
  LKA: -330,  // UTC+5:30
  PHL: -480,  // UTC+8
  IDN: -420,  // UTC+7  (WIB, majority of Indonesia)
  VNM: -420,  // UTC+7
  THA: -420,  // UTC+7
  MMR: -390,  // UTC+6:30
  KHM: -420,  // UTC+7
  LAO: -420,  // UTC+7
  MYS: -480,  // UTC+8
  SGP: -480,  // UTC+8
  CHN: -480,  // UTC+8
  BRA: 180,   // UTC-3  Brasilia Time
  COL: 300,   // UTC-5
  PER: 300,   // UTC-5
  VEN: 240,   // UTC-4
  ECU: 300,   // UTC-5
  BOL: 240,   // UTC-4
  PRY: 240,   // UTC-4
  MEX: 360,   // UTC-6  (majority)
  GTM: 360,   // UTC-6
  HND: 360,   // UTC-6
  NIC: 360,   // UTC-6
  HTI: 300,   // UTC-5
  DOM: 240,   // UTC-4
};

// Country centroids — used for USSD CHW location, climate fetching, map defaults
// Better than 0,0 for any location-dependent logic
export const COUNTRY_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  NGA: { lat: 9.082,   lng: 8.679   },
  KEN: { lat: -1.286,  lng: 36.817  },
  IND: { lat: 20.594,  lng: 78.963  },
  BGD: { lat: 23.685,  lng: 90.356  },
  PHL: { lat: 12.879,  lng: 121.774 },
  BRA: { lat: -14.235, lng: -51.925 },
  THA: { lat: 15.870,  lng: 100.993 },
  IDN: { lat: -0.789,  lng: 113.921 },
  VNM: { lat: 14.058,  lng: 108.278 },
  COL: { lat: 4.571,   lng: -74.297 },
  GHA: { lat: 7.947,   lng: -1.023  },
  ETH: { lat: 9.145,   lng: 40.489  },
  TZA: { lat: -6.369,  lng: 34.889  },
  UGA: { lat: 1.373,   lng: 32.290  },
  MOZ: { lat: -18.665, lng: 35.530  },
  CMR: { lat: 3.848,   lng: 11.502  },
  SDN: { lat: 12.863,  lng: 30.217  },
  PAK: { lat: 30.375,  lng: 69.346  },
  MMR: { lat: 19.165,  lng: 95.956  },
  MEX: { lat: 23.634,  lng: -102.553},
  PER: { lat: -9.190,  lng: -75.016 },
  VEN: { lat: 6.424,   lng: -66.590 },
};

// Phone number prefix → ISO3 country code + centroid
// Used by USSD to assign location to CHW reports instead of 0,0
export const PHONE_PREFIX_TO_COUNTRY: Array<{
  prefix: string; iso3: string; country: string;
}> = [
  { prefix: '+234', iso3: 'NGA', country: 'Nigeria'     },
  { prefix: '+254', iso3: 'KEN', country: 'Kenya'       },
  { prefix: '+91',  iso3: 'IND', country: 'India'       },
  { prefix: '+880', iso3: 'BGD', country: 'Bangladesh'  },
  { prefix: '+63',  iso3: 'PHL', country: 'Philippines' },
  { prefix: '+55',  iso3: 'BRA', country: 'Brazil'      },
  { prefix: '+66',  iso3: 'THA', country: 'Thailand'    },
  { prefix: '+62',  iso3: 'IDN', country: 'Indonesia'   },
  { prefix: '+84',  iso3: 'VNM', country: 'Vietnam'     },
  { prefix: '+57',  iso3: 'COL', country: 'Colombia'    },
  { prefix: '+233', iso3: 'GHA', country: 'Ghana'       },
  { prefix: '+251', iso3: 'ETH', country: 'Ethiopia'    },
  { prefix: '+255', iso3: 'TZA', country: 'Tanzania'    },
  { prefix: '+256', iso3: 'UGA', country: 'Uganda'      },
  { prefix: '+258', iso3: 'MOZ', country: 'Mozambique'  },
  { prefix: '+237', iso3: 'CMR', country: 'Cameroon'    },
  { prefix: '+92',  iso3: 'PAK', country: 'Pakistan'    },
  { prefix: '+95',  iso3: 'MMR', country: 'Myanmar'     },
  { prefix: '+52',  iso3: 'MEX', country: 'Mexico'      },
  { prefix: '+51',  iso3: 'PER', country: 'Peru'        },
  { prefix: '+58',  iso3: 'VEN', country: 'Venezuela'   },
];

export function countryFromPhone(phone: string): { iso3: string; country: string; lat: number; lng: number } | null {
  // Sort by prefix length descending so +880 matches before +88
  const sorted = [...PHONE_PREFIX_TO_COUNTRY].sort((a, b) => b.prefix.length - a.prefix.length);
  for (const entry of sorted) {
    if (phone.startsWith(entry.prefix)) {
      const centroid = COUNTRY_CENTROIDS[entry.iso3];
      if (centroid) return { ...entry, ...centroid };
    }
  }
  return null;
}

// L2 district ID prefixes — maps country name to Supabase ID prefix
export const L2_PREFIXES: Record<string, string> = {
  'India':      'IND_L2',
  'Nigeria':    'NGA_L2',
  'Kenya':      'KEN_L2',
  'Bangladesh': 'BGD_L2',
};
