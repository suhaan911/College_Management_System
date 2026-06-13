const router = require('express').Router();
const db = require('../db/connection');

// Dashboard KPIs
router.get('/dashboard', async (req, res) => {
  try {
    const [[{ total_students }]] = await db.query('SELECT COUNT(*) AS total_students FROM Student');
    const [[{ total_faculty }]]  = await db.query('SELECT COUNT(*) AS total_faculty FROM Faculty');
    const [[{ total_courses }]]  = await db.query('SELECT COUNT(*) AS total_courses FROM Course');
    const [[{ total_depts }]]    = await db.query('SELECT COUNT(*) AS total_depts FROM Department');
    const [[{ avg_marks }]]      = await db.query('SELECT ROUND(AVG(marks_obtained),2) AS avg_marks FROM Result');
    const [[{ total_enrollments }]] = await db.query('SELECT COUNT(*) AS total_enrollments FROM Enrollment');
    res.json({ success: true, data: { total_students, total_faculty, total_courses, total_depts, avg_marks, total_enrollments } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Department-wise student count
router.get('/dept-count', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT d.dept_name, COUNT(s.student_id) AS student_count
      FROM Department d
      LEFT JOIN Student s ON d.dept_id = s.dept_id
      GROUP BY d.dept_id, d.dept_name
      ORDER BY student_count DESC`);
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Top scorer
router.get('/top-scorer', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT s.student_id, s.student_name, d.dept_name,
             ROUND(AVG(r.marks_obtained),2) AS avg_marks,
             MAX(r.marks_obtained) AS highest_mark,
             COUNT(r.result_id) AS exams_taken
      FROM Result r
      JOIN Student s ON r.student_id = s.student_id
      LEFT JOIN Department d ON s.dept_id = d.dept_id
      GROUP BY s.student_id, s.student_name, d.dept_name
      ORDER BY avg_marks DESC LIMIT 5`);
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Students scoring above average
router.get('/above-average', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT s.student_id, s.student_name, d.dept_name,
             ROUND(AVG(r.marks_obtained),2) AS avg_marks
      FROM Result r
      JOIN Student s ON r.student_id = s.student_id
      LEFT JOIN Department d ON s.dept_id = d.dept_id
      GROUP BY s.student_id, s.student_name, d.dept_name
      HAVING avg_marks > (SELECT AVG(marks_obtained) FROM Result)
      ORDER BY avg_marks DESC`);
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Course-wise enrollment count
router.get('/course-enrollment', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT c.course_id, c.course_name, c.course_code,
             COUNT(e.enrollment_id) AS enrollment_count
      FROM Course c
      LEFT JOIN Enrollment e ON c.course_id = e.course_id
      GROUP BY c.course_id, c.course_name, c.course_code
      ORDER BY enrollment_count DESC`);
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Average marks per course
router.get('/course-avg-marks', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT c.course_name, c.course_code,
             ROUND(AVG(r.marks_obtained),2) AS avg_marks,
             MAX(r.marks_obtained) AS max_marks,
             MIN(r.marks_obtained) AS min_marks,
             COUNT(r.result_id) AS total_results
      FROM Result r
      JOIN Exam e   ON r.exam_id   = e.exam_id
      JOIN Course c ON e.course_id = c.course_id
      GROUP BY c.course_id, c.course_name, c.course_code
      ORDER BY avg_marks DESC`);
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Faculty teaching courses
router.get('/faculty-courses', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT f.faculty_id, f.faculty_name, f.designation, d.dept_name,
             GROUP_CONCAT(DISTINCT c.course_name ORDER BY c.course_name SEPARATOR ', ') AS courses_taught,
             COUNT(DISTINCT cl.course_id) AS course_count
      FROM Faculty f
      LEFT JOIN Class cl ON cl.faculty_id = f.faculty_id
      LEFT JOIN Course c ON cl.course_id  = c.course_id
      LEFT JOIN Department d ON f.dept_id = d.dept_id
      GROUP BY f.faculty_id, f.faculty_name, f.designation, d.dept_name
      ORDER BY f.faculty_name`);
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Grade distribution
router.get('/grade-distribution', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT grade, COUNT(*) AS count
      FROM Result
      WHERE grade IS NOT NULL
      GROUP BY grade
      ORDER BY FIELD(grade,'A+','A','B','C','D','F')`);
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
