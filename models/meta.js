const debug = require('debug')('loopback-component-meta')
const utils = require('loopback-datasource-juggler/lib/utils')
const _ = require('lodash')

module.exports = function (Meta, options) {
  options = options || {}

  // This object holds the Model structure
  Meta.structure = []

  /**
   * Method for building the Model structure
   */
  Meta.createStructure = function () {
    debug('createStructure: Building model structure')
    Object.keys(Meta.app.models)
      .filter((modelName) => {
        return options.filter.indexOf(modelName) === -1
      })
      .sort()
      .map((modelName) => {
        debug('createStructure: ' + modelName)
        Meta.structure.push(getModelInfo(modelName))
      })
  }

  /**
   * Helper method for format the type of the properties
   */
  function formatProperties (properties) {
    const result = {}
    for (const key in properties) {
      if (properties.hasOwnProperty(key)) {
        result[ key ] = _.clone(properties[ key ])
        result[ key ].type = properties[ key ].type.name
      }
    }
    return result
  }

  /**
   * Get the definition of a model and format the result in a way that's similar to a LoopBack model definition file
   */
  function getModelInfo (modelName) {
    debug('getModelInfo: ' + modelName)

    // Get the model
    const model = Meta.app.models[ modelName ]

    // Create the base return object
    const result = {
      id: model.definition.name,
      name: model.definition.name,
      properties: formatProperties(model.definition.properties)
    }

    // Get the following keys from the settings object, if they are set
    const keys = [
      'acls',
      'base',
      'description',
      'hidden',
      'idInjection',
      'methods',
      'mixins',
      'persistUndefinedAsNull',
      'plural',
      'relations',
      'strict',
      'validations'
    ]

    // Loop through the keys and add them to the result with their value
    keys.forEach((key) => {
      result[ key ] = _.get(model.definition.settings, key)
    })
    return result
  }

  /**
   * Get all the models with its information
   */
  Meta.getModels = function (cb) {
    cb = cb || utils.createPromiseCallback()
    process.nextTick(function () {
      cb(null, Meta.structure)
    })
    return cb.promise
  }

  /**
   * Get one model with its information
   */
  Meta.getModelById = function (modelName, cb) {
    cb = cb || utils.createPromiseCallback()
    process.nextTick(function () {
      cb(null, getModelInfo(modelName))
    })
    return cb.promise
  }

  /**
   * Create an overview of the models and relations in graphviz format
   */
  Meta.graphviz = function (res, cb) {
    cb = cb || utils.createPromiseCallback()

    // The array with all the lines of information
    var result = []

    // The graph definition header
    result.push('digraph models {')
    result.push('\tnode [ shape  = box ]')

    // List all the base models
    var bases = {}
    result.push('\t# Base models')
    Meta.structure.map((info) => {
      var baseModel = info[ 'base' ]
      if (!bases[ baseModel ]) {
        bases[ baseModel ] = true
        result.push(`\t${baseModel}`)
      }
    })

    // List all the models with the relation the the base
    result.push('\t# Models')

    Meta.structure.map((info) => {
      var model = info['name']
      // The model itself
      result.push(`\t# Model ${model}`)
      result.push(`\t${model}`)

      // Add a relation to the base
      result.push(`\t${info[ 'base' ]} -> ${model}`)

      // Add relations to other models
      _.mapKeys(info.relations, (relationInfo, relationName) => {
        result.push(`\t${model} -> ${relationInfo.model} [ label = "${relationInfo.type}\\n${relationName}" ]`)
      })
    })

    // The graph definition footer
    result.push('}')

    // Join the lines together
    result = result.join('\r\n')

    // Send the result to the client
    process.nextTick(function () {
      res.type('text/plain')
      res.send(result)
    })
    return cb.promise
  }

  return Meta
}
