/**
 * Cache integration tests via HTTP.
 */

import { runTest, assert, assertEqual, assertOk, assertDeepEqual, waitFor, getResults, resetResults } from "../helpers/assertions.js";
import { post, get, del, head } from "../helpers/http.js";
import { key, sleep } from "../helpers/test-data.js";

export async function runTests(baseUrl) {
  resetResults();

  await runTest("Cache SET and GET", async () => {
    const k = key("cache:1");
    const val = { name: "John", age: 30, tags: ["a", "b"] };
    const r = await post(baseUrl, "/cache", { key: k, value: val, ttl: 60000 });
    assertOk(r, "POST /cache");
    const g = await get(baseUrl, `/cache/${k}`);
    assertOk(g, "GET /cache");
    assertDeepEqual(g.json.value, val);
  });

  await runTest("Cache GET missing key returns 404", async () => {
    const g = await get(baseUrl, `/cache/${key("missing")}`);
    assertEqual(g.status, 404);
  });

  await runTest("Cache EXISTS endpoint", async () => {
    const k = key("cache:exists:1");
    await post(baseUrl, "/cache", { key: k, value: "exists" });
    const e1 = await get(baseUrl, `/cache/${k}/exists`);
    assertOk(e1);
    assertEqual(e1.json.exists, true);
    const e2 = await get(baseUrl, `/cache/${key("cache:exists:2")}/exists`);
    assertOk(e2);
    assertEqual(e2.json.exists, false);
  });

  await runTest("Cache HEAD request", async () => {
    const k = key("cache:head:1");
    await post(baseUrl, "/cache", { key: k, value: "head-test" });
    const h = await head(baseUrl, `/cache/${k}`);
    assertEqual(h.status, 200);
    const h2 = await head(baseUrl, `/cache/${key("cache:head:missing")}`);
    assertEqual(h2.status, 404);
  });

  await runTest("Cache DELETE", async () => {
    const k = key("cache:del:1");
    await post(baseUrl, "/cache", { key: k, value: "to-delete" });
    const g1 = await get(baseUrl, `/cache/${k}`);
    assertOk(g1);
    const d = await del(baseUrl, `/cache/${k}`);
    assertOk(d);
    const g2 = await get(baseUrl, `/cache/${k}`);
    assertEqual(g2.status, 404);
    const e = await get(baseUrl, `/cache/${k}/exists`);
    assertEqual(e.json.exists, false);
  });

  await runTest("Cache TTL expiration", async () => {
    const k = key("cache:ttl:1");
    await post(baseUrl, "/cache", { key: k, value: "ttl-test", ttl: 2000 }); // 2000ms
    const g1 = await get(baseUrl, `/cache/${k}`);
    assertOk(g1);
    await sleep(2500); // wait for expiration
    const g2 = await get(baseUrl, `/cache/${k}`);
    assertEqual(g2.status, 404);
  });

  await runTest("Cache clear expired", async () => {
    const k1 = key("cache:clear-exp:1");
    const k2 = key("cache:clear-exp:2");
    await post(baseUrl, "/cache", { key: k1, value: "expired-soon", ttl: 100 });
    await post(baseUrl, "/cache", { key: k2, value: "persistent", ttl: 60000 });
    await sleep(150);
    const r = await post(baseUrl, "/cache/clear-expired");
    assertOk(r);
    assert(r.json.deleted >= 1, "should delete at least 1 expired");
    const g1 = await get(baseUrl, `/cache/${k1}`);
    assertEqual(g1.status, 404);
    const g2 = await get(baseUrl, `/cache/${k2}`);
    assertOk(g2);
  });

  await runTest("Cache types: string, number, boolean, null, array", async () => {
    const tests = [
      { key: key("cache:type:str"), value: "hello" },
      { key: key("cache:type:num"), value: 42 },
      { key: key("cache:type:bool"), value: true },
      { key: key("cache:type:null"), value: null },
      { key: key("cache:type:arr"), value: [1, 2, 3] },
    ];
    for (const t of tests) {
      const s = await post(baseUrl, "/cache", { key: t.key, value: t.value });
      assertOk(s);
      const g = await get(baseUrl, `/cache/${encodeURIComponent(t.key)}`);
      assertOk(g);
      assertDeepEqual(g.json.value, t.value);
    }
  });

  // Test complex object with nested structures
  await runTest("Cache complex nested object", async () => {
    const k = key("cache:complex");
    const val = {
      user: { id: 1, name: "Test", meta: { tags: ["a", "b"], active: true } },
      items: [{ id: 1, qty: 2 }, { id: 2, qty: 5 }],
    };
    const s = await post(baseUrl, "/cache", { key: k, value: val });
    assertOk(s);
    const g = await get(baseUrl, `/cache/${k}`);
    assertOk(g);
    assertDeepEqual(g.json.value, val);
  });

  // Test special characters in key
  await runTest("Cache key with special characters", async () => {
    const k = key("cache:special:user:123:session:abc!@#$%^&*()");
    const s = await post(baseUrl, "/cache", { key: k, value: "special" });
    assertOk(s);
    // URL encode the key for GET request
    const encodedKey = encodeURIComponent(k);
    const g = await get(baseUrl, `/cache/${encodedKey}`);
    assertOk(g);
    assertEqual(g.json.value, "special");
  });
}