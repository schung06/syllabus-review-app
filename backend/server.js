const express = require('express');
const cors = require('cors');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Multer setup for PDF uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname.replace(/[^a-zA-Z0-9.]/g, '_'));
    }
});
const upload = multer({ storage });

// Database setup
const db = new sqlite3.Database(path.join(__dirname, 'database.sqlite'), (err) => {
    if (err) console.error('Database opening error: ', err);
});

db.serialize(() => {
    // Enable WAL (Write-Ahead Logging) for better concurrency
    db.run("PRAGMA journal_mode = WAL;");
    db.run("PRAGMA busy_timeout = 5000;");

    // Basic Reviewers table
    db.run(`CREATE TABLE IF NOT EXISTS reviewers (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT DEFAULT 'reviewer'
    )`);

    // Syllabi table
    db.run(`CREATE TABLE IF NOT EXISTS syllabi (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        filepath TEXT NOT NULL,
        uploadedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Assignments table (links a syllabus to a reviewer with a status and score)
    db.run(`CREATE TABLE IF NOT EXISTS assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        syllabusId INTEGER,
        reviewerId INTEGER,
        status TEXT DEFAULT 'pending',
        scores TEXT, 
        completedAt DATETIME,
        FOREIGN KEY(syllabusId) REFERENCES syllabi(id),
        FOREIGN KEY(reviewerId) REFERENCES reviewers(id)
    )`);

    // Initialize 5 reviewers if not present
    db.get("SELECT COUNT(*) as count FROM reviewers", (err, row) => {
        if (row && row.count === 0) {
            const stmt = db.prepare("INSERT INTO reviewers (id, name, role) VALUES (?, ?, ?)");
            stmt.run(1, 'Super Admin', 'admin');
            stmt.run(2, 'Dishita Joshi', 'reviewer');
            stmt.run(3, 'Nicole Sutedja', 'reviewer');
            stmt.run(4, 'Sadaf Amari', 'reviewer');
            stmt.run(5, 'Stephanie Chung', 'reviewer');
            stmt.finalize();
        }
    });
});

// APIs

// 1. Get all reviewers
app.get('/api/reviewers', (req, res) => {
    db.all("SELECT * FROM reviewers", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// 2. Upload Syllabus and conditionally auto-assign
app.post('/api/upload', upload.single('syllabus'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No PDF uploaded' });

    const filepath = `/uploads/${req.file.filename}`;
    const filename = req.file.originalname;
    const assignedReviewerId = req.body.reviewerId; // 'auto' or a specific ID

    db.run(`INSERT INTO syllabi (filename, filepath) VALUES (?, ?)`, [filename, filepath], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        const syllabusId = this.lastID;

        const assignToId = (id) => {
            return new Promise((resolve, reject) => {
                db.run(`INSERT INTO assignments (syllabusId, reviewerId) VALUES (?, ?)`, [syllabusId, id], function (err) {
                    if (err) reject(err);
                    else resolve(id);
                });
            });
        };

        if (assignedReviewerId === 'all') {
            db.all("SELECT id FROM reviewers WHERE role = 'reviewer'", [], async (err, rows) => {
                if (err) return res.status(500).json({ error: err.message });
                try {
                    await Promise.all(rows.map(r => assignToId(r.id)));
                    res.json({ message: 'Uploaded and assigned to all successfully', syllabusId });
                } catch (e) {
                    res.status(500).json({ error: e.message });
                }
            });
        } else if (assignedReviewerId && assignedReviewerId !== 'auto') {
            // Manual assignment
            assignToId(parseInt(assignedReviewerId, 10))
                .then(id => res.json({ message: 'Uploaded and assigned successfully', syllabusId, assignedTo: id }))
                .catch(err => res.status(500).json({ error: err.message }));
        } else {
            // Auto-assign to the reviewer with the least pending assignments
            db.all(`
                SELECT r.id, COUNT(a.id) as pendingCount 
                FROM reviewers r
                LEFT JOIN assignments a ON r.id = a.reviewerId AND a.status = 'pending'
                WHERE r.role = 'reviewer'
                GROUP BY r.id
                ORDER BY pendingCount ASC, r.id ASC
                LIMIT 1
            `, [], (err, rows) => {
                let assigneeId = 2; // Default to first actual reviewer instead of 1
                if (!err && rows.length > 0) {
                    assigneeId = rows[0].id;
                }
                assignToId(assigneeId)
                    .then(id => res.json({ message: 'Uploaded and assigned successfully', syllabusId, assignedTo: id }))
                    .catch(err => res.status(500).json({ error: err.message }));
            });
        }
    });
});

// 2b. Upload a Link (Google Drive, etc.)
app.post('/api/upload-link', (req, res) => {
    const { filename, link, reviewerId } = req.body;
    if (!filename || !link) return res.status(400).json({ error: 'Filename and link are required' });

    db.run(`INSERT INTO syllabi (filename, filepath) VALUES (?, ?)`, [filename, link], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        const syllabusId = this.lastID;

        const assignToId = (id) => {
            return new Promise((resolve, reject) => {
                db.run(`INSERT INTO assignments (syllabusId, reviewerId) VALUES (?, ?)`, [syllabusId, id], function (err) {
                    if (err) reject(err);
                    else resolve(id);
                });
            });
        };

        if (reviewerId === 'all') {
            db.all("SELECT id FROM reviewers WHERE role = 'reviewer'", [], async (err, rows) => {
                if (err) return res.status(500).json({ error: err.message });
                try {
                    await Promise.all(rows.map(r => assignToId(r.id)));
                    res.json({ message: 'Uploaded and assigned to all successfully', syllabusId });
                } catch (e) {
                    res.status(500).json({ error: e.message });
                }
            });
        } else if (reviewerId && reviewerId !== 'auto') {
            assignToId(parseInt(reviewerId, 10))
                .then(id => res.json({ message: 'Uploaded and assigned successfully', syllabusId, assignedTo: id }))
                .catch(err => res.status(500).json({ error: err.message }));
        } else {
            db.all(`
                SELECT r.id, COUNT(a.id) as pendingCount 
                FROM reviewers r
                LEFT JOIN assignments a ON r.id = a.reviewerId AND a.status = 'pending'
                WHERE r.role = 'reviewer'
                GROUP BY r.id
                ORDER BY pendingCount ASC, r.id ASC
                LIMIT 1
            `, [], (err, rows) => {
                let assigneeId = 2; // Default
                if (!err && rows.length > 0) {
                    assigneeId = rows[0].id;
                }
                assignToId(assigneeId)
                    .then(id => res.json({ message: 'Uploaded and assigned successfully', syllabusId, assignedTo: id }))
                    .catch(err => res.status(500).json({ error: err.message }));
            });
        }
    });
});

// 3. Get Progress Statistics
app.get('/api/progress', (req, res) => {
    const stats = { total: 0, completed: 0, reviewers: [] };

    // Get individual reviewer stats
    db.all(`
        SELECT r.id, r.name, 
               COUNT(a.id) as totalAssigned,
               SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) as completedCount
        FROM reviewers r
        LEFT JOIN assignments a ON r.id = a.reviewerId
        WHERE r.role = 'reviewer'
        GROUP BY r.id
    `, [], (err, reviewerRows) => {
        if (err) return res.status(500).json({ error: err.message });

        stats.reviewers = reviewerRows.map(r => ({
            id: r.id,
            name: r.name,
            totalAssigned: r.totalAssigned || 0,
            completedCount: r.completedCount || 0
        }));

        // Get global group stats (count by unique syllabi, not individual assignments)
        db.all(`
            SELECT 
                COUNT(*) as totalSyllabi,
                SUM(
                    CASE WHEN (
                        SELECT COUNT(*) FROM assignments a WHERE a.syllabusId = s.id
                    ) > 0 AND (
                        SELECT COUNT(*) FROM assignments a WHERE a.syllabusId = s.id AND a.status != 'completed'
                    ) = 0 THEN 1 ELSE 0 END
                ) as fullyCompletedSyllabi
            FROM syllabi s
        `, [], (err, groupRows) => {
            if (err) return res.status(500).json({ error: err.message });

            if (groupRows.length > 0) {
                stats.total = groupRows[0].totalSyllabi || 0;
                stats.completed = groupRows[0].fullyCompletedSyllabi || 0;
            }

            res.json(stats);
        });
    });
});

// 4. Get Assignments for a Reviewer
app.get('/api/assignments/:reviewerId', (req, res) => {
    const reviewerId = req.params.reviewerId;

    if (reviewerId === 'all') {
        db.all(`
            SELECT a.id as assignmentId, a.status, a.scores, r.name as reviewerName, s.id as syllabusId, s.filename, s.filepath, s.uploadedAt
            FROM assignments a
            JOIN syllabi s ON a.syllabusId = s.id
            LEFT JOIN reviewers r ON a.reviewerId = r.id
            ORDER BY a.status DESC, s.uploadedAt ASC
        `, [], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    } else {
        db.all(`
            SELECT a.id as assignmentId, a.status, a.scores, s.id as syllabusId, s.filename, s.filepath, s.uploadedAt
            FROM assignments a
            JOIN syllabi s ON a.syllabusId = s.id
            WHERE a.reviewerId = ?
            ORDER BY a.status DESC, s.uploadedAt ASC
        `, [reviewerId], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    }
});

// 5. Submit Review
app.post('/api/reviews/:assignmentId', (req, res) => {
    const assignmentId = req.params.assignmentId;
    const scores = req.body; // Expecting a JSON object with rubric keys

    db.run(`
        UPDATE assignments 
        SET status = 'completed', scores = ?, completedAt = CURRENT_TIMESTAMP
        WHERE id = ?
    `, [JSON.stringify(scores), assignmentId], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Assignment not found' });
        res.json({ message: 'Review submitted successfully' });
    });
});

// 6. Delete Assignment
app.delete('/api/assignments/:id', (req, res) => {
    db.run(`DELETE FROM assignments WHERE id = ?`, [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Deleted successfully' });
    });
});

// 7. Get All Syllabi (Admin View)
app.get('/api/admin/syllabi', (req, res) => {
    db.all(`SELECT * FROM syllabi ORDER BY uploadedAt DESC`, [], (err, syllabi) => {
        if (err) return res.status(500).json({ error: err.message });
        db.all(`SELECT a.id, a.syllabusId, a.reviewerId, r.name, a.status FROM assignments a JOIN reviewers r ON a.reviewerId = r.id`, [], (err, assignments) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(syllabi.map(s => {
                s.assignments = assignments.filter(a => a.syllabusId === s.id);
                return s;
            }));
        });
    });
});

// 8. Update Multiple Assignments for a Syllabus (Admin)
app.post('/api/admin/syllabi/:id/assign', (req, res) => {
    const syllabusId = req.params.id;
    const { reviewerIds } = req.body; // Array of IDs Strings/Numbers

    db.serialize(() => {
        db.all(`SELECT reviewerId, status FROM assignments WHERE syllabusId = ?`, [syllabusId], (err, existing) => {
            if (err) return res.status(500).json({ error: err.message });

            const parsedNewIds = reviewerIds.map(id => parseInt(id, 10));

            // Delete pending assignments that are no longer selected
            const toDelete = existing.filter(e => e.status === 'pending' && !parsedNewIds.includes(e.reviewerId));
            if (toDelete.length > 0) {
                const mapIds = toDelete.map(e => e.reviewerId).join(',');
                db.run(`DELETE FROM assignments WHERE syllabusId = ? AND status = 'pending' AND reviewerId IN (${mapIds})`, [syllabusId]);
            }

            // Insert new ones that don't already exist
            const existingIds = existing.map(e => e.reviewerId);
            const stmt = db.prepare(`INSERT INTO assignments (syllabusId, reviewerId) VALUES (?, ?)`);
            parsedNewIds.forEach(id => {
                if (!existingIds.includes(id)) {
                    stmt.run(syllabusId, id);
                }
            });
            stmt.finalize(() => res.json({ message: 'Assignments updated successfully' }));
        });
    });
});

// 9. Delete Syllabus & Cascade Assignments (Admin)
app.delete('/api/syllabi/:id', (req, res) => {
    const id = req.params.id;
    db.run(`DELETE FROM assignments WHERE syllabusId = ?`, [id], () => {
        db.run(`DELETE FROM syllabi WHERE id = ?`, [id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Syllabus and its assignments deleted' });
        });
    });
});

// 10. Export to CSV (Admin)
const { stringify } = require('csv-stringify/sync');

app.get('/api/admin/export', (req, res) => {
    db.all(`
        SELECT a.id, a.status, a.scores, a.completedAt, 
               s.filename as syllabusName, 
               r.name as reviewerName
        FROM assignments a
        JOIN syllabi s ON a.syllabusId = s.id
        JOIN reviewers r ON a.reviewerId = r.id
        WHERE a.status = 'completed'
        ORDER BY s.filename ASC, r.name ASC
    `, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        if (rows.length === 0) {
            return res.status(404).send('No completed reviews found to export.');
        }

        // 1. Parse all scores and find all unique rubric keys
        const parsedRows = rows.map(row => {
            let scoresData = {};
            try {
                if (row.scores) {
                    scoresData = JSON.parse(row.scores);
                }
            } catch (e) {
                console.error("Failed to parse scores for assignment", row.id, e);
            }
            return {
                ...row,
                parsedScores: scoresData
            };
        });

        const allRubricKeys = new Set();
        parsedRows.forEach(row => {
            Object.keys(row.parsedScores).forEach(key => allRubricKeys.add(key));
        });
        const dynamicHeaders = Array.from(allRubricKeys).sort();

        // 2. Prepare data for CSV
        const csvData = parsedRows.map(row => {
            const rowData = {
                'Syllabus Name': row.syllabusName,
                'Reviewer': row.reviewerName,
                'Status': row.status,
                'Completed At': row.completedAt ? new Date(row.completedAt).toLocaleString() : ''
            };

            // Add dynamic rubric scores
            dynamicHeaders.forEach(key => {
                rowData[key] = row.parsedScores[key] !== undefined ? row.parsedScores[key] : '';
            });

            return rowData;
        });

        // 3. Define headers starting with fixed columns, then dynamic ones
        const columns = [
            'Syllabus Name',
            'Reviewer',
            'Status',
            'Completed At',
            ...dynamicHeaders
        ];

        try {
            const csvString = stringify(csvData, { header: true, columns: columns });

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="reviews_export.csv"');
            res.send(csvString);
        } catch (stringifyErr) {
            res.status(500).json({ error: 'Failed to generate CSV' });
        }
    });
});

app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
