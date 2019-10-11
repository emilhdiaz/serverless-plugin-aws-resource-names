'use strict'

const naming = require('./naming')
const mergeIamTemplates = require('./mergeIamTemplates')

class AWSNaming {
    constructor(serverless, options) {
        this.serverless = serverless
        this.options = options
        this.provider = serverless.getProvider('aws')
        this.hooks = {
            'package:setupProviderConfiguration': this.cleanAndMergeIamTemplates.bind(this)
        }

        // Overwrite the AWS provider's naming module
        serverless.cli.log('Setting custom naming conventions...')
        Object.assign(this.provider.naming, naming)

        // Overwrite the function names
        serverless.cli.log('Setting custom function names...')
        naming.setFunctionNames(this.provider)
    }

    async cleanAndMergeIamTemplates() {
         this.provider.serverless.cli.log('Cleaning out broken policy and putting in consolidated')
         mergeIamTemplates.mergeIamTemplates(this.provider)
    }
}
module.exports = AWSNaming
