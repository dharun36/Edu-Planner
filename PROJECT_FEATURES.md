# EduPlanner Project Features

## 1. Project overview

EduPlanner is a personalized learning and student-progress platform built around:

- React and TypeScript for the web frontend.
- Vite for frontend development and production builds.
- FastAPI for the backend REST API.
- SQLAlchemy for database access.
- SQLite by default for local development.
- PostgreSQL-compatible configuration for deployment.
- JWT-based authentication and role-based access control.
- Student assessments, skill tracking, classrooms, learning materials, progress monitoring, and AI-generated learning plans.
- An optional RAG/vector-search layer for uploaded learning materials.
- A multi-agent AI workflow using Analyst, Optimizer, and Evaluator agents.

## 2. User roles

### Student

Students can:

- Register and sign in.
- View their dashboard.
- Complete the five-dimensional diagnostic assessment.
- View and update their skill tree.
- Add custom skills.
- Upload and browse learning materials.
- Join classrooms using a class code.
- View classroom materials, curriculum, skills, plans, and progress.
- Ask classroom-related questions to the AI assistant.
- Generate personalized learning plans.
- Complete learning-plan tasks.
- Answer learning-plan verification questions.
- View their progress and activity history.
- Update their profile.

### Teacher

Teachers can:

- Register and sign in as a teacher.
- View teacher dashboard statistics.
- View enrolled/student progress information.
- Create classrooms.
- Generate classroom join codes.
- View classroom members.
- View classroom curriculum, materials, skills, learning plans, and progress.
- Upload and manage learning materials.
- Remove classrooms or leave classrooms where applicable.

## 3. Frontend features

### Public pages

- `/login`
  - Email/password login.
  - Authentication token storage.
  - Role-aware redirect after login.
  - Error handling for invalid credentials.

- `/register`
  - Account creation.
  - Full name, email, password, and role selection.
  - Student and teacher role support.
  - Automatic login after successful registration.

### Student pages

- `/student/dashboard`
  - Welcome message and authenticated user information.
  - Current streak.
  - Completed learning plans.
  - Completed task count.
  - Active learning-plan status.
  - Classroom list.
  - Join-class flow.
  - Current active plan.
  - Skill profile summary.
  - Quick actions for assessment, skill tree, and plan generation.

- `/student/classroom/:classId`
  - Classroom overview.
  - Classroom materials.
  - Classroom curriculum.
  - Student skills.
  - Classroom learning plans.
  - Classroom progress.
  - Classroom members.
  - Material detail viewer.
  - AI question/answer interaction.

- `/student/assessment`
  - Five-dimensional diagnostic assessment.
  - Categories:
    - Numerical Calculation
    - Abstract Thinking
    - Logical Reasoning
    - Association/Analogy
    - Spatial Imagination
  - Difficulty-labelled questions.
  - One-question-at-a-time interface.
  - Answer selection and navigation.
  - Assessment submission.
  - Skill-score calculation and persistence.

- `/student/generate`
  - Learning-plan generation form.
  - College filter.
  - Year filter.
  - Semester filter.
  - Regulation filter.
  - Subject input.
  - Topic input.
  - Learning-goal input.
  - AI workflow submission.

- `/student/skill-tree`
  - Skill cards for each assessed skill.
  - Score percentages.
  - Beginner, Developing, Intermediate, and Advanced levels.
  - Circular score visualizations.
  - Overall average score.
  - Active skill count.
  - Top-strength summary.
  - Add-custom-skill flow.
  - Update-skill-score flow.
  - Link to conduct a new assessment.

- `/student/materials`
  - Browse uploaded learning materials.
  - Search by filename or scope.
  - Filter by college.
  - Upload TXT, Markdown, RST, PDF, and DOCX files.
  - View document metadata and extracted chunks.
  - Delete materials.
  - RAG/vector-index status support.
  - Local database-search fallback when optional vector packages are unavailable.

- `/student/progress`
  - Current streak.
  - Completed-plan count.
  - Mastered-skill count.
  - Completed-task count.
  - Recent milestones and activity.
  - Average competence score.
  - Uploaded-document count.
  - Task-completion rate.

- `/student/profile`
  - Full-name editing.
  - Phone editing.
  - Department editing.
  - Year-of-study editing.
  - College editing.
  - Regulation editing.
  - Semester editing.
  - Bio editing.
  - Profile-completion indicators.
  - Save and update feedback.

### Teacher pages

- `/teacher/dashboard`
  - Teacher-specific statistics.
  - Student monitoring.
  - Classroom information.
  - Activity and progress summaries.

- `/teacher/students`
  - Student viewer.
  - Student skill and progress information.
  - Students requiring attention.

- `/teacher/materials`
  - Material upload and management interface.
  - Shared material browsing and document viewing.

### Shared frontend behavior

- Protected routes based on authentication state.
- Role-based route restrictions.
- Automatic token validation on application startup.
- Automatic logout and redirect after an unauthorized response.
- Axios API client with bearer-token injection.
- Vite `/api` development proxy.
- Responsive layouts for student and teacher views.
- Shared card, button, input, and layout components.
- Tailwind-based styling with reusable utility-class composition.
- Loading states and user-facing error messages.

