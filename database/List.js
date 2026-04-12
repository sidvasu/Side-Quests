// Load the Mongoose library
const mongoose = require('mongoose');

// TextEntrySchema is a specific "to-do" item for a list
const TextEntrySchema = new mongoose.Schema({
    text: String,   // description of the task
    status: Boolean // whether the task is completed (true) or not (false)
});

// ListSchema is a collection of text entries or an entire "to-do" list
const ListSchema = new mongoose.Schema({
    title: String,  // name of the list
    entries: [TextEntrySchema]  // array of TextEntrySchema objects (tasks inside the list)
});

// Export the List model, so it can be used in server.js
module.exports = mongoose.model('List', ListSchema);