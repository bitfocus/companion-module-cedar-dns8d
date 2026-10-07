import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { InstanceStatus } from '@companion-module/base'
import CedarDNS8DInstance, { WATCHDOG_MIN_MS } from '../main.js'
import type { ModuleConfig } from '../config.js'
import { ParameterType } from '../message.js'

/** Synthetic, as in variables.spec.ts: the smallest message the parser reads without error */
const DEVICE_MESSAGE =
	'<dns8d><global on="1"/><chan idx="0"><name>Dialog</name></chan><group idx="0"><band idx="0"/></group></dns8d>'

const RECONNECT_MS = 10000

/**
 * Stands in for Node's WebSocket, including what was measured of it on Node 26: closing a socket that is still
 * connecting fails it there and then, firing error and close synchronously inside close(). An open socket's close
 * event comes later, once the device answers, which a test triggers with closed().
 */
class FakeWebSocket extends EventTarget {
	static readonly CONNECTING = 0
	static readonly OPEN = 1
	static readonly CLOSING = 2
	static readonly CLOSED = 3
	static created: FakeWebSocket[] = []

	readyState = FakeWebSocket.CONNECTING
	sent: string[] = []

	constructor(readonly url: string) {
		super()
		new URL(url) // throws on an address that can't make a URL, as WebSocket does
		FakeWebSocket.created.push(this)
	}

	send(data: string): void {
		this.sent.push(data)
	}

	close(): void {
		if (this.readyState === FakeWebSocket.CONNECTING) this.fail()
		else if (this.readyState === FakeWebSocket.OPEN) this.readyState = FakeWebSocket.CLOSING
	}

	open(): void {
		this.readyState = FakeWebSocket.OPEN
		this.dispatchEvent(new Event('open'))
	}

	receive(data: string): void {
		this.dispatchEvent(new MessageEvent('message', { data }))
	}

	fail(): void {
		this.readyState = FakeWebSocket.CLOSED
		this.dispatchEvent(Object.assign(new Event('error'), { message: '' }))
		this.dispatchEvent(Object.assign(new Event('close'), { code: 1006, reason: '' }))
	}

	closed(code = 1000, reason = ''): void {
		this.readyState = FakeWebSocket.CLOSED
		this.dispatchEvent(Object.assign(new Event('close'), { code, reason }))
	}
}

const CONFIG: ModuleConfig = { host: 'dns8d.local', port: 80, interval: 40 }

/** A real instance, on a context that accepts every call base makes into Companion */
function createInstance() {
	const target: Record<string | symbol, unknown> = { _isInstanceContext: true, id: 'test', label: 'test' }
	const context = new Proxy(target, { get: (t, prop) => (prop in t ? t[prop] : (t[prop] = vi.fn())) })
	const instance = new CedarDNS8DInstance(context)
	const log = vi.spyOn(instance, 'log').mockImplementation(() => {})
	const updateStatus = context.updateStatus as Mock<(status: InstanceStatus, message: string | null) => void>
	const statuses = () => updateStatus.mock.calls.map(([status]) => status)
	const warnings = () => log.mock.calls.filter(([level]) => level === 'warn').map(([, message]) => message)
	/** The status message of each Connection Failure */
	const failures = () =>
		updateStatus.mock.calls
			.filter(([status]) => status === InstanceStatus.ConnectionFailure)
			.map(([, message]) => message)
	return { instance, updateStatus, statuses, warnings, failures }
}

function latestSocket(): FakeWebSocket {
	const socket = FakeWebSocket.created.at(-1)
	if (!socket) throw new Error('no socket created')
	return socket
}

/** The device answering, as it does every poll, for a while */
async function talk(socket: FakeWebSocket, ms: number): Promise<void> {
	for (let elapsed = 0; elapsed < ms; elapsed += 100) {
		socket.receive(DEVICE_MESSAGE)
		await vi.advanceTimersByTimeAsync(100)
	}
}

beforeEach(() => {
	vi.useFakeTimers()
	vi.stubGlobal('WebSocket', FakeWebSocket)
	FakeWebSocket.created = []
})

afterEach(() => {
	vi.useRealTimers()
	vi.unstubAllGlobals()
})

