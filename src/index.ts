import { HttpServerRequest, HttpServerResponse } from '@vertx/core'
import { HttpMethod } from '@vertx/core/options'

interface DodokoRequest {
    path: string
    params: Record<string, string>
}

interface DodokoParamsHandler {
    req: HttpServerRequest
    extra: DodokoRequest
    res: HttpServerResponse
}
type DodokoHandler = (handler: DodokoParamsHandler) => any
type DodokoHttpHandler = (path: string, cb: DodokoHandler) => Dodoko

type Dodoko = {
    get: DodokoHttpHandler
    post: DodokoHttpHandler
    put: DodokoHttpHandler
    patch: DodokoHttpHandler
    del: DodokoHttpHandler
    options: DodokoHttpHandler
    head: DodokoHttpHandler
    listen: (port: number) => Promise<void>
    fallback: (cb: DodokoHandler) => Dodoko
}

const hasPathSymbol = (path: string) => path.includes(':') || path.includes('*')

const dodoko = () => {
    const route = new Map<string, DodokoHandler>()
    const paramRoute = new Map<HttpMethod, Map<string, DodokoHandler>>()

    let fallbackHandler: DodokoHandler = ({ res }) => {
        res.setStatusCode(404).end()
    }

    paramRoute.set(HttpMethod.GET, new Map())
    paramRoute.set(HttpMethod.POST, new Map())
    paramRoute.set(HttpMethod.PUT, new Map())
    paramRoute.set(HttpMethod.PATCH, new Map())
    paramRoute.set(HttpMethod.DELETE, new Map())
    paramRoute.set(HttpMethod.OPTIONS, new Map())
    paramRoute.set(HttpMethod.HEAD, new Map())

    const get = (path: string, cb: DodokoHandler) => {
        if (hasPathSymbol(path)) paramRoute.get(HttpMethod.GET)!.set(path, cb)
        else route.set(`${HttpMethod.GET}${path}`, cb)

        return handler
    }

    const post = (path: string, cb: DodokoHandler) => {
        if (hasPathSymbol(path)) paramRoute.get(HttpMethod.POST)!.set(path, cb)
        else route.set(`${HttpMethod.POST}${path}`, cb)

        return handler
    }

    const put = (path: string, cb: DodokoHandler) => {
        if (hasPathSymbol(path)) paramRoute.get(HttpMethod.PUT)!.set(path, cb)
        else route.set(`${HttpMethod.PUT}${path}`, cb)

        return handler
    }

    const patch = (path: string, cb: DodokoHandler) => {
        if (hasPathSymbol(path)) paramRoute.get(HttpMethod.PATCH)!.set(path, cb)
        else route.set(`${HttpMethod.PATCH}${path}`, cb)

        return handler
    }

    const del = (path: string, cb: DodokoHandler) => {
        if (hasPathSymbol(path))
            paramRoute.get(HttpMethod.DELETE)!.set(path, cb)
        else route.set(`${HttpMethod.DELETE}${path}`, cb)

        return handler
    }

    const options = (path: string, cb: DodokoHandler) => {
        if (hasPathSymbol(path))
            paramRoute.get(HttpMethod.OPTIONS)!.set(path, cb)
        else route.set(`${HttpMethod.OPTIONS}${path}`, cb)

        return handler
    }

    const head = (path: string, cb: DodokoHandler) => {
        if (hasPathSymbol(path)) paramRoute.get(HttpMethod.HEAD)!.set(path, cb)
        else route.set(`${HttpMethod.HEAD}${path}`, cb)

        return handler
    }

    const listen = async (port: number) => {
        return (() => {
            vertx
                .createHttpServer()
                .requestHandler(async (req) => {
                    const path = req.path()!
                    const method = req.method()
                    const res = req.response()

                    const dodokoReq: DodokoRequest = {
                        path,
                        params: {}
                    }

                    const requestHandler = {
                        req: req,
                        extra: dodokoReq,
                        res
                    }

                    const mapReturnResponse = async (callbackValue: any) => {
                        const value =
                            callbackValue instanceof Promise
                                ? await callbackValue
                                : callbackValue

                        if (value && !req.isEnded()) res.send(value)
                    }

                    const cb = route.get(`${method}${path!}`)
                    if (cb) return await mapReturnResponse(cb(requestHandler))

                    const paths = path.split('/')

                    for (let [handler, cb] of paramRoute
                        .get(method)!
                        .entries()) {
                        if (handler === '*')
                            return await mapReturnResponse(cb(requestHandler))

                        const handlers = handler.split('/')
                        if (
                            handlers.length !== paths.length &&
                            !handlers.includes('*')
                        )
                            continue

                        const _params: Record<string, string> = {}

                        let allowAll = false
                        let allMatches = true

                        for (let index = 0; index <= handlers.length; index++) {
                            const param = handlers[index]
                            const path = paths[index]

                            if (param === '*') {
                                allowAll = true

                                let rest = [path]
                                for (let i = index + 1; i < paths.length; i++)
                                    rest.push(paths[i])

                                _params['rest'] = rest.join('/')
                                break
                            }
                            if (!param) continue

                            if (param[0] === ':') {
                                _params[param.slice(1, param.length)] = path
                                continue
                            }

                            if (param !== path) {
                                allMatches = false
                                break
                            }
                        }

                        if (allowAll || allMatches) {
                            dodokoReq.params = _params

                            return await mapReturnResponse(cb(requestHandler))
                        }
                    }

                    return await mapReturnResponse(
                        fallbackHandler(requestHandler)
                    )
                })
                .listen(port)
        })()
    }

    const fallback = (cb: DodokoHandler) => {
        fallbackHandler = cb

        return handler
    }

    const handler = {
        get,
        post,
        put,
        patch,
        del,
        options,
        head,
        listen,
        fallback
    } as Dodoko

    return handler
}

export default dodoko
