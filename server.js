// server.js
// This file sets up the Node.js server with Express and defines the API endpoints.

const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const cors = require('cors');

require('dotenv').config();

const app = express();
const port = 3004;

// Middleware
app.use(cors());
// Increase payload size limit for base64 images
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// MySQL Connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL database:', err);
    return;
  }
  console.log('MySQL Connected...');
});

// --- API ROUTES ---

// Helper function for database queries
function dbQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (err, result) => {
            if (err) {
                console.error("Database Query Error:", err);
                return reject(err);
            }
            resolve(result);
        });
    });
}

app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working!' });
});


// GET all data needed for the application on initial load
app.get('/api/data', async (req, res) => {
    try {
        const [workers, projects, finance_entries, leave_requests] = await Promise.all([
            dbQuery('SELECT * FROM workers ORDER BY FullName ASC'),
            dbQuery('SELECT * FROM projects ORDER BY name ASC'),
            dbQuery('SELECT * FROM finance_entries ORDER BY date DESC'),
            dbQuery('SELECT * FROM leave_requests ORDER BY startDate DESC')
        ]);
        res.json({ workers, projects, finance_entries, leave_requests });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch initial data' });
    }
});


// --- WORKERS API ---

// GET all workers
app.get('/api/workers', async (req, res) => {
    try {
        const workers = await dbQuery('SELECT * FROM workers ORDER BY FullName ASC');
        res.json(workers);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch workers' });
    }
});

// ADD a new worker
app.post('/api/workers', async (req, res) => {
    const newWorker = req.body;
    // Set default values for fields that might be null
    for (const key in newWorker) {
        if (newWorker[key] === '') {
            newWorker[key] = null;
        }
    }
    const sql = 'INSERT INTO workers SET ?';
    try {
        const result = await dbQuery(sql, newWorker);
        res.status(201).json({ id: result.insertId, ...newWorker });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'A worker with this assigned number already exists.' });
        }
        res.status(500).json({ error: 'Failed to add worker' });
    }
});

// UPDATE a worker
app.put('/api/workers/:id', async (req, res) => {
    const workerId = req.params.id;
    const updatedWorker = req.body;
    // Remove id from the body to prevent changing it
    delete updatedWorker.id; 
    const sql = 'UPDATE workers SET ? WHERE id = ?';
    try {
        await dbQuery(sql, [updatedWorker, workerId]);
        res.json({ id: workerId, ...updatedWorker });
    } catch (error) {
         if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'A worker with this assigned number already exists.' });
        }
        res.status(500).json({ error: 'Failed to update worker' });
    }
});

// ARCHIVE a worker
app.post('/api/workers/archive/:id', async (req, res) => {
    const workerId = req.params.id;
    const { archiveReason } = req.body;

    try {
        // Start a transaction
        await dbQuery('START TRANSACTION');

        // 1. Get the worker data
        const workers = await dbQuery('SELECT * FROM workers WHERE id = ?', [workerId]);
        if (workers.length === 0) {
            await dbQuery('ROLLBACK');
            return res.status(404).json({ error: 'Worker not found' });
        }
        const worker = workers[0];
        
        // 2. Prepare data for archived_workers table
        const archivedWorkerData = {
            id: worker.id,
            FullName: worker.FullName,
            AssignedNumber: worker.AssignedNumber,
            Trade: worker.Trade,
            archiveReason: archiveReason,
            archivedDate: new Date()
        };

        // 3. Insert into archived_workers
        await dbQuery('INSERT INTO archived_workers SET ?', archivedWorkerData);

        // 4. Delete from workers table
        await dbQuery('DELETE FROM workers WHERE id = ?', [workerId]);

        // Commit the transaction
        await dbQuery('COMMIT');
        
        res.status(200).json({ message: 'Worker archived successfully' });

    } catch (error) {
        await dbQuery('ROLLBACK');
        res.status(500).json({ error: 'Failed to archive worker' });
    }
});

