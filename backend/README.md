<!-- # Efference Video Training Platform - Backend API

A comprehensive FastAPI application for managing video training sessions, task assignments, and reviews with role-based access control.

## 🏗️ Architecture Overview

This backend follows a well-structured, maintainable architecture:

```
backend/
├── main.py                 # FastAPI application entry point
├── database.py            # Database configuration and session management
├── auth.py                # Authentication and authorization utilities
├── schemas.py             # Pydantic models for API validation
├── crud.py                # Database CRUD operations
├── requirements.txt       # Python dependencies
├── alembic.ini           # Alembic configuration
├── setup.sh              # Setup script
├── .env.example          # Environment variables template
├── db/
│   ├── base.py           # SQLAlchemy base class
│   ├── models.py         # SQLAlchemy models
│   └── schema.py         # Database schema utilities
├── alembic/
│   ├── env.py            # Alembic environment configuration
│   └── versions/         # Migration files
└── routers/
    ├── auth.py           # Authentication endpoints
    ├── users.py          # User management endpoints
    ├── tasks.py          # Task management endpoints
    ├── sessions.py       # Video session management endpoints
    ├── reviews.py        # Review management endpoints
    └── dashboard.py      # Dashboard statistics endpoints
```

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- PostgreSQL (recommended) or SQLite for development
- pip or conda for package management

### 1. Setup

```bash
# Clone and navigate to backend directory
cd backend

# Run the setup script (creates virtual environment and installs dependencies)
chmod +x setup.sh
./setup.sh

# Or manually:
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env  # or your preferred editor
```

Key configuration variables:
- `DATABASE_URL`: Your PostgreSQL connection string
- `SECRET_KEY`: JWT secret key (generate a secure one for production)
- `ACCESS_TOKEN_EXPIRE_MINUTES`: Token expiration time

### 3. Database Setup

```bash
# Create database (PostgreSQL example)
createdb efference_db

# Generate initial migration
alembic revision --autogenerate -m "Initial migration"

# Apply migration
alembic upgrade head
```

### 4. Run the Application

```bash
# Development server with auto-reload
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Production server
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

### 5. Access the API

- **API Documentation**: http://localhost:8000/docs
- **Alternative Docs**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/health

## 📊 Database Models

### Core Entities

1. **User** - System users with roles (Admin, Trainer, Reviewer)
2. **Task** - Training tasks created by admins
3. **TaskAssignment** - Links trainers to tasks
4. **VideoSession** - Recording sessions for tasks
5. **RawClip** - Individual video file uploads
6. **Review** - Reviewer feedback on sessions
7. **ProcessingJob** - Background processing workflow tracking

### User Roles

- **ADMIN**: Creates tasks, manages users and assignments
- **TRAINER**: Records video sessions for assigned tasks
- **REVIEWER**: Reviews completed video sessions

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication:

1. **Login**: `POST /auth/login` with email/password
2. **Get Token**: Receive JWT access token
3. **Authenticate**: Include token in `Authorization: Bearer <token>` header
4. **Role-based Access**: Endpoints protected by user roles

### Example Authentication Flow

```python
# Login
response = requests.post("/auth/login", json={
    "email": "user@example.com",
    "password": "securepassword"
})
token = response.json()["access_token"]

