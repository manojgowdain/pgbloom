import { BloomFilter, serialize, validateKey } from "../src/browser.ts";

Deno.test("Deno JSR entrypoint exposes runtime-safe APIs", () => {
  const filter = new BloomFilter({ expectedItems: 10, falsePositiveRate: 0.01 });
  filter.add("deno");
  if (!filter.has("deno")) throw new Error("Bloom filter did not retain Deno value");
  if (serialize({ runtime: "deno" }).length === 0) throw new Error("serialization failed");
  validateKey("deno-key");
});
