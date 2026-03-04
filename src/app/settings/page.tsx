'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/header';
import { Save, Upload, Eye, EyeOff, FileText, CheckCircle2, Loader2 } from 'lucide-react';
import { UserPreferences } from '@/types';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const [prefs, setPrefs] = useState<UserPreferences>({
    targetRoles: ['Senior Product Designer', 'Staff Designer', 'Head of Design'],
    targetLevel: 'Senior / Staff / Lead',
    targetSalaryMin: 120000,
    remotePreference: 'remote',
    targetLocations: ['United States', 'Remote'],
    targetDomains: ['AI/ML', 'Design Tools', 'EdTech', 'FinTech'],
    excludeCompanies: [],
    minFitScore: 7,
    fullName: '',
    email: '',
    phone: '',
    linkedinUrl: '',
    portfolioUrl: '',
    workAuthorization: 'Yes - citizen',
    yearsOfExperience: 0,
    currentCompany: '',
    currentTitle: '',
    startDate: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [pdfStatus, setPdfStatus] = useState<'idle' | 'generating' | 'done' | 'error'>('idle');
  const [pdfMessage, setPdfMessage] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newExclude, setNewExclude] = useState('');

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => {
        if (d.preferences) setPrefs(d.preferences);
        if (d.apiKey) setApiKey(d.apiKey);
      })
      .catch(() => { });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: prefs }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Save failed — check console');
        return;
      }
      setSaved(true);
      toast.success('Settings saved!');
      setTimeout(() => setSaved(false), 2000);
    } catch {
      toast.error('Network error — could not save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleGeneratePdf = async () => {
    setPdfStatus('generating');
    setPdfMessage('');
    try {
      const res = await fetch('/api/generate/resume-pdf', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setPdfStatus('done');
        setPdfMessage(data.message || 'resume.pdf generated');
        setTimeout(() => setPdfStatus('idle'), 4000);
      } else {
        setPdfStatus('error');
        setPdfMessage(data.error || 'Generation failed');
        setTimeout(() => setPdfStatus('idle'), 5000);
      }
    } catch {
      setPdfStatus('error');
      setPdfMessage('Network error — is the server running?');
      setTimeout(() => setPdfStatus('idle'), 5000);
    }
  };

  const addRole = () => {
    if (newRole.trim()) {
      setPrefs(p => ({ ...p, targetRoles: [...p.targetRoles, newRole.trim()] }));
      setNewRole('');
    }
  };

  const removeRole = (i: number) => {
    setPrefs(p => ({ ...p, targetRoles: p.targetRoles.filter((_, idx) => idx !== i) }));
  };

  const addLocation = () => {
    if (newLocation.trim()) {
      setPrefs(p => ({ ...p, targetLocations: [...p.targetLocations, newLocation.trim()] }));
      setNewLocation('');
    }
  };

  const removeLocation = (i: number) => {
    setPrefs(p => ({ ...p, targetLocations: p.targetLocations.filter((_, idx) => idx !== i) }));
  };

  const addExclude = () => {
    if (newExclude.trim()) {
      setPrefs(p => ({ ...p, excludeCompanies: [...p.excludeCompanies, newExclude.trim()] }));
      setNewExclude('');
    }
  };

  const removeExclude = (i: number) => {
    setPrefs(p => ({ ...p, excludeCompanies: p.excludeCompanies.filter((_, idx) => idx !== i) }));
  };

  const DOMAINS = ['AI/ML', 'Design Tools', 'EdTech', 'FinTech', 'HealthTech', 'DevTools', 'Enterprise', 'Consumer'];

  const toggleDomain = (domain: string) => {
    setPrefs(p => ({
      ...p,
      targetDomains: p.targetDomains.includes(domain)
        ? p.targetDomains.filter(d => d !== domain)
        : [...p.targetDomains, domain]
    }));
  };

  const inputStyle = {
    backgroundColor: '#1A1A24',
    borderColor: 'rgba(255,255,255,0.08)',
    color: '#F4F4F5',
  };

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Settings"
        subtitle="Configure your job search preferences"
        actions={
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
            style={{ backgroundColor: '#6366F1', color: 'white' }}
          >
            <Save size={14} />
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
          </button>
        }
      />

      <div className="flex-1 overflow-auto p-6 max-w-2xl">
        <div className="space-y-6">
          {/* Personal Info */}
          <section
            className="rounded-xl p-5 border space-y-4"
            style={{ backgroundColor: '#1A1A24', borderColor: 'rgba(255,255,255,0.08)' }}
          >
            <h2 className="text-sm font-semibold" style={{ color: '#F4F4F5' }}>Personal Info</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs" style={{ color: '#A1A1AA' }}>Full Name</label>
                <input
                  type="text"
                  value={prefs.fullName}
                  onChange={e => setPrefs(p => ({ ...p, fullName: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                  style={inputStyle}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs" style={{ color: '#A1A1AA' }}>Email</label>
                <input
                  type="email"
                  value={prefs.email}
                  onChange={e => setPrefs(p => ({ ...p, email: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                  style={inputStyle}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs" style={{ color: '#A1A1AA' }}>Phone</label>
                <input
                  type="tel"
                  value={prefs.phone}
                  onChange={e => setPrefs(p => ({ ...p, phone: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                  style={inputStyle}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs" style={{ color: '#A1A1AA' }}>LinkedIn URL</label>
                <input
                  type="url"
                  value={prefs.linkedinUrl}
                  onChange={e => setPrefs(p => ({ ...p, linkedinUrl: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                  style={inputStyle}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs" style={{ color: '#A1A1AA' }}>Portfolio URL</label>
                <input
                  type="url"
                  value={prefs.portfolioUrl}
                  onChange={e => setPrefs(p => ({ ...p, portfolioUrl: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                  style={inputStyle}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs" style={{ color: '#A1A1AA' }}>Work Authorization</label>
                <select
                  value={prefs.workAuthorization}
                  onChange={e => setPrefs(p => ({ ...p, workAuthorization: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                  style={inputStyle}
                >
                  <option>Yes - citizen</option>
                  <option>Yes - visa</option>
                  <option>No</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs" style={{ color: '#A1A1AA' }}>Years of Experience</label>
                <input
                  type="number"
                  value={prefs.yearsOfExperience}
                  onChange={e => setPrefs(p => ({ ...p, yearsOfExperience: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                  style={inputStyle}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs" style={{ color: '#A1A1AA' }}>Current Company</label>
                <input
                  type="text"
                  value={prefs.currentCompany}
                  onChange={e => setPrefs(p => ({ ...p, currentCompany: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                  style={inputStyle}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs" style={{ color: '#A1A1AA' }}>Current Title</label>
                <input
                  type="text"
                  value={prefs.currentTitle}
                  onChange={e => setPrefs(p => ({ ...p, currentTitle: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                  style={inputStyle}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs" style={{ color: '#A1A1AA' }}>Start Date</label>
                <input
                  type="text"
                  placeholder="Within 2 weeks"
                  value={prefs.startDate}
                  onChange={e => setPrefs(p => ({ ...p, startDate: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                  style={inputStyle}
                />
              </div>
            </div>
          </section>

          {/* Resume Files */}
          <section
            className="rounded-xl p-5 border space-y-4"
            style={{ backgroundColor: '#1A1A24', borderColor: 'rgba(255,255,255,0.08)' }}
          >
            <h2 className="text-sm font-semibold" style={{ color: '#F4F4F5' }}>Resume Files</h2>

            {/* resume.md → PDF generator */}
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium" style={{ color: '#F4F4F5' }}>
                    Generate resume.pdf
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: '#71717A' }}>
                    Converts <code className="px-1 rounded" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>data/resume.md</code> → PDF using Playwright.
                    Needed for Playwright file upload during job apply.
                  </p>
                </div>
                <button
                  onClick={handleGeneratePdf}
                  disabled={pdfStatus === 'generating'}
                  className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
                  style={{
                    backgroundColor: pdfStatus === 'done'
                      ? 'rgba(34,197,94,0.15)'
                      : pdfStatus === 'error'
                        ? 'rgba(239,68,68,0.15)'
                        : 'rgba(99,102,241,0.15)',
                    color: pdfStatus === 'done'
                      ? '#22c55e'
                      : pdfStatus === 'error'
                        ? '#ef4444'
                        : '#6366F1',
                    border: '1px solid',
                    borderColor: pdfStatus === 'done'
                      ? 'rgba(34,197,94,0.3)'
                      : pdfStatus === 'error'
                        ? 'rgba(239,68,68,0.3)'
                        : 'rgba(99,102,241,0.3)',
                  }}
                >
                  {pdfStatus === 'generating' && <Loader2 size={14} className="animate-spin" />}
                  {pdfStatus === 'done' && <CheckCircle2 size={14} />}
                  {pdfStatus === 'error' && <FileText size={14} />}
                  {pdfStatus === 'idle' && <FileText size={14} />}
                  {pdfStatus === 'generating' ? 'Generating...' : pdfStatus === 'done' ? 'Generated!' : 'Generate PDF'}
                </button>
              </div>
              {pdfMessage && (
                <p className="text-xs" style={{ color: pdfStatus === 'error' ? '#ef4444' : '#22c55e' }}>
                  {pdfMessage}
                </p>
              )}
            </div>

            {/* Manual upload hint */}
            <div
              className="flex items-center gap-3 rounded-lg px-4 py-3"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.06)', border: '1px solid' }}
            >
              <Upload size={14} style={{ color: '#52525B', flexShrink: 0 }} />
              <p className="text-xs" style={{ color: '#52525B' }}>
                Or place your own PDF at{' '}
                <code className="px-1 rounded" style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#71717A' }}>
                  applyai/data/resume.pdf
                </code>
              </p>
            </div>
          </section>

          {/* API Keys */}
          <section
            className="rounded-xl p-5 border space-y-4"
            style={{ backgroundColor: '#1A1A24', borderColor: 'rgba(255,255,255,0.08)' }}
          >
            <h2 className="text-sm font-semibold" style={{ color: '#F4F4F5' }}>API Keys</h2>
            <div className="space-y-2">
              <label className="text-xs" style={{ color: '#A1A1AA' }}>Gemini API Key (from aistudio.google.com)</label>
              <div className="flex gap-2">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="flex-1 px-3 py-2 rounded-xl text-sm border outline-none"
                  style={inputStyle}
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="p-2 rounded-xl border transition-all"
                  style={{ backgroundColor: '#1A1A24', borderColor: 'rgba(255,255,255,0.08)', color: '#A1A1AA' }}
                >
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="text-xs" style={{ color: '#52525B' }}>
                Key is set in .env.local (local) and Vercel Environment Variables (production). This field shows the current status only.
              </p>
            </div>
          </section>

          {/* Target Roles */}
          <section
            className="rounded-xl p-5 border space-y-3"
            style={{ backgroundColor: '#1A1A24', borderColor: 'rgba(255,255,255,0.08)' }}
          >
            <h2 className="text-sm font-semibold" style={{ color: '#F4F4F5' }}>Target Roles</h2>
            <div className="flex flex-wrap gap-2">
              {prefs.targetRoles.map((role, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs"
                  style={{ backgroundColor: 'rgba(99,102,241,0.15)', color: '#6366F1' }}
                >
                  {role}
                  <button onClick={() => removeRole(i)} style={{ color: '#6366F1' }}>×</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newRole}
                onChange={e => setNewRole(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addRole()}
                placeholder="Add role..."
                className="flex-1 px-3 py-2 rounded-xl text-sm border outline-none"
                style={inputStyle}
              />
              <button
                onClick={addRole}
                className="px-3 py-2 rounded-xl text-sm font-medium"
                style={{ backgroundColor: '#6366F1', color: 'white' }}
              >
                Add
              </button>
            </div>
          </section>

          {/* Salary + Level */}
          <section
            className="rounded-xl p-5 border space-y-3"
            style={{ backgroundColor: '#1A1A24', borderColor: 'rgba(255,255,255,0.08)' }}
          >
            <h2 className="text-sm font-semibold" style={{ color: '#F4F4F5' }}>Compensation & Level</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs" style={{ color: '#A1A1AA' }}>Min Salary (USD)</label>
                <input
                  type="number"
                  value={prefs.targetSalaryMin}
                  onChange={e => setPrefs(p => ({ ...p, targetSalaryMin: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                  style={inputStyle}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs" style={{ color: '#A1A1AA' }}>Target Level</label>
                <select
                  value={prefs.targetLevel}
                  onChange={e => setPrefs(p => ({ ...p, targetLevel: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                  style={inputStyle}
                >
                  <option>Junior / Mid</option>
                  <option>Senior</option>
                  <option>Senior / Staff / Lead</option>
                  <option>Staff / Principal</option>
                  <option>Director / VP</option>
                </select>
              </div>
            </div>
          </section>

          {/* Remote Preference */}
          <section
            className="rounded-xl p-5 border space-y-3"
            style={{ backgroundColor: '#1A1A24', borderColor: 'rgba(255,255,255,0.08)' }}
          >
            <h2 className="text-sm font-semibold" style={{ color: '#F4F4F5' }}>Work Style</h2>
            <div className="flex gap-2">
              {['remote', 'hybrid', 'onsite', 'unknown'].map(opt => (
                <button
                  key={opt}
                  onClick={() => setPrefs(p => ({ ...p, remotePreference: opt as UserPreferences['remotePreference'] }))}
                  className="px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all"
                  style={{
                    backgroundColor: prefs.remotePreference === opt ? '#6366F1' : 'rgba(255,255,255,0.05)',
                    color: prefs.remotePreference === opt ? 'white' : '#A1A1AA',
                  }}
                >
                  {opt === 'unknown' ? 'Any' : opt}
                </button>
              ))}
            </div>
          </section>

          {/* Target Domains */}
          <section
            className="rounded-xl p-5 border space-y-3"
            style={{ backgroundColor: '#1A1A24', borderColor: 'rgba(255,255,255,0.08)' }}
          >
            <h2 className="text-sm font-semibold" style={{ color: '#F4F4F5' }}>Target Domains</h2>
            <div className="flex flex-wrap gap-2">
              {DOMAINS.map(domain => (
                <button
                  key={domain}
                  onClick={() => toggleDomain(domain)}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                  style={{
                    backgroundColor: prefs.targetDomains.includes(domain) ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)',
                    color: prefs.targetDomains.includes(domain) ? '#6366F1' : '#A1A1AA',
                    border: `1px solid ${prefs.targetDomains.includes(domain) ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.06)'}`,
                  }}
                >
                  {domain}
                </button>
              ))}
            </div>
          </section>

          {/* Locations */}
          <section
            className="rounded-xl p-5 border space-y-3"
            style={{ backgroundColor: '#1A1A24', borderColor: 'rgba(255,255,255,0.08)' }}
          >
            <h2 className="text-sm font-semibold" style={{ color: '#F4F4F5' }}>Target Locations</h2>
            <div className="flex flex-wrap gap-2">
              {prefs.targetLocations.map((loc, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs"
                  style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#A1A1AA' }}
                >
                  {loc}
                  <button onClick={() => removeLocation(i)}>×</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newLocation}
                onChange={e => setNewLocation(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addLocation()}
                placeholder="Add location..."
                className="flex-1 px-3 py-2 rounded-xl text-sm border outline-none"
                style={inputStyle}
              />
              <button onClick={addLocation} className="px-3 py-2 rounded-xl text-sm font-medium" style={{ backgroundColor: '#6366F1', color: 'white' }}>
                Add
              </button>
            </div>
          </section>

          {/* Min Fit Score */}
          <section
            className="rounded-xl p-5 border space-y-3"
            style={{ backgroundColor: '#1A1A24', borderColor: 'rgba(255,255,255,0.08)' }}
          >
            <h2 className="text-sm font-semibold" style={{ color: '#F4F4F5' }}>Auto-Queue Threshold</h2>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span style={{ color: '#A1A1AA' }}>Min Fit Score</span>
                <span style={{ color: '#F4F4F5' }}>{prefs.minFitScore}/10</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={prefs.minFitScore}
                onChange={e => setPrefs(p => ({ ...p, minFitScore: parseInt(e.target.value) }))}
                className="w-full accent-indigo-500"
              />
              <p className="text-xs" style={{ color: '#52525B' }}>
                Jobs scoring {prefs.minFitScore}+ will be auto-queued for application
              </p>
            </div>
          </section>

          {/* Excluded Companies */}
          <section
            className="rounded-xl p-5 border space-y-3"
            style={{ backgroundColor: '#1A1A24', borderColor: 'rgba(255,255,255,0.08)' }}
          >
            <h2 className="text-sm font-semibold" style={{ color: '#F4F4F5' }}>Excluded Companies</h2>
            <div className="flex flex-wrap gap-2">
              {prefs.excludeCompanies.map((co, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs"
                  style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#EF4444' }}
                >
                  {co}
                  <button onClick={() => removeExclude(i)}>×</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newExclude}
                onChange={e => setNewExclude(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addExclude()}
                placeholder="Company to exclude..."
                className="flex-1 px-3 py-2 rounded-xl text-sm border outline-none"
                style={inputStyle}
              />
              <button onClick={addExclude} className="px-3 py-2 rounded-xl text-sm font-medium" style={{ backgroundColor: '#EF4444', color: 'white' }}>
                Exclude
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
