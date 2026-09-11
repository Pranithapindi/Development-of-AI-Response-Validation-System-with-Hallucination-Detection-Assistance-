/**
 * api.js
 * ──────
 * Axios-based API client for the FastAPI backend.
 * Base URL: http://localhost:8000
 *
 * Falls back gracefully to the local JS validation engine
 * if the backend is offline or returns an error.
 */

import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 120000, // 2 min — model inference can be slow on first load
  headers: { 'Content-Type': 'application/json' },
});

// ── Health check ──────────────────────────────────────────────────────────────

export async function checkHealth() {
  try {
    const res = await apiClient.get('/api/health');
    return res.data;
  } catch {
    return null;
  }
}

// ── Validation ────────────────────────────────────────────────────────────────

/**
 * Run the full validation pipeline via the backend.
 * @param {{ query, ai_response, reference }} payload
 */
export async function validateResponseAPI(payload) {
  const res = await apiClient.post('/api/validate', payload);
  return res.data;
}

/**
 * Get the PDF download URL for a validation record.
 * Triggers browser download.
 */
export function downloadPDFReport(recordId) {
  const url = `${BASE_URL}/api/validate/pdf/${recordId}`;
  const a = document.createElement('a');
  a.href = url;
  a.download = `validation-${recordId.slice(0, 8)}.pdf`;
  a.target = '_blank';
  a.click();
}

// ── History ───────────────────────────────────────────────────────────────────

export async function fetchHistory() {
  const res = await apiClient.get('/api/history');
  return res.data;
}

export async function deleteHistoryRecord(recordId) {
  const res = await apiClient.delete(`/api/history/${recordId}`);
  return res.data;
}

export async function clearAllHistory() {
  const res = await apiClient.delete('/api/history');
  return res.data;
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export async function fetchAnalytics() {
  const res = await apiClient.get('/api/analytics');
  return res.data;
}

export default apiClient;
