import React, { useEffect, useState } from 'react';
import DashboardCard from '../components/DashboardCard.jsx';
import LaneSelector from '../components/LaneSelector.jsx';
import PredictionPanel from '../components/PredictionPanel.jsx';
import RecommendationPanel from '../components/RecommendationPanel.jsx';
import ExplanationPanel from '../components/ExplanationPanel.jsx';
import QueueMap from '../components/QueueMap.jsx';
import CommunityReportForm from '../components/CommunityReportForm.jsx';
import DecisionTracePanel from '../components/DecisionTracePanel.jsx';
import { fetchCurrentWaits, fetchPrediction, fetchRecommendation, fetchQueueMap, fetchRecommendationLogs } from '../lib/api.js';
import { PORTS } from '../lib/constants.js';

function dedupeByPortAndLane(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = `${item.portCode || item.port}-${item.laneType}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function Dashboard() {
  const [selectedPort, setSelectedPort] = useState(PORTS[0].code);
  const [selectedLane, setSelectedLane] = useState('standard');
  const [waits, setWaits] = useState([]);
  const [holidayContext, setHolidayContext] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [queueMapData, setQueueMapData] = useState(null);
  const [decisionLogs, setDecisionLogs] = useState([]);
  
  const [loading, setLoading] = useState({ waits: true, prediction: false, recommendation: false });
  const [hasError, setHasError] = useState(false);

  // Load all dashboard data reactively when selections change
  useEffect(() => {
    loadAllData(false);
  }, [selectedPort, selectedLane]);

  async function loadAllData(refresh = false) {
    setLoading((l) => ({ ...l, waits: true, prediction: true, recommendation: true }));
    setHasError(false);
    try {
      // 1. Fetch current waits & holidays
      const currentWaitsData = await fetchCurrentWaits({ refresh });
      setWaits(currentWaitsData.waits || []);
      setHolidayContext(currentWaitsData.holidayContext || null);

      // 2. Fetch AI crossing recommendation
      const recData = await fetchRecommendation({ laneType: selectedLane });
      setRecommendation(recData);

      // 3. Fetch prediction details
      const predData = await fetchPrediction({ port: selectedPort, laneType: selectedLane });
      setPrediction(predData);

      // 4. Fetch queue map geometry
      const qData = await fetchQueueMap({ port: selectedPort, laneType: selectedLane });
      setQueueMapData(qData);

      // 5. Fetch recent decision logs
      const logData = await fetchRecommendationLogs();
      setDecisionLogs(logData.logs || []);
    } catch (err) {
      console.error('[Dashboard] Error loading data:', err.message);
      setHasError(true);
    } finally {
      setLoading((l) => ({ ...l, waits: false, prediction: false, recommendation: false }));
    }
  }

  // Deduplicate and filter waits by selected lane to avoid duplicate cards
  const dedupedWaits = dedupeByPortAndLane(waits);
  const filteredWaits = dedupedWaits.filter((w) => w.laneType === selectedLane);

  const activeCbp = waits.find((w) => w.portCode === selectedPort && w.laneType === selectedLane)?.waitMinutes ?? 0;
  const activeCommunity = prediction?.communityData?.averageReportedWait ?? null;
  const showMismatchWarning = activeCommunity !== null && Math.abs(activeCbp - activeCommunity) > 30;

  const portName = PORTS.find((p) => p.code === selectedPort)?.name || selectedPort;
  const usesFallback = waits.some(w => w.source === 'mock_fallback');

  // Loading state
  if (loading.waits && waits.length === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        gap: '1rem'
      }}>
        <div className="pulse" style={{ fontSize: '2.5rem' }}>🛂</div>
        <div style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--color-primary)' }}>
          Scanning border conditions...
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      {/* Holiday Context Banner */}
      {holidayContext?.isHoliday && (
        <div className="card fade-in" style={{
          marginBottom: '1rem',
          background: 'rgba(245, 158, 11, 0.08)',
          borderColor: 'rgba(245, 158, 11, 0.25)',
          padding: '0.75rem 1rem'
        }}>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: '1.25rem' }}>🗓️</span>
            <div>
              <div className="text-xs" style={{ fontWeight: '700', color: 'var(--wait-yellow)' }}>
                {holidayContext.holidays.map((h) => h.name).join(' · ')} — Expect elevated wait times
              </div>
              <div className="text-xs text-muted" style={{ fontSize: '11px', marginTop: '1px' }}>{holidayContext.travelerNote}</div>
            </div>
          </div>
        </div>
      )}

      {/* Fallback Banner Alert */}
      {usesFallback && (
        <div className="card fade-in" style={{
          marginBottom: '1rem',
          background: 'rgba(249, 115, 22, 0.08)',
          borderColor: 'rgba(249, 115, 22, 0.2)',
          padding: '0.75rem 1rem'
        }}>
          <div className="text-xs" style={{ color: 'var(--wait-orange)', fontWeight: '600' }}>
            ⚠️ Demo fallback data is being shown because live CBP data is unavailable.
          </div>
        </div>
      )}

      {/* Error State Banner */}
      {hasError && (
        <div className="card fade-in" style={{
          marginBottom: '1rem',
          background: 'rgba(239, 68, 68, 0.08)',
          borderColor: 'rgba(239, 68, 68, 0.2)',
          padding: '0.75rem 1rem'
        }}>
          <div className="text-xs" style={{ color: 'var(--wait-red)', fontWeight: '600' }}>
            ❌ Could not load live border data. Showing fallback demo data.
          </div>
        </div>
      )}

      {/* Mismatch Alert Banner */}
      {showMismatchWarning && (
        <div className="card fade-in" style={{
          marginBottom: '1rem',
          background: 'rgba(239, 68, 68, 0.08)',
          borderColor: 'rgba(239, 68, 68, 0.2)',
          padding: '0.75rem 1rem'
        }}>
          <div className="flex items-start gap-2">
            <span style={{ fontSize: '1.1rem', marginTop: '1px' }}>⚠️</span>
            <div>
              <div className="text-xs" style={{ fontWeight: '700', color: 'var(--color-danger)' }}>
                Official and community signals disagree
              </div>
              <div className="text-xs text-muted" style={{ fontSize: '11px', marginTop: '2px' }}>
                Official CBP wait is <strong>{activeCbp} min</strong>, but community reports average <strong>{activeCommunity} min</strong>.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Layout Grid conforming to mobile order & desktop split */}
      <div className="dashboard-grid">
        
        {/* 1. Quick Recommendation Card */}
        <div className="area-rec">
          <RecommendationPanel {...(recommendation || {})} loading={loading.recommendation} />
        </div>

        {/* 2. Lane selector pills */}
        <div className="area-lane">
          <LaneSelector
            selectedLane={selectedLane}
            onLaneChange={(lane) => {
              setSelectedLane(lane);
              // Pick first available port for this lane type if needed
            }}
          />
        </div>

        {/* 3. Port Cards (one card per selected lane) */}
        <div className="area-ports">
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '1rem',
            marginBottom: '0.5rem'
          }}>
            {filteredWaits.length === 0 ? (
              <div className="text-sm text-muted text-center card" style={{ borderStyle: 'dashed' }}>
                No active lanes open for this lane type.
              </div>
            ) : (
              filteredWaits.map((w) => (
                <DashboardCard
                  key={`${w.portCode}-${w.laneType}`}
                  {...w}
                  portName={w.port}
                  updatedAt={w.capturedAt}
                  isActive={w.portCode === selectedPort}
                  onSelect={() => setSelectedPort(w.portCode)}
                />
              ))
            )}
          </div>
        </div>

        {/* 4. Live Queue Map */}
        <div className="area-map">
          <QueueMap
            geojson={queueMapData?.geojson}
            queueSummary={{
              title: queueMapData?.queue_start_label || "Estimated queue route",
              confidence: queueMapData?.confidence
            }}
            isLoading={loading.waits}
          />
        </div>

        {/* 5. Prediction Panel */}
        <div className="area-pred">
          <PredictionPanel
            predictions={prediction?.predictions || []}
            reasoning={prediction?.reasoning_summary || prediction?.reasoning}
            predictionData={prediction}
            loading={loading.prediction}
          />
        </div>

        {/* 6. Community Report Form */}
        <div className="area-report">
          <CommunityReportForm onReportSubmitted={() => loadAllData(true)} />
        </div>

        {/* 7. Explanation Panel ("Why this estimate?") */}
        <div className="area-explain">
          <ExplanationPanel
            explanation={recommendation?.explanation}
            sources={recommendation?.sources || []}
            guardrail={recommendation?.guardrail}
          />
        </div>

        {/* 8. Decision traces audit panel */}
        <div className="area-traces">
          <DecisionTracePanel logs={decisionLogs} loading={loading.recommendation} />
        </div>

      </div>
    </div>
  );
}
