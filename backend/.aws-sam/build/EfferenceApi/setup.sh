#!/bin/bash

# Setup script for the Efference API Backend

echo "🚀 Setting up Efference API Backend..."

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔄 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📥 Installing Python dependencies..."
pip install -r requirements.txt

# Create environment file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "⚙️ Creating environment configuration file..."
    cp .env.example .env
    echo "📝 Please edit .env file with your actual configuration values"
fi

echo "🗄️ Database Migration Instructions:"
echo "1. Make sure PostgreSQL is running and create a database called 'efference_db'"
echo "2. Update the DATABASE_URL in your .env file"
echo "3. Run: alembic revision --autogenerate -m 'Initial migration'"
echo "4. Run: alembic upgrade head"

echo "🎯 To start the development server:"
echo "uvicorn main:app --reload --host 0.0.0.0 --port 8000"

echo "✅ Setup complete! Check the instructions above."