describe('replacing the socket', () => {
	// close() fired the old socket's error and close handlers there and then. Each scheduled a reconnect, and the one
	// the error handler set was orphaned, so it fired ten seconds later and tore down the new, working connection.
	it('a socket still connecting when replaced cannot reconnect over its successor', async () => {
		const { instance, statuses } = createInstance()
		await instance.configUpdated(CONFIG)
		const [first] = FakeWebSocket.created

		await instance.configUpdated({ ...CONFIG, host: 'dns8d-2.local' })
		const second = FakeWebSocket.created[1]
		second.open()
		await talk(second, RECONNECT_MS * 2)

		expect(first.readyState).toBe(FakeWebSocket.CLOSED)
		expect(FakeWebSocket.created).toHaveLength(2)
		expect(second.readyState).toBe(FakeWebSocket.OPEN)
		expect(statuses()).not.toContain(InstanceStatus.UnknownError)
		expect(statuses()).not.toContain(InstanceStatus.ConnectionFailure)
	})

	// The old socket's close arrives once the device answers, which can be after the new socket opened. Its handler
	// stopped the new socket's polling and scheduled a reconnect that closed it.
	it("an open socket's late close event does not stop its successor", async () => {
		const { instance, statuses } = createInstance()
		await instance.configUpdated(CONFIG)
		const first = FakeWebSocket.created[0]
		first.open()

		await instance.configUpdated({ ...CONFIG, interval: 100 })
		const second = FakeWebSocket.created[1]
		second.open()
		first.closed()
		const sentBefore = second.sent.length
		await talk(second, RECONNECT_MS * 2)

		expect(second.sent.length).toBeGreaterThan(sentBefore) // still polling
		expect(FakeWebSocket.created).toHaveLength(2)
		expect(statuses().at(-1)).toBe(InstanceStatus.Ok)
		expect(statuses()).not.toContain(InstanceStatus.ConnectionFailure)
	})

	it('a failed connection reconnects once, after the reconnect interval', async () => {
		const { instance } = createInstance()
		await instance.configUpdated(CONFIG)
		FakeWebSocket.created[0].fail()

		await vi.advanceTimersByTimeAsync(RECONNECT_MS - 1)
		expect(FakeWebSocket.created).toHaveLength(1)
		await vi.advanceTimersByTimeAsync(RECONNECT_MS * 3)
		// Each attempt still connecting, so the second is the only one made
		expect(FakeWebSocket.created).toHaveLength(2)
	})
})

describe('config without a usable host', () => {
	// configUpdated left the old socket and its pending reconnect running. The reconnect built ws://:80/info.ws, which
	// throws, from inside a timer, ending the connection's process.
	it('clearing the host stops the old connection and anything it had scheduled', async () => {
		const { instance, statuses } = createInstance()
		await instance.configUpdated(CONFIG)
		const first = FakeWebSocket.created[0]
		first.fail()

		const before = statuses().length
		await instance.configUpdated({ ...CONFIG, host: '' })
		await vi.advanceTimersByTimeAsync(RECONNECT_MS * 3)

		// Bad config, and nothing after it: no reconnect attempt, not even one that fails safely
		expect(statuses().slice(before)).toEqual([InstanceStatus.BadConfig])
		expect(FakeWebSocket.created).toHaveLength(1)
	})

	it('clearing the host closes an open socket', async () => {
		const { instance } = createInstance()
		await instance.configUpdated(CONFIG)
		const first = FakeWebSocket.created[0]
		first.open()

		await instance.configUpdated({ ...CONFIG, host: '' })

		expect(first.readyState).not.toBe(FakeWebSocket.OPEN)
	})

	it('reports an address that cannot make a URL as bad config, without throwing', async () => {
		const { instance, statuses } = createInstance()

		await expect(instance.configUpdated({ ...CONFIG, host: 'not a host' })).resolves.toBeUndefined()
		expect(statuses().at(-1)).toBe(InstanceStatus.BadConfig)
		expect(FakeWebSocket.created).toHaveLength(0)
	})
})

describe('queued messages', () => {
	// queue.clear() dropped them without settling their promises, so an action waiting on one never finished
	it('are rejected when the connection resets, not left pending', async () => {
		const { instance } = createInstance()
		await instance.configUpdated(CONFIG)
		const socket = FakeWebSocket.created[0]
		socket.open()
		await vi.advanceTimersByTimeAsync(100)

		const outcomes: string[] = []
		for (let i = 0; i < 3; i++) {
			instance.buildMessage(1, ParameterType.On, '1').then(
				() => outcomes.push('sent'),
				(err: Error) => outcomes.push(err.message),
			)
		}
		socket.closed(1006)
		await vi.advanceTimersByTimeAsync(200)

		expect(outcomes).toHaveLength(3)
		expect(outcomes.filter((outcome) => outcome !== 'sent')).not.toHaveLength(0)
		expect(outcomes.filter((outcome) => outcome !== 'sent')).toEqual(
			expect.arrayContaining(['Connection reset before the message was sent']),
		)
	})

	it("are also dropped when the action's own signal aborts", async () => {
		const { instance } = createInstance()
		await instance.configUpdated(CONFIG)
		FakeWebSocket.created[0].open()
		const controller = new AbortController()

		const sends = [1, 2, 3].map(async () =>
			instance.buildMessage(1, ParameterType.On, '1', { signal: controller.signal }),
		)
		controller.abort()

		const results = await Promise.allSettled(sends)
		expect(results.filter((result) => result.status === 'rejected')).not.toHaveLength(0)
	})
})

