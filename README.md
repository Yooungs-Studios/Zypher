<div align="center">
  <h1>ZYPHER</h1>
  <h3>Intelligent Media Streaming & Recommendation Engine</h3>
  
  <p>
    A high-performance content distribution platform powered by 
    real-time recommendation algorithms and user metrics analysis.
  </p>
  
  <p><strong>Developed by Yooungs Studios</strong></p>

  <img src="https://img.shields.io/badge/Node.js-Backend-339933?style=for-the-badge&logo=nodedotjs" />
  <img src="https://img.shields.io/badge/FFmpeg-Media_Processing-007808?style=for-the-badge&logo=ffmpeg" />
  <img src="https://img.shields.io/badge/SQLite-Persistence-003B57?style=for-the-badge&logo=sqlite" />
  <img src="https://img.shields.io/badge/Architecture-MVC-orange?style=for-the-badge" />
  
  <br /><br />
</div>

---

## Project Overview

**Zypher** is an advanced media management and streaming architecture designed to maximize user retention. Unlike standard video players, Zypher integrates a proprietary recommendation engine that analyzes behavioral patterns to serve personalized content feeds.

The system features enterprise-grade data security, automated media optimization via `ffmpeg`, and a dynamic real-time trend scoring system.

---

## Core Engine: Recommendation Algorithms

The distinct feature of Zypher is its suite of algorithms designed to drive User Engagement.

| Algorithm | Function | Business Logic |
| :--- | :--- | :--- |
| **TrendFactor** | `Dynamic Scoring` | Hourly recalculation based on view velocity, likes, and shares. Determines real-time virality. |
| **ClickRec+** | `CTR Optimization` | Prioritizes content with high Click-Through Rates and initial retention. |
| **SubRec+** | `Feed Priority` | Boosts relevant content from subscribed channels based on recency. |
| **TasteRec+** | `Collaborative Filtering` | Suggests content based on user clusters with similar consumption habits. |
| **EngageRec** | `Interaction Weighting` | Promotes videos generating high community participation (comments/debates). |
| **RandRec+** | `Discovery` | Introduce serendipity by suggesting relevant new content outside the user's usual bubble. |

---

## Tech Stack & Architecture

The project follows a modular architecture to ensure scalability and maintainability.

### Backend & Processing
* **Runtime:** Node.js (Express Framework).
* **Media Processing:** **FFmpeg** integration for transcoding and automatic thumbnail generation.
* **Database:** SQLite (Optimized for fast read operations in local/PoC deployments).
* **Security:** Sensitive data encryption and strict privacy policies.

### Module Structure
```text
src/
├── core/
│   ├── recomendalg/       # Recommendation Logic (The Brain)
│   │   ├── updateTrendFactor.js
│   │   └── userPreferences.js
│   └── notifications.js   # Pub/Sub Event System
├── database/              # Persistence Layer (SQLite Connectors)
├── server/                # API Routes & Controllers
└── public/                # EJS Views & Optimized Assets
````

-----

## System Features

### 1\. Content Management (CMS)

  * **Creator Dashboard:** Administrative panel for metrics, channel customization, and asset management.
  * **Upload Pipeline:** Secure file upload system with type validation and automatic size optimization.

### 2\. User Experience (UX)

  * **Dynamic Interface:** Server-Side Rendering (SSR) using EJS for fast initial load times.
  * **Wiki & Support:** Integrated documentation modules and ticket support system.
  * **Smart Notifications:** Real-time alerts for subscriptions and interactions.

### 3\. Security

  * Secure authentication with email verification.
  * Admin route protection and session validation.

-----

## License & Rights

**Proprietary Software.**
This project was developed by **Yooungs Studios**.
The source code is provided for portfolio demonstration purposes only.

  * **External collaboration is not accepted.**
  * Commercial redistribution of this code is strictly prohibited without authorization.

-----

\<div align="center"\>
\<p\>Engineered by \<strong\>Yooungs Studios\</strong\>\</p\>
\<a href="https://www.google.com/search?q=https://github.com/Yooungs-Studios"\>View Organization Profile\</a\>
\</div\>

```
