import { NoDataNotice } from '../../components/ui/NoDataNotice';

/**
 * Quality & Compliance
 *
 * Intentionally renders no figures. The prototype filled this screen with
 * invented numbers; showing them under a "no data" banner would be worse than
 * showing nothing, so the page states what it needs and stops.
 */
export const QualityCompliancePage = () => (
  <div className="space-y-3">
    <div>
      <h1 className="text-xl font-bold text-slate-800">Quality & Compliance</h1>
      <p className="text-xs text-slate-500">Accreditation scores, audit findings and incident log</p>
    </div>

    <NoDataNotice
      title="Accreditation scores, audit findings and incident log"
      needs="Quality & Incident Reporting"
      detail="NABH 98% / JCI 96%, infection rates and the incident log were hardcoded, with incident dates fixed to March 2024."
    />
  </div>
);
