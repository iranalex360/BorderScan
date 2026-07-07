import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const HOLIDAY_BASE = process.env.HOLIDAY_API_BASE_URL || 'https://date.nager.at/api/v3';

/**
 * @param {{ date: string, country?: string }} params
 * @returns {Promise<Object>}
 */
export async function getHolidayContext({ date, country = 'both' }) {
  // Quick dev-mode check
  if (!process.env.HOLIDAY_API_KEY || process.env.NODE_ENV === 'development') {
    try {
      const seedPath = resolve(__dirname, '../../../data/seed/sample_holidays.json');
      const raw = readFileSync(seedPath, 'utf-8');
      const holidaysData = JSON.parse(raw);
      
      const [year, month, day] = date.split('-');
      const monthDay = `${month}-${day}`;
      
      const todaysHolidays = holidaysData.filter((h) => {
        const [hYear, hMonth, hDay] = h.date.split('-');
        return `${hMonth}-${hDay}` === monthDay;
      });
      
      if (todaysHolidays.length > 0) {
        const mappedHolidays = todaysHolidays.map((h) => ({
          name: h.name,
          country: h.country,
          type: h.type || 'public'
        }));
        
        const firstHoliday = todaysHolidays[0];
        const isHoliday = true;
        const trafficImpact = firstHoliday.expectedTrafficImpact || 'high';
        
        const isUSHoliday = todaysHolidays.some(h => h.country === 'US');
        const isMXHoliday = todaysHolidays.some(h => h.country === 'MX');
        
        return {
          source: 'Holiday Seed Data',
          date,
          isHoliday,
          holidays: mappedHolidays,
          isLongWeekend: false,
          trafficImpact,
          travelerNote: firstHoliday.notes || `Today is a holiday (${mappedHolidays.map((h) => h.name).join(', ')}). Expect significantly elevated wait times.`,
          
          // Contract fields
          is_us_holiday: isUSHoliday,
          is_mx_holiday: isMXHoliday,
          is_long_weekend: false,
          impact_level: trafficImpact
        };
      }
    } catch (err) {
      console.error('Error reading holiday mock seed data:', err.message);
    }
    
    return {
      source: 'Holiday Seed Data (Empty)',
      date,
      isHoliday: false,
      holidays: [],
      isLongWeekend: false,
      trafficImpact: 'none',
      travelerNote: 'No major holidays detected today.',
      is_us_holiday: false,
      is_mx_holiday: false,
      is_long_weekend: false,
      impact_level: 'none'
    };
  }

  const [year] = date.split('-');
  const countries = country === 'both' ? ['US', 'MX'] : [country.toUpperCase()];
  const allHolidays = [];

  for (const c of countries) {
    try {
      const res = await fetch(`${HOLIDAY_BASE}/PublicHolidays/${year}/${c}`);
      if (!res.ok) continue;
      const holidays = await res.json();
      const todaysHolidays = holidays.filter((h) => h.date === date);
      allHolidays.push(...todaysHolidays.map((h) => ({ ...h, country: c })));
    } catch {
      // non-fatal
    }
  }

  const context = buildContext(date, allHolidays);
  const isUSHoliday = allHolidays.some(h => h.country === 'US');
  const isMXHoliday = allHolidays.some(h => h.country === 'MX');
  const maxImpact = allHolidays.length > 0 ? 'high' : 'none';

  return {
    ...context,
    is_us_holiday: isUSHoliday,
    is_mx_holiday: isMXHoliday,
    is_long_weekend: false,
    impact_level: maxImpact
  };
}

function buildContext(date, holidays) {
  const isHoliday = holidays.length > 0;
  const trafficImpact = isHoliday ? 'high' : 'none';
  return {
    source: 'Holiday Calendar Service',
    date,
    isHoliday,
    holidays,
    isLongWeekend: false,
    trafficImpact,
    travelerNote: isHoliday
      ? `Today is a holiday (${holidays.map((h) => h.name).join(', ')}). Expect significantly elevated wait times. Consider crossing early morning or late evening.`
      : 'No major holidays detected today.',
  };
}

/**
 * Determines the holiday profile string for a given date.
 * @param {string} dateStr YYYY-MM-DD
 * @returns {Promise<string>}
 */
export async function determineHolidayProfile(dateStr) {
  try {
    const todayCtx = await getHolidayContext({ date: dateStr });
    
    if (todayCtx.isHoliday) {
      const isUS = todayCtx.is_us_holiday;
      const isMX = todayCtx.is_mx_holiday;
      if (isUS && isMX) return 'both_holiday';
      if (isUS) return 'us_holiday';
      if (isMX) return 'mx_holiday';
    }

    const date = new Date(dateStr + 'T00:00:00');
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 5 = Friday, 6 = Saturday
    
    const yesterday = new Date(date.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const tomorrow = new Date(date.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const tomorrowCtx = await getHolidayContext({ date: tomorrow });
    if (tomorrowCtx.isHoliday) {
      return 'day_before_holiday';
    }

    const yesterdayCtx = await getHolidayContext({ date: yesterday });
    if (yesterdayCtx.isHoliday) {
      return 'day_after_holiday';
    }

    if (dayOfWeek === 1 || dayOfWeek === 5) {
      if (dayOfWeek === 5) {
        const mondayStr = new Date(date.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const monCtx = await getHolidayContext({ date: mondayStr });
        if (monCtx.isHoliday) {
          return monCtx.is_us_holiday ? 'us_long_weekend' : 'mx_long_weekend';
        }
      } else if (dayOfWeek === 1) {
        const fridayStr = new Date(date.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const friCtx = await getHolidayContext({ date: fridayStr });
        if (friCtx.isHoliday) {
          return friCtx.is_us_holiday ? 'us_long_weekend' : 'mx_long_weekend';
        }
      }
    }
  } catch (err) {
    console.error('Error determining holiday profile:', err);
  }
  return 'none';
}
