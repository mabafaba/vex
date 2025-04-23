# Vex - Live Event Participation Platform
## Requirements Document

## Development Philosophy

| Principle | Description | Rationale | Application |
|-----------|-------------|-----------|-------------|
| Minimal Complexity | Keep the codebase as simple as possible | Every line of code is a liability that needs to be maintained and understood | Minimize abstractions and layers; keep functions small and focused |
| No Unnecessary Dependencies | Avoid external libraries and frameworks when possible | Each dependency increases complexity and introduces potential security risks and breaking changes | Use native Web Components over JS frameworks; rely on built-in browser and Node.js capabilities |
| Feature Parsimony | Only implement features that are truly necessary | Features add complexity exponentially, not linearly | Regularly question the necessity of each feature; remove unused or rarely used functionality |
| Simplification First | When solving problems or adding features, first try to remove code | Adding more code to solve problems often increases complexity; removing code leads to simpler solutions | Before writing new code, look for ways the architecture can be simplified to achieve the same goal with less code |
| Strictly Hierarchical Decoupling | Higher level components may depend on lower level ones, never the reverse | Bidirectional dependencies create tight coupling and make code harder to maintain and understand | Package components as full-stack vertical slices; avoid horizontal coupling across different components at the same level |
| Vertical Full-Stack Organization | Group code by feature/component rather than by technical layer | Traditional frontend/backend separation creates unnecessary coupling across features | Keep a component's backend and frontend code together; each component should be as self-contained and autonomous as possible |
| Broad Definition of Dependencies | Consider all forms of coupling as dependencies | Hidden dependencies are especially dangerous and lead to unexpected failures | Identify and document all dependencies including API contracts, data structures, events, and shared state |
| Intentional Code | Every line of code must justify its existence | Unnecessary code creates cognitive load and maintenance burden | Remove commented code; eliminate dead code paths; refactor verbose code |
| Minimal Testing Overhead | Balance testing with added complexity | Tests add code that needs maintenance and can create false security | Focus on critical path testing only; avoid test-for-test's sake approaches |
| Simplicty Over Extensibility | Prefer simple concrete implementations over complex abstractions | Premature abstraction creates overhead for hypothetical future use cases | Build for current needs with clean, readable code rather than complex "future-proof" designs |
| Deliberate Documentation | Document only what's necessary and non-obvious | Excessive documentation becomes outdated and misleading | Use self-documenting code with clear names; document only complex behaviors and architectural decisions |
| Shared Understanding | Team members should fully understand the entire codebase | Specialized knowledge creates bottlenecks and increases bus factor | Keep the system small enough that any developer can comprehend it all |

## Detailed Requirements

### User Authentication & Management Requirements

| Requirement ID | Description | User Story | Expected Behavior/Outcome | Status | Complexity |
|---------------|-------------|------------|---------------------------|--------|-----------------|
| UAM001 | User Registration | As a user, I want to create a new account so I can access the platform features. | The system should provide a registration form where users can enter username and password, with validation for password confirmation. Upon successful registration, the user should be automatically logged in. | Implemented | Medium |
| UAM002 | User Login | As a user, I want to log in to access my account and use the platform features. | The system should provide a login form that accepts username and password, authenticates the credentials, and upon success, grants access to the platform features. | Implemented | Medium |
| UAM003 | User Logout | As a user, I want to log out of my account to ensure my session is secure. | The system should provide a logout option that clears the authentication token and redirects to the login page. | Implemented | Low |
| UAM004 | Role-based Access | As an admin, I want to access administrative features that regular users cannot. | The system should restrict access to certain features based on user roles (basic, admin, superadmin) and return appropriate error messages for unauthorized access attempts. | Implemented | Medium |
| UAM005 | International Support | As a non-English speaker, I want to use the authentication UI in my preferred language. | The system should detect or allow selection of language preference and display authentication UI elements in the selected language. | Implemented | Medium |
| UAM006 | User Management | As an admin, I want to view, update, and delete user accounts. | The system should provide interfaces for admins to list all users, modify user details, and remove user accounts when necessary. | Implemented | High |
| UAM007 | User Profile | As a user, I want to view my account details and role. | The system should provide a user profile page showing the user's information and current role assignments. | Partially Implemented | Medium |

### Content Management Requirements

