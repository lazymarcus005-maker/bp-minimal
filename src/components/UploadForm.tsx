'use client';

import { useEffect, useMemo, useState } from 'react';

type Extracted = {
  systolic: number | null;
  diastolic: number | null;
  pulse: number | null;
  measured_at: string | null;
  confidence: number | null;
  notes: string | null;
  raw: unknown;
  image_base64: string | null;
};

type ModalState = {
  action: 'extract' | 'save' | null;
  passcodeInput: string;
};

export default function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [passcode, setPasscode] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [result, setResult] = useState<Extracted | null>(null);
  const [requiresPasscode, setRequiresPasscode] = useState(false);
  const [modal, setModal] = useState<ModalState>({ action: null, passcodeInput: '' });
  const [form, setForm] = useState({
    systolic: '',
    diastolic: '',
    pulse: '',
    measured_at: '',
    notes: '',
    confidence: '',
  });

  // Check if passcode is required
  useEffect(() => {
    (async () => {
      try {
        const response = await fetch('/api/config');
        const config = await response.json();
        setRequiresPasscode(config.requiresPasscode);
      } catch {}
    })();
  }, []);

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  async function performExtract(passCodeValue: string) {
    if (!file) {
      setError('Pick an image first');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/extract', {
        method: 'POST',
        headers: passCodeValue ? { 'x-app-passcode': passCodeValue } : undefined,
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to extract reading');
      }

      const extracted: Extracted = data;
      setResult(extracted);
      setForm({
        systolic: extracted.systolic?.toString() ?? '',
        diastolic: extracted.diastolic?.toString() ?? '',
        pulse: extracted.pulse?.toString() ?? '',
        measured_at: extracted.measured_at ? extracted.measured_at.slice(0, 16) : '',
        notes: extracted.notes ?? '',
        confidence: extracted.confidence?.toString() ?? '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown extraction error');
    } finally {
      setLoading(false);
    }
  }

  async function handleExtract() {
    if (!file) {
      setError('Pick an image first');
      return;
    }

    // Show passcode modal if required
    if (requiresPasscode) {
      setModal({ action: 'extract', passcodeInput: '' });
      return;
    }

    await performExtract(passcode);
  }

  async function performSave(passCodeValue: string) {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/readings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(passCodeValue ? { 'x-app-passcode': passCodeValue } : {}),
        },
        body: JSON.stringify({
          systolic: form.systolic,
          diastolic: form.diastolic,
          pulse: form.pulse,
          measured_at: form.measured_at ? new Date(form.measured_at).toISOString() : null,
          notes: form.notes,
          confidence: form.confidence,
          extracted_json: result?.raw ?? null,
          image_base64: result?.image_base64 ?? null,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save reading');
      }

      // Clear form on success
      setSuccess('Reading saved successfully!');
      alert('Reading saved successfully!');
      setFile(null);
      setResult(null);
      setForm({
        systolic: '',
        diastolic: '',
        pulse: '',
        measured_at: '',
        notes: '',
        confidence: '',
      });
      setSuccess(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown save error');
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    // Show passcode modal if required
    if (requiresPasscode) {
      setModal({ action: 'save', passcodeInput: '' });
      return;
    }

    await performSave(passcode);
  }

  function handleModalConfirm() {
    if (!modal.passcodeInput) {
      setError('Passcode is required');
      return;
    }
    const userPasscode = modal.passcodeInput;
    setModal({ action: null, passcodeInput: '' });

    // Trigger the appropriate action with the passcode
    if (modal.action === 'extract') {
      performExtract(userPasscode);
    } else if (modal.action === 'save') {
      performSave(userPasscode);
    }
  }

  return (
    <>
      <div className="page-grid">
        <section className="card stack">
          <div>
            <h2>1. Upload image</h2>
            <p className="small">Image is processed, resized to 600x800, and stored as Base64 in the database.</p>
          </div>

          <div className="field">
            <label htmlFor="image">Blood pressure image</label>
            <input id="image" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>

          {previewUrl ? <img className="preview" src={previewUrl} alt="Preview" /> : null}

          <div className="actions">
            <button className="primary" type="button" disabled={loading || !file} onClick={handleExtract}>
              {loading ? 'Reading image...' : 'Read image'}
            </button>
          </div>

          {error ? <div className="error">{error}</div> : null}
          {success ? <div className="notice">{success}</div> : null}
        </section>

        <section className="card stack">
          <div>
            <h2>2. Review & save</h2>
            <p className="small">Always review the values before saving.</p>
          </div>

          <div className="row">
            <div className="field">
              <label>Systolic</label>
              <input value={form.systolic} onChange={(e) => setForm((s) => ({ ...s, systolic: e.target.value }))} placeholder="e.g. 128" />
            </div>
            <div className="field">
              <label>Diastolic</label>
              <input value={form.diastolic} onChange={(e) => setForm((s) => ({ ...s, diastolic: e.target.value }))} placeholder="e.g. 82" />
            </div>
          </div>

          <div className="row">
            <div className="field">
              <label>Pulse</label>
              <input value={form.pulse} onChange={(e) => setForm((s) => ({ ...s, pulse: e.target.value }))} placeholder="optional" />
            </div>
            <div className="field">
              <label>Confidence</label>
              <input value={form.confidence} onChange={(e) => setForm((s) => ({ ...s, confidence: e.target.value }))} placeholder="0 - 1" />
            </div>
          </div>

          <div className="field">
            <label>Measured at</label>
            <input type="datetime-local" value={form.measured_at} onChange={(e) => setForm((s) => ({ ...s, measured_at: e.target.value }))} />
          </div>

          <div className="field">
            <label>Notes</label>
            <textarea rows={5} value={form.notes} onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))} placeholder="Anything useful" />
          </div>

          {result?.confidence !== null && (result?.confidence ?? 0) < 0.7 ? (
            <div className="notice">Low confidence extraction. Double-check before saving.</div>
          ) : null}

          <div className="actions">
            <button className="primary" type="button" disabled={saving || !form.systolic || !form.diastolic} onClick={handleSave}>
              {saving ? 'Saving...' : 'Save reading'}
            </button>
          </div>
        </section>
      </div>

      {/* Passcode Modal */}
      {modal.action && (
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
          >
            <h3 style={{ marginTop: 0 }}>Enter Passcode</h3>
            <input
              type="password"
              value={modal.passcodeInput}
              onChange={(e) => setModal((m) => ({ ...m, passcodeInput: e.target.value }))}
              placeholder="Enter passcode"
              style={{
                width: '100%',
                padding: '8px',
                marginBottom: '16px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                boxSizing: 'border-box',
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleModalConfirm();
                }
              }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setModal({ action: null, passcodeInput: '' })}
                style={{
                  flex: 1,
                  padding: '8px 16px',
                  backgroundColor: '#f0f0f0',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleModalConfirm}
                style={{
                  flex: 1,
                  padding: '8px 16px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
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
