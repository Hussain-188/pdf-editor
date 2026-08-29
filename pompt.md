You are acting as a Principal Software Architect, Senior PDF Rendering Engineer, Senior Full-Stack Engineer, and Product Engineer.

I want to build a production-quality online PDF platform inspired by the functionality and workflow simplicity of Sejda and iLovePDF, but with my own original branding, UI, architecture, and implementation.

The product should allow users to use PDF tools without creating an account, while authenticated users can securely save, reopen, edit, manage, and version their documents.

I want to plan the COMPLETE implementation before writing significant code.

IMPORTANT: I specifically want TRUE ARBITRARY EXISTING PDF TEXT EDITING.

I do NOT mean simply placing a text box over an existing PDF.

I want users to be able to:

* Click on existing text inside a PDF
* Detect the underlying text object when possible
* Select existing text
* Modify the text
* Delete existing text
* Insert text into existing content
* Change font properties
* Change font size
* Change font color
* Change text alignment
* Preserve surrounding layout as accurately as possible
* Reflow or reposition text where technically possible
* Preserve the edited result as a valid downloadable PDF

Before proposing the architecture, explain the technical reality of implementing true PDF editing.

Specifically distinguish between:

1. Editing existing PDF content streams directly
2. Overlay-based editing
3. Reconstructing a page from extracted text and graphical objects
4. OCR-based editing for scanned PDFs
5. Using an existing commercial or open-source PDF SDK

Do not pretend that all PDFs can be perfectly edited. Clearly explain limitations caused by:

* Fonts not embedded or unavailable
* Font subset encoding
* Glyph mapping
* Complex content streams
* Vector-based text
* Text converted to paths
* Scanned documents
* Multi-column layouts
* Tables
* Rotated text
* Ligatures
* Kerning
* Text embedded in XObjects
* Encrypted PDFs
* Digital signatures
* Corrupted PDFs
* Complex graphics
* Forms

I want you to recommend the most realistic architecture for building a high-quality product.

==================================================
PRODUCT VISION
==============

The application is an online PDF workspace.

There should be two types of users:

1. Guest users
2. Authenticated users

Guest users should:

* Upload a PDF without registration
* Use the available PDF tools
* Edit the document
* Download the final result
* Have temporary document storage
* Have files automatically deleted after a configurable expiration period
* Not see other users' files
* Receive secure temporary document access

Authenticated users should:

* Register
* Login
* Manage their account
* Upload PDFs
* Store documents permanently or according to account storage policies
* Reopen documents later
* Continue editing previous documents
* Automatically save edits
* Maintain document history
* Restore older versions
* Delete documents
* Download original and edited versions
* Manage reusable assets such as signatures

==================================================
CORE PRODUCT MODULES
====================

Plan the implementation for the following modules.

1. AUTHENTICATION AND USER MANAGEMENT

Features:

* Registration
* Login
* Logout
* JWT or secure session authentication
* Refresh tokens if appropriate
* Password hashing
* Password reset architecture
* Email verification architecture
* Protected routes
* Role-based access if useful
* Account settings
* Storage usage tracking

Explain the recommended security architecture.

==================================================
2. DOCUMENT MANAGEMENT
======================

Features:

* PDF upload
* Drag and drop
* File validation
* File size limits
* PDF validation
* Metadata extraction
* Page count detection
* Document thumbnails
* Document dashboard
* Search documents
* Rename documents
* Delete documents
* Restore if implementing soft delete
* Recent documents
* Original file preservation
* Edited document generation

Design the database schema and object storage strategy.

Explain exactly what belongs in:

* PostgreSQL
* Object storage
* Redis or cache if needed

==================================================
3. TRUE PDF EDITOR
==================

This is the most important module.

I want a complete architecture for:

* PDF rendering
* Existing text detection
* Text selection
* Mapping screen coordinates to PDF coordinates
* Mapping selected text back to PDF content structures
* Editing existing text
* Font detection
* Font substitution
* Text insertion
* Text deletion
* Text replacement
* Text formatting
* Paragraph handling
* Text alignment
* Text positioning
* Text reflow where possible
* Multi-line text editing
* Undo
* Redo
* Selection
* Move
* Resize where relevant

Explain the editor architecture in layers.

For example, determine whether an architecture similar to the following is appropriate:

PDF Rendering Layer
↓
PDF Document Analysis Layer
↓
Semantic Object Model
↓
Editor Interaction Layer
↓
Operation / Command Layer
↓
Document Modification Engine
↓
PDF Export Engine

Improve this architecture if necessary.

Explain what data structure should represent an editable text object.

For example, discuss whether the system should maintain:

* PDF object references
* Page references
* Content stream references
* Bounding boxes
* Transformation matrices
* Font references
* Character-level or glyph-level information
* Original content stream operations