| Requirement ID | Description | User Story | Expected Behavior/Outcome | Status | Complexity |
|---------------|-------------|------------|---------------------------|--------|-----------------|
| CM001 | Creating Content | As a user, I want to create new vexes (messages) to share my thoughts. | The system should provide an input interface for creating vex content, validate the input is not empty, and save it to the database. | Implemented | Medium |
| CM002 | Viewing Content | As a user, I want to view existing vexes to read shared content. | The system should display vexes with appropriate formatting and layout depending on the view mode. | Implemented | Medium |
| CM003 | Threaded Discussions | As a user, I want to reply to vexes to participate in discussions. | The system should allow users to create child vexes linked to parent vexes, and display them in a threaded format. | Implemented | High |
| CM004 | Real-time Updates | As a user, I want to see new replies to a thread immediately without refreshing. | The system should push notifications about new replies to users viewing the thread using Socket.io. | Implemented | High |
| CM005 | Content View Modes | As a user, I want to switch between different view modes for content. | The system should support three view modes: collapsed (preview), normal (standard view), and thread (expanded with replies). | Implemented | Medium |
| CM006 | Content Actions | As a user, I want to interact with content through actions like upvoting. | The system should provide buttons for various content actions, though implementation of voting functionality is pending. | Partially Implemented | Medium |
| CM007 | Content Persistence | As a user, I want my created content to be saved and retrievable later. | The system should persist all created vexes to the database and make them retrievable via API endpoints. | Implemented | Medium |

### Real-time Communication Requirements

| Requirement ID | Description | User Story | Expected Behavior/Outcome | Status | Complexity |
|---------------|-------------|------------|---------------------------|--------|-----------------|
| RTC001 | Socket Connection | As a user, I want a stable real-time connection to receive updates. | The system should establish and maintain a Socket.io connection, with fallback transport methods if WebSockets are unavailable. | Implemented | Medium |
| RTC002 | Room-based Subscription | As a user, I want to receive updates only for threads I'm viewing. | The system should implement a room-based subscription model where clients join/leave rooms based on the threads they are viewing. | Implemented | Medium |
| RTC003 | Real-time Notifications | As a user, I want immediate notification when someone replies to a thread I'm viewing. | When a new reply is added to a thread, the system should broadcast the update to all clients viewing that thread. | Implemented | Medium |
| RTC004 | Connection Status | As a user, I want to know if my real-time connection is active. | The system should provide visual indicators showing the current connection status (connected, disconnected, error). | Implemented | Low |
| RTC005 | Graceful Degradation | As a user, I want the application to work even if real-time features fail. | The system should fall back to traditional request-response patterns if real-time communication is unavailable. | Partially Implemented | Medium |

### Geo-spatial Requirements

| Requirement ID | Description | User Story | Expected Behavior/Outcome | Status | Complexity |
|---------------|-------------|------------|---------------------------|--------|-----------------|
| GEO001 | GeoJSON Storage | As a developer, I want to store geographic data in the database. | The system should provide a schema for GeoJSON features with appropriate spatial indexing. | Implemented | Medium |
| GEO002 | GeoJSON Import | As an admin, I want to import GeoJSON files into the system. | The system should provide utilities to import and parse GeoJSON files into the database. | Implemented | Medium |
| GEO003 | Geographic Input | As a user, I want to create content with geographic context. | The system should provide a component for selecting geographic context when creating content. | Partially Implemented | High |
| GEO004 | Ordinal Scale Input | As a user, I want to provide scale-based input alongside geographic data. | The system should provide a slider-based interface for selecting values on an ordinal scale. | Implemented | Medium |

### Deployment & Infrastructure Requirements

| Requirement ID | Description | User Story | Expected Behavior/Outcome | Status | Complexity |
|---------------|-------------|------------|---------------------------|--------|-----------------|
| DEP001 | Docker Deployment | As a developer, I want to deploy the application using Docker for consistency. | The system should provide a Dockerfile and docker-compose configuration for containerized deployment. | Implemented | Low |
| DEP002 | Environment Detection | As a developer, I want the application to adapt to different environments. | The system should detect whether it's running in Docker or locally and adjust database connections accordingly. | Implemented | Low |
| DEP003 | Secret Management | As a developer, I want secure handling of application secrets. | The system should generate and securely store JWT secrets, with persistence across container restarts. | Implemented | Medium |
| DEP004 | MongoDB Integration | As a developer, I want reliable database connectivity. | The system should establish and maintain connection to MongoDB, with appropriate error handling. | Implemented | Low |
| DEP005 | Development Tools | As a developer, I want efficient development workflow tools. | The system should provide npm scripts for development, watching for changes, and deployment tasks. | Implemented | Low |

### Security Requirements

