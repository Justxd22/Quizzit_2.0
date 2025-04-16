# PDF MCQ Generator API

A FastAPI-based application that generates multiple-choice questions (MCQs) from PDF documents using OpenAI's GPT model.

## Features

- PDF text extraction
- AI-powered MCQ generation
- RESTful API endpoints
- Interactive API documentation
- CORS support for frontend integration

## Prerequisites

- Python 3.8+
- OpenAI API key
- Virtual environment (recommended)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd backend
```

2. Create and activate a virtual environment (recommended):
```bash
python -m venv venv
# Windows
venv\Scripts\activate
# Unix/MacOS
source venv/bin/activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create a `.env` file in the project root and add your OpenAI API key:
```plaintext
OPENAI_API_KEY=your_api_key_here
```

## Running the Application

1. Start the FastAPI server:
```bash
python -m uvicorn main:app --reload --port 8000
```

2. The server will start at `http://localhost:8000`
3. Access the interactive API documentation (Swagger UI) at `http://localhost:8000/docs`

## API Endpoints

### 1. Generate Questions
- **Endpoint**: `POST /generate-questions/`
- **Purpose**: Upload a PDF file and generate MCQ questions
- **Parameters**:
  - `file`: PDF file (required)
  - `num_questions`: Number of questions to generate (optional, default: 10)
- **Response Format**:
```json
{
    "questions": [
        {
            "question": "Question text",
            "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
            "correct_answer": "Correct option"
        }
    ]
}
```

### 2. Health Check
- **Endpoint**: `GET /health/`
- **Purpose**: Check if the API is running
- **Response**: `{"status": "healthy"}`

## Testing the API

### Using Swagger UI (Recommended)
1. Start the FastAPI server using the command above
2. Open your browser and navigate to `http://localhost:8000/docs`
3. You'll see the interactive Swagger UI documentation
4. Testing the Health Check:
   - Locate the `/health/` endpoint
   - Click the "Try it out" button
   - Click "Execute"
   - You should see a response with `{"status": "healthy"}`

5. Testing Question Generation:
   - Locate the `/generate-questions/` endpoint
   - Click the "Try it out" button
   - In the "Request body" section:
     - Click "Choose File" under the `file` parameter
     - Select a PDF file from your computer
     - (Optional) Set the `num_questions` parameter to your desired number
   - Click "Execute"
   - The response will show the generated questions in JSON format
   - You can view both the response body and the response headers
   - If there's an error, the response will include error details

Note: The Swagger UI provides a user-friendly interface to:
- Read API documentation
- Test endpoints interactively
- View request/response schemas
- Download response data
- View error messages and status codes

### Using cURL
```bash
# Health check
curl http://localhost:8000/health/

# Generate questions (replace path/to/your/file.pdf with actual path)
curl -X 'POST' \
  'http://localhost:8000/generate-questions/?num_questions=5' \
  -H 'accept: application/json' \
  -H 'Content-Type: multipart/form-data' \
  -F 'file=@path/to/your/file.pdf'
```



## Error Handling

The API includes proper error handling for common scenarios:

- Invalid file type (non-PDF)
- File processing errors
- OpenAI API errors
- Invalid request format

Error responses include appropriate HTTP status codes and descriptive messages.

## Development

The main application code is in `main.py` and includes:

- FastAPI application setup
- PDF text extraction
- MCQ generation using OpenAI
- API endpoints and response models
- Error handling and validation

## Security Considerations

1. The API key is stored in an environment file
2. CORS middleware is configured (customize allowed origins for production)
3. File uploads are handled securely with temporary file cleanup
4. Input validation is implemented for all endpoints
