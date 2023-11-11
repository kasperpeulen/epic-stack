// Forked from @remix-run/testing
import {
	type MetaFunction,
	type UNSAFE_AssetsManifest as AssetsManifest,
	type UNSAFE_EntryRoute as EntryRoute,
	type UNSAFE_FutureConfig as FutureConfig,
	UNSAFE_RemixContext as RemixContext,
	type UNSAFE_RemixContextObject as RemixContextObject,
	type UNSAFE_RouteModules as RouteModules,
} from '@remix-run/react'
import {
	type ActionFunctionArgs as RRActionFunctionArgs,
	type HydrationState,
	type InitialEntry,
	type LoaderFunctionArgs as RRLoaderFunctionArgs,
	type Router,
	UNSAFE_convertRoutesToDataRoutes,
} from '@remix-run/router'
import {
	type ActionFunction,
	type AppLoadContext,
	type LinksFunction,
	type LoaderFunction,
} from '@remix-run/server-runtime'
import * as React from 'react'
import { type MutableRefObject } from 'react'
import {
	createMemoryRouter,
	type DataRouteObject,
	type IndexRouteObject,
	type NonIndexRouteObject,
	Outlet,
	RouterProvider,
} from 'react-router-dom'

interface StubIndexRouteObject
	extends Omit<
		IndexRouteObject,
		'loader' | 'action' | 'element' | 'errorElement' | 'children'
	> {
	loader?: LoaderFunction
	action?: ActionFunction
	children?: StubRouteObject[]
	meta?: MetaFunction
	links?: LinksFunction
}

interface StubNonIndexRouteObject
	extends Omit<
		NonIndexRouteObject,
		'loader' | 'action' | 'element' | 'errorElement' | 'children'
	> {
	loader?: LoaderFunction
	action?: ActionFunction
	children?: StubRouteObject[]
	meta?: MetaFunction
	links?: LinksFunction
}

export type StubRouteObject = StubIndexRouteObject | StubNonIndexRouteObject

export interface RemixStubProps {
	/**
	 *  The initial entries in the history stack. This allows you to start a test with
	 *  multiple locations already in the history stack (for testing a back navigation, etc.)
	 *  The test will default to the last entry in initialEntries if no initialIndex is provided.
	 *  e.g. initialEntries={["/home", "/about", "/contact"]}
	 */
	initialEntries?: InitialEntry[]

	/**
	 * The initial index in the history stack to render. This allows you to start a test at a specific entry.
	 * It defaults to the last entry in initialEntries.
	 * e.g.
	 *   initialEntries: ["/", "/events/123"]
	 *   initialIndex: 1 // start at "/events/123"
	 */
	initialIndex?: number

	/**
	 *  Used to set the route's initial loader and action data.
	 *  e.g. hydrationData={{
	 *   loaderData: { "/contact": { locale: "en-US" } },
	 *   actionData: { "/login": { errors: { email: "invalid email" } }}
	 *  }}
	 */
	hydrationData?: HydrationState

	/**
	 * Future flags mimicking the settings in remix.config.js
	 */
	future?: Partial<FutureConfig>

	routerRef?: MutableRefObject<Router | undefined>
}

export function createRemixStub(
	routes: StubRouteObject[],
	context: AppLoadContext = {},
) {
	return function RemixStub({
		initialEntries,
		initialIndex,
		hydrationData,
		future,
		routerRef,
	}: RemixStubProps) {
		routerRef ??= React.useRef<Router>()
		let remixContextRef = React.useRef<RemixContextObject>()

		if (routerRef.current == null) {
			remixContextRef.current = {
				future: {
					v3_fetcherPersist: future?.v3_fetcherPersist === true,
				},
				manifest: {
					routes: {},
					entry: { imports: [], module: '' },
					url: '',
					version: '',
				},
				routeModules: {},
			}

			// Update the routes to include context in the loader/action and populate
			// the manifest and routeModules during the walk
			let patched = processRoutes(
				// @ts-expect-error loader/action context types don't match :/
				UNSAFE_convertRoutesToDataRoutes(routes, r => r),
				context,
				remixContextRef.current.manifest,
				remixContextRef.current.routeModules,
			)
			routerRef.current = createMemoryRouter(patched, {
				initialEntries,
				initialIndex,
				hydrationData,
			})
		}

		return (
			<RemixContext.Provider value={remixContextRef.current}>
				<RouterProvider router={routerRef.current} />
			</RemixContext.Provider>
		)
	}
}

function processRoutes(
	routes: StubRouteObject[],
	context: AppLoadContext,
	manifest: AssetsManifest,
	routeModules: RouteModules,
	parentId?: string,
): DataRouteObject[] {
	return routes.map(route => {
		if (!route.id) {
			throw new Error(
				'Expected a route.id in @remix-run/testing processRoutes() function',
			)
		}

		// Patch in the Remix context to loaders/actions
		let { loader, action } = route
		let newRoute: DataRouteObject = {
			id: route.id,
			path: route.path,
			index: route.index,
			lazy: route.lazy,
			Component: route.Component,
			ErrorBoundary: route.ErrorBoundary,
			action: action
				? (args: RRActionFunctionArgs) => action!({ ...args, context })
				: undefined,
			loader: loader
				? (args: RRLoaderFunctionArgs) => loader!({ ...args, context })
				: undefined,
			handle: route.handle,
			shouldRevalidate: route.shouldRevalidate,
		}

		// Add the EntryRoute to the manifest
		let entryRoute: EntryRoute = {
			id: route.id,
			path: route.path,
			index: route.index,
			parentId,
			hasAction: route.action != null,
			hasLoader: route.loader != null,
			hasErrorBoundary: route.ErrorBoundary != null,
			module: 'build/stub-path-to-module.js', // any need for this?
		}
		manifest.routes[newRoute.id] = entryRoute

		// Add the route to routeModules
		routeModules[route.id] = {
			default: route.Component || Outlet,
			ErrorBoundary: route.ErrorBoundary || undefined,
			handle: route.handle,
			links: route.links,
			meta: route.meta,
			shouldRevalidate: route.shouldRevalidate,
		}

		if (route.children) {
			newRoute.children = processRoutes(
				route.children,
				context,
				manifest,
				routeModules,
				newRoute.id,
			)
		}

		return newRoute
	})
}
