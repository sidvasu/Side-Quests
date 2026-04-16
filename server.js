const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');
const session = require('express-session');
const MongoStore = require('connect-mongo').default;

const app = express();
app.use(express.json());
app.use(express.static('public')); // serves your HTML/CSS/JS files

// --- Sessions ---
app.use(session({
    secret: 'change-this-to-a-random-string',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: 'mongodb://localhost:27017/sidequests' }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 }  // 1 day
}));

// --- Connect to MongoDB ---
const MONGO_URL = 'mongodb://localhost:27017';
const DB_NAME = 'sidequests';
let db;

MongoClient.connect(MONGO_URL)
    .then(client => {
        db = client.db(DB_NAME);
        console.log('Connected to MongoDB');
        app.listen(3000, () => console.log('Server running at http://localhost:3000'));
    })
    .catch(err => console.error('MongoDB connection failed:', err));


// --- Helper: get the lists collection ---
function lists() {
    return db.collection('lists');
}

function users() { 
    return db.collection('users'); 
}

// --- Middleware: block logged-out users from the API ---
function requireLogin(req, res, next) {
    if (!req.session.user_id) {
        return res.status(401).json({ error: 'Not logged in' });
    }
    next();
}

// --- Auth routes ---

// POST /api/register
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;

    const existing = await users().findOne({ username });
    if (existing) return res.status(400).json({ error: 'Username already taken' });

    const hashed = await bcrypt.hash(password, 10);
    const result = await users().insertOne({ username, password: hashed });

    req.session.user_id = result.insertedId;
    res.json({ message: 'Registered successfully' });
});

// POST /api/login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    const user = await users().findOne({ username });
    if (!user) return res.status(400).json({ error: 'Invalid username or password' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: 'Invalid username or password' });

    req.session.user_id = user._id;
    res.json({ message: 'Logged in successfully' });
});

// POST /api/logout
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ message: 'Logged out' });
});


// --- List routes (all protected) ---

app.get('/api/lists', requireLogin, async (req, res) => {
    const all_lists = await lists()
        .find({ user_id: req.session.user_id }, { projection: { title: 1 } })
        .toArray();
    res.json(all_lists);
});

app.get('/api/lists/:id', requireLogin, async (req, res) => {
    const list = await lists().findOne({
        _id: new ObjectId(req.params.id),
        user_id: req.session.user_id       // ensures users can't access each other's lists
    });
    if (!list) return res.status(404).json({ error: 'List not found' });
    res.json(list);
});

app.post('/api/lists', requireLogin, async (req, res) => {
    const new_list = {
        title: req.body.title,
        entries: [],
        user_id: req.session.user_id       // attach the list to the logged-in user
    };
    const result = await lists().insertOne(new_list);
    res.json({ ...new_list, _id: result.insertedId });
});

app.post('/api/lists/:id/entries', requireLogin, async (req, res) => {
    const new_entry = { _id: new ObjectId(), text: req.body.text, status: false };
    await lists().updateOne(
        { _id: new ObjectId(req.params.id), user_id: req.session.user_id },
        { $push: { entries: new_entry } }
    );
    const updated_list = await lists().findOne({ _id: new ObjectId(req.params.id) });
    res.json(updated_list);
});

app.patch('/api/lists/:listId/entries/:entryId', requireLogin, async (req, res) => {
    await lists().updateOne(
        { _id: new ObjectId(req.params.listId), user_id: req.session.user_id, 'entries._id': new ObjectId(req.params.entryId) },
        { $set: { 'entries.$.status': req.body.status } }
    );
    const updated_list = await lists().findOne({ _id: new ObjectId(req.params.listId) });
    res.json(updated_list);
});

app.delete('/api/lists/:listId/entries/:entryId', requireLogin, async (req, res) => {
    await lists().updateOne(
        { _id: new ObjectId(req.params.listId), user_id: req.session.user_id },
        { $pull: { entries: { _id: new ObjectId(req.params.entryId) } } }
    );
    res.json({ message: 'Task deleted' });
});

app.delete('/api/lists/:id', requireLogin, async (req, res) => {
    await lists().deleteOne({ _id: new ObjectId(req.params.id), user_id: req.session.user_id });
    res.json({ message: 'List deleted' });
});