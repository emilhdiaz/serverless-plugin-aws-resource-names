'use strict'

const naming = require('./naming')
const mergeIamTemplates = require('./mergeIamTemplates')
const ref = {}

class AWSNaming {
    constructor(serverless, options) {
        const self = this
        ref.self = self
        this.serverless = serverless
        this.service = serverless.service
        this.serverlessLog = serverless.cli.log.bind(serverless.cli)
        this.options = options
        this.provider = serverless.getProvider('aws')

        this.hooks = {
            'before:package:finalize': naming.fixLogGroups.bind(this),
            'package:setupProviderConfiguration': this.cleanAndMergeIamTemplates.bind(this),
        }

        self.start()
    }

    start() {
        ref.self.serverlessLog('Setting custom naming conventions...')
        var aws = ref.self.serverless.getProvider('aws')
        Object.assign(aws.naming, naming)
        ref.self.serverless.cli.log('Setting custom function names...')
        naming.setFunctionNames(aws)
    }

    async cleanAndMergeIamTemplates() {
        this.provider.serverless.cli.log('Cleaning out broken policy and putting in consolidated')
        mergeIamTemplates.mergeIamTemplates(this.provider)
    }
}
module.exports = AWSNaming
