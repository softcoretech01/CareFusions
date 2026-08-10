import { motion } from 'framer-motion';
import { NoDataNotice } from '../../../components/ui/NoDataNotice';

/**
 * Prompts Master.
 *
 * Same story as Clinical Rules: the screen was filled by a mock generator that
 * produced rows on every mount and stored nothing. A prompt template needs a
 * model, a body with variables and somewhere it is invoked from — none of which
 * the system has.
 */
export const PromptsMaster = () => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="h-full flex flex-col"
  >
    <div className="mb-4">
      <h1 className="text-2xl font-bold text-slate-800">Prompts Master</h1>
      <p className="text-slate-500 text-xs">AI prompt templates</p>
    </div>

    <NoDataNotice
      title="Prompt templates are not configurable yet"
      needs="AI Assistant"
      detail="A prompt template needs a target model, a body with substitutable variables, and a screen or workflow that invokes it. No part of CareFusions calls a model today. This screen previously showed rows invented on page load; they were never saved anywhere."
    />
  </motion.div>
);
