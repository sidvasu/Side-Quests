const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
app.use(express.json());
app.use(express.static('public')); // serves your HTML/CSS/JS files

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

// GET /api/lists — return all lists (just id + title, no entries)
app.get('/api/lists', async (req, res) => {
    const all_lists = await lists().find({}, { projection: { title: 1 } }).toArray();
    res.json(all_lists);
});


// GET /api/lists/:id — return one list with all its entries
app.get('/api/lists/:id', async (req, res) => {
    const list = await lists().findOne({ _id: new ObjectId(req.params.id) });
    if (!list) return res.status(404).json({ error: 'List not found' });
    res.json(list);
});


// POST /api/lists — create a new list
app.post('/api/lists', async (req, res) => {
    const new_list = { title: req.body.title, entries: [] };
    const result = await lists().insertOne(new_list);
    res.json({ ...new_list, _id: result.insertedId });
});


// POST /api/lists/:id/entries — add a task to a list
app.post('/api/lists/:id/entries', async (req, res) => {
    const new_entry = {
        _id: new ObjectId(),   // give each task its own unique id
        text: req.body.text,
        status: false
    };
    await lists().updateOne(
        { _id: new ObjectId(req.params.id) },
        { $push: { entries: new_entry } }
    );
    const updated_list = await lists().findOne({ _id: new ObjectId(req.params.id) });
    res.json(updated_list);
});


// PATCH /api/lists/:listId/entries/:entryId — toggle a task's status
app.patch('/api/lists/:listId/entries/:entryId', async (req, res) => {
    await lists().updateOne(
        { _id: new ObjectId(req.params.listId), 'entries._id': new ObjectId(req.params.entryId) },
        { $set: { 'entries.$.status': req.body.status } }
    );
    const updated_list = await lists().findOne({ _id: new ObjectId(req.params.listId) });
    res.json(updated_list);
});


// DELETE /api/lists/:listId/entries/:entryId — remove a task
app.delete('/api/lists/:listId/entries/:entryId', async (req, res) => {
    await lists().updateOne(
        { _id: new ObjectId(req.params.listId) },
        { $pull: { entries: { _id: new ObjectId(req.params.entryId) } } }
    );
    res.json({ message: 'Task deleted' });
});


// DELETE /api/lists/:id — delete an entire list
app.delete('/api/lists/:id', async (req, res) => {
    await lists().deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ message: 'List deleted' });
});