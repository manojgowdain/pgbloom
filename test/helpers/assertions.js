/**
 * Test result tracker and assertion helpers.
 *
 * Each test calls `runTest(name, fn)` which records PASS/FAIL/SKIP
 * and prints structured failure output.
 */

import { setTimeout as sleep } from "node:timers/promises";

const results = {
  passed: [],
  failed: [],
  skipped: [],
};

export function resetResults() {
  results.passed = [];
  results.failed = [];
  results.skipped = [];
}

export function getResults() {
  return results;
}

export class TestError extends Error {
  constructor(message, context = {}) {
    super(message);
    this.name = "TestError";
    this.context = context;
  }
}

export async function runTest(name, fn, { skip = false, skipReason = "not implemented" } = {}) {
  if (skip) {
    results.skipped.push({ name, reason: skipReason });
    console.log(`  SKIP  ${name}  (${skipReason})`);
    return;
  }
  const start = Date.now();
  try {
    await fn();
    const ms = Date.now() - start;
    results.passed.push({ name, ms });
    console.log(`  PASS  ${name}  (${ms}ms)`);
  } catch (err) {
    const ms = Date.now() - start;
    results.failed.push({ name, ms, error: err });
    console.log(`  FAIL  ${name}  (${ms}ms)`);
    printFailure(name, err);
  }
}

function printFailure(name, err) {
  const ctx = err.context ?? {};
  console.log("");
  console.log(`  FAIL: ${name}`);
  if (err.message) console.log(`  Error: ${err.message}`);
  for (const [k, v] of Object.entries(ctx)) {
    console.log(`  ${k}: ${typeof v === "string" ? v : JSON.stringify(v, null, 2)}`);
  }
  if (err.stack) {
    const lines = err.stack.split("\n").slice(0, 5);
    console.log(`  Stack: ${lines.join("\n          ")}`);
  }
  console.log("");
}

export function assert(cond, msg, context = {}) {
  if (!cond) throw new TestError(msg, context);
}

export function assertEqual(actual, expected, msg = "values not equal", context = {}) {
  if (actual !== expected && !(Number.isNaN(actual) && Number.isNaN(expected))) {
    throw new TestError(
      msg,
      { expected, actual, ...context },
    );
  }
}

export function assertDeepEqual(actual, expected, msg = "objects not deep equal", context = {}) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    throw new TestError(msg, { expected, actual, ...context });
  }
}

export function assertOk(res, label = "HTTP") {
  if (!res.ok) {
    throw new TestError(`${label} failed`, {
      status: res.status,
      body: res.text,
      json: res.json,
    });
  }
  return res;
}

export async function waitFor(label, predicate, { timeoutMs = 5000, intervalMs = 50 } = {}) {
  const deadline = Date.now() + timeoutMs;
  let last;
  while (Date.now() < deadline) {
    try {
      last = await predicate();
      if (last) return last;
    } catch (err) {
      last = err;
    }
    await sleep(intervalMs);
  }
  throw new TestError(`waitFor timed out: ${label}`, { timeoutMs, lastResult: last instanceof Error ? last.message : last });
}

export function printSummary() {
  console.log("");
  console.log("==================================================");
  console.log("PGBLOOM API INTEGRATION TEST RESULT");
  console.log("==================================================");
  console.log(`Passed:  ${results.passed.length}`);
  console.log(`Failed:  ${results.failed.length}`);
  console.log(`Skipped: ${results.skipped.length}`);
  if (results.failed.length > 0) {
    console.log("");
    console.log("FAILED TESTS:");
    for (const f of results.failed) {
      console.log(`  - ${f.name}: ${f.error?.message ?? "?"}`);
    }
  }
  if (results.skipped.length > 0) {
    console.log("");
    console.log("SKIPPED TESTS:");
    for (const s of results.skipped) {
      console.log(`  - ${s.name}: ${s.reason}`);
    }
  }
  console.log("==================================================");
}
