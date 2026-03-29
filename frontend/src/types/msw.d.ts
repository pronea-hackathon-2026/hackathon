declare module 'msw' {
  export const http: {
    get: (...args: any[]) => any
    post: (...args: any[]) => any
    put: (...args: any[]) => any
    patch: (...args: any[]) => any
    delete: (...args: any[]) => any
  }

  export const HttpResponse: {
    json: (...args: any[]) => any
  }
}

declare module 'msw/browser' {
  export function setupWorker(...handlers: any[]): {
    start: (...args: any[]) => Promise<void>
    stop: () => void
  }
}