describe('watchdog', () => {
	it.each([
		{ interval: 40, timeout: WATCHDOG_MIN_MS },
		{ interval: 400, timeout: 2000 },
	])('reconnects after $timeout ms without a message at a $interval ms poll', async ({ interval, timeout }) => {
		const { instance, statuses } = createInstance()
		await instance.configUpdated({ ...CONFIG, interval })
		const socket = FakeWebSocket.created[0]
		socket.open()
		await talk(socket, 3000)
		expect(statuses()).not.toContain(InstanceStatus.ConnectionFailure)

		socket.receive(DEVICE_MESSAGE)
		await vi.advanceTimersByTimeAsync(timeout - 1)
		expect(statuses()).not.toContain(InstanceStatus.ConnectionFailure)
		await vi.advanceTimersByTimeAsync(1)

		expect(statuses().at(-1)).toBe(InstanceStatus.ConnectionFailure)
		expect(socket.readyState).not.toBe(FakeWebSocket.OPEN)
		await vi.advanceTimersByTimeAsync(RECONNECT_MS)
		expect(FakeWebSocket.created).toHaveLength(2)
	})

	it('also trips if the device accepts the connection but never answers', async () => {
		const { instance, statuses } = createInstance()
		await instance.configUpdated(CONFIG)
		FakeWebSocket.created[0].open()

		await vi.advanceTimersByTimeAsync(WATCHDOG_MIN_MS)

		expect(statuses().at(-1)).toBe(InstanceStatus.ConnectionFailure)
	})

	it('does not run while disconnected', async () => {
		const { instance, statuses } = createInstance()
		await instance.configUpdated(CONFIG)
		const socket = FakeWebSocket.created[0]
		socket.open()
		await instance.destroy()

		await vi.advanceTimersByTimeAsync(RECONNECT_MS * 2)

		expect(statuses()).not.toContain(InstanceStatus.ConnectionFailure)
		expect(FakeWebSocket.created).toHaveLength(1)
	})
})

describe('failure reports', () => {
	const ADDRESS = 'ws://dns8d.local:80/info.ws'

	// The error listener logged Node's error message, which is always empty, on every attempt
	it('say a connection could not be made, with its address, once across repeated attempts', async () => {
		const { instance, warnings, failures } = createInstance()
		await instance.configUpdated(CONFIG)
		for (let attempt = 0; attempt < 3; attempt++) {
			latestSocket().fail()
			await vi.advanceTimersByTimeAsync(RECONNECT_MS)
		}

		expect(FakeWebSocket.created).toHaveLength(4)
		expect(warnings()).toEqual([`Could not connect to ${ADDRESS}`])
		expect(failures()).toEqual(['Could not connect', 'Could not connect', 'Could not connect'])
	})

	it('say a connection that had opened was lost, with the close code and reason', async () => {
		const { instance, warnings, failures } = createInstance()
		await instance.configUpdated(CONFIG)
		latestSocket().open()
		await talk(latestSocket(), 500)

		latestSocket().closed(1001, 'Going away')

		expect(warnings()).toEqual([`Lost connection to ${ADDRESS} (close code 1001: Going away)`])
		expect(failures()).toEqual(['Connection lost'])
	})

	it('log the next outage once a reconnect has succeeded', async () => {
		const { instance, warnings } = createInstance()
		await instance.configUpdated(CONFIG)
		latestSocket().fail()
		await vi.advanceTimersByTimeAsync(RECONNECT_MS)
		latestSocket().open()
		await talk(latestSocket(), 500)

		latestSocket().closed(1006)

		expect(warnings()).toEqual([`Could not connect to ${ADDRESS}`, `Lost connection to ${ADDRESS} (close code 1006)`])
	})

	it('treat a watchdog trip as the start of the outage', async () => {
		const { instance, warnings, failures } = createInstance()
		await instance.configUpdated(CONFIG)
		latestSocket().open()
		await vi.advanceTimersByTimeAsync(WATCHDOG_MIN_MS + RECONNECT_MS)
		latestSocket().fail()

		expect(warnings()).toEqual([`No message from the device for ${WATCHDOG_MIN_MS} ms, reconnecting`])
		expect(failures()).toEqual(['No response', 'Could not connect'])
	})
})
