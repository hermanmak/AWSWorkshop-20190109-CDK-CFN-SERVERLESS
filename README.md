# AWSWorkshop-20190109-CDK-CFN-SERVERLESS
This workshop is intended to demonstrate the use of AWS CloudDevelopmentKit, hereby referred to as AWS CDK. Using AWS CDK we will go through step by step how to create a serverless web application from scratch. 

#### What is AWS CDK?
*Quoted directly from the open-source [repo](https://github.com/awslabs/aws-cdk)*: The AWS Cloud Development Kit (AWS CDK) is an open-source software development framework to define cloud infrastructure in code and provision it through AWS CloudFormation. The CDK integrates fully with AWS services and offers a higher level object-oriented abstraction to define AWS resources imperatively. Using the CDK’s library of infrastructure constructs, you can easily encapsulate AWS best practices in your infrastructure definition and share it without worrying about boilerplate logic. The CDK improves the end-to-end development experience because you get to use the power of modern programming languages to define your AWS infrastructure in a predictable and efficient manner.

#### Why should I use AWS CDK, or infrastructure as code?!?!
One of major reasons for unforseen outages and customer impacting issues is due to lack of change management.

#### Pre-reqs
1. A **personal** AWS Account

## Step 0 - Setup a clean development environment
Since everyone has their own preconfigured laptops with their own customized development environments, things could get pretty messy. So, lets use AWS Cloud9 for the sake of this lab, AWS Cloud9 provides a hosted IDE to write, run and debug code. It also comes with awscli preinstalled!

1. In the console, the Services button in the top left will reveal a dropdown with all the services.
2. Find or search for **Cloud9**.
3. In the middle right click **Create Environment**.
4. Give the Cloud9 environment a name (for example *cdk-cfn-demo-env*) and leave everything else as standard, create your environment.
5. In the bottom there is a terminal, lets install and initalize the CDK
    ```
    nvm install --lts
    nvm update npm
    npm install -g aws-cdk
    cdk --version

    mkdir myFirstCDKApp
    cd myFirstCDKApp
    cdk init --language typescript
    ```
    
## Step 1 - Start building our cdk template
1. Make our main App file
    ```
    mkdir bin
    touch app.js
    ```
2. Open the app.js file and paste the following:
    ```
    const cdk = require('@aws-cdk/cdk');
    const apigateway = require('@aws-cdk/aws-apigateway');
    const lambda = require('@aws-cdk/aws-lambda');

    class MyStack extends cdk.Stack {
        constructor(parent, id, props) {
            super(parent, id, props);

            // Define the backend lambda function
            const backend = new lambda.Function(this, 'myCDKFunction', {
                runtime: lambda.Runtime.NodeJS810,
                handler: 'index.handler',
                code: lambda.Code.asset('resources'),
            });

            const api = new apigateway.LambdaRestApi(this, 'myCDKAPI', {
                handler: backend,
                proxy: false,
            });

            const items = api.root.addResource('items');
            items.addMethod('GET');
            items.addMethod('POST');
        }
    }

    class MyApp extends cdk.App {
        constructor(argv) {
            super(argv);

            new MyStack(this, 'hello-cdk');
        }
    }

    new MyApp().run();
    ```
    Ensure that you are at the base directory of the project `pwd` should output `/home/ec2-user/environment/cdk-cfn-demo-env` then execute
    ```
    cdk synth --app 'bin/app.js'
    cdk deploy --app 'bin/app.js'
    ```


