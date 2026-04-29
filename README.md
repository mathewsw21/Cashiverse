# Cashiverse

Cashiverse is a web-based shift clocking and time tracking system built with React and Firebase. It allows employees to clock in and out while enabling administrators to monitor attendance and manage employee timecards in real time.

The system integrates authentication, cloud-based storage, and a responsive user interface to provide a complete time tracking workflow.

---

## Overview

Cashiverse provides a full time tracking pipeline:

- Users authenticate using Firebase Authentication  
- Employees clock in and clock out to record work hours  
- Timecard data is stored in Cloud Firestore  
- Administrators can view and manage employee records  

All interactions follow a request-response model where frontend actions update the database and reflect changes in the UI.

---

## Features

- Clock in / Clock out functionality  
- Shift history tracking  
- Automatic time calculations  
- Secure authentication  
- Cloud-based storage  
- Responsive interface  
- Role-based access (Employee / Admin)  

---

## Tech Stack

### Frontend
- React  
- React Router  

### Backend / Infrastructure
- Firebase Authentication  
- Cloud Firestore  

### Deployment
- Docker

### Running with Docker
- docker pull rjhwinner2003/cashiverse:latest
- docker run -p 3000:3000 rjhwinner2003/cashiverse:latest

## Deploying with Docker
- docker pull rjhwinner2003/cashiverse:latest
- docker tag rjhwinner2003/cashiverse:latest gcr.io/(YOUR PROJECT ID)/cashiverse:latest
- docker push gcr.io/(YOUR PROJECT ID)/cashiverse:latest
- gcloud run deploy cahsiverse --image gcr.io/(YOUR PROJECT ID)/cashiverse:latest
- Select a region close to you and then allow unauthenticated invocations

---

## Running Locally (Development)
- npm install
- npm install react react-dom react-router firebase
- npm run dev
- http://localhost:5173

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/cashiverse.git
cd cashiverse
