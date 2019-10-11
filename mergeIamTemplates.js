'use strict'

const _ = require('lodash')
const BbPromise = require('bluebird');

module.exports = {
    mergeIamTemplates(provider) {
        const self = this
        self.provider = provider

        return this.merge();
    },

    merge() {
        // resolve early if no functions are provided
        if (!this.provider.serverless.service.getAllFunctions().length) {
          return BbPromise.resolve();
        }

        // resolve early if provider level role is provided
        if ('role' in this.provider.serverless.service.provider) {
          return BbPromise.resolve();
        }

        // resolve early if all functions contain a custom role
        const allResolvedFunctions = []
        const customRolesProvided = [];
        this.provider.serverless.service.getAllFunctions().forEach(functionName => {
          const { name: resolvedFunctionName } = this.provider.serverless.service.getFunction(functionName);
          allResolvedFunctions.push(resolvedFunctionName)

          const functionObject = this.provider.serverless.service.getFunction(functionName);
          customRolesProvided.push('role' in functionObject);
        });
        if (_.isEqual(_.uniq(customRolesProvided), [true])) {
          return BbPromise.resolve();
        }

        // discover the canonical function prefix ex) stage-service-
        const canonicalFunctionNamePrefix = function(strings) {
          if(!strings.length) {
            return "";
          }

          var sorted = strings.slice(0).sort(),
              string1 = sorted[0],
              string2 = sorted[sorted.length-1],
              i = 0,
              l = Math.min(string1.length, string2.length);

          while(i < l && string1[i] === string2[i]) {
            i++;
          }

          return string1.slice(0, i);
        }(allResolvedFunctions);


        const logGroupsPrefix = this.provider.naming.getLogGroupName(canonicalFunctionNamePrefix);


        const policyDocumentStatements = this.provider.serverless.service.provider.compiledCloudFormationTemplate
          .Resources[this.provider.naming.getRoleLogicalId()].Properties.Policies[0].PolicyDocument
          .Statement;

        let hasOneOrMoreCanonicallyNamedFunctions = false;

        // reset the policy statements to remove from main
        policyDocumentStatements[0].Resource = []
        policyDocumentStatements[1].Resource = []

        // Ensure policies for functions with custom name resolution
        this.provider.serverless.service.getAllFunctions().forEach(functionName => {
          const { name: resolvedFunctionName } = this.provider.serverless.service.getFunction(functionName);
          if (!resolvedFunctionName || resolvedFunctionName.startsWith(canonicalFunctionNamePrefix)) {
            hasOneOrMoreCanonicallyNamedFunctions = true;
            return;
          }

          const customFunctionNamelogGroupsPrefix = this.provider.naming.getLogGroupName(
            resolvedFunctionName
          );

          policyDocumentStatements[0].Resource.push({
            'Fn::Sub':
              'arn:${AWS::Partition}:logs:${AWS::Region}:${AWS::AccountId}' +
              `:log-group:${customFunctionNamelogGroupsPrefix}:*`,
          });

          policyDocumentStatements[1].Resource.push({
            'Fn::Sub':
              'arn:${AWS::Partition}:logs:${AWS::Region}:${AWS::AccountId}' +
              `:log-group:${customFunctionNamelogGroupsPrefix}:*:*`,
          });
        });

        if (hasOneOrMoreCanonicallyNamedFunctions) {
          // Ensure general policies for functions with default name resolution
          policyDocumentStatements[0].Resource.push({
            'Fn::Sub':
              'arn:${AWS::Partition}:logs:${AWS::Region}:${AWS::AccountId}' +
              `:log-group:${logGroupsPrefix}*:*`,
          });

          policyDocumentStatements[1].Resource.push({
            'Fn::Sub':
              'arn:${AWS::Partition}:logs:${AWS::Region}:${AWS::AccountId}' +
              `:log-group:${logGroupsPrefix}*:*:*`,
          });
        }
      }
};
