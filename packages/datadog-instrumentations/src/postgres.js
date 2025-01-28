'use strict'

const {
  channel,
  addHook,
  AsyncResource
} = require('./helpers/instrument')
const shimmer = require('../../datadog-shimmer')

const startCh = channel('apm:postgres:query:start')
const finishCh = channel('apm:postgres:query:finish')
const errorCh = channel('apm:postgres:query:error')
addHook({ name: 'postgres', file: 'cjs/src/query.js', versions: ['>=3.4.5'] }, postgres => {
  console.log(postgres.Query.prototype.handle, 'postgres.js', 14)
  shimmer.wrap(postgres.Query.prototype, 'handle', query => wrapQuery(query))
  return postgres
})

function wrapQuery (query) {
  // console.log(query, 'postgres.js', 20, this)
  // if (typeof query === 'function') return query
  // console.log(query, 'postgres.js', ...arguments)
  return async function () {
    !this.executed && (this.executed = true) && await 1 && this.handler(this)
    // console.log({ query: query }, { strings: this.strings, pid: this.state?.pid }, 'postgres.js', arguments)
    console.log('postgres', 26)
    startCh.publish({
      params: arguments,
      query: arguments,
      processId: this.state?.pid,
      arguments
    })

    finishCh.publish()
  
    // if (!startCh.hasSubscribers) {
    //   return query.apply(this, arguments)
    // }

    // this.handle()
    // console.log(this.prototype.then)
    // return this.then.apply(this, arguments)

    // const callbackResource = new AsyncResource('bound-anonymous-fn')
    // const asyncResource = new AsyncResource('bound-anonymous-fn')
    // const processId = this.processID

    // const postgresQuery = arguments[0] !== null && typeof arguments[0] === 'object'
    //   ? arguments[0]
    //   : { text: arguments[0] }
    // const textProp = Object.getOwnPropertyDescriptor(postgresQuery, 'text')

    // // Only alter `text` property if safe to do so.
    // if (!textProp || textProp.configurable) {
    //   const originalText = postgresQuery.text

    //   Object.defineProperty(postgresQuery, 'text', {
    //     get () {
    //       return this?.__ddInjectableQuery || originalText
    //     }
    //   })
    // }

    // return asyncResource.runInAsyncScope(() => {
    //   const abortController = new AbortController()

    //   startCh.publish({
    //     params: arguments,
    //     query: arguments,
    //     arguments,
    //     abortController
    //   })

    //   const finish = asyncResource.bind(function (error) {
    //     if (error) {
    //       errorCh.publish(error)
    //     }
    //     finishCh.publish()
    //   })

    //   if (abortController.signal.aborted) {
    //     const error = abortController.signal.reason || new Error('Aborted')

    //     // eslint-disable-next-line max-len
    //     // Based on: https://github.com/brianc/node-postgres/blob/54eb0fa216aaccd727765641e7d1cf5da2bc483d/packages/pg/lib/client.js#L510
    //     const reusingQuery = typeof postgresQuery.submit === 'function'
    //     const callback = arguments[arguments.length - 1]

    //     finish(error)

    //     if (reusingQuery) {
    //       if (!postgresQuery.callback && typeof callback === 'function') {
    //         postgresQuery.callback = callback
    //       }

    //       if (postgresQuery.callback) {
    //         postgresQuery.callback(error)
    //       } else {
    //         process.nextTick(() => {
    //           postgresQuery.emit('error', error)
    //         })
    //       }

    //       return postgresQuery
    //     }

    //     if (typeof callback === 'function') {
    //       callback(error)

    //       return
    //     }

    //     return Promise.reject(error)
    //   }

    //   arguments[0] = postgresQuery

    //   const retval = query.apply(this, arguments)
    //   const queryQueue = this.queryQueue || this._queryQueue
    //   const activeQuery = this.activeQuery || this._activeQuery
    //   console.log(arguments[0], 'postgres.js 104')
    //   const newQuery = queryQueue[queryQueue.length - 1] || activeQuery

    //   if (!newQuery) {
    //     return retval
    //   }

    //   if (newQuery.callback) {
    //     const originalCallback = callbackResource.bind(newQuery.callback)
    //     newQuery.callback = function (err, res) {
    //       finish(err)
    //       return originalCallback.apply(this, arguments)
    //     }
    //   } else if (newQuery.once) {
    //     newQuery
    //       .once('error', finish)
    //       .once('end', () => finish())
    //   } else {
    //     newQuery.then(() => finish(), finish)
    //   }

    //   try {
    //     return query
    //   } catch (err) {
    //     errorCh.publish(err)
    //   }
    // })
  }
}
