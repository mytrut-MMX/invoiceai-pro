// SEC-005: Anthropic API key MUST NOT be stored client-side. All AI calls go through /api/claude-proxy.

const SETTINGS_KEY = 'iai_settings';

const DEFAULT_SETTINGS = {
  emailjs_service: '',
  emailjs_template: '',
  emailjs_public: '',
};

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    // Strip anthropic_key if it exists from legacy data
    const { anthropic_key: _removed, ...safe } = parsed;
    return { ...DEFAULT_SETTINGS, ...safe };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  // Ensure anthropic_key is never persisted
  const { anthropic_key: _removed, ...safe } = settings;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(safe));
}
