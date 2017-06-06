const debug = require('debug')('loopback-component-meta')
const modelDefinition = require('./models/meta.json')

// Remove properties that will confuse LB
function getSettings (def) {
  var settings = {}
  for (var s in def) {
    if (def.hasOwnProperty(s)) {
      if (s !== 'name' || s !== 'properties') {
        settings[ s ] = def[ s ]
      }
    }
  }
  return settings
}

module.exports = function (app, options) {
  debug('Component configuration:')
  debug(options)
  options = options || {}

  if (!options.filter) {
    debug('No filter defined')
    options.filter = []
  }

  var dataSource = options.dataSource || 'db'
  if (typeof dataSource === 'string') {
    dataSource = app.dataSources[ dataSource ]
  }

  if (typeof options.acls !== 'object') {
    modelDefinition.acls = []
  } else {
    debug('Enable ACL')
    debug(options.acls)
    modelDefinition.acls = options.acls
  }

  // Support for loopback 2.x.
  if (app.loopback.version.startsWith(2)) {
    Object.keys(modelDefinition.methods).forEach(method => {
      modelDefinition.methods[method].isStatic = true
    })
  }

  const NewModel = dataSource.createModel(
    modelDefinition.name,
    modelDefinition.properties,
    getSettings(modelDefinition)
  )

  const Model = require('./models/meta.js')(NewModel, options)
  app.model(Model)

  if (!options.enableRest) {
    Object.keys(modelDefinition.methods).forEach(function (methodName) {
      debug('REST disabled for method ' + methodName)
      Model.disableRemoteMethod(methodName, true)
    })
  } else {
    debug('REST enabled')
  }

  Model.createStructure()
}
