// middleware
import type {
	ActionFunction,
	ActionFunctionArgs,
	LoaderFunction,
	LoaderFunctionArgs,
} from '@remix-run/router'
import { RouteObject } from 'react-router-dom'
import * as setCookieParser from 'set-cookie-parser'
import crypto from 'crypto'
import { action } from '@storybook/addon-actions'

type DataFunction = LoaderFunction | ActionFunction
type DataFunctionArgs = LoaderFunctionArgs | ActionFunctionArgs

export type Middleware = (
	fn: DataFunction,
) => (args: DataFunctionArgs) => ReturnType<DataFunction>

export const lazy = (
	url: () => Promise<{
		default: RouteObject['Component']
	}>,
	middleware?: Middleware,
) => {
	return () =>
		url().then(it => ({
			...it,
			loader: it.loader && middleware ? middleware(it.loader) : it.loader,
			action: it.action && middleware ? middleware(it.action) : it.action,
			Component: it.default,
		}))
}

/**
 * This a little hack to make sure that cookie and set-cookie can be set and get in the browser.
 * This is not possible normally, because of security concerns.
 */
export function installUnsecureHeaderPolyfill() {
	const originalGet = globalThis.Headers.prototype.get
	globalThis.Headers.prototype.get = function (name) {
		if (name.toLowerCase() === 'cookie')
			return (
				originalGet.call(this, 'cookie') ?? originalGet.call(this, '$cookie')
			)
		if (name.toLowerCase() === 'set-cookie')
			return (
				originalGet.call(this, 'set-cookie') ??
				originalGet.call(this, 'set-$cookie')
			)
		return originalGet.call(this, name)
	}
	const originalSet = globalThis.Headers.prototype.set
	globalThis.Headers.prototype.set = function (name, value) {
		if (name.toLowerCase() === 'cookie')
			return originalSet.call(this, '$cookie', value)
		if (name.toLowerCase() === 'set-cookie') {
			return originalSet.call(this, 'set-$cookie', value)
		}
		return originalSet.call(this, name, value)
	}
	const originalAppend = globalThis.Headers.prototype.append
	globalThis.Headers.prototype.append = function (name, value) {
		if (name.toLowerCase() === 'cookie')
			return originalAppend.call(this, '$cookie', value)
		if (name.toLowerCase() === 'set-cookie') {
			return originalAppend.call(this, 'set-$cookie', value)
		}
		return originalAppend.call(this, name, value)
	}

	globalThis.Headers.prototype.getSetCookie = function () {
		return setCookieParser.splitCookiesString(this.get(`set-$cookie`) ?? '')
	}

	window.Headers = class Bla extends Headers {
		constructor(init?: HeadersInit) {
			super(init)
			const setCookie = this.get('set-cookie')
			if (setCookie) this.set('set-$cookie', setCookie)
			const cookie = this.get('cookie')
			if (cookie) this.set('$cookie', cookie)
		}
	}
}

export function installCryptoPolyfill() {
	function timingSafeEqual<T extends any>(a: T, b: T): boolean {
		if (a.byteLength !== b.byteLength) return false
		let len = a.length,
			different = false
		while (len-- > 0) {
			// must check all items until complete
			if (a[len] !== b[len]) different = true
		}
		return !different
	}

	crypto.timingSafeEqual = timingSafeEqual
}

export const cookieMiddleware: Middleware = fn => async args => {
	const request = args.request
	request.headers.set('cookie', document.cookie)
	const url = `${request.method} ${
		request.url.split(new URL(request.url).host)[1]
	}`
	action(`Request`)({ url: url, headers: Object.fromEntries(request.headers) })

	let response
	try {
		response = await fn(args)
	} catch (e) {
		if (!(e instanceof Response)) throw e
		response = e
	}

	if (response instanceof Response) {
		const newCookies = response.headers.getSetCookie()
		if (newCookies) {
			newCookies.forEach(
				cookie => (document.cookie = cookie.replaceAll('HttpOnly; ', '')),
			)
		}

		const cloned = response.clone()

		let body
		try {
			body = await cloned.json()
		} catch (e) {
			body = await cloned.text()
		}

		action(`Response`)({
			url,
			status: cloned.status,
			statusText: cloned.statusText,
			body,
			headers: Object.fromEntries(cloned.headers),
		})
	}

	return response
}
