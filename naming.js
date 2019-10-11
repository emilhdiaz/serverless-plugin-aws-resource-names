'use strict'

const fs = require('fs')
const _ = require('lodash')
const uuidv4 = require('uuid/v4');

module.exports = {
    dataSource: undefined,

    _getMappings(lambdaName) {
        if (!this.dataSource) {
            this.dataSource = fs.readFileSync(this.provider.serverless.service.custom['serverless-aws-resource-names'].source, 'utf8').replace(new RegExp('\\$rand', 'g'), uuidv4())
        }
        var data = this.dataSource.replace(new RegExp('\\$stage', 'g'), this.provider.getStage() || 'dev')
        data = data.replace(new RegExp('\\$region', 'g'), this.provider.getRegion())
        data = data.replace(new RegExp('\\$service', 'g'), this.provider.serverless.service.service)
        if (lambdaName) {
            data = data.replace(new RegExp('\\$lambda', 'g'), lambdaName)
        } else {
            data = data.replace(new RegExp('\\$lambda', 'g'), 'lambdaName')
        }
        return JSON.parse(data)
    },

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
        const self = this
        var logGroup
        _.forEach(self.provider.serverless.service.functions, (functionObj, functionName) => {
            if (name === functionObj.name) {
                logGroup = this._getMappings(functionName).logGroup
                return false
            }
        })
        // the default function returns a string of /aws/lambda/functionName we need to replicate that
        // but still do the naming convention switch
        if (typeof logGroup == 'undefined') {
            var mappedlogGroup = this._getMappings(name).logGroup
            // name comes in as label-stage-label-stage
            logGroup = mappedlogGroup.substring(0, (mappedlogGroup.length - (name.length + 1)))
        }
        return logGroup
    },
   setFunctionNames(provider) {
        const self = this
        var mappings
        if (!self.provider) {
            self.provider = provider
        }
        if (self.provider) {
            _.forEach(self.provider.serverless.service.functions, (functionObj, functionName) => {
                if (!functionObj.events) {
                    self.provider.serverless.service.functions[functionName].events = []
                }
                mappings = self._getMappings(functionName)
                self.provider.serverless.service.functions[functionName].name = mappings.lambda
            })
        }
    },
    fixLogGroups(args) {
        var cft = this.serverless.service.provider.compiledCloudFormationTemplate
        var role = cft.Resources.IamRoleLambdaExecution
        for (var policy of role.Properties.Policies) {
            for (var statement of policy.PolicyDocument.Statement) {
                statement.Resource = []
                if (statement.Action.includes("logs:CreateLogStream")) {
                    for (var resource of Object.keys(cft.Resources)) {
                        if (resource.includes("LogGroup")) {
                            statement.Resource.push({
                                "Fn::Sub": "arn:aws:logs:${AWS::Region}:${AWS::AccountId}:log-group:${" + resource + "}:*"
                            })
                        }
                    }
                }
                if (statement.Action.includes("logs:PutLogEvents")) {
                    for (var resource of Object.keys(cft.Resources)) {
                        if (resource.includes("LogGroup")) {
                            statement.Resource.push({
                                "Fn::Sub": "arn:aws:logs:${AWS::Region}:${AWS::AccountId}:log-group:${" + resource + "}:*:*"
                            })
                        }
                    }
                }
            }
        }

    }
}