## 4. Backend API features

The backend registers both primary routes and `/api` compatibility aliases for frontend use.

### Health

- `GET /health`
- `GET /api/health`

Health responses include:

- Service status.
- Application name.
- Environment.
- API version.
- UTC timestamp.
- Database configuration state.
- Database reachability state.

### Authentication

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `PATCH /auth/profile`
- `/api/auth/...` aliases for frontend compatibility.

Authentication features:

- Password hashing.
- JWT access-token generation.
- JWT validation.
- Bearer-token authentication.
- Active-user validation.
- Email uniqueness checking.
- Student/teacher role validation.
- Profile updates.

### Assessment and skills

- `POST /assessment/start`
- `GET /assessment/{assessment_id}/questions`
- `POST /assessment/{assessment_id}/submit`
- `POST /assessment/custom-skill`
- `GET /assessment/skills`
- `PATCH /assessment/skills/{skill_id}`

Assessment features:

- Seeded diagnostic questions.
- Required-category validation.
- Assessment attempt persistence.
- Correct-answer evaluation.
- Student skill creation and updates.
- Skill history tracking.
- Custom skill support.
- Score validation from 0 to 100.

### AI learning plans

- `POST /ai/learning-plan`

The workflow:

1. Loads the student’s current skill scores.
2. Identifies known, weak, and missing skills.
3. Loads matching curriculum context.
4. Retrieves matching RAG material context when available.
5. Runs the Analyst agent.
6. Runs the Optimizer agent.
7. Runs the Evaluator agent.
8. Iterates when the evaluator rejects the plan.
9. Tracks the best plan found.
10. Returns the final plan, score, status, feedback, and issues.

AI agents:

- Analyst:
  - Identifies strengths.
  - Identifies weaknesses.
  - Selects priority skills.
  - Identifies prerequisite gaps.
  - Recommends a learning strategy.

- Optimizer:
  - Creates learning objectives.
  - Builds prerequisite review.
  - Creates lesson sequence.
  - Creates practice activities.
  - Defines difficulty progression.
  - Defines assessment strategy.
  - Adds personalization notes.
  - References RAG materials when available.

- Evaluator:
  - Checks skill alignment.
  - Checks prerequisite coverage.
  - Checks goal alignment.
  - Checks topic and curriculum alignment.
  - Checks RAG grounding.
  - Checks difficulty appropriateness.
  - Checks actionability and coherence.
  - Produces a deterministic score.
  - Approves plans at the configured threshold.

Supported provider configuration:

- Gemini.
- OpenRouter.
- Groq.

Provider behavior:

- Configurable model names.
- Configurable request timeout.
- Configurable retry count.
- Provider fallback behavior.
- Safe API error translation for frontend responses.

### Learning plans

- `GET /learning-plans`
- `GET /learning-plans/active`
- `GET /learning-plans/{plan_id}`
- `PATCH /learning-plans/tasks/{task_id}/complete`
- `GET /learning-plans/{plan_id}/verification-questions`
- `POST /learning-plans/{plan_id}/verify-submit`

Learning-plan features:

- Active-plan retrieval.
- Plan and module retrieval.
- Ordered modules and tasks.
- Task completion.
- Verification-question generation/retrieval.
- Verification submission.
- Progress updates from task completion.

### Materials

- `GET /materials`
- `POST /materials`
- `POST /materials/search`
- `GET /materials/{material_id}`
- `DELETE /materials/{material_id}`

Supported formats:

- `.txt`
- `.md`
- `.rst`
- `.pdf`
- `.docx`

Material-processing features:

- File validation.
- Content hashing.
- Duplicate-file detection.
- Text extraction.
- Chunk splitting.
- Persistent file storage.
- Database document records.
- Database chunk records.
- Optional ChromaDB indexing.
- Optional sentence-transformer embeddings.
- Local text-search fallback without ChromaDB.

### Curriculum

- `GET /curriculum/tree`
- Department CRUD.
- Semester CRUD.
- Subject CRUD.
- Unit CRUD.
- Topic CRUD.
- Learning-objective CRUD.

The curriculum hierarchy supports:

- Departments.
- Semesters.
- Subjects.
- Units.
- Topics.
- Learning objectives.

### Classrooms

- `POST /classes`
- `GET /classes/teacher`
- `POST /classes/join`
- `GET /classes/student`
- `GET /classes/{class_id}`
- `GET /classes/{class_id}/overview`
- `GET /classes/{class_id}/materials`
- `GET /classes/{class_id}/skills`
- `GET /classes/{class_id}/curriculum`
- `GET /classes/{class_id}/learning-plans`
- `GET /classes/{class_id}/progress`
- `POST /classes/{class_id}/ask-ai`
- `GET /classes/{class_id}/members`
- `DELETE /classes/{class_id}/leave`
- `DELETE /classes/{class_id}`

Classroom features:

