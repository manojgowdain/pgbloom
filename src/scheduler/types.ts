import { Pool } from "pg";
import { LocalStore } from "../storage/local/types.js";

export interface SchedulerState {
  pool: Pool;
  localStore: LocalStore | null;
  workerId: string; // Unique identifier for this scheduler instance
}

export interface ScheduleOptions {
  name: string;
  payload: unknown;
  runAt: Date;
  priority?: number;
  maxAttempts?: number;
  interval?: string; // Cron-like expression for recurring jobs
}

export interface ScheduledJob {
  id: number;
  name: string;
  payload: unknown;
  runAt: Date;
  priority: number;
  attempts: number;
  maxAttempts: number;
  status: 'scheduled' | 'processing' | 'completed' | 'failed' | 'cancelled';
  interval?: string;
  lastRunAt?: Date;
  nextRunAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScheduleResult {
  job: ScheduledJob;
}

export interface SchedulerWorkerOptions {
  pollingInterval?: number; // How often to check for due jobs (ms)
}