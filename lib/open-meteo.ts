export interface ClimateData {
  avgTemp: number;
  avgRainfall: number;
  laggedRainfall: number; // 14-day average — matches mosquito breeding incubation window
  avgHumidity: number;
  weeks: number;
}

export async function fetchClimateData(lat: number, lng: number): Promise<ClimateData> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,precipitation_sum,relative_humidity_2m_max&past_days=28&forecast_days=1`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
    const data = await res.json();

    const temps: number[] = data.daily?.temperature_2m_max ?? [];
    const rains: number[] = data.daily?.precipitation_sum ?? [];
    const hums: number[]  = data.daily?.relative_humidity_2m_max ?? [];

    const avg = (arr: number[]) =>
      arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;

    // Most-recent 14 days for lagged rainfall (incubation window)
    const laggedRainfall = avg(rains.slice(-14));

    return {
      avgTemp:        avg(temps),
      avgRainfall:    avg(rains),
      laggedRainfall,
      avgHumidity:    avg(hums),
      weeks: 4,
    };
  } catch (err) {
    console.warn('Open-Meteo failed, using fallback:', err);
    return { avgTemp: 28, avgRainfall: 25, laggedRainfall: 20, avgHumidity: 70, weeks: 4 };
  }
}
