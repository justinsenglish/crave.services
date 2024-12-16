import { RemovalPolicy } from 'aws-cdk-lib';
import { AccountRecovery, UserPool, UserPoolGroup, VerificationEmailStyle } from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';

export interface Props {
  environment: string;
}

export class CognitoConfiguration extends Construct {
  public readonly userPool: UserPool;

  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id);

    const { environment } = props;

    const userPool = new UserPool(this, 'userPool', {
      userPoolName: `crave-${environment}-user-pool`,
      signInAliases: {
        email: true
      },
      selfSignUpEnabled: false,
      autoVerify: {
        email: true
      },
      userVerification: {
        emailSubject: 'Verify your email for Crave Franchise Management',
        emailBody: 'Hello {username}, Thanks for signing up to Crave Franchise Management! Your verification code is {####}',
        emailStyle: VerificationEmailStyle.CODE
      },
      standardAttributes: {
        givenName: {
          required: false,
          mutable: true
        },
        familyName: {
          required: false,
          mutable: true
        },
        email: {
          required: true,
          mutable: false
        }
      },
      passwordPolicy: {
        minLength: 8,
        requireDigits: true,
        requireLowercase: true,
        requireUppercase: true,
        requireSymbols: false
      },
      accountRecovery: AccountRecovery.EMAIL_ONLY,
      removalPolicy: RemovalPolicy.DESTROY
    });

    new UserPoolGroup(this, 'adminGroup', {
      groupName: 'Administrators',
      userPool
    });

    new UserPoolGroup(this, 'franchiseeGroup', {
      groupName: 'Franchisees',
      userPool
    });

    userPool.addClient('adminClient', {
      userPoolClientName: 'crave-admin-client',
      generateSecret: true,
      authFlows: {
        userPassword: true
      }
    });

    userPool.addClient('franchiseeClient', {
      userPoolClientName: 'crave-franchisee-client',
      generateSecret: true,
      authFlows: {
        userPassword: true
      }
    });
  }
}
