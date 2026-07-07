import { getRecentReports } from '../services/communityService.js';

/**
 * recommendationTool — Selects the best crossing option from available data.
 * @param {Object} params
 * @returns {Promise<Object>}
 */
export async function recommendationTool({ laneType = 'standard', cbpData, predictions, holidayContext, communitySignals }) {
  const lanes = cbpData?.data?.lanes || [];
  if (lanes.length === 0) {
    return { error: 'Insufficient data for recommendation', partial: true };
  }

  // 1. Resolve wait times and community signals for all ports
  const portStats = ['SAN_YSIDRO', 'OTAY_MESA', 'TECATE'].map((portCode) => {
    // Find CBP wait
    const cbpLane = lanes.find((l) => (l.port === portCode || l.port?.toUpperCase()?.replace(' ', '_') === portCode) && l.type === laneType);
    const cbpWait = cbpLane ? cbpLane.waitMinutes : 45;

    // Find community median
    let commWait = null;
    let reportsCount = 0;
    let queueStartLabel = null;

    if (communitySignals && (communitySignals.port === portCode || portCode === 'SAN_YSIDRO')) {
      commWait = communitySignals.averageReportedWait;
      reportsCount = communitySignals.reportsCount;
      const reportWithLabel = communitySignals.reports?.find((r) => r.queueStartLabel);
      queueStartLabel = reportWithLabel ? reportWithLabel.queueStartLabel : null;
    } else {
      try {
        const recent = getRecentReports({ port: portCode, windowMinutes: 60 });
        reportsCount = recent.length;
        if (recent.length > 0) {
          commWait = Math.round(recent.reduce((sum, r) => sum + r.reported_wait_minutes, 0) / recent.length);
          const reportWithLabel = recent.find((r) => r.queue_start_label);
          queueStartLabel = reportWithLabel ? reportWithLabel.queue_start_label : null;
        }
      } catch (e) {
        // Fallback
      }
    }

    const effectiveWait = commWait !== null ? commWait : cbpWait;

    return {
      portCode,
      portName: portCode === 'SAN_YSIDRO' ? 'San Ysidro' : portCode === 'OTAY_MESA' ? 'Otay Mesa' : 'Tecate',
      cbpWait,
      commWait,
      effectiveWait,
      reportsCount,
      queueStartLabel
    };
  });

  const targetStat = portStats[0];

  const sorted = [...portStats].sort((a, b) => a.effectiveWait - b.effectiveWait);
  const bestStat = sorted[0];

  let recommendationAction = 'cross now';
  let recommendedPort = targetStat.portName;
  let alternativeOption = null;

  const waitDiff = targetStat.effectiveWait - bestStat.effectiveWait;

  if (bestStat.portCode !== targetStat.portCode && waitDiff >= 20) {
    recommendationAction = 'use another port';
    recommendedPort = bestStat.portName;
    alternativeOption = targetStat.portName;
  } else if (targetStat.effectiveWait >= 90) {
    recommendationAction = 'wait';
    if (bestStat.portCode !== targetStat.portCode) {
      alternativeOption = bestStat.portName;
    }
  } else {
    recommendationAction = 'cross now';
    if (bestStat.portCode !== targetStat.portCode) {
      alternativeOption = bestStat.portName;
    }
  }

  let warningMsg = null;
  const isUnderreporting = targetStat.commWait !== null && (targetStat.commWait - targetStat.cbpWait) > 30;
  if (isUnderreporting) {
    warningMsg = `CBP wait time for ${targetStat.portName} may be underreporting actual queue conditions.`;
  }

  let explanation = '';
  if (recommendationAction === 'use another port') {
    explanation = `Use ${bestStat.portName} ${laneType} now. CBP reports ${targetStat.portName} at ${targetStat.cbpWait} minutes, `;
    if (targetStat.commWait !== null) {
      explanation += `but recent community reports suggest ${targetStat.commWait} minutes. `;
    } else {
      explanation += `but current predictions suggest ${targetStat.effectiveWait} minutes. `;
    }
    if (targetStat.queueStartLabel) {
      explanation += `The queue is estimated ${targetStat.queueStartLabel}. `;
    }
  } else if (recommendationAction === 'wait') {
    explanation = `Wait to cross at ${targetStat.portName} ${laneType}. Current wait is extremely high at ${targetStat.effectiveWait} minutes. `;
    if (alternativeOption) {
      explanation += `Consider using ${alternativeOption} as a shorter alternative. `;
    }
  } else {
    explanation = `Cross through ${targetStat.portName} ${laneType} now. Wait times are currently stable at ${targetStat.effectiveWait} minutes. `;
  }

  const sources = ['CBP Border Wait Times API'];
  if (targetStat.reportsCount > 0) {
    sources.push('BorderScan Community Reports');
  }
  if (predictions) {
    sources.push('BorderScan Prediction Engine');
  }

  let confidence = 'high';
  if (isUnderreporting || holidayContext?.isHoliday) {
    confidence = 'medium';
  } else if (targetStat.reportsCount === 0) {
    confidence = 'medium';
  }

  return {
    recommendedPort,
    recommendedLane: laneType,
    estimatedWaitMinutes: bestStat.effectiveWait,
    confidence,
    explanation: explanation.trim() + ` Confidence: ${confidence}.`,
    sources,
    action: recommendationAction,
    alternativeOption,
    warning: warningMsg,
    cbpUnderreporting: isUnderreporting
  };
}
