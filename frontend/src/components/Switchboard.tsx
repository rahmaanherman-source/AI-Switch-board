import { motion } from 'framer-motion';

type ToggleState = {
  codeRabbit: boolean;
  devin: boolean;
  claude: boolean;
  openAI: boolean;
  cursor: boolean;
};

type SwitchboardProps = {
  toggles: ToggleState;
  onToggle: (key: keyof ToggleState) => void;
};

const portCards: Array<{ key: keyof ToggleState; label: string; subtitle: string; accent: string }> = [
  { key: 'codeRabbit', label: 'CodeRabbit', subtitle: 'PR review lane', accent: 'from-amber-500 to-emerald-500' },
  { key: 'devin', label: 'Devin', subtitle: 'Autonomous work', accent: 'from-purple-500 to-indigo-500' },
  { key: 'claude', label: 'Claude', subtitle: 'Deep reasoning', accent: 'from-cyan-500 to-blue-500' },
  { key: 'openAI', label: 'OpenAI', subtitle: 'General assistant', accent: 'from-green-500 to-emerald-500' },
  { key: 'cursor', label: 'Cursor', subtitle: 'IDE copilot', accent: 'from-rose-500 to-orange-500' },
];

export function Switchboard({ toggles, onToggle }: SwitchboardProps) {
  return (
    <section className="rounded-[2rem] border border-zinc-800 bg-zinc-950/90 p-5 shadow-[0_0_30px_rgba(201,168,76,0.08)] md:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-gold/80">Switchboard</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Mute the noise</h2>
        </div>
        <div className="h-px flex-1 bg-gradient-to-r from-gold/40 via-gold/10 to-transparent" />
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        {portCards.map(({ key, label, subtitle, accent }) => {
          const enabled = toggles[key];

          return (
            <motion.article
              key={key}
              whileHover={{ y: -4, scale: 1.01 }}
              className="rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900 p-5"
            >
              <div className={`mb-5 h-2 w-full rounded-full bg-gradient-to-r ${accent} ${enabled ? 'opacity-100' : 'opacity-30'}`} />

              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold text-white">{label}</p>
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">{subtitle}</p>
                </div>
                <div
                  className={`flex h-10 w-16 items-center rounded-full p-1 transition ${
                    enabled ? 'bg-emerald-500/90 shadow-[0_0_18px_rgba(16,185,129,0.6)]' : 'bg-zinc-700'
                  }`}
                >
                  <button
                    type="button"
                    aria-label={`Toggle ${label}`}
                    onClick={() => onToggle(key)}
                    className={`h-8 w-8 rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-0'}`}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-xs uppercase tracking-[0.2em]">
                <span className={enabled ? 'text-emerald-400' : 'text-zinc-500'}>{enabled ? 'Live' : 'Muted'}</span>
                <span className="text-zinc-400">Port {enabled ? 'Open' : 'Closed'}</span>
              </div>
            </motion.article>
          );
        })}
      </div>
    </section>
  );
}
