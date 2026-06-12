# College_Management_System
# SmartCampus Pro

A modern College Management System built with React, Node.js, Express, and MySQL. SmartCampus Pro provides a complete solution for managing students, faculty, courses, attendance, examinations, placements, library services, hostels, and administrative operations.

---

## Features

### Authentication & Security

* JWT Authentication
* Role-Based Access Control (Admin, Faculty, Student)
* Secure Password Hashing
* Protected Routes

### Student Management

* Add, Edit, Delete Students
* Student Profiles
* Academic Records
* Attendance Tracking
* Result Management

### Faculty Management

* Faculty Profiles
* Course Assignments
* Class Scheduling
* Attendance Monitoring

### Department Management

* Department Creation
* Faculty Allocation
* Student Allocation
* Department Analytics

### Course Management

* Course Creation
* Course Assignment
* Enrollment Tracking
* Course Analytics

### Examination & Results

* Exam Scheduling
* Marks Entry
* Result Generation
* Performance Analysis

### Attendance System

* Daily Attendance
* Attendance Reports
* Percentage Tracking
* Absence Monitoring

### Library Management

* Book Inventory
* Book Issue & Return
* Fine Management
* Search Functionality

### Hostel Management

* Room Allocation
* Hostel Records
* Student Accommodation Tracking

### Placement Management

* Company Records
* Placement Statistics
* Student Placement Tracking

### Event Management

* Event Creation
* Student Registration
* Participation Tracking

### Fee Management

* Fee Collection
* Pending Fee Reports
* Payment History

### Dashboard Analytics

* Total Students
* Total Faculty
* Total Courses
* Total Departments
* Attendance Percentage
* Pass Percentage
* Top Performing Student
* Top Performing Department
* Interactive Charts

---

## Technology Stack

### Frontend

* React
* Vite
* Bootstrap 5
* Axios
* React Router
* Chart.js

### Backend

* Node.js
* Express.js

### Database

* MySQL

### Authentication

* JWT (JSON Web Tokens)
* bcrypt

---

## Project Structure

```text
SmartCampusPro/
│
├── client/
│   ├── src/
│   ├── public/
│   └── package.json
│
├── server/
│   ├── routes/
│   ├── controllers/
│   ├── middleware/
│   ├── config/
│   ├── models/
│   └── package.json
│
├── database/
│   ├── schema.sql
│   ├── seed.sql
│   └── migrations/
│
├── .env
├── README.md
└── package.json
```

---

## Installation

### Clone Repository

```bash
git clone https://github.com/your-username/smartcampus-pro.git
cd smartcampus-pro
```

### Install Backend Dependencies

```bash
cd server
npm install
```

### Install Frontend Dependencies

```bash
cd ../client
npm install
```

---

## Environment Variables

Create a `.env` file in the server directory.

```env
PORT=5000

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=your_password
DB_NAME=SmartCampusProDB

JWT_SECRET=your_jwt_secret
```

---

## Database Setup

Create the database:

```sql
CREATE DATABASE SmartCampusProDB;
```

Import schema:

```bash
mysql -u root -p SmartCampusProDB < database/schema.sql
```

Import sample data:

```bash
mysql -u root -p SmartCampusProDB < database/seed.sql
```

---

## Run Backend

```bash
cd server
npm start
```

Backend runs at:

```text
http://localhost:5000
```

---

## Run Frontend

```bash
cd client
npm run dev
```

Frontend runs at:

```text
http://localhost:5173
```

---

## Default Login Credentials

### Administrator

```text
Email: admin@smartcampuspro.com
Password: Admin@123
```

### Faculty

```text
Email: faculty@smartcampuspro.com
Password: Faculty@123
```

### Student

```text
Email: student@smartcampuspro.com
Password: Student@123
```

---

## API Endpoints

### Authentication

```http
POST /api/auth/login
POST /api/auth/register
GET  /api/auth/profile
```

### Students

```http
GET    /api/students
POST   /api/students
PUT    /api/students/:id
DELETE /api/students/:id
```

### Faculty

```http
GET    /api/faculty
POST   /api/faculty
PUT    /api/faculty/:id
DELETE /api/faculty/:id
```

### Courses

```http
GET    /api/courses
POST   /api/courses
PUT    /api/courses/:id
DELETE /api/courses/:id
```

---

## Dashboard Metrics

* Student Count
* Faculty Count
* Department Count
* Course Count
* Attendance Percentage
* Pass Percentage
* Placement Statistics
* Fee Collection Summary

---

## Future Enhancements

* AI Student Performance Prediction
* SMS Notifications
* Email Notifications
* Online Examination System
* Mobile Application
* Biometric Attendance Integration
* Cloud Deployment
* Multi-Campus Support

---

## License

This project is licensed under the MIT License.

---

## Author

SmartCampus Pro Development Team

Version: 1.0.0
