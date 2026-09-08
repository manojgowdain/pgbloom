import { expect, test } from "bun:test";
import { BloomFilter, createPgbloom } from "../dist/esm/index.js";

test("Bun can load the built ESM package", () => {
  const filter = new BloomFilter({ expectedItems: 10, falsePositiveRate: 0.01 });
  filter.add("bun");
  expect(filter.has("bun")).toBe(true);
  expect(typeof createPgbloom).toBe("function");
});