# Authenticated request
headers = {"Authorization": f"Bearer {token}"}
response = requests.get("/users/me", headers=headers)
```

## 🛣️ API Endpoints

### Authentication (`/auth`)
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `GET /auth/me` - Get current user info
- `POST /auth/change-password` - Change password

### Users (`/users`)
- `GET /users/` - List users (with filtering)
- `POST /users/` - Create user
- `GET /users/{user_id}` - Get user by ID
- `PUT /users/{user_id}` - Update user
- `DELETE /users/{user_id}` - Delete user
- `GET /users/{user_id}/statistics` - User statistics

### Tasks (`/tasks`)
- `GET /tasks/` - List tasks
- `POST /tasks/` - Create task (admin only)
- `GET /tasks/{task_id}` - Get task
- `PUT /tasks/{task_id}` - Update task
- `DELETE /tasks/{task_id}` - Delete task
- `POST /tasks/{task_id}/assignments` - Assign task to trainer
- `GET /tasks/{task_id}/assignments` - List task assignments

### Video Sessions (`/sessions`)
- `GET /sessions/` - List video sessions (with filtering)
- `POST /sessions/` - Create video session
- `GET /sessions/{session_id}` - Get session with details
- `PUT /sessions/{session_id}` - Update session
- `DELETE /sessions/{session_id}` - Delete session
- `GET /sessions/{session_id}/clips` - List raw clips
- `POST /sessions/{session_id}/clips` - Add raw clip
- `GET /sessions/{session_id}/processing-jobs` - List processing jobs

### Reviews (`/reviews`)
- `GET /reviews/` - List reviews
- `POST /reviews/` - Create review (reviewer only)
- `GET /reviews/{review_id}` - Get review
- `PUT /reviews/{review_id}` - Update review
- `DELETE /reviews/{review_id}` - Delete review
- `GET /reviews/session/{session_id}` - Get review by session

### Dashboard (`/dashboard`)
- `GET /dashboard/statistics` - Overall platform statistics

## 🔄 Database Migrations

This project uses Alembic for database schema management:

```bash
# Create a new migration
alembic revision --autogenerate -m "Description of changes"

# Apply migrations
alembic upgrade head

# Rollback migration
alembic downgrade -1

# View migration history
alembic history

# View current revision
alembic current
```

## 🧪 Testing

```bash
# Install test dependencies
pip install pytest pytest-asyncio httpx

# Run tests
pytest

# Run with coverage
pytest --cov=.
```

## 📦 Dependencies

Key dependencies and their purposes:

- **FastAPI**: Modern, fast web framework
- **SQLAlchemy**: ORM and database toolkit
- **Alembic**: Database migration tool
- **Pydantic**: Data validation and serialization
- **python-jose**: JWT token handling
- **passlib**: Password hashing
- **psycopg2-binary**: PostgreSQL adapter
- **uvicorn**: ASGI server

## 🔧 Development

### Code Structure Guidelines

1. **Models** (`db/models.py`): SQLAlchemy models with relationships
2. **Schemas** (`schemas.py`): Pydantic models for API validation
3. **CRUD** (`crud.py`): Database operations, separated from API logic
4. **Routers** (`routers/`): API endpoints grouped by functionality
5. **Auth** (`auth.py`): Authentication and authorization utilities

### Adding New Features

1. **Add Model**: Define SQLAlchemy model in `db/models.py`
2. **Create Schema**: Add Pydantic schemas in `schemas.py`
3. **Implement CRUD**: Add database operations in `crud.py`
4. **Create Router**: Add API endpoints in `routers/`
5. **Generate Migration**: `alembic revision --autogenerate -m "Add feature"`

## 🚀 Deployment

### Environment Variables for Production

```bash
DATABASE_URL=postgresql://user:pass@production-db:5432/efference_prod
SECRET_KEY=your-super-secure-secret-key
ACCESS_TOKEN_EXPIRE_MINUTES=60
DEBUG=False
```

### Docker Deployment

```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## 📝 Contributing

1. Follow the existing code structure and patterns
2. Add proper type hints and docstrings
3. Include appropriate error handling
4. Write tests for new functionality
5. Update this README for significant changes

## 🔒 Security Considerations

- Change default `SECRET_KEY` in production
- Use environment variables for sensitive configuration
- Implement rate limiting for API endpoints
- Validate and sanitize all inputs
- Use HTTPS in production
- Regularly update dependencies

## 📋 Next Steps

1. **File Upload Integration**: Implement S3 presigned URLs for video uploads
2. **Background Processing**: Add Celery/Redis for video processing workflows
3. **WebSocket Support**: Real-time updates for session status
4. **API Versioning**: Implement versioning strategy
5. **Monitoring**: Add logging, metrics, and health checks
6. **Testing**: Comprehensive test suite with fixtures
7. **Documentation**: API documentation with examples



TEST TEST