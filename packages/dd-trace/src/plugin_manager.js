'use strict'

const { channel } = require('dc-polyfill')
const { isFalse } = require('./util')
const plugins = require('./plugins')
const log = require('./log')

const loadChannel = channel('dd-trace:instrumentation:load')
// eslint-disable-next-line no-console
// console.log(loadChannel)

// instrument everything that needs Plugin System V2 instrumentation
require('../../datadog-instrumentations')
if (process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined) {
  // instrument lambda environment
  require('./lambda')
}

const { DD_TRACE_DISABLED_PLUGINS } = process.env

const disabledPlugins = new Set(
  DD_TRACE_DISABLED_PLUGINS && DD_TRACE_DISABLED_PLUGINS.split(',').map(plugin => plugin.trim())
)

// TODO actually ... should we be looking at environment variables this deep down in the code?

const pluginClasses = {}

loadChannel.subscribe(({ name }) => {
  // eslint-disable-next-line no-console
  // console.log(name, 'plugin_manager')
  maybeEnable(plugins[name])
})

// Globals
maybeEnable(require('../../datadog-plugin-fetch/src'))

function maybeEnable (Plugin) {
  if (!Plugin || typeof Plugin !== 'function') return
  if (!pluginClasses[Plugin.id]) {
    const envName = `DD_TRACE_${Plugin.id.toUpperCase()}_ENABLED`
    const enabled = process.env[envName.replace(/[^a-z0-9_]/ig, '_')]

    // TODO: remove the need to load the plugin class in order to disable the plugin
    if (isFalse(enabled) || disabledPlugins.has(Plugin.id)) {
      log.debug(`Plugin "${Plugin.id}" was disabled via configuration option.`)

      pluginClasses[Plugin.id] = null
    } else {
      pluginClasses[Plugin.id] = Plugin
    }
  }
}

// TODO this must always be a singleton.
module.exports = class PluginManager {
  constructor (tracer) {
    this._tracer = tracer
    this._tracerConfig = null
    this._pluginsByName = {}
    this._configsByName = {}

    this._loadedSubscriber = ({ name }) => {
      // eslint-disable-next-line no-console
      // console.log(name, 61, 'plugin_manager')
      const Plugin = plugins[name]

      if (!Plugin || typeof Plugin !== 'function') return

      this.loadPlugin(Plugin.id)
    }

    loadChannel.subscribe(this._loadedSubscriber)
  }

  loadPlugin (name) {
    // eslint-disable-next-line no-console
    // data mostly comes from _loadedSubscriber, and only in this file console.log(name, 74, 'plugin_manager')
    const Plugin = pluginClasses[name]

    if (!Plugin) return
    if (!this._tracerConfig) return // TODO: don't wait for tracer to be initialized
    if (!this._pluginsByName[name]) {
      this._pluginsByName[name] = new Plugin(this._tracer, this._tracerConfig)
    }
    const pluginConfig = this._configsByName[name] || {
      enabled: this._tracerConfig.plugins !== false
    }

    // extracts predetermined configuration from tracer and combines it with plugin-specific config
    this._pluginsByName[name].configure({
      ...this._getSharedConfig(name),
      ...pluginConfig
    })
  }

  // TODO: merge config instead of replacing
  configurePlugin (name, pluginConfig) {
    // eslint-disable-next-line no-console
    // checked already console.log(name, 100, 'plugin_manager')
    const enabled = this._isEnabled(pluginConfig)

    this._configsByName[name] = {
      ...pluginConfig,
      enabled
    }

    this.loadPlugin(name)
  }

  // like instrumenter.enable()
  configure (config = {}) {
    this._tracerConfig = config
    // console.log(this._tracer._nomenclature, 'plugin_manager')
    this._tracer._nomenclature.configure(config)
    // console.log(pluginClasses, 'plugin_manager')
    for (const name in pluginClasses) {
      // eslint-disable-next-line no-console
      // console.log(name, 'plugin_manager')
      this.loadPlugin(name)
    }
  }

  // This is basically just for testing. like intrumenter.disable()
  destroy () {
    for (const name in this._pluginsByName) {
      this._pluginsByName[name].configure({ enabled: false })
    }

    loadChannel.unsubscribe(this._loadedSubscriber)
  }

  _isEnabled (pluginConfig) {
    if (typeof pluginConfig === 'boolean') return pluginConfig
    if (!pluginConfig) return true

    return pluginConfig.enabled !== false
  }

  // TODO: figure out a better way to handle this
  _getSharedConfig (name) {
    const {
      logInjection,
      serviceMapping,
      queryStringObfuscation,
      site,
      url,
      headerTags,
      dbmPropagationMode,
      dsmEnabled,
      clientIpEnabled,
      memcachedCommandEnabled,
      ciVisibilityTestSessionName,
      ciVisAgentlessLogSubmissionEnabled,
      isTestDynamicInstrumentationEnabled
    } = this._tracerConfig

    const sharedConfig = {
      dbmPropagationMode,
      dsmEnabled,
      memcachedCommandEnabled,
      site,
      url,
      headers: headerTags || [],
      ciVisibilityTestSessionName,
      ciVisAgentlessLogSubmissionEnabled,
      isTestDynamicInstrumentationEnabled
    }

    if (logInjection !== undefined) {
      sharedConfig.logInjection = logInjection
    }

    if (queryStringObfuscation !== undefined) {
      sharedConfig.queryStringObfuscation = queryStringObfuscation
    }

    if (serviceMapping && serviceMapping[name]) {
      sharedConfig.service = serviceMapping[name]
    }

    if (clientIpEnabled !== undefined) {
      sharedConfig.clientIpEnabled = clientIpEnabled
    }

    return sharedConfig
  }
}
