import { getHolidayContext } from '../services/holidayService.js';

/**
 * holidayTool — Checks for holidays and assesses traffic impact.
 * @param {{ date: string, country?: string }} params
 * @returns {Promise<Object>}
 */
export async function holidayTool({ date, country = 'both' }) {
  if (!date) throw new Error('holidayTool: date is required');
  return getHolidayContext({ date, country });
}