| Requirement ID | Description | User Story | Expected Behavior/Outcome | Status | Complexity |
|---------------|-------------|------------|---------------------------|--------|-----------------|
| SEC001 | Password Security | As a user, I want my password to be stored securely. | The system should hash passwords using bcrypt before storing them in the database. | Implemented | Medium |
| SEC002 | JWT Authentication | As a user, I want secure authentication without sending my password repeatedly. | The system should implement JWT-based authentication with secure token storage in HTTP-only cookies. | Implemented | Medium |
| SEC003 | Content Sanitization | As a user, I want protection from malicious content. | The system should sanitize user-generated HTML content to prevent XSS attacks. | Implemented | Low |
| SEC004 | Access Control | As a system administrator, I want to restrict access to sensitive operations. | The system should implement middleware to verify user permissions before allowing access to protected resources. | Implemented | Medium |
| SEC005 | Cookie Security | As a user, I want my authentication data to be protected from JavaScript access. | The system should set cookies with HTTP-only flag to prevent client-side JavaScript access. | Implemented | Low |

### User Reactions Requirements

| Requirement ID | Description | User Story | Expected Behavior/Outcome | Status | Complexity |
|---------------|-------------|------------|---------------------------|--------|-----------------|
| UR001 | Upvote Content | As a user, I want to upvote vexes that I find valuable to indicate my approval. | When a user clicks the upvote button, the system should increment the upvote counter for that vex, visually indicate the upvoted state, and persist this information in the database. | Partially Implemented | Medium |
| UR002 | Downvote Content | As a user, I want to downvote vexes that I find unhelpful to indicate my disapproval. | When a user clicks the downvote button, the system should increment the downvote counter for that vex, visually indicate the downvoted state, and persist this information in the database. | Partially Implemented | Medium |
| UR003 | Share Content | As a user, I want to share vexes with others to spread valuable information. | When a user clicks the share button, the system should generate a shareable link and provide options to copy it or share directly to common platforms. | Partially Implemented | Medium |
| UR004 | Mark as Off-Topic | As a user, I want to mark vexes that are off-topic to help maintain discussion quality. | When a user marks a vex as off-topic, the system should record this flag, notify moderators, and potentially visually indicate the flag status if enough users mark it. | Not Implemented | Medium |
| UR005 | Flag Inappropriate Content | As a user, I want to flag inappropriate content to help maintain community standards. | When a user flags a vex, the system should record the flag type and reason, notify moderators, and hide the content if it receives multiple flags. | Not Implemented | High |
| UR006 | View Reaction Status | As a user, I want to see the current reaction status of vexes to understand community sentiment. | The system should display the current count of upvotes, downvotes, and other reactions on each vex in a clear, unobtrusive manner. | Partially Implemented | Low |
| UR007 | Toggle Reactions | As a user, I want to be able to toggle my reactions on and off to change my mind. | When a user clicks a reaction button they've already selected, the system should remove their reaction and update the counter accordingly. | Not Implemented | Low |
| UR008 | Reaction Analytics | As an admin, I want to view analytics about reactions to understand user engagement. | The system should provide administrators with aggregated data about reaction patterns across vexes. | Not Implemented | High |
| UR009 | Moderation Tools | As a moderator, I want tools to review flagged content efficiently. | The system should provide a moderation interface showing flagged content sorted by severity and flag count. | Not Implemented | High |
| UR010 | Reaction Notifications | As a content creator, I want to be notified when users react to my vexes. | The system should notify users when their content receives reactions, with options to configure notification preferences. | Not Implemented | High |

## 1. Overview

Vex is a platform that enables users to create and interact with threaded discussions. The system is built with a focus on real-time interactions, allowing users to post messages (vexes) and reply to existing content while seeing updates in real-time.

## 2. System Architecture

### 2.1 Backend Architecture

The backend is built on Node.js using Express.js framework with the following components:

- **Database**: MongoDB for data persistence
- **Authentication**: JWT-based authentication system
- **Real-time communication**: Socket.io for pushing live updates to clients
- **API**: RESTful API endpoints for CRUD operations on resources

### 2.2 Frontend Architecture

The frontend is built using Web Components (custom elements) for a modular and reusable UI:

- **Custom Elements**: Native Web Components without a framework dependency
- **Shadow DOM**: Encapsulated styling and DOM for components
- **HTML Templates**: Template-based rendering for components

## 3. Core Services

### 3.1 User Service

The User Service handles user authentication and management:

- **Registration**: Users can create new accounts
- **Authentication**: JWT-based login system with token persistence
- **Authorization**: Role-based access control with basic, admin, and superadmin roles
- **Internationalization**: Support for multiple languages in the UI (English, Spanish, French, German, Portuguese)

### 3.2 Vertex Service

The Vertex Service manages the core content entities (vexes):

