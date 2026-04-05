'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type DashboardResponse = {
  latest: {
    systolic: number;
    diastolic: number;
    pulse: number | null;
    measured_at: string | null;
    created_at: string;
  } | null;
  averages: {
    systolic7d: number | null;
    diastolic7d: number | null;
    systolic30d: number | null;
    diastolic30d: number | null;
  };
  chart: Array<{
    id: string;
    at: string;
    systolic: number;
    diastolic: number;
    pulse: number | null;
  }>;
  recent: Array<{
    id: string;
    systolic: number;
    diastolic: number;
    pulse: number | null;
    measured_at: string | null;
    created_at: string;
    confidence: number | null;
    notes: string | null;
    image_base64: string | null;
  }>;
};

type ModalState = {
  show: boolean;
  passcodeInput: string;
};

export default function DashboardClient() {
  const [passcode, setPasscode] = useState('');
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [requiresPasscode, setRequiresPasscode] = useState(false);
  const [modal, setModal] = useState<ModalState>({ show: false, passcodeInput: '' });

  // Check if passcode is required
  useEffect(() => {
    console.log('🔵 DashboardClient init: fetching config');
    (async () => {
      try {
        const response = await fetch('/api/config');
        const config = await response.json();
        console.log('📋 Config received:', config);
        setRequiresPasscode(config.requiresPasscode);
        setIsInitialized(true);
      } catch (err) {
        console.error('❌ Config fetch error:', err);
        setIsInitialized(true);
      }
    })();
  }, []);

  async function performLoad(passCodeValue: string) {
    setLoading(true);
    setError(null);
    try {
      console.log('Loading dashboard with passcode:', passCodeValue ? '***' : 'none');
      const response = await fetch('/api/dashboard', {
        headers: passCodeValue ? { 'x-app-passcode': passCodeValue } : undefined,
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const json = await response.json();
        throw new Error(json.error || `Failed to load dashboard (${response.status})`);
      }
      
      const json = await response.json();
      console.log('Dashboard data received:', json);
      setData(json);
      setPasscode(passCodeValue);
      console.log('Dashboard loaded successfully');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown dashboard error';
      console.error('Dashboard error:', err);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }

  function handleLoadClick() {
    console.log('🔵 handleLoadClick called');
    console.log('requiresPasscode:', requiresPasscode);
    setError(null);
    
    // If passcode is required, show modal
    if (requiresPasscode) {
      console.log('🟡 Showing passcode modal');
      setModal({ show: true, passcodeInput: '' });
      return;
    }
    
    // Otherwise load data directly
    console.log('🟢 Loading data without passcode');
    performLoad('');
  }

  function handleModalConfirm() {
    console.log('🔵 handleModalConfirm called, passcode input:', modal.passcodeInput);
    const userPasscode = modal.passcodeInput;
    
    if (!userPasscode || userPasscode.trim() === '') {
      console.log('❌ Passcode empty');
      setError('Passcode is required');
      return;
    }
    
    console.log('🟢 Passcode confirmed, closing modal');
    setModal({ show: false, passcodeInput: '' });
    // Load data with the passcode
    performLoad(userPasscode);
  }

  const chartData = useMemo(
    () =>
      (data?.chart ?? []).map((item) => ({
        ...item,
        label: new Date(item.at).toLocaleString(),
      })),
    [data],
  );

  // Landing screen when not initialized
  if (!isInitialized) {
    console.log('📱 Rendering: Loading screen');
    return (
      <div className="stack">
        <section className="card stack" style={{ textAlign: 'center' }}>
          <h2>Loading...</h2>
        </section>
      </div>
    );
  }

  // Landing screen before loading data
  if (!data) {
    console.log('📱 Rendering: Landing screen (no data yet), modal.show =', modal.show);
    return (
      <>
        <div className="stack">
          <section className="card stack" style={{ textAlign: 'center', minHeight: '400px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <h1>Blood Pressure Dashboard</h1>
            <p style={{ fontSize: '16px', marginBottom: '24px' }}>Your health data in one place</p>
            {loading ? (
              <p>Loading data...</p>
            ) : (
              <button
                className="primary"
                onClick={handleLoadClick}
                disabled={loading}
                style={{ padding: '12px 32px', fontSize: '16px' }}
              >
                Load Data
              </button>
            )}
            {error ? <div className="error" style={{ marginTop: '16px' }}>{error}</div> : null}
          </section>
        </div>

        {/* Passcode Modal */}
        {modal.show && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2000,
            }}
          >
            <div
              style={{
                backgroundColor: 'white',
                padding: '24px',
                borderRadius: '8px',
                minWidth: '300px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ marginTop: 0 }}>Enter Passcode</h3>
              <input
                type="password"
                value={modal.passcodeInput}
                onChange={(e) => {
                  console.log('Passcode input changed:', e.target.value);
                  setModal((m) => ({ ...m, passcodeInput: e.target.value }));
                }}
                placeholder="Enter passcode"
                style={{
                  width: '100%',
                  padding: '8px',
                  marginBottom: '16px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  boxSizing: 'border-box',
                  fontSize: '16px',
                }}
                autoFocus
                onKeyPress={(e) => {
                  console.log('Key pressed:', e.key);
                  if (e.key === 'Enter') {
                    console.log('Enter key detected');
                    handleModalConfirm();
                  }
                }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={(e) => {
                    console.log('Cancel button clicked');
                    e.stopPropagation();
                    setModal({ show: false, passcodeInput: '' });
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 16px',
                    backgroundColor: '#f0f0f0',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    console.log('Confirm button clicked');
                    e.stopPropagation();
                    handleModalConfirm();
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 16px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold',
                  }}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  console.log('📱 Rendering: Dashboard with data');

  return (
    <div className="stack">
      {error ? <section className="card"><div className="error">{error}</div></section> : null}

      {data && (
        <>
          <section className="metrics">
            <div className="metric">
              <div className="label">Latest</div>
              <div className="value">
                {data?.latest ? `${data.latest.systolic}/${data.latest.diastolic}` : 'No data'}
              </div>
            </div>
            <div className="metric">
              <div className="label">7d avg SYS/DIA</div>
              <div className="value">
                {data?.averages?.systolic7d ? `${data.averages.systolic7d} / ${data.averages.diastolic7d}` : '-'}
              </div>
            </div>
            <div className="metric">
              <div className="label">30d avg SYS/DIA</div>
              <div className="value">
                {data?.averages?.systolic30d ? `${data.averages.systolic30d} / ${data.averages.diastolic30d}` : '-'}
              </div>
            </div>
            <div className="metric">
              <div className="label">Readings shown</div>
              <div className="value">{data?.recent?.length ?? 0}</div>
            </div>
          </section>

          <section className="card">
            <h2>Trend</h2>
            <div style={{ width: '100%', height: 360 }}>
              <ResponsiveContainer>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" hide />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="systolic" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="diastolic" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="card table-wrap">
            <h2>Recent readings</h2>
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>BP</th>
                  <th>Pulse</th>
                  <th>Confidence</th>
                  <th>Notes</th>
                  <th>Image</th>
                </tr>
              </thead>
              <tbody>
                {(data?.recent ?? []).map((row) => (
                  <tr key={row.id}>
                    <td>{new Date(row.measured_at ?? row.created_at).toLocaleString()}</td>
                    <td>{row.systolic}/{row.diastolic}</td>
                    <td>{row.pulse ?? '-'}</td>
                    <td>{row.confidence ?? '-'}</td>
                    <td>{row.notes ?? '-'}</td>
                    <td>
                      {row.image_base64 ? (
                        <button 
                          type="button"
                          onClick={() => setSelectedImage(row.image_base64)}
                          style={{ cursor: 'pointer', padding: '4px 8px', fontSize: '12px' }}
                        >
                          View
                        </button>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}

      {/* Image Modal */}
      {selectedImage && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setSelectedImage(null)}
        >
          <div 
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '60vh',
              height: 'auto',
              aspectRatio: '9 / 16',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <img 
              src={`data:image/jpeg;base64,${selectedImage}`}
              alt="Blood pressure reading"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
              }}
            />
            <button
              type="button"
              onClick={() => setSelectedImage(null)}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                padding: '8px 12px',
                fontSize: '16px',
                cursor: 'pointer',
                backgroundColor: 'white',
                border: 'none',
                borderRadius: '4px',
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Passcode Modal */}
      {modal.show && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
          }}
          onClick={() => console.log('Overlay clicked')}
        >
          <div
            style={{
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '8px',
              minWidth: '300px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            }}
            onClick={(e) => {
              console.log('Modal content clicked');
              e.stopPropagation();
            }}
          >
            <h3 style={{ marginTop: 0 }}>Enter Passcode</h3>
            <input
              type="password"
              value={modal.passcodeInput}
              onChange={(e) => {
                console.log('Passcode input changed:', e.target.value);
                setModal((m) => ({ ...m, passcodeInput: e.target.value }));
              }}
              placeholder="Enter passcode"
              style={{
                width: '100%',
                padding: '8px',
                marginBottom: '16px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                boxSizing: 'border-box',
                fontSize: '16px',
              }}
              autoFocus
              onKeyPress={(e) => {
                console.log('Key pressed:', e.key);
                if (e.key === 'Enter') {
                  console.log('Enter key detected');
                  handleModalConfirm();
                }
              }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={(e) => {
                  console.log('Cancel button clicked');
                  e.stopPropagation();
                  setModal({ show: false, passcodeInput: '' });
                }}
                style={{
                  flex: 1,
                  padding: '8px 16px',
                  backgroundColor: '#f0f0f0',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={(e) => {
                  console.log('Confirm button clicked');
                  e.stopPropagation();
                  handleModalConfirm();
                }}
                style={{
                  flex: 1,
                  padding: '8px 16px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
