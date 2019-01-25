#!/usr/bin/env node
import cdk = require('@aws-cdk/cdk');
import apigateway = require('@aws-cdk/aws-apigateway');
import lambda = require('@aws-cdk/aws-lambda');
import s3 = require('@aws-cdk/aws-s3');
import s3deploy = require('@aws-cdk/aws-s3-deployment');
import iam = require('@aws-cdk/aws-iam');

class HelloCdkStack extends cdk.Stack {
    constructor(parent: cdk.App, name: string, props?: cdk.StackProps) {
        super(parent, name, props);
    
        /*
            Setup our lambda function, this is the business logic backend of our server.
            Notice that we can also configure the policies that this lambda function
            has, in particular we want to send an email using SES, so we will allow
            this lambda function to make actions to SES.
        */
        const backend = new lambda.Function(this, 'myCDKFunction', {
            runtime: lambda.Runtime.NodeJS810,
            handler: 'index.handler',
            code: lambda.Code.asset('resources/lambda')
        });
        backend.addToRolePolicy(new iam.PolicyStatement()
            .addResource('*')
            .addAction('ses:*'));
        
        /*
            Setup our API Gateway, this is a mamanged service that hosts apis which
            are eventually handled by lambdas or you backend servers.
        */
        const api = new apigateway.LambdaRestApi(this, 'myCDKAPI', {
            handler: backend,
            proxy: false,
        });
        api.root.addMethod('POST');
        
        /* 
            Setup our S3 bucket, not only is S3 a object storage but it also has 
            the capability to host static single page websites.
        */
        const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
            websiteIndexDocument: 'index.html',
            publicReadAccess: true
        });

        new s3deploy.BucketDeployment(this, 'DeployWebsite', {
          source: s3deploy.Source.asset('resources/website'),
          destinationBucket: websiteBucket,
        });
    }   
}

const app = new cdk.App();
new HelloCdkStack(app, 'HelloCdkStack');
app.run();