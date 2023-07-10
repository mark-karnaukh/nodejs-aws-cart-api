import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as dotenv from 'dotenv';

dotenv.config();

export class NodejsAwsCartApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here
    const vpc = new ec2.Vpc(this, 'VPC', {
      natGateways: 1,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
        {
          cidrMask: 24,
          name: 'PrivateWithEgress',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
      ],
    });

    const securityGroup = new ec2.SecurityGroup(this, 'QuerySecurityGroup', {
      vpc,
      description: 'Security Group for Query',
      allowAllOutbound: true,
    });

    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(5432));

    const database = new rds.DatabaseInstance(this, 'PostgreSQLInstance', {
      databaseName: process.env.PG_DATABASE,
      engine: rds.DatabaseInstanceEngine.POSTGRES,
      vpc,
      vpcSubnets: {
        // Use this for `prod`
        // subnetType: ec2.SubnetType.PRIVATE_ISOLATED

        // Use this for `dev`
        subnetType: ec2.SubnetType.PUBLIC,
      },
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.BURSTABLE3,
        ec2.InstanceSize.MICRO
      ),
      allocatedStorage: 10,
      maxAllocatedStorage: 15,
      multiAz: false,
      allowMajorVersionUpgrade: false,
      autoMinorVersionUpgrade: true,
      backupRetention: cdk.Duration.days(0),
      securityGroups: [securityGroup],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      deletionProtection: false,
      // publiclyAccessible: true,
    });

    const lambdaLayer = new lambda.LayerVersion(this, 'CartApiBackendLayer', {
      // Remove `handlers/cart-api/node_modules` and run `npm install --omit=dev`
      code: lambda.Code.fromAsset('handlers/cart-api/node_modules'),
      compatibleRuntimes: [
        lambda.Runtime.NODEJS_16_X,
        lambda.Runtime.NODEJS_14_X,
      ],
    });

    const backendLambda = new lambda.Function(this, 'CartApiBackendLambda', {
      runtime: lambda.Runtime.NODEJS_16_X,
      code: lambda.Code.fromAsset('handlers/cart-api/dist'),
      handler: 'index.handler',
      layers: [lambdaLayer],
      environment: {
        DB_HOST: process.env.DB_HOST || '',
        DB_PORT: process.env.DB_PORT || '',
        DB_USERNAME: process.env.DB_USERNAME || '',
        DB_PASSWORD: process.env.DB_PASSWORD || '',
        DB_DATABASE: process.env.DB_DATABASE || '',
        NODE_PATH: '$NODE_PATH:/opt',
      },
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      timeout: cdk.Duration.minutes(5),
    });

    new apigateway.LambdaRestApi(this, 'CartAPI', {
      handler: backendLambda,
      description: 'Cart Service REST API',
      deployOptions: {
        stageName: 'dev', // Deployment stages: 'dev' or 'prod'. By default, the stageName is set to prod.
      },
      // 👇 enable CORS
      defaultCorsPreflightOptions: {
        allowHeaders: [
          ...apigateway.Cors.DEFAULT_HEADERS,
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
        ],
        allowMethods: apigateway.Cors.ALL_METHODS, // 'OPTIONS', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'
        allowCredentials: true,
        allowOrigins: apigateway.Cors.ALL_ORIGINS, // 'http://localhost:3000'
      },
    });
  }
}
