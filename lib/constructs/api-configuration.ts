import { Duration } from 'aws-cdk-lib';
import { AuthorizationType, CognitoUserPoolsAuthorizer, EndpointType, LambdaIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { UserPool } from 'aws-cdk-lib/aws-cognito';
import { ManagedPolicy, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Architecture, Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import * as path from 'path';

export interface ApiConfigurationProps {
  environment: string;
  userPool: UserPool;
}

export class ApiConfiguration extends Construct {
  constructor(scope: Construct, id: string, props: ApiConfigurationProps) {
    super(scope, id);

    const { environment, userPool } = props;

    const lambdaRole = new Role(this, `expressRole`, {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      path: '/',
      managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')]
    });

    const bundling = {
      minify: false,
      sourceMap: true,
      externalModules: ['aws-sdk', '@aws-sdk/*']
    };

    const expressHandler = new NodejsFunction(this, `expressHandler`, {
      runtime: Runtime.NODEJS_18_X,
      memorySize: 512,
      timeout: Duration.seconds(30),
      role: lambdaRole,
      entry: path.join(__dirname, '../src/index.ts'),
      architecture: Architecture.ARM_64,
      logRetention: RetentionDays.ONE_WEEK,
      environment: {
        ENVIRONMENT: environment,
        NODE_OPTIONS: '--enable-source-maps'
      },
      bundling
    });

    const apiGateway = new RestApi(this, `apiGateway`, {
      deployOptions: {
        stageName: environment
      },
      endpointConfiguration: {
        types: [EndpointType.REGIONAL]
      },
      defaultCorsPreflightOptions: {
        allowOrigins: ['*'],
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: ['*']
      }
    });

    const authorizer = new CognitoUserPoolsAuthorizer(this, `authorizer`, {
      cognitoUserPools: [userPool]
    });

    apiGateway.root.addProxy({
      defaultIntegration: new LambdaIntegration(expressHandler),
      defaultMethodOptions: {
        authorizationType: AuthorizationType.COGNITO,
        authorizer
      }
    });
  }
}
