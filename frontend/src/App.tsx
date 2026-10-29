import { useEffect, useState } from 'react';
import { Switchboard } from './components/Switchboard';

type ToggleState = {
  codeRabbit: boolean;
  devin: boolean;
  claude: boolean;
  openAI: boolean;
  cursor: boolean;
};

const defaultState: ToggleState = {
  codeRabbit: true,
  devin: true,
  claude: true,
  openAI: true,
  cursor: true,
};

export default function App() {
  const [toggles, setToggles] = useState<ToggleState>(defaultState);
  const [prompt, setPrompt] = useState('Fix this React bug and explain the patch.');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadInitialState = async () => {
      try {
        const response = await fetch('/api/config');
        if (response.ok) {
          const next = await response.json();
          setToggles({ ...defaultState, ...next });
        }
      } catch (error) {
        console.error('Failed to load config', error);
      }
    };

    loadInitialState();
  }, []);

  const handleToggle = async (key: keyof ToggleState) => {
    const nextValue = !toggles[key];
    const nextState = { ...toggles, [key]: nextValue };
    setToggles(nextState);

    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: nextValue }),
      });
    } catch (error) {
      console.error('Failed to persist switch state', error);
    }
  };

  const handleSubmit = async () => {
    if (!prompt.trim()) {
      return;
    }

    setLoading(true);
    setResponse('');

    try {
      const result = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      const data = await result.json();
      setResponse(data.output ?? 'No response received.');
    } catch (error) {
      setResponse(`Request failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-obsidian text-zinc-100">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <header className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-gold/80">AI Switchboard</p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-white md:text-5xl">
              Route the noise.<br />Keep the signal.
            </h1>
          </div>
          <div className="rounded-full border border-gold/40 bg-zinc-900/80 px-4 py-2 text-sm text-zinc-300 shadow-glow">
            {Object.values(toggles).filter(Boolean).length} / {Object.keys(toggles).length} ports live
          </div>
        </header>

        <Switchboard toggles={toggles} onToggle={handleToggle} />

        <section className="mt-10 rounded-3xl border border-zinc-800 bg-zinc-950/80 p-6 shadow-[0_0_30px_rgba(0,0,0,0.35)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-white">Unified Chat</h2>
            <button
              type="button"
              onClick={handleSubmit}
              className="rounded-full bg-gradient-to-r from-gold to-yellow-500 px-4 py-2 text-sm font-medium text-stone-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={loading || !prompt.trim()}
            >
              {loading ? 'Routing...' : 'Send Prompt'}
            </button>
          </div>

          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={4}
            className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-200 outline-none ring-0 transition focus:border-gold/80"
            placeholder="Type your prompt to route only through active AI tools..."
          />

          {response && (
            <div className="mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-sm leading-7 text-emerald-100">
              <p className="mb-2 text-xs uppercase tracking-[0.2em] text-emerald-300">Response</p>
              <pre className="whitespace-pre-wrap font-sans">{response}</pre>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
