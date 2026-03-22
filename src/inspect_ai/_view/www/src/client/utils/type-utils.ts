import { EvalMetric, EvalResults } from "../../@types/log";
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
