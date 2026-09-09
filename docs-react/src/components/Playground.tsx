import { useMemo, useRef, useState } from 'react'
import { BloomFilter, encodeValue, hashPair, serialize, deserialize, validateKey } from '../../../src/browser.ts'
import { Link } from 'react-router-dom'
import './Playground.css'

type Category = { name: string; functions: string[]; browserSafe?: boolean }
type TraceStep = { name: string; detail: string; durationMs: number; status: 'success' | 'simulated' | 'error'; data?: unknown }

const categories: Category[] = [
  { name: 'Bloom Filter', functions: ['BloomFilter.add', 'BloomFilter.has', 'BloomFilter.clear'], browserSafe: true },
  { name: 'Serialization', functions: ['serialize', 'deserialize'], browserSafe: true },
  { name: 'Validation', functions: ['validateKey'], browserSafe: true },
  { name: 'Cache', functions: ['client.getCache', 'client.setCache', 'client.deleteCache'], },
  { name: 'Locks', functions: ['client.tryLock', 'client.lock', 'client.unlock'] },
  { name: 'Pub/Sub', functions: ['client.publish', 'client.subscribe'] },
  { name: 'Queue', functions: ['client.enqueue', 'client.dequeue'] },
  { name: 'CRUD', functions: ['client.model', 'Model.create', 'Model.find'] },
]

const examples: Record<string, string> = {
  'BloomFilter.add': 'const filter = new BloomFilter({ expectedItems: 32, falsePositiveRate: 0.01 });\nfilter.add("user:123");',
  'BloomFilter.has': 'const filter = new BloomFilter({ expectedItems: 32, falsePositiveRate: 0.01 });\nfilter.add("user:123");\nfilter.has("user:123");',
  'BloomFilter.clear': 'const filter = new BloomFilter({ expectedItems: 32, falsePositiveRate: 0.01 });\nfilter.add("user:123");\nfilter.clear();',
  serialize: 'serialize({ user: "Ada", active: true });',
  deserialize: 'deserialize("{\\"user\\":\\"Ada\\"}");',
  validateKey: 'validateKey("user:123");',
}

const descriptions: Record<string, string> = {
  'BloomFilter.add': 'Adds a value to the real counting Bloom filter and increments counters at its hash positions.',
  'BloomFilter.has': 'Checks the real Bloom filter. false means definitely absent; true means possibly present.',
  'BloomFilter.clear': 'Clears the real filter counters and resets its approximate size.',
  serialize: 'Serializes a value using the browser-safe PGBloom serialization utility.',
  deserialize: 'Deserializes a string using the browser-safe PGBloom deserialization utility.',
  validateKey: 'Validates a cache-style key using the real PGBloom validation utility.',
}

const safeFunctions = new Set(Object.keys(examples))

function waitForPaint() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
}

