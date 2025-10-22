#!/bin/bash

# AWS SAM deployment script for Efference Backend API

set -e

echo "Deploying Efference Backend API to AWS Lambda..."

# Load .env file if it exists
if [ -f .env ]; then
    echo "Loading .env file..."
    set -a
    source .env
    set +a
fi

# Check if AWS credentials are available
if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
    echo "AWS credentials not found. Make sure AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are set."
    exit 1
fi

# Test AWS connection
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "Cannot connect to AWS. Check your credentials."
    exit 1
fi

# Check if SAM CLI is installed
if ! command -v sam &> /dev/null; then
    echo "AWS SAM CLI not found. Install it first:"
    echo "   pip install aws-sam-cli"
    exit 1
fi

# Build the application
echo "Building SAM application..."
sam build

# Deploy (guided mode for first time)
echo "Deploying to AWS..."
if [ ! -f samconfig.toml ]; then
    echo "First time deployment - using guided mode..."
    sam deploy --guided
else
    echo "Using existing configuration..."
    sam deploy
fi

echo "Deployment complete!"
echo "Your API is now live. Check the CloudFormation outputs for the API URL."