import { Router } from 'express';

const router = Router();

router.get('/cbp-raw', async (req, res, next) => {
  const fetchedAt = new Date().toISOString();
  try {
    // Disable TLS verification locally
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    const CBP_WAIT_TIMES_URL = "https://bwt.cbp.gov/api/waittimes";
    const url = `${CBP_WAIT_TIMES_URL}?_=${Date.now()}`;

    const response = await fetch(url, {
      headers: {
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "Accept": "application/json"
      }
    });

    const contentType = response.headers.get('content-type') || '';
    const text = await response.text();

    let jsonParsed = false;
    let data = null;
    try {
      data = JSON.parse(text);
      jsonParsed = true;
    } catch (e) {
      // ignore
    }

    if (!response.ok) {
      return res.status(response.status).json({
        ok: false,
        error_type: "HTTP_ERROR",
        error_message: `CBP API status ${response.status}: ${text.slice(0, 200)}`,
        fetched_at: fetchedAt
      });
    }

    if (!jsonParsed) {
      return res.status(500).json({
        ok: false,
        error_type: "JSON_PARSE_ERROR",
        error_message: `Failed to parse response as JSON: ${text.slice(0, 200)}`,
        fetched_at: fetchedAt
      });
    }

    const records = Array.isArray(data) ? data : (data?.ports || data?.data || []);
    const sampleRecords = records.slice(0, 3).map(r => ({
      port_number: r.port_number || '',
      port_name: r.port_name || '',
      crossing_name: r.crossing_name || '',
      date: r.date || '',
      time: r.time || ''
    }));

    res.json({
      ok: true,
      status: response.status,
      content_type: contentType,
      record_count: records.length,
      sample_records: sampleRecords,
      fetched_at: fetchedAt
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error_type: "FETCH_FAILED",
      error_message: err.message,
      fetched_at: fetchedAt
    });
  }
});

export default router;