export default function Playground() {
  const [selected, setSelected] = useState('BloomFilter.has')
  const [code, setCode] = useState(examples['BloomFilter.has'])
  const [value, setValue] = useState('user:123')
  const [trace, setTrace] = useState<TraceStep[]>([])
  const [activeStep, setActiveStep] = useState(-1)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  const [output, setOutput] = useState<unknown>(null)
  const [filter, setFilter] = useState(() => new BloomFilter({ expectedItems: 32, falsePositiveRate: 0.01 }))
  const [mode, setMode] = useState<'auto' | 'step'>('auto')
  const nextStep = useRef<(() => void) | null>(null)
  const [messages, setMessages] = useState<string[]>(['Select a browser-safe API to execute real PGBloom code.'])

  const selectedDescription = descriptions[selected] ?? 'This API is server-only. The playground can show a client-side demo flow, but it does not connect to Node.js or PostgreSQL.'
  const indices = useMemo(() => {
    const [first, second] = hashPair(encodeValue(value))
    const count = filter.hashCount
    return Array.from({ length: count }, (_, index) => ((first + Math.imul(index, second)) >>> 0) % filter.bitCount)
  }, [filter, value])

  function selectFunction(name: string) {
    setSelected(name)
    setCode(examples[name] ?? `// ${name}\n// Server-only: execute through a sandbox backend.`)
    setTrace([])
    setActiveStep(-1)
    setOutput(null)
    setError('')
    setMessages([safeFunctions.has(name) ? 'Ready to execute the real browser-safe implementation.' : 'Demo simulation selected. No server, database, SQL, or network call will run.'])
  }

  function reset() {
    setFilter(new BloomFilter({ expectedItems: 32, falsePositiveRate: 0.01 }))
    setTrace([])
    setActiveStep(-1)
    setOutput(null)
    setError('')
    setMessages(['Playground state reset: Bloom counters, trace, output, and logs cleared.'])
  }

  async function run() {
    setRunning(true)
    setError('')
    setOutput(null)
    setTrace([])
    setActiveStep(-1)
    if (!safeFunctions.has(selected)) {
      const simulatedSteps: Array<[string, string]> = selected.startsWith('client.getCache')
        ? [['function.call', 'Demo call received for client.getCache.'], ['cache.l1.get', 'Demo L1 cache lookup: MISS.'], ['cache.database', 'Demo PostgreSQL lookup: simulated result.'], ['function.return', 'Demo cache miss returned as null.']]
        : selected.startsWith('client.setCache')
          ? [['function.call', 'Demo call received for client.setCache.'], ['cache.serialize', 'Demo value serialization: simulated.'], ['postgres.query', 'Demo PostgreSQL write: simulated INSERT.'], ['cache.l1.set', 'Demo L1 cache population: simulated.'], ['function.return', 'Demo cache value returned.']]
          : selected.startsWith('client.deleteCache')
            ? [['function.call', 'Demo call received for client.deleteCache.'], ['cache.l1.delete', 'Demo L1 invalidation: simulated.'], ['postgres.query', 'Demo PostgreSQL delete: simulated DELETE.'], ['function.return', 'Demo delete completed.']]
            : selected.startsWith('client.tryLock') || selected.startsWith('client.lock')
              ? [['function.call', 'Demo lock request received.'], ['lock.acquire', 'Demo lock acquisition: simulated success.'], ['postgres.query', 'Demo lock row update: simulated.'], ['function.return', 'Demo critical section may proceed.']]
              : selected.startsWith('client.unlock')
                ? [['function.call', 'Demo unlock request received.'], ['lock.release', 'Demo lock release: simulated.'], ['postgres.query', 'Demo lock row deletion: simulated.'], ['function.return', 'Demo lock released.']]
                : selected.startsWith('client.publish') || selected.startsWith('client.subscribe')
                  ? [['function.call', 'Demo Pub/Sub operation received.'], ['pubsub.listen-notify', 'Demo PostgreSQL LISTEN/NOTIFY delivery: simulated.'], ['pubsub.subscriber', 'Demo subscriber delivery: simulated.'], ['function.return', 'Demo message flow completed.']]
                  : selected.startsWith('client.enqueue') || selected.startsWith('client.dequeue')
                    ? [['function.call', 'Demo queue operation received.'], ['queue.claim', 'Demo FOR UPDATE SKIP LOCKED claim: simulated.'], ['postgres.query', 'Demo queue row mutation: simulated.'], ['function.return', 'Demo job result returned.']]
                    : selected.startsWith('client.model') || selected.startsWith('Model.')
                      ? [['function.call', 'Demo CRUD operation received.'], ['model.validate', 'Demo schema validation: simulated success.'], ['postgres.transaction', 'Demo PostgreSQL transaction: simulated.'], ['database.rows', 'Demo table state changed: simulated.'], ['function.return', 'Demo model result returned.']]
                      : [['function.call', `Demo call received for ${selected}.`], ['postgres.query', 'Demo PostgreSQL operation: simulated.'], ['function.return', 'Demo result returned.']]
      const demoTrace: TraceStep[] = []
      setMessages(['I received a server-side API selection.', 'This is a client-side demo simulation only.', 'No Node.js, PostgreSQL, SQL, credentials, or network call will run.'])
      for (const [name, detail] of simulatedSteps) {
        const started = performance.now()
        setActiveStep(demoTrace.length)
        setMessages((current) => [...current, `→ ${detail}`])
        await new Promise<void>((resolve) => setTimeout(resolve, 180))
        demoTrace.push({ name, detail, durationMs: performance.now() - started, status: 'simulated' })
        setTrace([...demoTrace])
        setMessages((current) => [...current, `◌ ${detail} (demo)`])
      }
      setOutput({ simulated: true, function: selected, result: 'demo-only', value })
      setMessages((current) => [...current, '◌ Demo completed. No server-side operation was attempted.'])
      setActiveStep(-1)
      setRunning(false)
      return
    }

    const localTrace: TraceStep[] = []
    const addStep = async (name: string, detail: string, action: () => unknown) => {
      const started = performance.now()
      setActiveStep(localTrace.length)
      setMessages((current) => [...current, `→ ${detail}`])
      await waitForPaint()
      let data: unknown
      try {
        data = action()
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : String(caught)
        localTrace.push({ name, detail: message, durationMs: performance.now() - started, status: 'error' })
        throw caught
      }
      const step = { name, detail, durationMs: performance.now() - started, status: 'success' as const, data }
      localTrace.push(step)
      setTrace([...localTrace])
      setOutput(data)
      setMessages((current) => [...current, `✓ ${detail}`])
      if (mode === 'step') {
        await new Promise<void>((resolve) => { nextStep.current = resolve })
        nextStep.current = null
      }
      return data
    }

    try {
      if (selected === 'BloomFilter.add') {
        await addStep('function.call', 'Function called with the editable value.', () => value)
        await addStep('bloom.hash', `Computed ${filter.hashCount} real hash positions.`, () => indices)
        await addStep('bloom.add', 'Incremented the real counting Bloom filter counters.', () => { filter.add(value); return { size: filter.size(), bitCount: filter.bitCount, hashCount: filter.hashCount } })
        setOutput({ size: filter.size(), positions: indices })
      } else if (selected === 'BloomFilter.has') {
        await addStep('function.call', 'Function called with the editable value.', () => value)
        await addStep('bloom.hash', `Computed ${filter.hashCount} real hash positions.`, () => indices)
        const result = await addStep('bloom.has', 'Checked all required real counter positions.', () => filter.has(value))
        setOutput({ result, interpretation: result ? 'possibly present' : 'definitely not present', positions: indices })
        setMessages((current) => [...current, result ? '✓ Result may be present; Bloom filters can return false positives.' : '✓ One required counter is zero: definitely not present.'])
      } else if (selected === 'BloomFilter.clear') {
        await addStep('function.call', 'Function called.', () => value)
        await addStep('bloom.clear', 'Cleared every real counter in the Bloom filter.', () => { filter.clear(); return { size: filter.size() } })
      } else if (selected === 'serialize') {
        const result = await addStep('serialize', 'Serialized the editable JSON value with PGBloom.', () => serialize({ value, timestamp: new Date(0).toISOString() }))
        setOutput(result)
      } else if (selected === 'deserialize') {
        const result = await addStep('deserialize', 'Deserialized the editable JSON string with PGBloom.', () => deserialize('{"value":"Ada"}'))
        setOutput(result)
      } else if (selected === 'validateKey') {
        const result = await addStep('validate.key', 'Validated the editable key with PGBloom.', () => { validateKey(value); return { valid: true, key: value } })
        setOutput(result)
      }
      setMessages((current) => [...current, `✓ Completed in ${localTrace.reduce((total, step) => total + step.durationMs, 0).toFixed(2)}ms.`])
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught)
      setError(message)
      setMessages((current) => [...current, `✕ ${message}`])
    } finally {
      setTrace([...localTrace])
      setActiveStep(-1)
      setRunning(false)
    }
  }

  return (
    <div className="playground">
      <header className="playground-header">
        <div><Link to="/" className="playground-back">PGBloom docs</Link><h1>Interactive Playground</h1><p>Execute browser-safe PGBloom APIs and inspect measured execution traces.</p></div>
        <div className="playground-actions"><span className="status-pill"><span /> Browser sandbox</span><button onClick={reset}>Reset Playground</button></div>
      </header>
      <div className="playground-grid">
        <aside className="function-explorer"><div className="panel-heading"><span>Function explorer</span><small>allowlisted APIs</small></div>{categories.map((category) => <section key={category.name}><h2>{category.name}<small>{category.browserSafe ? 'browser-safe' : 'server-only'}</small></h2>{category.functions.map((name) => <button className={selected === name ? 'function-item selected' : 'function-item'} key={name} onClick={() => selectFunction(name)}><span>{name}</span><i>{safeFunctions.has(name) ? 'RUN' : 'SERVER'}</i></button>)}</section>)}</aside>
        <main className="playground-main">
          <section className="editor-panel"><div className="panel-heading"><span>Code editor</span><div><button onClick={() => setCode(examples[selected] ?? '')}>Reset Example</button><button onClick={() => navigator.clipboard?.writeText(code)}>Copy Code</button></div></div><textarea value={code} onChange={(event) => setCode(event.target.value)} spellCheck={false} /><div className="runbar"><label>Value <input value={value} onChange={(event) => setValue(event.target.value)} /></label><div className="mode-toggle"><button className={mode === 'auto' ? 'active' : ''} onClick={() => setMode('auto')}>Auto Run</button><button className={mode === 'step' ? 'active' : ''} onClick={() => setMode('step')}>Step Through</button></div>{mode === 'step' && running && <button onClick={() => nextStep.current?.()}>Next</button>}<button className="run-button" disabled={running} onClick={run}>▶ Run</button></div></section>
          <section className="function-card"><div className="eyebrow">Selected function</div><h2>{selected}</h2><p>{selectedDescription}</p><div className="contract-grid"><div><b>Runtime</b><span>{safeFunctions.has(selected) ? 'Browser-safe' : 'Server-only'}</span></div><div><b>Source</b><span>pgbloom/browser or server client</span></div><div><b>Trace</b><span>{trace.length ? `${trace.length} measured steps` : 'Ready'}</span></div></div></section>
          <section className="flow-panel"><div className="panel-heading"><span>Execution flow</span><small>{activeStep >= 0 ? `step ${activeStep + 1} active` : 'idle'}</small></div><div className="flow-nodes">{(trace.length ? trace : [{ name: 'function.call', detail: 'Run a function to begin the measured trace.', durationMs: 0, status: 'success' as const }]).map((step, index) => <div className={index === activeStep ? 'flow-node active' : `flow-node ${step.status}`} key={`${step.name}-${index}`}><span>{index + 1}</span><div><b>{step.name}</b><small>{step.detail}</small></div>{index < trace.length - 1 && <em>↓</em>}</div>)}</div></section>
        </main>
        <aside className="agent-panel"><div className="panel-heading"><span>🤖 PGBloom Agent</span><small>live explanation</small></div><div className="agent-messages">{messages.map((message, index) => <p key={`${message}-${index}`} className={message.startsWith('✓') ? 'success' : message.startsWith('✕') ? 'failure' : ''}>{message}</p>)}</div><div className="io-panel"><h2>Output</h2><pre>{JSON.stringify(output, null, 2) ?? 'null'}</pre>{error && <p className="error-box">{error}</p>}</div></aside>
      </div>
      <section className="telemetry-grid"><div className="telemetry-panel"><div className="panel-heading"><span>Execution timeline</span><small>performance.now()</small></div>{trace.length ? trace.map((step, index) => <div className="timeline-row" key={`${step.name}-${index}`}><time>{step.durationMs.toFixed(2)}ms</time><b>{step.name}</b><span>{step.detail}</span></div>) : <p className="empty-state">Measured steps appear here after Run.</p>}</div><div className="telemetry-panel"><div className="panel-heading"><span>Bloom state</span><small>real filter inspection</small></div><div className="bloom-stats"><span><b>{filter.size()}</b> items</span><span><b>{filter.bitCount}</b> counters</span><span><b>{filter.hashCount}</b> hashes</span></div><div className="bit-grid">{Array.from({ length: Math.min(filter.bitCount, 96) }, (_, index) => <span className={indices.includes(index) ? 'bit checked' : 'bit'} key={index}>{indices.includes(index) ? '●' : '○'}</span>)}</div><p className="hint">Highlighted positions are computed with PGBloom's real <code>hashPair</code> algorithm for <code>{value}</code>.</p></div></section>
      <footer className="playground-footer"><span>Server-only APIs use client-side demo simulation only. No backend operation is executed.</span><Link to="/aiagent/playground">AI-agent playground documentation</Link></footer>
    </div>
  )
}