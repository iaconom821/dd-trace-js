'use strict'

const { CLIENT_PORT_KEY } = require('../../dd-trace/src/constants')
const DatabasePlugin = require('../../dd-trace/src/plugins/database')

class PostgresPlugin extends DatabasePlugin {
  static get id () { return 'postgres' }
  static get operation () { return 'query' }
  static get system () { return 'postgres' }

  start ({ params = {}, query, processId }) {
    console.log('datadog-plugin-postgres', 12)
    console.log(this.startSpan)
    //const service = this.serviceName({ pluginConfig: this.config, params })
    // const originalStatement = this.maybeTruncate(query.text)
    console.log(this.operationName())
    // const span = this.startSpan('postgres.query', {
    //   service: 'postgres',
    //   resource: 'test',
    //   type: 'sql',
    //   kind: 'client',
    //   meta: {
    //     'db.type': 'postgres'
    //     // 'db.pid': processId,
    //     // 'db.name': params.database,
    //     // 'db.user': params.user,
    //     // 'out.host': params.host,
    //     // [CLIENT_PORT_KEY]: params.port
    //   }
    // })

    // console.log(span)

    // query.__ddInjectableQuery = this.injectDbmQuery(span, query.text, service, !!query.name)
  }
}

module.exports = PostgresPlugin
