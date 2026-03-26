import { EvalMetric, EvalResults, Events, ModelEvent } from "../../@types/log";
import { EvalHeader, LogDetails, LogPreview } from "../api/types";

export const toLogPreview = (header: EvalHeader | LogDetails): LogPreview => {
  return {
    eval_id: header.eval.eval_id,
    run_id: header.eval.run_id,

    task: header.eval.task,
    task_id: header.eval.task_id,
    task_version: header.eval.task_version,

    version: header.version,
    status: header.status,
    error: header.error,

    model: header.eval.model,

    started_at: header.stats?.started_at,
    completed_at: header.stats?.completed_at,

    primary_metric: primaryMetric(header.results),

    thinking_truncation: thinkingTruncation(header.results),
  };
};

const thinkingTruncation = (
  evalResults?: EvalResults | null,
): { truncated_samples: number; total_samples: number } | undefined => {
  const meta = evalResults?.metadata as
    | Record<string, unknown>
    | undefined
    | null;
  const trunc = meta?.thinking_truncation as
    | { truncated_samples?: number; total_samples?: number }
    | undefined;
  if (
    trunc &&
    typeof trunc.truncated_samples === "number" &&
    trunc.truncated_samples > 0
  ) {
    return {
      truncated_samples: trunc.truncated_samples,
      total_samples: trunc.total_samples ?? 0,
    };
  }
  return undefined;
};

const primaryMetric = (
  evalResults?: EvalResults | null,
): EvalMetric | undefined => {
  if (evalResults?.scores && evalResults?.scores.length > 0) {
    const evalMetrics = evalResults.scores[0].metrics;
    const metrics = Object.values(evalMetrics);
    if (metrics.length > 0) {
      return metrics[0];
    }
  }
  return undefined;
};

/**
 * Detect output truncation from transcript events.
 *
 * Works on both old and new eval logs — scans ModelEvent objects
 * for stop_reason === "max_tokens" with reasoning_tokens > 0.
 * This is the same logic the Python side uses to set the
 * thinking_truncated metadata flag, but computed client-side
 * so old logs without the flag still show warnings.
 */
export const detectTruncationFromEvents = (
  events: Events | undefined | null,
): boolean => {
  if (!events || events.length === 0) return false;
  for (const event of events) {
    if (isModelEvent(event) && isOutputTruncated(event)) {
      return true;
    }
  }
  return false;
};

/**
 * Type guard: is this event a ModelEvent?
 * ModelEvent has event === "model".
 */
const isModelEvent = (
  event: Events[number],
): event is ModelEvent => {
  return "event" in event && (event as ModelEvent).event === "model";
};

/**
 * Check if a ModelEvent represents output truncation on a reasoning model.
 */
const isOutputTruncated = (event: ModelEvent): boolean => {
  const output = event.output;
  if (!output) return false;
  const stopReason = output.choices?.[0]?.stop_reason;
  if (stopReason !== "max_tokens") return false;
  const reasoning = output.usage?.reasoning_tokens;
  return typeof reasoning === "number" && reasoning > 0;
};
