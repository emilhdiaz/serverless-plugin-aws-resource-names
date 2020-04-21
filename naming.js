'use strict'

const fs = require('fs')
const _ = require('lodash')
const uuidv4 = require('uuid/v4')

module.exports = {
    dataSource: undefined,

    getCompiledTemplateFileName() {
        return this._getMappings().template.compiled
    },

    getCoreTemplateFileName() {
        return this._getMappings().template.core
    },

    getStackName() {
        return this._getMappings().stack
    },

    getRoleName() {
        return this._getMappings().role
    },

    getPolicyName() {
        return this._getMappings().policy
    },

    getApiGatewayName() {
        return this._getMappings().apiGateway
    },

    getLogGroupName(name) {
        name = name
            .replace(this.provider.getStage() || 'dev', '')
            .replace(this.provider.serverless.service.service, '')
            .replace(/^\-+/g, '')
            .trim()
        var logGroupName = this._getMappings(name).logGroup
        return logGroupName
    },

    setFunctionNames(provider) {
        const self = this
        self.provider = provider

        if (self.provider) {
            _.forEach(self.provider.serverless.service.functions, (functionObj, functionName) => {
                if (!functionObj.events) {
                    self.provider.serverless.service.functions[functionName].events = []
                }
                const mappings = self._getMappings(functionName)
                self.provider.serverless.service.functions[functionName].name = mappings.lambda
            })
        }
    },

    _getMappings(lambdaName) {
        if (!this.dataSource) {
            this.dataSource = fs.readFileSync(this.provider.serverless.service.custom['serverless-aws-resource-names'].source, 'utf8').replace(new RegExp('\\$rand', 'g'), uuidv4())
        }
        var data = this.dataSource.replace(new RegExp('\\$stage', 'g'), this.provider.getStage() || 'dev')
        data = data.replace(new RegExp('\\$region', 'g'), this.provider.getRegion())
        data = data.replace(new RegExp('\\$service', 'g'), this.provider.serverless.service.service)
        data = data.replace(new RegExp('\\$lambda', 'g'), lambdaName)
        return JSON.parse(data)
    }
}
