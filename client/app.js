// current_task_id: id of the currently selected task
let current_task_id = null;


// References to HTML elements
// Left panel: list of quests
const list_of_quests = document.getElementById('lists');
// Right panel: tasks inside the selected quest
const tasks_inside_quest = document.getElementById('tasks');
// Title above the tasks panel
const current_list_title = document.getElementById('current-list-title');
// Delete quest button
const delete_list_button = document.getElementById('delete-list-button');


// Helper function to call the backend API
// Parameters - path: URL; options: method, body
async function api(path, options) {
    // If there was no method or body, create an empty object
    if (options === undefined) {
        options = {};
    }

    // Sent the request to the server and wait for the response
    const server_response = await fetch(path, {
        headers: { "Content-Type": "application/json" },
        method: options.method,
        body: options.body
    });

    // Convert the server response's JSON into a JavaScript object
    return server_response.json();
}


// loadLists() loads all lists from the backend and displays them on the left panel
async function loadListsFromServer() {
    // Get all lists from server and clear old content
    const lists_from_server = await api('/api/lists');  
    list_of_quests.innerHTML = '';

    // Loop through each list and create a clickable <li>
    for (let i = 0; i < lists_from_server.length; ++i) {
        const list = lists_from_server[i];

        const li = document.createElement('li');
        li.textContent = list.title;

        // When clicked, load that list's tasks
        li.onclick = function () {
            clickTask(list._id, list.title);
        };

        list_of_quests.appendChild(li);
    }
}


// clickTask() is called when the user clicks a task
async function clickTask(id, title) {
    // Show the quest title & show delete button and task form
    current_task_id = id;
    current_list_title.textContent = title;
    delete_list_button.style.display = 'inline-block';
    document.getElementById('new-task-form').style.display = 'block';

    // Load tasks for the quest
    loadTasks();
}


// loadTasks() load all tasks for the selected quest and displays them
async function loadTasks() {
    // Get all lists from server and clear old content
    const lists_from_server = await api('/api/lists/' + current_task_id);
    tasks_inside_quest.innerHTML = '';

    // Loop through each task in the list
    for (let i = 0; i < lists_from_server.entries.length; ++i) {
        const task = lists_from_server.entries[i];

        const li = document.createElement('li');

        // Task text
        const task_text = document.createElement('span');
        task_text.textContent = task.text;

        // If completed, apply .completed CSS class 
        if (task.status === true) {
            task_text.classList.add('completed');
        }

        // Checkbox to toggle completion
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = task.status;

        checkbox.onchange = function () {
            toggleTask(task._id, checkbox.checked);
        };

        // Delete button for task
        const delete_button = document.createElement('button');
        delete_button.textContent = '🗑️';

        delete_button.onclick = function () {
            deleteTask(task._id);
        };

        // Add elements to the <li>
        li.appendChild(checkbox);
        li.appendChild(task_text);
        li.appendChild(delete_button);

        tasks_inside_quest.appendChild(li);
    }
}

// Create a new task in the database when the user submits the "New Quest" form
document.getElementById('new-list-form').onsubmit = async function (event) {
    // Stop the form from refreshing the page
    event.preventDefault();

    // Find the input box 
    const input_box = document.getElementById('new-list-title');

    // Get the text the user typed
    const user_typed_title = input_box.value;

    // Prepare the data to send to the server
    const data_to_send = { text : user_typed_title };

    // Convert the data into JSON text
    const json_body = JSON.stringify(data_to_send);

    // Send the POST request
    await api('/api/lists/', {
        method: 'POST',
        body: json_body
    });

    // Clear the input box
    input_box.value = '';

    // Reload the quests, so the new quest appears
    loadListsFromServer();
}


// Add a new task to the currently selected quest when the user submits the "New Task" form
document.getElementById('new-task-form').onsubmit = async function (event) {
    // Stop the browser from refreshing the page
    event.preventDefault();

    // Find the input box where the user typed the task
    const task_input_box = document.getElementById('new-task-text');

    // Get the text the user typed
    const user_typed_task = task_input_box.value;

    // Prepare the data to send to the server
    const data_to_send = { text : user_typed_task };

    // Convert the data into JSON text
    const json_body = JSON.stringify(data_to_send);

    // Send the POST request to add the task to the selected quest
    await api('/api/lists/' + current_task_id + '/entries', {
        method: 'POST',
        body: json_body
    });

    // Clear the input box
    task_input_box.value = '';

    // Reload the tasks, so the new task appears
    loadTasks();
}


// toggleTask() updates a task's completion status
async function toggleTask(task_id, new_status) {
    // Prepare the status data to send to the server
    const status_data = { status: new_status };

    // Convert the data into JSON text
    const json_body = JSON.stringify(status_data);

    // Send a PATCH request to update the task
    await api('/api/lists/' + current_task_id + '/entries/' + task_id, {
        method: 'PATCH',
        body: json_body
    });

    // Reload the tasks, so the UI updates
    loadTasks();
}


// deleteTask() deletes a task from the selected quest
async function deleteTask(task_id) {
    // Send a DELETE request to remove the task
    await api('/api/lists/' + current_task_id + '/entries/' + task_id, {
        method: 'DELETE'
    });

    // Reload the tasks, so the deleted task disappears
    loadTasks();
}


// Delete the entire quest
delete_list_button.onclick = async function () {
    // Send a DELETE request to remove the whole quest
    await api('/api/lists/' + current_task_id, {
        method: 'DELETE'
    });

    // Reset the UI because no quest is selected anymore
    current_task_id = null;
    current_list_title.textContent = 'Select a Quest';
    tasks_inside_quest.innerHTML = '';
    delete_list_button.style.display = 'none';
    document.getElementById('new-task-form').style.display = 'none';

    // Reload the list of quests on the left panel
    loadListsFromServer();
};


// Load all quests when the page first opens
loadListsFromServer();