- **Content Creation**: Users can create new vexes (messages)
- **Content Hierarchy**: Support for parent-child relationships between vexes
- **Content Retrieval**: API for fetching individual vexes and their children
- **Real-time Updates**: Socket.io integration for live updates

### 3.3 GeoData Service

The GeoData Service provides geographic data management:

- **GeoJSON Support**: Storage and retrieval of GeoJSON features
- **Spatial Indexing**: 2dsphere indexing for geospatial queries
- **Data Import**: Utilities for importing GeoJSON files into the database

## 4. UI Components

### 4.1 VexComponent

The `vex-display` custom element:

- **States**: Supports three view modes - collapsed, normal, and thread
- **Real-time Updates**: Subscribes to Socket.io updates for new replies
- **Features**: Upvote/downvote buttons (non-functional), share button (non-functional)
- **Thread View**: Displays replies in a threaded format with nested components

### 4.2 VexInputComponent

The `vex-input` custom element:

- **User Input**: Text field for typing messages
- **Submission**: POST requests to create new vexes
- **Parent Association**: Links new vexes to their parent for threaded conversations
- **Validation**: Prevents empty content submission

### 4.3 GeoTextInputComponent

The `placed-text-input` custom element:

- **Text Input**: Multi-line text area for content
- **Scale Selection**: Slider-based ordinal scale (1-5)
- **Submission**: API integration with the Vertex service

### 4.4 AuthenticationForm

The authentication form components:

- **Dual Mode**: Toggle between login and registration forms
- **Login Form**: Username/password authentication
- **Registration Form**: New user registration with password confirmation
- **Internationalization**: Translatable UI based on document language
- **Redirection**: Post-login/registration redirection to target URLs

## 5. API Endpoints

### 5.1 User API

- `POST /vex/user/register`: Create a new user account
- `POST /vex/user/login`: Authenticate and receive JWT token
- `GET /vex/user/logout`: Remove authentication token
- `PUT /vex/user/update`: Update user details (admin only)
- `DELETE /vex/user/delete`: Delete user accounts (admin only)
- `GET /vex/user/all`: List all users (admin only)
- `GET /vex/user/me`: Get current user details
- `GET /vex/user/authorize/:role`: Check role-based authorization

### 5.2 Vertex API

- `POST /vex/vertex`: Create a new vex
- `GET /vex/vertex`: Get all vexes
- `GET /vex/vertex/:id`: Get a specific vex by ID
- `GET /vex/vertex/:id/children`: Get all children of a vex
- `PUT /vex/vertex/:id`: Update a vex
- `DELETE /vex/vertex/:id`: Delete a vex

### 5.3 GeoData API

- `GET /vex/geodata`: Get all GeoJSON features

## 6. Real-time Features

### 6.1 Socket.io Integration

- **Connection Management**: Handling client connections/disconnections
- **Room-based Communications**: Clients join/leave rooms based on active threads
- **Event Broadcasting**: Real-time notifications for new replies
- **Status Monitoring**: Connection status indicators in the UI

### 6.2 Vertex Thread Updates

- **Live Replies**: New replies appear in real-time without page refresh
- **Room Subscription**: Clients subscribe to updates for specific thread IDs
- **Efficiency**: Updates are pushed only to clients viewing relevant threads

## 7. Deployment

### 7.1 Docker Deployment

- **Containerization**: Docker images for consistent deployment
- **Docker Compose**: Multi-container setup with web server and MongoDB
- **Environment Variables**: Configuration via environment variables
- **Persistent Storage**: Volume mapping for database persistence
- **Secret Management**: Secure JWT secret generation and storage

### 7.2 Development Environment

- **Nodemon**: Auto-reload during development
- **Browser Sync**: Live browser reloading for frontend changes
- **MongoDB Connection**: Automatic detection of Docker vs. local environment

## 8. Security Features

- **Password Hashing**: bcrypt for secure password storage
- **JWT Authentication**: Signed tokens for secure authentication
- **Content Sanitization**: HTML sanitization for user-generated content
- **HTTPS Ready**: Structure supports HTTPS configuration (needs certificates)
- **Secure Cookies**: HTTP-only cookies for JWT storage

## 9. Current Limitations & ToDos

- **Upvote/Downvote**: Buttons exist but functionality is not fully implemented
- **Share Feature**: Share button is a placeholder for future implementation
- **User Profile**: Limited user profile management features
- **Error Handling**: Basic error handling with room for improvement
- **Mobile Responsiveness**: Basic styling but not fully optimized for all devices
- **Content Moderation**: No content moderation tools yet