- Teacher classroom creation.
- Join-code generation.
- Student enrollment by code.
- Teacher/student classroom views.
- Classroom membership management.
- Classroom-specific material access.
- Classroom-specific curriculum access.
- Classroom-specific skill access.
- Classroom-specific plan access.
- Classroom-specific progress access.
- Classroom AI questions.

### Teacher monitoring

- `GET /teacher/stats`
- `GET /teacher/students`
- `GET /teacher/activity`

Teacher monitoring includes:

- Student counts.
- Student skill summaries.
- Students needing attention.
- Recent activity.
- Assessment and learning-plan information.

### Progress

- `GET /student/progress`

Progress data includes:

- Streak information.
- Completed learning plans.
- Mastered skills.
- Completed tasks.
- Activity timeline.
- Skill averages.
- Material counts.
- Task-completion rates.

## 5. Data and persistence

The application uses SQLAlchemy models for:

- Users.
- Departments.
- Semesters.
- Subjects.
- Units.
- Topics.
- Learning objectives.
- Diagnostic questions.
- Diagnostic assessments.
- Diagnostic attempts.
- Student skills.
- Student skill history.
- Learning plans.
- Learning modules.
- Learning tasks.
- Material documents.
- Material chunks.
- Classrooms.
- Classroom memberships.

Database behavior:

- SQLite is used by default for local development.
- PostgreSQL can be configured with `DATABASE_URL`.
- Tables are created at application startup.
- User profile columns use additive startup migrations.
- Database health is included in the health response.

## 6. Security and access control

- Passwords are stored as hashes, not plaintext.
- Authentication uses signed JWT tokens.
- Protected API endpoints require bearer authentication.
- Student-only endpoints enforce the student role.
- Teacher-only endpoints enforce the teacher role.
- Users can update only their own profiles.
- Classroom access is checked against membership and role.
- CORS is configured for local frontend origins.
- AI evaluator prompts explicitly reject secret generation and untrusted instructions in retrieved documents.
- API keys are supplied through environment variables.

## 7. Configuration

Important backend settings include:

- `APP_NAME`
- `ENVIRONMENT`
- `SECRET_KEY`
- `JWT_ALGORITHM`
- `ACCESS_TOKEN_EXPIRY_MINUTES`
- `BACKEND_HOST`
- `BACKEND_PORT`
- `CORS_ORIGINS`
- `DATABASE_URL`
- `CHROMA_PATH`
- `GEMINI_API_KEY`
- `OPENROUTER_API_KEY`
- `GROQ_API_KEY`
- `GEMINI_MODEL`
- `OPENROUTER_ANALYST_MODEL`
- `OPENROUTER_OPTIMIZER_MODEL`
- `OPENROUTER_EVALUATOR_MODEL`
- `GROQ_ANALYST_MODEL`
- `LLM_TIMEOUT_SECONDS`
- `LLM_MAX_RETRIES`
- `LANGGRAPH_MAX_ITERATIONS`

Frontend configuration:

- `VITE_API_BASE_URL`

The frontend defaults to `/api`, which is proxied to the backend during Vite development.

## 8. Optional features and current limitations

### Optional vector search

ChromaDB and Sentence Transformers are optional because their Windows installation may require native C++ build tools.

Without these packages:

- File uploads still work.
- Text is extracted and stored.
- Chunks are persisted in the database.
- Basic database-backed text search is used.
- Semantic vector search is unavailable.

With these packages:

- Embeddings are generated.
- Chunks are stored in ChromaDB.
- Semantic similarity search is available.
- RAG context can be retrieved for AI learning-plan generation.

### AI API keys

AI plan generation requires at least one configured provider API key:

- Gemini.
- OpenRouter.
- Groq.

Without a provider key, the core application remains usable, but AI generation returns a provider-configuration error.

### Production configuration

Before production deployment:

- Replace the development `SECRET_KEY`.
- Configure a production database.
- Configure production CORS origins.
- Configure AI provider keys securely.
- Use a production ASGI process manager.
- Configure persistent uploaded-file storage.
- Configure HTTPS.

## 9. Validation status

The project has been verified with:

- Backend automated test suite: 48 tests passing.
- Frontend TypeScript compilation: passing.
- Frontend production build: passing.
- Backend `/health` endpoint: passing.
- Registration and login flow: passing.
- Profile update flow: passing.
- Assessment start, question retrieval, and submission: passing.
- Materials upload and database fallback search: passing.
- Skill-tree retrieval and score updates: passing.
- Student dashboard API loading: passing.

## 10. Local development commands

### Backend

```powershell
cd "d:\Edu_Planner\Edu-Planner\backend"
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### Frontend

```powershell
cd "d:\Edu_Planner\Edu-Planner\frontend"
npm install
npm run dev
```

### Frontend production build

```powershell
cd "d:\Edu_Planner\Edu-Planner\frontend"
npm run build
```

### Backend tests

```powershell
cd "d:\Edu_Planner\Edu-Planner\backend"
pytest -q tests
```

## 11. Local URLs

- Frontend: `http://127.0.0.1:5173`
- Backend: `http://127.0.0.1:8000`
- Backend health: `http://127.0.0.1:8000/health`
- API documentation: `http://127.0.0.1:8000/docs`
