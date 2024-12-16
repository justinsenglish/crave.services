#!/usr/bin/env node
import { App } from 'aws-cdk-lib';
import { ServicesStack } from '../lib/services-stack';

const app = new App();

const environment = app.node.tryGetContext('environment');

new ServicesStack(app, 'CraveServicesStack', {
  environment
});
