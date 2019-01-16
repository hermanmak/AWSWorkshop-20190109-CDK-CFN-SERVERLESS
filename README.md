# AWSWorkshop-CDK-CFN-SERVERLESS
This workshop is intended to demonstrate the use of AWS CloudDevelopmentKit, hereby referred to as AWS CDK. Using AWS CDK we will go through step by step how to create a serverless web application from scratch. 

#### What is AWS CDK?
*Quoted directly from the open-source [repo](https://github.com/awslabs/aws-cdk)*: The AWS Cloud Development Kit (AWS CDK) is an open-source software development framework to define cloud infrastructure in code and provision it through AWS CloudFormation. The CDK integrates fully with AWS services and offers a higher level object-oriented abstraction to define AWS resources imperatively. Using the CDK’s library of infrastructure constructs, you can easily encapsulate AWS best practices in your infrastructure definition and share it without worrying about boilerplate logic. The CDK improves the end-to-end development experience because you get to use the power of modern programming languages to define your AWS infrastructure in a predictable and efficient manner.

#### Why should I use AWS CDK, or infrastructure as code?!?!
One of major reasons for unforseen outages and customer impacting issues is due to lack of change management.

#### Pre-reqs
1. A **personal** AWS Account
2. A **personal** email address

## Step 0 - Setup a clean development environment
Since everyone has their own preconfigured laptops with their own customized development environments, things could get pretty messy. So, lets use AWS Cloud9 for the sake of this lab, AWS Cloud9 provides a hosted IDE to write, run and debug code. It also comes with awscli preinstalled!
![AWS Cloud9 Console](/images/c9-console.png)

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
    
## Step 1 - Setup the basic CDK App Structure
The CDK is a way to implement your CloudFormation as code.
1. We will give out CloudFormation stack we want to create a name, *hello-cdk*
2. Open the myFirstCDKApp.ts file and paste the following:
    ```
    const cdk = require('@aws-cdk/cdk');
    
    class MyStack extends cdk.Stack {
        constructor(parent, id, props) {}
    }

    class MyApp extends cdk.App {
        constructor(argv) {
            super(argv);

            new MyStack(this, 'hello-cdk');
        }
    }

    new MyApp().run();
    ```
3. Lets ensure this builds and synthesizes corrently as is. Ensure that you are at the base directory of the project `pwd` should output `/home/ec2-user/environment/cdk-cfn-demo-env` then execute
    ```
    npm run build
    cdk synth
    cdk deploy
    ```
## Step 2 - Setup Amazon Simple Email Service
For the purposes of our demo we will use Amazon Simple Email Service to send an email to yourself, similar to how we may send a sample verfication code during signup as your favorite website.
![Amazon Simple Email Service](/images/ses-setup.png)
1. On the right hand side click `Email Addresses`.
3. At the top click `Verify a New Email Address`.
4. Add your email here and verify by going to your own email inbox and clicking the confirm link. Save this email as it will be used in Step 3.3

## Step 3 - Let's create our serverless backend
1. Install the node module for Lambda
    ```
    npm i @aws-cdk/aws-lambda@0.22.0
    ```
2. Lets create a new Lambda function, first we will create a directory and file.
    ```
    mkdir resources
    mkdir resources/lambda
    touch index.js
    ```
3. Paste the following code in `index.js`, the full path would be something like `/home/ec2-user/environment/cdk-cfn-demo-app/resources/lambda`. Don't forget to save the file afterwards. Make sure you replace `<YOUR_EMAIL_HERE>` with your own.
    ```
    var AWS = require('aws-sdk');
    var ses = new AWS.SES();
    var RECEIVERS = ['<YOUR_EMAIL_HERE>];
    var SENDER = '<YOUR_EMAIL_HERE>'; // ensure 'sender email' is verified in your Amazon SES
    exports.handler = (event, context, callback) => {
        console.log('Received event:', event);
        sendEmail(event, function (err, data) {
            var response = {
                "isBase64Encoded": false,
                "headers": { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                "statusCode": 200,
                "body": "{\"result\": \"Success.\"}"
            };
            callback(err, response);
        });
    };
    function sendEmail (event, done) {
        var data = JSON.parse(event.body);

        var params = {
            Destination: {
                ToAddresses: RECEIVERS
            },
            Message: {
                Body: {
                    Text: {
                        Data: 'Name: ' + data.name + '\nEmail: ' + data.email + '\nMessage: ' + data.message,
                        Charset: 'UTF-8'
                    }
                },
                Subject: {
                    Data: 'Contact Form inquiry: ' + data.name,
                    Charset: 'UTF-8'
                }
            },
            Source: SENDER
        }
        ses.sendEmail(params, done);
    }
    ```
4. Let's define the Lambda function in our stack. Back in `myFirstCDKApp.ts` update the stack object with:
    ```
    const backend = new lambda.Function(this, 'myCDKFunction', {
        runtime: lambda.Runtime.NodeJS810,
        handler: 'index.handler',
        code: lambda.Code.asset('resources/lambda')
    });
    backend.addToRolePolicy(new iam.PolicyStatement()
        .addResource('*')
        .addAction('ses:*'));
    ```
    What we did here was define a new Lambda which is written in NodeJS. The file name will be `index.js` and the  function which will be called by the Lambda execution will be called `handler`, hence `index.handler`. The code will be stored in this file, under `resources/lambda` and CDK will upload it to S3 and then populate it for us. We added a new additional policy to this Lambda execution role so that it can call SES to send emails out. 

5. Install the node module for API Gateway
    ```
    npm i @aws-cdk/aws-apigateway@0.22.0
    ```
6. Update our stack with API Gateway. Back in `myFirstCDKApp.ts` update the stack object with:
    ```
    const api = new apigateway.LambdaRestApi(this, 'myCDKAPI', {
        handler: backend,
        proxy: false,
    });
    api.root.addMethod('POST');
    ```
    What we did here was define a new API Gateway API. The name of the REST API is `myCDKAPI` and at the base URL you are able to send a POST call.

## Step 3 - Let's setup a serverless front end
1. Install the node module for S3 and S3 Deployment
    ```
    npm i @aws-cdk/aws-s3@0.22.0
    npm i @aws-cdk/aws-s3-deployment@0.22.0
    ```
2. Populate a html file to be uploaded via S3 for our static website at `resources/website`, be sure to replace `<YOUR_GATEWAY_ENDPOINT>` with your own email.
    ```
    <script src="https://ajax.googleapis.com/ajax/libs/jquery/2.2.4/jquery.min.js"></script>
    <script type="text/javascript">         
    $(document).ready(function() {
        $("#submit").click(function(e) {
            e.preventDefault();

            var name = $("#name").val();            
            var email = $("#email").val();                 
            var message = $("#message").val();

            $.ajax({                     
                type: 'POST',                     
                url: 'https://<YOUR_GATEWAY_ENDPOINT>.execute-api.us-east-1.amazonaws.com/prod',          
                contentType: 'application/json',
                data: JSON.stringify({                         
                    'name': name,                         
                    'email': email,                         
                    'message': message                     
                }),                     
                success: function(res){                         
                    $('#form-response').html('<div class="alert alert-info" role="alert">Now sending onfirmation email...</div>');
                },                     
                error: function(){
                    $('#form-response').html('<div class="alert alert-info" role="alert">Something went wrong... We are working on it!</div>');                     
                }
            }); 
        }) 
    });      
    </script>

    <!--THIS IS WHERE DATA IS PULLED FROM S3 TO API TO LAMBDA TO SES-->
    <link rel="shortcut icon" href="">
    <div class="form-label-group">
        <input type="text" id="name" class="form-control" required>
            <label for="name" class="control-label">Name</label>
    </div>
    <div class="form-label-group">
        <input type="text" id="email" class="form-control" required>
        <label for="email" class="control-label">Email address</label>
    </div>
    <div class="form-label-group">
        <textarea id="message" name="message" rows="3" class="form-control" placeholder="Message"></textarea>
    </div>
    <div id="form-response"></div>
    <button class="btn btn-lg btn-primary btn-block" id="submit" type="submit" style="background-color:#28547C;">Request Demo</button>
    ```
    What we did there was create a bucket for static website hosting, we set `index.html` file name to be our main index document for our website. Then we deployed the website by uploading the local files stored at `resources/website` to S3.
    
3. Update `myFirstCDKApp.ts` with the new S3 bucket and deployment.
    ```
    const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
        websiteIndexDocument: 'index.html',
        publicReadAccess: true
    });
    websiteBucket.grantRead;

    new s3deploy.BucketDeployment(this, 'DeployWebsite', {
      source: s3deploy.Source.asset('resources/website'),
      destinationBucket: websiteBucket,
    });
    ```
    
## Step 4 - After the lab ends
1. Destroy the stack to clean up all resources generated by this project.
    ```
    cdk destroy
    ```
    
# Congrats, you are now a AWS CDK user!
Consider storing the cloudformation output in git, along with the rest of the CDK App. `cdk synth > raw-cfn.txt`
