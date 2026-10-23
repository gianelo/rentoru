import { describe, expect, it, vi } from "vitest";
import { createHomeSsrTiming } from "./home-ssr-timing";

const scope = {
  HOME_SSR_TIMING_DIAGNOSTICS: "1",
  VERCEL_ENV: "preview",
  VERCEL_GIT_COMMIT_REF: "dev",
};

describe("preview-dev home data timing", () => {
  it.each([
    { HOME_SSR_TIMING_DIAGNOSTICS: undefined },
    { HOME_SSR_TIMING_DIAGNOSTICS: "0" },
    { HOME_SSR_TIMING_DIAGNOSTICS: "true" },
    { VERCEL_ENV: undefined },
    { VERCEL_ENV: "production" },
    { VERCEL_ENV: "development" },
    { VERCEL_GIT_COMMIT_REF: undefined },
    { VERCEL_GIT_COMMIT_REF: "staging" },
    { VERCEL_GIT_COMMIT_REF: "main" },
  ])("stays silent outside the exact opt-in scope: %o", (override) => {
    const emit = vi.fn();
    const now = vi.fn(() => 0);
    const probe = createHomeSsrTiming({ env: { ...scope, ...override }, emit, now });
    const promise = Promise.resolve("unchanged");
    expect(probe.measure("cities", () => promise)).toBe(promise);
    probe.finish();
    expect(emit).not.toHaveBeenCalled();
    expect(now).not.toHaveBeenCalled();
  });

  it("emits one closed numeric record, never options, arguments, results or errors", async () => {
    const emit = vi.fn();
    const ticks = [100, 110, 140, 200];
    const value = { id: "PRIVATE_ID", token: "PRIVATE_TOKEN" };
    const probe = createHomeSsrTiming({
      env: { ...scope, PRIVATE_ENV: "PRIVATE_ENV_VALUE" },
      emit,
      now: () => ticks.shift() ?? 200,
    });
    expect(await probe.measure("cities", async () => value)).toBe(value);
    probe.finish();
    probe.finish();
    expect(emit).toHaveBeenCalledTimes(1);
    const line = String(emit.mock.calls[0]?.[0]);
    expect(JSON.parse(line)).toEqual({
      schema: "home-ssr-timing/v1",
      dataPreparationMs: 100,
      phasesMs: { cities: 30 },
    });
    expect(line).not.toContain("PRIVATE");
  });

  it("preserves action failure identity and never serializes its message", async () => {
    const error = new Error("PRIVATE_ERROR");
    const emit = vi.fn();
    let time = 0;
    const probe = createHomeSsrTiming({ env: scope, emit, now: () => time++ });
    await expect(
      probe.measure("collections", async () => {
        throw error;
      }),
    ).rejects.toBe(error);
    probe.finish();
    expect(emit).toHaveBeenCalledTimes(1);
    expect(String(emit.mock.calls[0]?.[0])).not.toContain("PRIVATE");
  });

  it("isolates diagnostic failures without changing application results", async () => {
    const probe = createHomeSsrTiming({
      env: scope,
      now: () => {
        throw new Error("clock");
      },
      emit: () => {
        throw new Error("sink");
      },
    });
    expect(await probe.measure("covers", async () => 42)).toBe(42);
    expect(() => probe.finish()).not.toThrow();
  });

  it("reports unknown for invalid or backwards clocks rather than fake durations", async () => {
    const emit = vi.fn();
    const ticks = [Number.NaN, 10, 5, Number.POSITIVE_INFINITY];
    const probe = createHomeSsrTiming({ env: scope, emit, now: () => ticks.shift() ?? 0 });
    await probe.measure("session", async () => null);
    probe.finish();
    expect(JSON.parse(String(emit.mock.calls[0]?.[0]))).toEqual({
      schema: "home-ssr-timing/v1",
      dataPreparationMs: null,
      phasesMs: { session: null },
    });
  });

  it("does not serialize unrecognized phase labels", async () => {
    const emit = vi.fn();
    const probe = createHomeSsrTiming({ env: scope, emit, now: () => 0 });
    expect(await probe.measure("PRIVATE_PHASE" as never, async () => 7)).toBe(7);
    probe.finish();
    expect(JSON.parse(String(emit.mock.calls[0]?.[0])).phasesMs).toEqual({});
    expect(String(emit.mock.calls[0]?.[0])).not.toContain("PRIVATE");
  });

  it("starts parallel work immediately and keeps its original result order", async () => {
    const started: string[] = [];
    const probe = createHomeSsrTiming({ env: scope, emit: () => {}, now: () => 0 });
    let finishCities!: (value: string) => void;
    const cities = probe.measure("cities", () => {
      started.push("cities");
      return new Promise<string>((resolve) => {
        finishCities = resolve;
      });
    });
    const zones = probe.measure("activeZones", async () => {
      started.push("zones");
      return "zones";
    });
    expect(started).toEqual(["cities", "zones"]);
    finishCities("cities");
    expect(await Promise.all([cities, zones])).toEqual(["cities", "zones"]);
  });
});
