import { motion } from 'framer-motion';
import { NoDataNotice } from '../../../components/ui/NoDataNotice';

/**
 * Clinical Rules Master.
 *
 * The prototype filled this screen from a mock generator that invented rows on
 * every mount — names borrowed from an unrelated lookup table, codes like
 * "CODE-101", and a random third of them marked Inactive. None of it was
 * stored, and nothing in the system read it.
 *
 * It is left unbuilt rather than given a name/code/status table: a clinical
 * rule needs a trigger, a condition and an action to mean anything, and there
 * is no rules engine to evaluate one. Showing that plainly is more honest than
 * a grid of fabricated rules that look configured.
 */
export const ClinicalRulesMaster = () => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="h-full flex flex-col"
  >
    <div className="mb-4">
      <h1 className="text-2xl font-bold text-slate-800">Clinical Rules</h1>
      <p className="text-slate-500 text-xs">Clinical decision-support rules</p>
    </div>

    <NoDataNotice
      title="Clinical rules are not configurable yet"
      needs="Clinical Decision Support"
      detail="A rule needs a trigger (an order, a result, a vital), a condition to evaluate and an action to take — an alert, a block, a suggested order. None of those exist in the system today, so there is nothing for a rule to act on. This screen previously showed rows invented on page load; they were never saved anywhere."
    />
  </motion.div>
);