// BATCH update worker assignments
app.post('/api/workers/assign', async (req, res) => {
    const { workerIds, projectId, area } = req.body;
    if (!workerIds || !projectId || !area || !Array.isArray(workerIds) || workerIds.length === 0) {
        return res.status(400).json({ error: 'Invalid data provided for assignment.' });
    }
    const sql = 'UPDATE workers SET projectId = ?, area = ? WHERE id IN (?)';
    try {
        await dbQuery(sql, [projectId, area, workerIds]);
        res.status(200).json({ message: 'Workers assigned successfully.' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to assign workers.' });
    }
});

// BATCH update worker attendance to absent
app.post('/api/workers/absent', async (req, res) => {
    const { workers } = req.body; // Expects an array of {id, reason}
    if (!workers || !Array.isArray(workers) || workers.length === 0) {
        return res.status(400).json({ error: 'Invalid data provided for marking absence.' });
    }

    try {
        await dbQuery('START TRANSACTION');
        for (const worker of workers) {
            const sql = "UPDATE workers SET attendance_status = 'absent', attendance_reason = ? WHERE id = ?";
            await dbQuery(sql, [worker.reason, worker.id]);
        }
        await dbQuery('COMMIT');
        res.status(200).json({ message: 'Workers marked absent successfully.' });
    } catch (error) {
        await dbQuery('ROLLBACK');
        res.status(500).json({ error: 'Failed to mark workers absent.' });
    }
});


// --- PROJECTS API ---

// GET all projects
app.get('/api/projects', async (req, res) => {
    const sql = `
        SELECT p.*, 
               COALESCE(SUM(CASE WHEN f.type = 'received' THEN f.amount ELSE 0 END), 0) as totalFunds,
               COALESCE(SUM(CASE WHEN f.type = 'spent' THEN f.amount ELSE 0 END), 0) as spentFunds
        FROM projects p
        LEFT JOIN finance_entries f ON p.id = f.projectId
        GROUP BY p.id
        ORDER BY p.name ASC
    `;
    try {
        const projects = await dbQuery(sql);
        res.json(projects);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
});

// ADD a new project
app.post('/api/projects', async (req, res) => {
    const newProject = req.body;
    const sql = 'INSERT INTO projects SET ?';
    try {
        await dbQuery(sql, newProject);
        // Fetch the newly created project with fund info
        const result = await dbQuery(`
            SELECT p.*, 0.00 as totalFunds, 0.00 as spentFunds 
            FROM projects p WHERE id = ?`, [newProject.id]
        );
        res.status(201).json(result[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to add project' });
    }
});

// UPDATE a project
app.put('/api/projects/:id', async (req, res) => {
    const projectId = req.params.id;
    const updatedProject = req.body;
    delete updatedProject.id;
    const sql = 'UPDATE projects SET ? WHERE id = ?';
    try {
        await dbQuery(sql, [updatedProject, projectId]);
        res.json({ id: projectId, ...updatedProject });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update project' });
    }
});


// --- FINANCE API ---

// GET all finance entries
app.get('/api/finance', async (req, res) => {
    try {
        const entries = await dbQuery('SELECT * FROM finance_entries ORDER BY date DESC');
        res.json(entries);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch finance entries' });
    }
});

// ADD a new finance entry
app.post('/api/finance', async (req, res) => {
    const newEntry = req.body;
    const sql = 'INSERT INTO finance_entries SET ?';
    try {
        const result = await dbQuery(sql, newEntry);
        res.status(201).json({ id: result.insertId, ...newEntry });
    } catch (error) {
        res.status(500).json({ error: 'Failed to add finance entry' });
    }
});


// --- LEAVE REQUESTS API ---

// GET all leave requests
app.get('/api/leave', async (req, res) => {
    try {
        const requests = await dbQuery('SELECT * FROM leave_requests ORDER BY startDate DESC');
        res.json(requests);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch leave requests' });
    }
});

// ADD a new leave request
app.post('/api/leave', async (req, res) => {
    const newRequest = req.body;
    const sql = 'INSERT INTO leave_requests SET ?';
    try {
        await dbQuery(sql, newRequest);
        res.status(201).json(newRequest);
    } catch (error) {
        res.status(500).json({ error: 'Failed to add leave request' });
    }
});

// UPDATE a leave request status
app.put('/api/leave/:id', async (req, res) => {
    const requestId = req.params.id;
    const { status } = req.body; // Expecting { status: 'Approved' | 'Rejected' }
    if (!['Approved', 'Rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status provided.' });
    }
    const sql = 'UPDATE leave_requests SET status = ? WHERE id = ?';
    try {
        await dbQuery(sql, [status, requestId]);
        res.json({ id: requestId, status });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update leave request' });
    }
});


// --- Server Start ---
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
