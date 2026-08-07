import { NoDataNotice } from './components/NoDataNotice';

/**
 * Patient Experience
 *
 * Intentionally renders no figures. The prototype filled this screen with
 * invented numbers; showing them under a "no data" banner would be worse than
 * showing nothing, so the page states what it needs and stops.
 */
export const PatientExperiencePage = () => (
  <div className="space-y-3">
    <div>
      <h1 className="text-xl font-bold text-slate-800">Patient Experience</h1>
      <p className="text-xs text-slate-500">NPS, satisfaction ratings and patient feedback</p>
    </div>

    <NoDataNotice
      title="NPS, satisfaction ratings and patient feedback"
      needs="Patient Feedback"
      detail="No survey or feedback capture exists. The prototype showed an NPS of 78, a 4.6 average rating and four written testimonials, none of which were collected from anyone."
    />
  </div>
);
