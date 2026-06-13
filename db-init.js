/**
 * db-init.js — Automatically creates the database, tables, view,
 * stored procedure, triggers, and loads all sample data.
 * Run once: node db-init.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const HOST = process.env.DB_HOST || 'localhost';
const USER = process.env.DB_USER || 'root';
const PASS = process.env.DB_PASS || '';
const DB   = process.env.DB_NAME || 'college_mgmt';

async function run() {
  console.log('🔧 Connecting to MySQL as', USER, '@', HOST);

  // Connect without a database first to create it
  const conn = await mysql.createConnection({
    host: HOST, user: USER, password: PASS,
    multipleStatements: true
  });

  console.log('✅ Connected to MySQL');

  // 1. Create DB
  await conn.query(`DROP DATABASE IF EXISTS \`${DB}\``);
  await conn.query(`CREATE DATABASE \`${DB}\``);
  await conn.query(`USE \`${DB}\``);
  console.log(`✅ Database "${DB}" created`);

  // 2. Tables
  await conn.query(`
    CREATE TABLE IF NOT EXISTS Department (
      dept_id INT AUTO_INCREMENT PRIMARY KEY,
      dept_name VARCHAR(100) NOT NULL,
      hod_name VARCHAR(100),
      established_year INT,
      location VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await conn.query(`
    CREATE TABLE IF NOT EXISTS Faculty (
      faculty_id INT AUTO_INCREMENT PRIMARY KEY,
      faculty_name VARCHAR(100) NOT NULL,
      email VARCHAR(100) UNIQUE,
      phone VARCHAR(20),
      dept_id INT,
      designation VARCHAR(100),
      joining_date DATE,
      salary DECIMAL(10,2),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (dept_id) REFERENCES Department(dept_id) ON DELETE SET NULL
    )
  `);
  await conn.query(`
    CREATE TABLE IF NOT EXISTS Student (
      student_id INT AUTO_INCREMENT PRIMARY KEY,
      student_name VARCHAR(100) NOT NULL,
      email VARCHAR(100) UNIQUE,
      phone VARCHAR(20),
      dept_id INT,
      dob DATE,
      gender ENUM('Male','Female','Other'),
      address TEXT,
      admission_year INT,
      semester INT DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (dept_id) REFERENCES Department(dept_id) ON DELETE SET NULL
    )
  `);
  await conn.query(`
    CREATE TABLE IF NOT EXISTS Course (
      course_id INT AUTO_INCREMENT PRIMARY KEY,
      course_name VARCHAR(150) NOT NULL,
      course_code VARCHAR(20) UNIQUE,
      dept_id INT,
      credits INT DEFAULT 3,
      semester INT,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (dept_id) REFERENCES Department(dept_id) ON DELETE SET NULL
    )
  `);
  await conn.query(`
    CREATE TABLE IF NOT EXISTS Class (
      class_id INT AUTO_INCREMENT PRIMARY KEY,
      course_id INT,
      faculty_id INT,
      class_date DATE,
      start_time TIME,
      end_time TIME,
      room_no VARCHAR(20),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (course_id) REFERENCES Course(course_id) ON DELETE CASCADE,
      FOREIGN KEY (faculty_id) REFERENCES Faculty(faculty_id) ON DELETE SET NULL
    )
  `);
  await conn.query(`
    CREATE TABLE IF NOT EXISTS Enrollment (
      enrollment_id INT AUTO_INCREMENT PRIMARY KEY,
      student_id INT,
      course_id INT,
      enrollment_date DATE DEFAULT (CURDATE()),
      status ENUM('Active','Dropped','Completed') DEFAULT 'Active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_enrollment (student_id, course_id),
      FOREIGN KEY (student_id) REFERENCES Student(student_id) ON DELETE CASCADE,
      FOREIGN KEY (course_id) REFERENCES Course(course_id) ON DELETE CASCADE
    )
  `);
  await conn.query(`
    CREATE TABLE IF NOT EXISTS Attendance (
      attendance_id INT AUTO_INCREMENT PRIMARY KEY,
      student_id INT,
      class_id INT,
      status ENUM('Present','Absent','Late') DEFAULT 'Present',
      marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES Student(student_id) ON DELETE CASCADE,
      FOREIGN KEY (class_id) REFERENCES Class(class_id) ON DELETE CASCADE
    )
  `);
  await conn.query(`
    CREATE TABLE IF NOT EXISTS Exam (
      exam_id INT AUTO_INCREMENT PRIMARY KEY,
      exam_name VARCHAR(150) NOT NULL,
      course_id INT,
      exam_date DATE,
      total_marks INT DEFAULT 100,
      exam_type ENUM('Internal','External','Practical','Viva') DEFAULT 'Internal',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (course_id) REFERENCES Course(course_id) ON DELETE CASCADE
    )
  `);
  await conn.query(`
    CREATE TABLE IF NOT EXISTS Result (
      result_id INT AUTO_INCREMENT PRIMARY KEY,
      student_id INT,
      exam_id INT,
      marks_obtained DECIMAL(5,2),
      grade VARCHAR(5),
      remarks TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_result (student_id, exam_id),
      FOREIGN KEY (student_id) REFERENCES Student(student_id) ON DELETE CASCADE,
      FOREIGN KEY (exam_id) REFERENCES Exam(exam_id) ON DELETE CASCADE
    )
  `);
  console.log('✅ All 9 tables created');

  // 3. View
  await conn.query(`
    CREATE VIEW StudentResultView AS
    SELECT s.student_id, s.student_name, d.dept_name, c.course_name, e.exam_name,
           e.exam_type, e.total_marks, r.marks_obtained, r.grade,
           ROUND((r.marks_obtained / e.total_marks) * 100, 2) AS percentage
    FROM Result r
    JOIN Student s ON r.student_id = s.student_id
    JOIN Exam e ON r.exam_id = e.exam_id
    JOIN Course c ON e.course_id = c.course_id
    JOIN Department d ON s.dept_id = d.dept_id
  `);
  console.log('✅ StudentResultView created');

  // 4. Stored Procedure
  await conn.query(`
    CREATE PROCEDURE GetStudentResult(IN p_student_id INT)
    BEGIN
      SELECT s.student_name, d.dept_name, c.course_name, e.exam_name,
             e.exam_type, e.total_marks, r.marks_obtained, r.grade,
             ROUND((r.marks_obtained / e.total_marks) * 100, 2) AS percentage
      FROM Result r
      JOIN Student s ON r.student_id = s.student_id
      JOIN Exam e ON r.exam_id = e.exam_id
      JOIN Course c ON e.course_id = c.course_id
      JOIN Department d ON s.dept_id = d.dept_id
      WHERE r.student_id = p_student_id
      ORDER BY c.course_name, e.exam_name;
    END
  `);
  console.log('✅ GetStudentResult procedure created');

  // 5. Triggers
  await conn.query(`
    CREATE TRIGGER CheckMarks_before_insert
    BEFORE INSERT ON Result
    FOR EACH ROW
    BEGIN
      IF NEW.marks_obtained < 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Marks cannot be negative';
      END IF;
      IF NEW.marks_obtained > (SELECT total_marks FROM Exam WHERE exam_id = NEW.exam_id) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Marks cannot exceed total marks';
      END IF;
      SET NEW.grade = CASE
        WHEN NEW.marks_obtained >= 90 THEN 'A+'
        WHEN NEW.marks_obtained >= 80 THEN 'A'
        WHEN NEW.marks_obtained >= 70 THEN 'B'
        WHEN NEW.marks_obtained >= 60 THEN 'C'
        WHEN NEW.marks_obtained >= 50 THEN 'D'
        ELSE 'F'
      END;
    END
  `);
  await conn.query(`
    CREATE TRIGGER CheckMarks_before_update
    BEFORE UPDATE ON Result
    FOR EACH ROW
    BEGIN
      IF NEW.marks_obtained < 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Marks cannot be negative';
      END IF;
      IF NEW.marks_obtained > (SELECT total_marks FROM Exam WHERE exam_id = NEW.exam_id) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Marks cannot exceed total marks';
      END IF;
      SET NEW.grade = CASE
        WHEN NEW.marks_obtained >= 90 THEN 'A+'
        WHEN NEW.marks_obtained >= 80 THEN 'A'
        WHEN NEW.marks_obtained >= 70 THEN 'B'
        WHEN NEW.marks_obtained >= 60 THEN 'C'
        WHEN NEW.marks_obtained >= 50 THEN 'D'
        ELSE 'F'
      END;
    END
  `);
  console.log('✅ CheckMarks triggers created (INSERT + UPDATE)');

  // ===== SAMPLE DATA =====
  console.log('📦 Inserting sample data...');

  await conn.query(`INSERT INTO Department (dept_name, hod_name, established_year, location) VALUES
    ('Computer Science','Dr. Rajesh Kumar',2000,'Block A'),
    ('Electronics','Dr. Meena Sharma',1998,'Block B'),
    ('Mechanical','Dr. Arjun Patel',1995,'Block C'),
    ('Civil Engineering','Dr. Priya Singh',1992,'Block D'),
    ('Mathematics','Dr. Sonal Verma',2005,'Block E')`);

  await conn.query(`INSERT INTO Faculty (faculty_name, email, phone, dept_id, designation, joining_date, salary) VALUES
    ('Prof. Amit Joshi','amit.joshi@college.edu','9876543210',1,'Associate Professor','2015-06-01',75000),
    ('Prof. Sunita Rao','sunita.rao@college.edu','9876543211',1,'Assistant Professor','2018-07-15',60000),
    ('Prof. Vikram Singh','vikram.singh@college.edu','9876543212',2,'Professor','2010-03-10',90000),
    ('Prof. Kavitha Nair','kavitha.nair@college.edu','9876543213',3,'Associate Professor','2016-08-20',70000),
    ('Prof. Ravi Tiwari','ravi.tiwari@college.edu','9876543214',4,'Assistant Professor','2019-01-05',58000),
    ('Prof. Deepa Menon','deepa.menon@college.edu','9876543215',5,'Professor','2008-09-12',95000),
    ('Prof. Harish Gupta','harish.gupta@college.edu','9876543216',2,'Assistant Professor','2020-02-14',55000),
    ('Prof. Pooja Chauhan','pooja.chauhan@college.edu','9876543217',1,'Assistant Professor','2021-06-30',52000)`);

  await conn.query(`INSERT INTO Student (student_name, email, phone, dept_id, dob, gender, address, admission_year, semester) VALUES
    ('Aarav Sharma','aarav.sharma@student.edu','8765432101',1,'2002-04-15','Male','12 MG Road, Bangalore',2022,5),
    ('Priya Patel','priya.patel@student.edu','8765432102',1,'2003-07-22','Female','45 Park Street, Mumbai',2022,5),
    ('Rohan Mehta','rohan.mehta@student.edu','8765432103',2,'2001-12-01','Male','78 Civil Lines, Delhi',2021,7),
    ('Sneha Reddy','sneha.reddy@student.edu','8765432104',2,'2003-03-18','Female','22 Jubilee Hills, Hyderabad',2022,5),
    ('Karan Verma','karan.verma@student.edu','8765432105',3,'2002-08-30','Male','5 Lal Darwaza, Ahmedabad',2022,5),
    ('Ananya Singh','ananya.singh@student.edu','8765432106',1,'2003-01-10','Female','90 Anna Nagar, Chennai',2022,5),
    ('Vikash Yadav','vikash.yadav@student.edu','8765432107',4,'2001-06-25','Male','33 Boring Road, Patna',2021,7),
    ('Meera Nair','meera.nair@student.edu','8765432108',1,'2003-09-05','Female','11 MG Road, Kochi',2022,5),
    ('Arjun Gupta','arjun.gupta@student.edu','8765432109',5,'2002-11-20','Male','56 Station Road, Jaipur',2022,5),
    ('Divya Kapoor','divya.kapoor@student.edu','8765432110',3,'2003-05-14','Female','18 Sadar Bazaar, Lucknow',2022,5),
    ('Rahul Kumar','rahul.kumar@student.edu','8765432111',1,'2002-02-28','Male','67 Sector 15, Chandigarh',2022,5),
    ('Pooja Mishra','pooja.mishra@student.edu','8765432112',2,'2003-08-12','Female','29 Mahal, Nagpur',2022,5),
    ('Suresh Babu','suresh.babu@student.edu','8765432113',4,'2001-10-07','Male','44 Tambaram, Chennai',2021,7),
    ('Lakshmi Iyer','lakshmi.iyer@student.edu','8765432114',5,'2003-04-29','Female','8 Velachery, Chennai',2022,5),
    ('Nikhil Jain','nikhil.jain@student.edu','8765432115',1,'2002-07-03','Male','77 Karol Bagh, Delhi',2022,5)`);

  await conn.query(`INSERT INTO Course (course_name, course_code, dept_id, credits, semester, description) VALUES
    ('Database Management Systems','CS301',1,4,5,'Fundamentals of DBMS, SQL, and NoSQL'),
    ('Data Structures & Algorithms','CS201',1,4,3,'Core DSA concepts and problem solving'),
    ('Operating Systems','CS302',1,3,5,'OS concepts, process management, memory'),
    ('Digital Electronics','EC201',2,3,3,'Logic gates, flip-flops, and digital circuits'),
    ('Signals & Systems','EC301',2,4,5,'Signal processing and system analysis'),
    ('Thermodynamics','ME201',3,3,3,'Laws of thermodynamics and applications'),
    ('Fluid Mechanics','CE301',4,4,5,'Fluid properties, flow analysis'),
    ('Calculus & Linear Algebra','MA101',5,4,1,'Differential and integral calculus, matrices'),
    ('Probability & Statistics','MA201',5,3,3,'Probability theory and statistical methods'),
    ('Computer Networks','CS401',1,3,7,'Network protocols, TCP/IP, security')`);

  await conn.query(`INSERT INTO Class (course_id, faculty_id, class_date, start_time, end_time, room_no) VALUES
    (1,1,'2026-06-01','09:00:00','10:00:00','A101'),
    (1,1,'2026-06-03','09:00:00','10:00:00','A101'),
    (2,2,'2026-06-02','10:00:00','11:00:00','A102'),
    (3,2,'2026-06-02','11:00:00','12:00:00','A103'),
    (4,3,'2026-06-01','09:00:00','10:00:00','B101'),
    (5,7,'2026-06-03','14:00:00','15:00:00','B102'),
    (6,4,'2026-06-04','09:00:00','10:00:00','C101'),
    (7,5,'2026-06-05','10:00:00','11:00:00','D101'),
    (8,6,'2026-06-06','11:00:00','12:00:00','E101'),
    (9,6,'2026-06-07','09:00:00','10:00:00','E102')`);

  await conn.query(`INSERT INTO Enrollment (student_id, course_id, enrollment_date, status) VALUES
    (1,1,'2026-01-10','Active'),(1,2,'2026-01-10','Active'),(1,3,'2026-01-10','Active'),
    (2,1,'2026-01-10','Active'),(2,2,'2026-01-10','Active'),(2,9,'2026-01-10','Active'),
    (3,4,'2025-01-10','Active'),(3,5,'2025-01-10','Active'),
    (4,4,'2026-01-10','Active'),(4,5,'2026-01-10','Active'),
    (5,6,'2026-01-10','Active'),(5,8,'2026-01-10','Active'),
    (6,1,'2026-01-10','Active'),(6,2,'2026-01-10','Active'),(6,3,'2026-01-10','Active'),
    (7,7,'2025-01-10','Active'),
    (8,1,'2026-01-10','Active'),(8,3,'2026-01-10','Active'),
    (9,8,'2026-01-10','Active'),(9,9,'2026-01-10','Active'),
    (10,6,'2026-01-10','Active'),
    (11,1,'2026-01-10','Active'),(11,2,'2026-01-10','Active'),(11,10,'2026-01-10','Active'),
    (12,4,'2026-01-10','Active'),(12,5,'2026-01-10','Active'),
    (13,7,'2025-01-10','Active'),
    (14,8,'2026-01-10','Active'),(14,9,'2026-01-10','Active'),
    (15,1,'2026-01-10','Active'),(15,2,'2026-01-10','Active')`);

  await conn.query(`INSERT INTO Attendance (student_id, class_id, status) VALUES
    (1,1,'Present'),(1,2,'Present'),(1,3,'Present'),
    (2,1,'Present'),(2,2,'Absent'),(2,3,'Late'),
    (6,1,'Present'),(6,2,'Present'),(6,3,'Absent'),
    (8,1,'Present'),(8,2,'Present'),
    (11,1,'Late'),(11,2,'Present'),
    (15,1,'Present'),(15,2,'Absent'),
    (3,5,'Present'),(4,5,'Absent'),(3,6,'Present'),
    (5,7,'Present'),(10,7,'Present'),(7,8,'Present'),
    (9,9,'Present'),(9,10,'Absent'),(14,9,'Present')`);

  await conn.query(`INSERT INTO Exam (exam_name, course_id, exam_date, total_marks, exam_type) VALUES
    ('DBMS Mid-Term',1,'2026-03-15',50,'Internal'),
    ('DBMS End-Term',1,'2026-05-20',100,'External'),
    ('DSA Mid-Term',2,'2026-03-16',50,'Internal'),
    ('DSA End-Term',2,'2026-05-21',100,'External'),
    ('OS Mid-Term',3,'2026-03-17',50,'Internal'),
    ('Digital Electronics',4,'2026-03-18',100,'External'),
    ('Signals Mid-Term',5,'2026-03-19',50,'Internal'),
    ('Thermodynamics Final',6,'2026-05-22',100,'External'),
    ('Fluid Mechanics Final',7,'2026-05-23',100,'External'),
    ('Calculus Mid-Term',8,'2026-03-20',50,'Internal'),
    ('Probability Final',9,'2026-05-24',100,'External'),
    ('Networks Final',10,'2026-05-25',100,'External'),
    ('DBMS Practical',1,'2026-04-10',50,'Practical'),
    ('DSA Practical',2,'2026-04-11',50,'Practical'),
    ('OS Practical',3,'2026-04-12',50,'Practical')`);

  await conn.query(`INSERT INTO Result (student_id, exam_id, marks_obtained, remarks) VALUES
    (1,1,45,'Excellent'),(1,2,88,'Very Good'),(1,3,42,'Good'),
    (1,4,76,'Good'),(1,5,38,'Good'),(1,13,47,'Excellent'),
    (2,1,40,'Good'),(2,2,72,'Good'),(2,3,35,'Average'),
    (2,4,65,'Good'),(2,14,44,'Good'),
    (3,6,82,'Very Good'),(3,7,38,'Good'),
    (4,6,55,'Average'),(4,7,28,'Below Average'),
    (5,8,91,'Excellent'),(5,10,46,'Excellent'),
    (6,1,48,'Excellent'),(6,2,95,'Excellent'),(6,3,46,'Excellent'),
    (6,4,89,'Very Good'),(6,5,44,'Excellent'),(6,13,49,'Excellent'),
    (7,9,63,'Good'),
    (8,1,35,'Average'),(8,2,68,'Good'),(8,5,30,'Average'),
    (9,10,43,'Good'),(9,11,78,'Good'),
    (10,8,74,'Good'),
    (11,1,44,'Good'),(11,2,80,'Very Good'),(11,3,40,'Good'),
    (11,4,73,'Good'),(11,14,45,'Good'),
    (12,6,60,'Average'),(12,7,32,'Average'),
    (13,9,88,'Very Good'),
    (14,10,49,'Excellent'),(14,11,92,'Excellent'),
    (15,1,46,'Good'),(15,2,83,'Very Good'),(15,3,39,'Good'),
    (15,14,48,'Excellent')`);

  // Count records
  const tables = ['Department','Faculty','Student','Course','Class','Enrollment','Attendance','Exam','Result'];
  console.log('\n📊 Records loaded:');
  let totalRecords = 0;
  for (const t of tables) {
    const [[{ c }]] = await conn.query(`SELECT COUNT(*) AS c FROM ${t}`);
    console.log(`   ${t}: ${c} records`);
    totalRecords += c;
  }
  console.log(`   TOTAL: ${totalRecords} records\n`);

  // Test the view
  const [viewRows] = await conn.query('SELECT COUNT(*) AS c FROM StudentResultView');
  console.log(`✅ StudentResultView works — ${viewRows[0].c} rows`);

  // Test stored procedure
  const [spRows] = await conn.query('CALL GetStudentResult(1)');
  console.log(`✅ GetStudentResult(1) works — ${spRows[0].length} results for Aarav Sharma`);

  // Test trigger (negative marks should fail)
  try {
    await conn.query(`INSERT INTO Result (student_id, exam_id, marks_obtained) VALUES (1, 9, -10)`);
    console.log('❌ CheckMarks trigger FAILED — negative marks were accepted');
  } catch(e) {
    console.log('✅ CheckMarks trigger works — blocked negative marks');
  }

  await conn.end();
  console.log('\n🎉 Database initialization complete!\n');
}

run().catch(err => {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
});
