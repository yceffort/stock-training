import type { Server as HttpServer } from 'node:http'
import type { Connect, Plugin } from 'vite'
import { handleApi } from './api'
import { ensureSeeded, setSimulator } from './market'
import { createSocketServer, startHeartbeat } from './socket'
import { state } from './state'

function attach(middlewares: Connect.Server, httpServer: HttpServer | null) {
  middlewares.use((request, response, next) => {
    handleApi(request, response, next).catch(next)
  })
  httpServer?.on('upgrade', createSocketServer())
  ensureSeeded()
  startHeartbeat()
  if (process.env.E2E !== '1' && !state.simulator.running) setSimulator(true)
}

/** 실제 백엔드를 대신하는 API와 웹소켓 서버를 dev, preview 서버에 붙인다. */
export function fakeBackend(): Plugin {
  return {
    name: 'fake-backend',
    configureServer(server) {
      attach(server.middlewares, server.httpServer as HttpServer | null)
    },
    configurePreviewServer(server) {
      attach(server.middlewares, server.httpServer as HttpServer)
    },
  }
}
