import { NoDataNotice } from './components/NoDataNotice';

/**
 * AI Intelligence
 *
 * Intentionally renders no figures. The prototype filled this screen with
 * invented numbers; showing them under a "no data" banner would be worse than
 * showing nothing, so the page states what it needs and stops.
 */
export const AIIntelligencePage = () => (
  <div className="space-y-3">
    <div>
      <h1 className="text-xl font-bold text-slate-800">AI Intelligence</h1>
      <p className="text-xs text-slate-500">Conversational analytics over hospital data</p>
    </div>

    <NoDataNotice
      title="Conversational analytics over hospital data"
      needs="AI Analytics Service"
      detail="The chat was a fixed script: the prompt, the reply and its figures were written into the page, and the input box had no handler."
    />
  </div>
);
