# Project Setup Application

A comprehensive web application for project setup with Salesforce integration capabilities. The application guides users through a project setup process, accepting inputs from direct entry, file uploads (JSON/CSV), or document attachments with NLP/OCR parsing.

## Features

- **Multiple Input Methods**: Direct input, file upload (JSON/CSV), or document attachment
- **Document Parsing**: NLP and OCR capabilities for extracting information from PDFs, Word documents, and images
- **Role-Based Access Control**: Fine-grained permissions for different user roles
- **Modern UI**: Neumorphism and minimalist design with responsive layout
- **Multi-Step Form**: Organized sections for efficient data entry
- **Data Validation**: Comprehensive validation and confirmation before submission

## Technology Stack

### Frontend
- React 18.2.0
- React Router DOM 6.20.0
- React Hook Form 7.48.2
- Axios 1.6.2
- Lucide React (Icons)
- React Hot Toast (Notifications)

### Backend
- Node.js with Express.js
- JWT Authentication
- Multer (File Upload)
- CSV Parser
- PDF Parse
- Mammoth (DOCX parsing)
- Tesseract.js (OCR)
- Natural (NLP)

## Project Structure

```
ProjectSetup/
├── server/
│   ├── index.js                 # Main server file
│   ├── routes/
│   │   ├── auth.js              # Authentication routes
│   │   ├── projects.js           # Project CRUD routes
│   │   ├── upload.js             # File upload routes
│   │   └── parse.js              # Document parsing routes
│   ├── middleware/
│   │   └── auth.js               # Authentication middleware
│   └── config/
│       └── fieldDefinitions.js   # Field definitions
├── client/
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── App.js                # Main app component
│       ├── pages/
│       │   ├── Login.js          # Login page
│       │   ├── Dashboard.js      # Dashboard
│       │   ├── ProjectSetup.js   # Project setup form
│       │   └── ProjectConfirmation.js # Confirmation page
│       ├── components/
│       │   └── ProtectedRoute.js  # Route protection
│       ├── context/
│       │   └── AuthContext.js    # Authentication context
│       └── styles/               # CSS files
├── package.json                  # Root package.json
└── README.md
```

## Installation

1. **Install dependencies**:
   ```bash
   npm run install-all
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and configure:
   - `PORT`: Server port (default: 5000)
   - `CLIENT_URL`: Frontend URL (default: http://localhost:3000)
   - `JWT_SECRET`: Secret key for JWT tokens
   - `NODE_ENV`: Environment (development/production)

3. **Start the application**:
   ```bash
   npm run dev
   ```
   This starts both the backend server (port 5000) and frontend (port 3000).

## Usage

### Demo Credentials

- **Admin**: admin@example.com / admin123
  - Full access to all features
- **Project Manager**: pm@example.com / pm123
  - Can create, edit, and view projects
- **User**: user@example.com / user123
  - Can only view projects

### Project Setup Flow

1. **Login**: Sign in with your credentials
2. **Dashboard**: Click "Create New Project"
3. **Input Method Selection**:
   - **Direct Input**: Fill in forms manually
   - **File Upload**: Upload JSON or CSV file
   - **Document Attachment**: Upload PDF, DOCX, or image files
4. **Form Completion**: Navigate through sections:
   - Project Information
   - Project Details
   - Payment Configurations
   - Requirements
   - People
   - Languages
   - Budget
   - Links & Locations
   - Timeline
   - Project Team
   - Communication
5. **Confirmation**: Review all entered data
6. **Submit**: Create the project (Phase 1: stores in backend, Phase 2: will integrate with Salesforce)

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/verify` - Verify JWT token

### Projects
- `GET /api/projects` - Get all projects
- `GET /api/projects/:id` - Get project by ID
- `POST /api/projects` - Create new project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### File Upload
- `POST /api/upload/json` - Upload and parse JSON file
- `POST /api/upload/csv` - Upload and parse CSV file

### Document Parsing
- `POST /api/parse/document` - Upload and parse document (PDF, DOCX, TXT, images)

## File Formats

### JSON Format
```json
{
  "projectName": "P20315 Peregrine EN Transcription 2024 (Perkiomen-D)",
  "shortProjectName": "Perkiomen-D",
  "workdayProjectId": "P20315",
  "projectType": "Transcription",
  "projectPriority": 50.0,
  ...
}
```

### CSV Format
```csv
field,value
projectName,P20315 Peregrine EN Transcription 2024 (Perkiomen-D)
shortProjectName,Perkiomen-D
workdayProjectId,P20315
```

## Supported Document Types

- **PDF**: Text extraction using pdf-parse
- **Word Documents** (.docx, .doc): Text extraction using mammoth
- **Text Files** (.txt): Direct text reading
- **Images** (.png, .jpg, .jpeg): OCR using Tesseract.js

## Security Features

- JWT-based authentication
- Role-based access control (RBAC)
- Fine-grained permissions
- Helmet.js for security headers
- Rate limiting
- Input validation
- CORS configuration

## Phase 2 (Future)

- Salesforce REST API integration
- Actual project creation in Salesforce
- Advanced NLP for better data extraction
- Enhanced OCR accuracy
- Database integration (PostgreSQL/MongoDB)
- Email notifications
- Project history and audit logs

## Development

### Running in Development Mode
```bash
npm run dev
```

### Running Server Only
```bash
npm run server
```

### Running Client Only
```bash
npm run client
```

### Building for Production
```bash
npm run build
```

## Troubleshooting

### Port Already in Use
- Change the port in `.env` file or kill the process using the port

### File Upload Issues
- Ensure `uploads/` directory exists and has write permissions
- Check file size limits (default: 10MB for JSON/CSV, 50MB for documents)

### OCR Issues
- Tesseract.js requires time to initialize on first use
- Large images may take longer to process

## License

ISC

## Contributing

This is a project setup application. For contributions, please follow standard coding practices and ensure all tests pass.
























# project-tools
