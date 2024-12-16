import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CognitoConfiguration } from './constructs/cognito-configuration';
import { ApiConfiguration } from './constructs/api-configuration';

export interface ServiceStackProps extends StackProps {
  environment: string;
}

export class ServicesStack extends Stack {
  constructor(scope: Construct, id: string, props: ServiceStackProps) {
    super(scope, id, props);

    const { environment } = props;

    const { userPool } = new CognitoConfiguration(this, 'cognito', {
      environment
    });

    new ApiConfiguration(this, 'api', {
      environment,
      userPool
    });
  }
}
