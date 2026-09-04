/**
 * Pub/Sub integration tests via HTTP.
 */

import { runTest, assert, assertEqual, assertOk, assertDeepEqual, waitFor } from "../helpers/assertions.js";
import { post, get, del } from "../helpers/http.js";
import { channel, sleep } from "../helpers/test-data.js";

export async function runTests(baseUrl) {
  await runTest("PubSub publish and subscribe", async () => {
    const ch = channel("pubsub:basic");
    const sub = await post(baseUrl, "/pubsub/subscribe", { channel: ch });
    assertOk(sub);
    const subscriberId = sub.json.subscriberId;

    const pub = await post(baseUrl, "/pubsub/publish", { channel: ch, message: { hello: "world" } });
    assertOk(pub);

    // Wait for message to arrive - give more time
    await waitFor(`message on ${ch}`, async () => {
      const msgs = await get(baseUrl, `/pubsub/messages/${subscriberId}`);
      return msgs.json.messages.length > 0;
    }, { timeoutMs: 5000, intervalMs: 100 });

    const msgs = await get(baseUrl, `/pubsub/messages/${subscriberId}`);
    assertEqual(msgs.json.messages.length, 1);
    assertDeepEqual(msgs.json.messages[0].payload, { hello: "world" });
    assertEqual(msgs.json.messages[0].channel, ch);

    // Cleanup
    await del(baseUrl, `/pubsub/subscribe/${subscriberId}`);
  });

  await runTest("PubSub multiple subscribers", async () => {
    const ch = channel("pubsub:multi");
    const sub1 = await post(baseUrl, "/pubsub/subscribe", { channel: ch });
    assertOk(sub1);
    const sub2 = await post(baseUrl, "/pubsub/subscribe", { channel: ch });
    assertOk(sub2);

    await post(baseUrl, "/pubsub/publish", { channel: ch, message: { multi: true } });

    await waitFor("sub1 gets message", async () => {
      const m = await get(baseUrl, `/pubsub/messages/${sub1.json.subscriberId}`);
      return m.json.messages.length > 0;
    }, { timeoutMs: 5000, intervalMs: 100 });
    await waitFor("sub2 gets message", async () => {
      const m = await get(baseUrl, `/pubsub/messages/${sub2.json.subscriberId}`);
      return m.json.messages.length > 0;
    }, { timeoutMs: 5000, intervalMs: 100 });

    const m1 = await get(baseUrl, `/pubsub/messages/${sub1.json.subscriberId}`);
    const m2 = await get(baseUrl, `/pubsub/messages/${sub2.json.subscriberId}`);
    assertEqual(m1.json.messages.length, 1);
    assertEqual(m2.json.messages.length, 1);
    assertDeepEqual(m1.json.messages[0].payload, { multi: true });
    assertDeepEqual(m2.json.messages[0].payload, { multi: true });

    await del(baseUrl, `/pubsub/subscribe/${sub1.json.subscriberId}`);
    await del(baseUrl, `/pubsub/subscribe/${sub2.json.subscriberId}`);
  });

  await runTest("PubSub unsubscribe", async () => {
    const ch = channel("pubsub:unsub");
    const sub1 = await post(baseUrl, "/pubsub/subscribe", { channel: ch });
    assertOk(sub1);
    const sub2 = await post(baseUrl, "/pubsub/subscribe", { channel: ch });
    assertOk(sub2);

    await post(baseUrl, "/pubsub/publish", { channel: ch, message: 1 });
    await waitFor("sub1 gets message 1", async () => {
      const m = await get(baseUrl, `/pubsub/messages/${sub1.json.subscriberId}`);
      return m.json.messages.length > 0;
    }, { timeoutMs: 5000, intervalMs: 100 });

    // Unsubscribe sub1
    await del(baseUrl, `/pubsub/subscribe/${sub1.json.subscriberId}`);

    await post(baseUrl, "/pubsub/publish", { channel: ch, message: 2 });
    await waitFor("sub2 gets message 2", async () => {
      const m = await get(baseUrl, `/pubsub/messages/${sub2.json.subscriberId}`);
      return m.json.messages.length > 0;
    }, { timeoutMs: 5000, intervalMs: 100 });

    const m1 = await get(baseUrl, `/pubsub/messages/${sub1.json.subscriberId}`);
    const m2 = await get(baseUrl, `/pubsub/messages/${sub2.json.subscriberId}`);
    // sub1 should not get message 2
    assertEqual(m1.json.messages.length, 1); // only message 1
    assertEqual(m1.json.messages[0].payload, 1);
    // sub2 should get both
    assertEqual(m2.json.messages.length, 2);
    assertEqual(m2.json.messages[0].payload, 1);
    assertEqual(m2.json.messages[1].payload, 2);

    await del(baseUrl, `/pubsub/subscribe/${sub2.json.subscriberId}`);
  });

  await runTest("PubSub multiple channels", async () => {
    const ch1 = channel("pubsub:chan1");
    const ch2 = channel("pubsub:chan2");
    const sub1 = await post(baseUrl, "/pubsub/subscribe", { channel: ch1 });
    assertOk(sub1);
    const sub2 = await post(baseUrl, "/pubsub/subscribe", { channel: ch2 });
    assertOk(sub2);

    await post(baseUrl, "/pubsub/publish", { channel: ch1, message: "chan1" });
    await post(baseUrl, "/pubsub/publish", { channel: ch2, message: "chan2" });
    await sleep(100);

    const m1 = await get(baseUrl, `/pubsub/messages/${sub1.json.subscriberId}`);
    const m2 = await get(baseUrl, `/pubsub/messages/${sub2.json.subscriberId}`);
    assertEqual(m1.json.messages.length, 1);
    assertEqual(m1.json.messages[0].payload, "chan1");
    assertEqual(m2.json.messages.length, 1);
    assertEqual(m2.json.messages[0].payload, "chan2");

    await del(baseUrl, `/pubsub/subscribe/${sub1.json.subscriberId}`);
    await del(baseUrl, `/pubsub/subscribe/${sub2.json.subscriberId}`);
  });

  await runTest("PubSub channels list", async () => {
    const ch = channel("pubsub:list");
    const sub = await post(baseUrl, "/pubsub/subscribe", { channel: ch });
    assertOk(sub);

    const list = await get(baseUrl, "/pubsub/channels");
    assertOk(list);
    assert(list.json.channels.includes(ch), "channel should be in list");

    await del(baseUrl, `/pubsub/subscribe/${sub.json.subscriberId}`);
  });

  await runTest("PubSub rapid publishing", async () => {
    const ch = channel("pubsub:rapid");
    const sub = await post(baseUrl, "/pubsub/subscribe", { channel: ch });
    assertOk(sub);

    const count = 50;
    for (let i = 0; i < count; i++) {
      await post(baseUrl, "/pubsub/publish", { channel: ch, message: { idx: i } });
    }
    await sleep(500);

    const msgs = await get(baseUrl, `/pubsub/messages/${sub.json.subscriberId}`);
    assertEqual(msgs.json.messages.length, count);
    for (let i = 0; i < count; i++) {
      assertEqual(msgs.json.messages[i].payload.idx, i);
    }

    await del(baseUrl, `/pubsub/subscribe/${sub.json.subscriberId}`);
  });

  await runTest("PubSub concurrent publishing", async () => {
    const ch = channel("pubsub:concurrent");
    const sub = await post(baseUrl, "/pubsub/subscribe", { channel: ch });
    assertOk(sub);

    const promises = [];
    for (let i = 0; i < 30; i++) {
      promises.push(post(baseUrl, "/pubsub/publish", { channel: ch, message: { concurrent: i } }));
    }
    await Promise.all(promises);
    await sleep(1000);

    const msgs = await get(baseUrl, `/pubsub/messages/${sub.json.subscriberId}`);
    assertEqual(msgs.json.messages.length, 30);

    await del(baseUrl, `/pubsub/subscribe/${sub.json.subscriberId}`);
  });
}