Do not generate code yet.

==================================================
4. SCANNED PDF AND OCR EDITING
==============================

Plan a separate pipeline for scanned PDFs.

The system should:

* Detect whether a page contains selectable text
* Detect scanned/image-based pages
* Run OCR when necessary
* Display recognized text as editable
* Preserve the original page image when possible
* Replace or cover the original text appropriately
* Generate an edited PDF

Clearly distinguish the architecture for:

A. Native digital PDFs
B. Scanned PDFs
C. Hybrid PDFs

Recommend OCR technology options and explain the trade-offs.

==================================================
5. ANNOTATION AND DRAWING TOOLS
===============================

Plan:

* Add text
* Highlight
* Underline
* Strikeout
* Freehand drawing
* Shapes
* Lines
* Arrows
* Images
* Stickers if appropriate
* Comments
* Notes
* Stamps

Each editing action should support:

* Selection
* Move
* Resize
* Delete
* Undo
* Redo

==================================================
6. SIGNATURE SYSTEM
===================

Plan:

* Draw signature
* Upload signature
* Type signature
* Reusable saved signatures for authenticated users
* Signature placement
* Signature resizing
* Signature deletion
* Export

Clearly distinguish:

* Visual signature image
* PDF annotation signature
* Cryptographic digital signature

Do not falsely claim that a drawn signature provides cryptographic verification.

==================================================
7. PAGE MANAGEMENT
==================

Plan:

* Delete pages
* Reorder pages
* Duplicate pages
* Rotate pages
* Insert blank pages
* Extract pages
* Split PDFs
* Merge PDFs
* Organize page thumbnails using drag and drop

==================================================
8. PDF TOOL SUITE
=================

Plan a modular tool architecture for:

* Merge PDF
* Split PDF
* Compress PDF
* Convert PDF to images
* Convert images to PDF
* Watermark PDF
* Page numbers
* Rotate PDF
* Protect PDF
* Unlock PDF where authorized by the user
* Crop PDF
* Extract pages

For each tool, explain:

* Browser-side vs server-side processing
* Memory requirements
* Security considerations
* Processing strategy
* Temporary file cleanup

==================================================
9. EDITING STATE AND UNDO/REDO
==============================

Design a robust editor state architecture.

Compare:

A. Directly modifying the PDF after every operation

B. Storing editing operations separately and generating the PDF later

C. Hybrid approach

Recommend the best approach.

I want operations such as:

* TEXT_REPLACE
* TEXT_INSERT
* TEXT_DELETE
* TEXT_STYLE_CHANGE
* ADD_IMAGE
* DELETE_PAGE
* REORDER_PAGE
* ROTATE_PAGE
* ADD_SIGNATURE
* ADD_ANNOTATION

Design the operation schema.

Explain how undo and redo should work.

Explain how operations should be persisted.

Explain how version history should work.

==================================================
10. AUTO-SAVE AND VERSIONING
============================

Authenticated users should have:

* Auto-save
* Save status
* Version history
* Restore previous versions
* Named versions if useful

Design:

* Debouncing
* Conflict handling
* Version snapshots
* Operation logs
* Rollback strategy

==================================================
11. GUEST USER ARCHITECTURE
===========================

Guest users should not need an account.

Design a secure system for:

* Temporary document IDs
* Secure guest session tokens
* Temporary object storage
* File ownership isolation
* Expiration timestamps
* Automatic deletion jobs
* Rate limiting
* Abuse prevention
* Guest-to-authenticated account conversion

When a guest creates an account after editing a document:

* Transfer ownership of the document
* Preserve editing operations
* Preserve document history if appropriate
* Prevent unauthorized document claiming

==================================================
12. STORAGE ARCHITECTURE
========================

Design the complete storage system.

Consider:

* S3-compatible object storage
* Original PDF
* Working copy
* Generated versions
* Thumbnails
* Preview images
* OCR artifacts
* Temporary guest files

Propose an object key structure.

For example:

users/{userId}/documents/{documentId}/original.pdf

But improve it if necessary.

Explain lifecycle policies.

==================================================
13. DATABASE DESIGN
===================

Create a complete relational database design.

Include tables such as:

* users
* documents
* document_versions
* document_operations
* document_pages
* guest_sessions
* user_assets
* signatures
* processing_jobs
* audit_logs

For every table provide:

* Primary key
* Foreign keys
* Important indexes
* Important constraints
* Lifecycle considerations

==================================================
14. BACKEND ARCHITECTURE
========================

I am considering:

* Java
* Spring Boot
* PostgreSQL
* Redis
* S3-compatible object storage

Evaluate whether this stack is appropriate.

Design the backend modules.

For example:

auth
users
documents
storage
editor
operations
pdf-processing
ocr
jobs
versions
guest-sessions

Recommend better boundaries if necessary.

Define:

* REST APIs
* Request flow
* Authorization model
* Async processing
* Background jobs
* Error handling
* Rate limiting

==================================================
15. FRONTEND ARCHITECTURE
=========================

I am considering:

* React
* TypeScript
* PDF.js
* Zustand or Redux
* React Query
* Tailwind

Evaluate this stack.

Design:

* Component architecture
* Editor state
* Tool state
* Selection state
* PDF coordinate system
* Zoom handling
* Multi-page rendering
* Virtualization for large PDFs
* Performance optimization

The UI should be inspired by professional online PDF editors in terms of usability, but must not copy the exact branding or interface of Sejda or iLovePDF.

==================================================
16. PDF PROCESSING TECHNOLOGY EVALUATION
========================================

This is critical.

Compare realistic technology approaches for true existing PDF editing.

Evaluate:

* PDF.js
* pdf-lib
* PDFBox
* MuPDF
* qpdf
* Ghostscript
* PSPDFKit / Nutrient
* Apryse
* Other suitable PDF SDKs

For each technology explain:

* Rendering
* Text extraction
* Existing text editing
* Content stream editing
* Annotation support
* Page manipulation
* OCR integration
* Licensing
* Server-side suitability
* Browser-side suitability

Then recommend:

OPTION A: Mostly open-source architecture

OPTION B: Commercial SDK architecture

OPTION C: Hybrid architecture

Be brutally honest about which architecture can realistically provide high-quality true arbitrary existing-text editing.

==================================================
17. SECURITY
============

Design security for:

* Uploaded file validation
* Malicious PDFs
* PDF bombs
* Large files
* Storage authorization
* Signed URLs
* JWT/session security
* Guest token security
* Rate limiting
* CSRF where applicable
* XSS
* Content security
* File isolation
* Document ownership checks

==================================================
18. DEPLOYMENT
==============

Design:

Development environment:

* Docker Compose
* Local PostgreSQL
* Local S3-compatible storage
* Local Redis

Production environment:

* Frontend deployment
* Backend deployment
* PostgreSQL
* Object storage
* Redis
* Background workers

Recommend deployment platforms appropriate for a portfolio MVP.

==================================================
19. TESTING STRATEGY
====================

Plan:

* Unit tests
* Integration tests
* API tests
* PDF processing tests
* Security tests
* Large document tests
* Browser tests
* End-to-end tests

Include a PDF test corpus strategy covering:

* Simple PDFs
* Multi-page PDFs
* Embedded fonts
* Subset fonts
* Scanned PDFs
* Rotated pages
* Tables
* Complex layouts
* Forms
* Password-protected PDFs where authorized

==================================================
20. IMPLEMENTATION ROADMAP
==========================

After completing the architecture analysis, create a PHASE-BY-PHASE implementation roadmap.

Do NOT simply list features.

For every phase provide:

1. Phase objective
2. Exact scope
3. Features to implement
4. Database changes
5. Backend changes
6. Frontend changes
7. APIs
8. Tests
9. Definition of Done
10. Dependencies on previous phases
11. Technical risks
12. Recommended implementation order

The phases should look conceptually like:

PHASE 0 — Technical feasibility and PDF engine proof of concept
PHASE 1 — Repository and infrastructure setup
PHASE 2 — Authentication and users
PHASE 3 — Guest sessions and document upload
PHASE 4 — Document storage and dashboard
PHASE 5 — PDF rendering and coordinate system
PHASE 6 — PDF object analysis and existing text selection
PHASE 7 — Existing text editing proof of concept
PHASE 8 — Editor state and operation system
PHASE 9 — Full text editing implementation
PHASE 10 — Annotations and overlays
PHASE 11 — Page management
PHASE 12 — OCR and scanned document editing
PHASE 13 — Auto-save and version history
PHASE 14 — Export and PDF generation
PHASE 15 — Tool suite
PHASE 16 — Security and performance
PHASE 17 — Deployment
PHASE 18 — Testing and production hardening

You may modify this roadmap if there is a technically better order.

==================================================
CRITICAL WORKING RULES
======================

Do not generate implementation code yet.

First act as an architect.

Do not oversimplify PDF editing.

Do not assume PDF text is stored like HTML text.

Clearly explain every major technical limitation.

When something is difficult or impossible to reliably implement across arbitrary PDFs, explicitly say so.

When a commercial SDK would be significantly better, clearly identify that.

Optimize the architecture for a serious portfolio project that I can explain in software engineering interviews.

After completing the architecture, implementation phases, technology comparison, database design, API design, and risk analysis, STOP.

Do not begin implementation.

Wait for me to select the implementation approach and tell you which phase to start.
