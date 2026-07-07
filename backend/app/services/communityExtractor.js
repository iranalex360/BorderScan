/**
 * communityExtractor.js — Handles parsing and validating community reports text.
 */

export function extractAndValidateReport(text) {
  if (!text || typeof text !== 'string') {
    return {
      validationStatus: 'rejected',
      reason: 'Empty report text',
      passed: false
    };
  }

  const normalized = text.toLowerCase().trim();

  // 1. Detect Prompt Injection
  const injectionPatterns = [
    'ignore previous',
    'ignore all previous',
    'system prompt',
    'ignore instructions',
    'say san ysidro is',
    'developer instruction'
  ];
  if (injectionPatterns.some(pattern => normalized.includes(pattern))) {
    return {
      validationStatus: 'rejected',
      reason: 'Prompt injection attempt detected.',
      passed: false
    };
  }

  // 2. Detect Personal Identifying Information (PII)
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  if (emailRegex.test(text) || (text.match(/\d/g) || []).length > 15) {
    return {
      validationStatus: 'rejected',
      reason: 'Personal identifying data detected.',
      passed: false
    };
  }

  // 3. Extract Port
  let port = null;
  if (normalized.includes('sy') || normalized.includes('san ysidro')) {
    port = 'SAN_YSIDRO';
  } else if (normalized.includes('otay') || normalized.includes('otay mesa')) {
    port = 'OTAY_MESA';
  } else if (normalized.includes('tecate')) {
    port = 'TECATE';
  }

  if (!port) {
    return {
      validationStatus: 'rejected',
      reason: 'Missing port specification.',
      passed: false
    };
  }

  // 4. Extract Lane
  let laneType = 'standard';
  if (normalized.includes('ready')) {
    laneType = 'ready';
  } else if (normalized.includes('sentri')) {
    laneType = 'sentri';
  } else if (normalized.includes('pedestrian') || normalized.includes('walking') || normalized.includes('walk')) {
    laneType = 'pedestrian';
  } else if (normalized.includes('regular') || normalized.includes('general') || normalized.includes('standard')) {
    laneType = 'standard';
  }

  // 5. Extract Wait Time
  let reportedWaitMinutes = null;
  
  const negativeMatch = normalized.match(/-\s*\d+/);
  if (negativeMatch) {
    return {
      validationStatus: 'rejected',
      reason: 'Negative wait times are not allowed.',
      passed: false
    };
  }

  if (normalized.includes('empty')) {
    reportedWaitMinutes = 0;
  } else {
    const hourRegex = /(\d+)\s*(?:hour|hr)/;
    const minRegex = /(\d+)\s*(?:min|minute)/;

    const hourMatch = normalized.match(hourRegex);
    const minMatch = normalized.match(minRegex);

    let hrs = 0;
    let mins = 0;

    if (hourMatch) {
      hrs = parseInt(hourMatch[1], 10);
    }
    if (minMatch) {
      mins = parseInt(minMatch[1], 10);
    } else if (!hourMatch) {
      const numberMatch = normalized.match(/(\d+)/);
      if (numberMatch) {
        mins = parseInt(numberMatch[1], 10);
      }
    }

    reportedWaitMinutes = hrs * 60 + mins;
  }

  if (reportedWaitMinutes === null) {
    return {
      validationStatus: 'rejected',
      reason: 'Could not extract valid wait time.',
      passed: false
    };
  }

  if (reportedWaitMinutes < 0) {
    return {
      validationStatus: 'rejected',
      reason: 'Negative wait times are not allowed.',
      passed: false
    };
  }

  if (reportedWaitMinutes > 480) {
    return {
      validationStatus: 'rejected',
      reason: 'Wait times above 480 minutes are not allowed.',
      passed: false
    };
  }

  // 6. Extract Queue Start Label
  let queueStartLabel = null;
  const queueLabelPatterns = [
    /starts\s+near\s+([a-zA-Z0-9\s]+?)(?:,|\s+about|\s+looks|$)/,
    /starts\s+by\s+([a-zA-Z0-9\s]+?)(?:,|\s+about|\s+looks|$)/,
    /near\s+([a-zA-Z0-9\s]+?)(?:,|\s+about|\s+looks|$)/,
    /by\s+([a-zA-Z0-9\s]+?)(?:,|\s+about|\s+looks|$)/
  ];

  for (const pattern of queueLabelPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      queueStartLabel = match[1].trim();
      break;
    }
  }

  return {
    validationStatus: 'accepted',
    port,
    laneType,
    reportedWaitMinutes,
    queueStartLabel,
    passed: true,
    confidence: 0.85
  };
}
