/**
 * Events integration tests via HTTP.
 */

import { runTest, assert, assertEqual, assertOk, assertDeepEqual, waitFor } from "../helpers/assertions.js";
import { post, get, del } from "../helpers/http.js";
import { eventType, sleep } from "../helpers/test-data.js";

export async function runTests(baseUrl) {
  await runTest("Events emit and listen", async () => {
    const type = eventType("events:basic");
    const payload = { userId: 123, action: "created" };

    // Start listener
    const lst = await post(baseUrl, "/events/listen", { type });
    assertOk(lst);
    const listenerId = lst.json.listenerId;

    // Emit event
    const emit = await post(baseUrl, "/events/emit", { type, payload });
    assertOk(emit);
    const eventId = emit.json.eventId;
    assert(eventId, "should return eventId");

    // Wait for delivery
    await waitFor(`event delivery`, async () => {
      const msgs = await get(baseUrl, `/events/messages/${listenerId}`);
      return msgs.json.events.length > 0;
    });

    const msgs = await get(baseUrl, `/events/messages/${listenerId}`);
    assertEqual(msgs.json.events.length, 1);
    assertDeepEqual(msgs.json.events[0].payload, payload);
    assertEqual(msgs.json.events[0].type, type);
    assertEqual(msgs.json.events[0].meta.isReplay, false);

    // Cleanup
    await del(baseUrl, `/events/listen/${listenerId}`);
  });

  await runTest("Events multiple listeners", async () => {
    const type = eventType("events:multi");
    const lst1 = await post(baseUrl, "/events/listen", { type });
    assertOk(lst1);
    const lst2 = await post(baseUrl, "/events/listen", { type });
    assertOk(lst2);

    await post(baseUrl, "/events/emit", { type, payload: { multi: true } });

    await waitFor("lst1 gets event", async () => {
      const m = await get(baseUrl, `/events/messages/${lst1.json.listenerId}`);
      return m.json.events.length > 0;
    });
    await waitFor("lst2 gets event", async () => {
      const m = await get(baseUrl, `/events/messages/${lst2.json.listenerId}`);
      return m.json.events.length > 0;
    });

    const m1 = await get(baseUrl, `/events/messages/${lst1.json.listenerId}`);
    const m2 = await get(baseUrl, `/events/messages/${lst2.json.listenerId}`);
    assertEqual(m1.json.events.length, 1);
    assertEqual(m2.json.events.length, 1);

    await del(baseUrl, `/events/listen/${lst1.json.listenerId}`);
    await del(baseUrl, `/events/listen/${lst2.json.listenerId}`);
  });

  await runTest("Events history persistence", async () => {
    const type = eventType("events:history");
    const payload = { data: "persistent" };

    // Emit
    await post(baseUrl, "/events/emit", { type, payload });

    // Query history
    const hist = await get(baseUrl, `/events/history?type=${type}&limit=10`);
    assertOk(hist);
    assert(hist.json.events.length >= 1);
    const found = hist.json.events.find(e => e.type === type);
    assert(found, "event should be in history");
    assertDeepEqual(found.payload, payload);
  });

  await runTest("Events history with time filter", async () => {
    const type = eventType("events:timefilter");
    const from = new Date(Date.now() - 60000).toISOString();
    const to = new Date(Date.now() + 60000).toISOString();

    await post(baseUrl, "/events/emit", { type, payload: { in: "range" } });

    const hist = await get(baseUrl, `/events/history?type=${type}&from=${from}&to=${to}&limit=10`);
    assertOk(hist);
    assert(hist.json.events.length >= 1);
  });

  await runTest("Events replay", async () => {
    const type = eventType("events:replay");
    const payload1 = { seq: 1 };
    const payload2 = { seq: 2 };
    const payload3 = { seq: 3 };

    await post(baseUrl, "/events/emit", { type, payload: payload1 });
    await sleep(50);
    await post(baseUrl, "/events/emit", { type, payload: payload2 });
    await sleep(50);
    await post(baseUrl, "/events/emit", { type, payload: payload3 });

    const from = new Date(Date.now() - 10000).toISOString();
    const to = new Date(Date.now() + 10000).toISOString();

    const replay = await post(baseUrl, "/events/replay", { from, to, type });
    assertOk(replay);
    assertEqual(replay.json.replayed, 3);

    // Replay events should have isReplay=true in metadata
    // We'd need a listener to verify this; for now just verify count
  });

  await runTest("Events pagination", async () => {
    const type = eventType("events:page");
    const count = 25;

    for (let i = 0; i < count; i++) {
      await post(baseUrl, "/events/emit", { type, payload: { idx: i } });
    }

    // First page
    const page1 = await get(baseUrl, `/events/history?type=${type}&limit=10`);
    assertOk(page1);
    assertEqual(page1.json.events.length, 10);
    assert(page1.json.nextCursor, "should have cursor");

    // Second page
    const page2 = await get(baseUrl, `/events/history?type=${type}&limit=10&cursor=${page1.json.nextCursor}`);
    assertOk(page2);
    assertEqual(page2.json.events.length, 10);

    // Third page (5 remaining)
    const page3 = await get(baseUrl, `/events/history?type=${type}&limit=10&cursor=${page2.json.nextCursor}`);
    assertOk(page3);
    assertEqual(page3.json.events.length, 5);
    assert(!page3.json.nextCursor, "no more pages");
  });

  await runTest("Events unsubscribe", async () => {
    const type = eventType("events:unsub");
    const lst1 = await post(baseUrl, "/events/listen", { type });
    assertOk(lst1);
    const lst2 = await post(baseUrl, "/events/listen", { type });
    assertOk(lst2);

    await post(baseUrl, "/events/emit", { type, payload: 1 });
    await sleep(100);

    // Unsubscribe lst1
    await del(baseUrl, `/events/listen/${lst1.json.listenerId}`);

    await post(baseUrl, "/events/emit", { type, payload: 2 });
    await sleep(100);

    const m1 = await get(baseUrl, `/events/messages/${lst1.json.listenerId}`);
    const m2 = await get(baseUrl, `/events/messages/${lst2.json.listenerId}`);
    assertEqual(m1.json.events.length, 1); // only first event
    assertEqual(m2.json.events.length, 2); // both events

    await del(baseUrl, `/events/listen/${lst2.json.listenerId}`);
  });

  await runTest("Events metadata", async () => {
    const type = eventType("events:meta");
    const metadata = { source: "test", version: "1.0" };

    const lst = await post(baseUrl, "/events/listen", { type });
    assertOk(lst);

    await post(baseUrl, "/events/emit", { type, payload: { data: "meta" }, metadata });

    await waitFor("event with metadata", async () => {
      const m = await get(baseUrl, `/events/messages/${lst.json.listenerId}`);
      return m.json.events.length > 0;
    });

    const msgs = await get(baseUrl, `/events/messages/${lst.json.listenerId}`);
    assert(msgs.json.events[0].meta.source === "test", "metadata should be passed through");
    assert(msgs.json.events[0].meta.version === "1.0");

    await del(baseUrl, `/events/listen/${lst.json.listenerId}`);
  });
}