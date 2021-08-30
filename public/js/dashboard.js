'use strict';
const iconAmount = 1;
const bannerAmount = 0;
const db = firebase.database();
let myData;
let mainRef;
let myTasks = {};
let myRoutines = {};
let currentPage = 'Dashboard';
let myLists = [];
let myListsIndex = {};

let breadcrumbs = [];

function returnPage() {
    if (breadcrumbs.length <= 1) {
        changePage('Dashboard');
        return;
    }
    breadcrumbs.pop();
    changePage(breadcrumbs[breadcrumbs.length - 1], true);
}

function changePage(page, log) {
    if (!log) {
        breadcrumbs.push(page);
    }
    if (document.getElementById(page) != null) {
        document.getElementById(currentPage).style.display = 'none';
        document.getElementById(page).style.display = 'inline';
        if (page != 'Dashboard') {
            document.getElementById('returnBTN').innerHTML = `<button onclick="returnPage()"><i class="material-icons">&#xe5c4;</i></button>`;
            window.open('#' + page, '_self');
        }
        else {
            window.open('#', '_self');
            document.getElementById('returnBTN').innerHTML = '';
        }
        document.getElementById('pageName').innerHTML = page;
        currentPage = page;
    }
}

//---Settings---

function loadProfile(user) {
    let photoURL = user.photoURL;
    if (user.photoURL.includes('=')) {
        photoURL = user.photoURL.split('=')[0]; //High resolution profile photo
    }
    document.getElementById('profileName').innerHTML = user.displayName;
    document.getElementById('profilePhoto').src = user.photoURL;
    document.getElementById('settings.uid').innerHTML = user.uid;
    db.ref(mainRef + '/profile/bio').get().then((snapshot) => {
        if (snapshot.exists()) {
            document.getElementById('settings.bio').value = snapshot.val();
        }
    }).catch((error) => {
        errorAlert(error);
    });
    document.getElementById('settings.viewProfilePage').onclick = function() {
        window.open(`https://www.execassist.io/profile/${user.uid}`, '_blank');
    };
    db.ref(mainRef + '/settings').get().then((snapshot) => {
        if (snapshot.exists()) {
            snapshot = snapshot.toJSON();
            if (snapshot.publicProfile) {
                document.getElementById('settings.publicProfileToggle').setAttribute('checked', '');
            }
            if (snapshot.iCalPasscode != null) {
                document.getElementById('settings.icalCode').value = snapshot.iCalPasscode;
                document.getElementById('settings.icalURL').innerHTML = `webcal://www.execassist.io/api/calendar/${user.uid}/${snapshot.iCalPasscode}/ical`;
                document.getElementById('settings.webcalBTN').onclick = function() {
                    window.open(`webcal://www.execassist.io/api/calendar/${user.uid}/${snapshot.iCalPasscode}/ical`, '_blank');
                };
            }
        }
    }).catch((error) => {
        errorAlert(error);
    });
}

function saveChanges(values) {
    if (values == 0) {
        if (document.getElementById('settings.bio').value.length > 200) {
            document.getElementById('settings.alert0').innerHTML = 'Profile bio must be less than 200 characters long.';
            return;
        }
        db.ref(mainRef + '/settings/publicProfile').set(document.getElementById('settings.publicProfileToggle').checked).then(() => {
            db.ref(mainRef + '/profile/bio').set(document.getElementById('settings.bio').value).then(() => {
                document.getElementById('settings.alert0').innerHTML = 'Successfully saved changes!';
            }).catch((error) => {
                document.getElementById('settings.alert0').innerHTML = 'An error occured';
                console.error(error);
            });
        }).catch((error) => {
            document.getElementById('settings.alert0').innerHTML = 'An error occured';
            console.error(error);
        });
    }
    else if (values == 1) {
        if (!confirm('Are you sure you want to change your iCal Passcode? This will stop any currently linked calendars from working. You will need to relink calendars with the "Sync Task Feed" button or the iCal URL.')) {
            return;
        }
        if (document.getElementById('settings.icalCode').value.length != 20) {
            document.getElementById('settings.alert1').innerHTML = 'iCal Passcode must be exactly 20 characters long.';
            return;
        }
        db.ref(mainRef + '/settings/iCalPasscode').set(document.getElementById('settings.icalCode').value).then(() => {
            document.getElementById('settings.alert1').innerHTML = 'Successfully saved changes! Refresh the page to get an updated iCal link.';
        }).catch((error) => {
            document.getElementById('settings.alert1').innerHTML = 'An error occured';
            console.error(error);
        });
    }
}

function autofillICScode() {
    document.getElementById('settings.icalCode').value = randICScode();
}

function randICScode() {
    return String(Math.round((Math.pow(36, 20 + 1) - Math.random() * Math.pow(36, 20))).toString(36).slice(1));
}

function deleteAccount() {
    if (confirm('Do you want to delete your ExecAssist.io account? All of your data on ExecAssist.io will be lost and is unrecoverable. You will not be able to reverse this action.')) {
        db.ref(`${mainRef}`).remove().then(() => {
            firebase.auth().currentUser.delete().then(() => {
                alert('Your ExecAssist.io account has been deleted.');
                logout(true);
            }).catch((error) => {
                db.ref(`${mainRef}/deactivate`).set(true);
                alert("We've successfully deleted your account data, but an error occured whilst deleting your user authentication tokens. Login to your account again to finish deleting your account.");
                logout();
                console.error(error);
            });
        }).catch((error) => {
            errorAlert(error);
        });;
    }
}

//---Tasks---

function shareTask(id) {
    const url = `https://www.execassist.io/task/${firebase.auth().currentUser.uid}/${id}`;
    if (myTasks[id].shared == false) {
        if (!confirm('Are you sure you want to share this task? You have not enabled sharing access. Edit this task to enable sharing access.')) {
            return;
        }
    }
    try {
        navigator.share({
            title: `Task on ExecAssist.io: ${myTasks[id].name}`,
            text: `Join ${firebase.auth().currentUser.displayName} on ExecAssist.io`,
            url: url
        });
    }
    catch (err) {
        copyText(url);
    }
}

function toggleComplete(taskID) {
    let state = true;
    if (myTasks[taskID].completed) {
        state = false;
    }
    db.ref(`${mainRef}/data/tasks/${taskID}/completed`).set(state);
}

function deleteTask(taskID) {
    if (new Date(myTasks[taskID].time).getTime() + myTasks[taskID].length > new Date().getTime() || myTasks[taskID].completed == false) {
        if (!confirm('Confirm that you want to delete this task. This action cannot be reversed.')) {
            return;
        }
    }
    for (var i = 0; i < myLists.length; i++) {
        if (myLists[i].items.includes(taskID)) {
            db.ref(`${mainRef}/data/lists/${myLists[i].name}/items/${myLists[i].items.indexOf(taskID)}`).remove().catch((error) => {
                errorAlert(error);
                return;
            });
        }
    }
    db.ref(`${mainRef}/data/tasks/${taskID}`).remove().catch((error) => {
        errorAlert(error);
    });
}

const taskModel = {
    validate: function(attribute, value) {
        const info = taskModel[attribute].properties;
        if (typeof value != info.type) {
            return `be a ${info.type}`;
        }
        if (typeof value == 'string') {
            if (value.includes('<' || '>')) {
                return 'not contain < or >';
            }
        }
        for (var test in info.tests) {
            if (!(eval('value' + info.tests[test]))) {
                let msg = 'be' + info.tests[test].replace('<=', 'at most').replace('>=', 'at least').replace('>', 'more than').replace('<', 'less than');
                if (info.tests[test].includes('.length')) {
                    msg += ' characters long';
                    msg = msg.replace('.length', '');
                }
                return msg;
            }
        }
        if (info.regex != null) {
            if (value.match(info.regex) == false) {
                return 'be correctly formatted';
            }
        }
        return true;
    },
    name: {
        name: 'name',
        properties: {
            type: 'string',
            tests: [
                '.length > 0',
                '.length <= 30'
            ],
            regex: null
        }
    },
    desc: {
        name: 'description',
        properties: {
            type: 'string',
            tests: [
                '.length <= 100'
            ],
            regex: null
        }
    },
    iconPhoto: {
        name: 'icon photo',
        properties: {
            type: 'number',
            tests: [
                ' >= 0'
            ],
            regex: null
        }
    },
    iconColor: {
        name: 'icon background',
        properties: {
            type: 'string',
            tests: [
                '.length == 7'
            ],
            regex: null
        }
    },
    color: {
        name: 'color',
        properties: {
            type: 'string',
            tests: [
                '.length == 7'
            ],
            regex: null
        }
    },
    banner: {
        name: 'banner photo',
        properties: {
            type: 'number',
            tests: [
                ' >= 0'
            ],
            regex: null
        }
    },
    time: {
        name: 'date/time',
        properties: {
            type: 'number',
            tests: [
                ' >= 0'
            ],
            regex: null
        }
    },
    length: {
        name: 'duration',
        properties: {
            type: 'number',
            tests: [
                ' >= 1'
            ],
            regex: null
        }
    },
    location: {
        name: 'location',
        properties: {
            type: 'string',
            tests: [
                '.length <= 60'
            ],
            regex: null
        }
    },
    completed: {
        name: 'completed toggle',
        properties: {
            type: 'boolean',
            tests: [],
            regex: null
        }
    },
    shared: {
        name: 'shared toggle',
        properties: {
            type: 'boolean',
            tests: [],
            regex: null
        }
    }
}

async function changeTask(taskID) {
    if (document.getElementById(`changeTask${taskID}`) != null) {
        let taskChecklist = '';
        const subtasks = document.querySelectorAll(`div[id^='editSubtask${taskID}.']`);
        if (subtasks.length > 0) {
            taskChecklist = {};
        }
        for (var i = 0; i < subtasks.length; i++) {
            var item = (subtasks[i].id).split(`${taskID}.`)[1];
            var completed = false;
            if (myTasks[taskID].checklist[item] != null && myTasks[taskID].checklist[item].completed == true) {
                completed = true;
            }
            taskChecklist[eval('"' + item + '"')] = {
                "iconPhoto": Number(document.getElementById(`editSubtask${taskID}.${item}IconPhoto`).innerHTML),
                "iconColor": document.getElementById(`editSubtask${taskID}.${item}IconColor`).value,
                "name": document.getElementById(`editSubtask${taskID}.${item}Name`).value,
                "completed": completed
            };
        }
        var newData = {
            "name": document.getElementById(`edit${taskID}Name`).value,
            "desc": document.getElementById(`edit${taskID}Desc`).value,
            "iconPhoto": Number(document.getElementById(`edit${taskID}IconPhoto`).innerHTML),
            "iconColor": document.getElementById(`edit${taskID}IconColor`).value,
            "banner": Number(document.getElementById(`edit${taskID}Banner`).innerHTML),
            "time": new Date(document.getElementById(`edit${taskID}Time`).value).getTime(),
            "length": Number(document.getElementById(`edit${taskID}Length`).value) * 60000,
            "checklist": taskChecklist,
            "location": document.getElementById(`edit${taskID}Location`).value,
            "completed": document.getElementById(`edit${taskID}Completed`).checked,
            "shared": document.getElementById(`edit${taskID}Shared`).checked
        };
        for (var attribute in newData) {
            if (attribute == 'checklist') {
                for (var subtaskID in taskChecklist) {
                    for (var attribute2 in taskChecklist[subtaskID]) {
                        var validateResponse = await taskModel.validate(attribute2, taskChecklist[subtaskID][attribute2]);
                        if (validateResponse != true) {
                            alert(`Subtask ${taskModel[attribute2].name} must ${validateResponse}.`);
                            return;
                        }
                    }
                }
            }
            else {
                var validateResponse = await taskModel.validate(attribute, newData[attribute]);
                if (validateResponse != true) {
                    alert(`The task ${taskModel[attribute].name} must ${validateResponse}.`);
                    return;
                }
            }
        }
        for (var i = 0; i < myLists.length; i++) {
            if (document.getElementById(`labelToggle${myLists[i].name}For${taskID}`).checked) {
                if (!myLists[i].items.includes(taskID)) {
                    db.ref(`${mainRef}/data/lists/${myLists[i].name}/items/${myLists[i].items.length}`).set(taskID).catch((error) => {
                        errorAlert(error);
                        return;
                    });
                }
            }
            else {
                db.ref(`${mainRef}/data/lists/${myLists[i].name}/items/${myLists[i].items.indexOf(taskID)}`).remove().catch((error) => {
                    errorAlert(error);
                    return;
                });
            }
        }
        db.ref(`${mainRef}/data/tasks/${taskID}`).set(newData).then(function() {
            renderTask(taskID);
        }).catch((error) => {
            errorAlert(error);
        });
    }
}

async function editTask(taskID) {
    const task = myTasks[taskID];
    let sharingAccess = '';
    if (task.shared) {
        sharingAccess = 'checked';
    }
    document.getElementById(`task${taskID}frame`).innerHTML = `
    <h2>Edit Task</h2>
    <br>
    <span>Name: </span><input type="text" placeholder="Task Name" id="edit${taskID}Name" value="${task.name.replaceAll('"', '&#34;')}" />
    <br>
    <span>Description: </span><input type="text" placeholder="Task Desc" id="edit${taskID}Desc" value="${task.desc.replaceAll('"', '&#34;')}" />
    <br>
    <span>Icon Photo: </span>
    <span>Icon <span id="edit${taskID}IconPhoto">${task.iconPhoto}</span></span>
    <a onclick="openIconPicker('edit${taskID}IconPhoto')"><i class="material-icons">&#xe3c9;</i></a>
    <br>
    <br>
    <span>Icon Background: </span><input type="color" id="edit${taskID}IconColor" value="${task.iconColor}" />
    <br>
    <span>Banner Photo: </span>
    <span>Banner <span id="edit${taskID}Banner">${task.banner}</span></span>
    <a onclick="openBannerPicker('edit${taskID}Banner')"><i class="material-icons">&#xe3c9;</i></a>
    <br>
    <br>
    <span>Date/Time: </span><input type="datetime-local" style="background-color:white;color:black" id="edit${taskID}Time" />
    <br>
    <span>Duration: </span><input type="number" id="edit${taskID}Length" min="1" value="${Math.round(task.length / 60000)}" /><span> Minutes</span>
    <br>
    <!--
    <span>Location (Coordinates): </span><input type="text" id="edit${taskID}Location" placeholder="Lat,Long" value="${task.location}" pattern="/^[-+]?([1-8]?[0-9]([.][0-9]+)?|90([.]0+)?),*[-+]?(180([.]0+)?|((1[0-7][0-9])|([1-9]?[0-9]))([.][0-9]+)?)$/" />
    <button onclick="getLocation('${taskID}')">Autofill with My Location</button>
    <button onclick="window.open('https://www.gps-coordinates.net/','_blank')">Coord Picker (Copy "Lat,Long" and Paste)</button>
    -->
    <span>Location: </span><input type="text" id="edit${taskID}Location" placeholder="Place, address, or coordinates" value="${task.location}" />
    <br>
    <br>
    <span>Sharing Access: </span>
    <label class="switch">
        <input type="checkbox" id="edit${taskID}Shared" class="switch2" ${sharingAccess}>
        <span class="slider round"></span>
    </label>
    <br>
    <h3>Checklist</h3>
    <div class="checklist" id="checklistForTask${taskID}">
        <button onclick="appendSubtask('${taskID}')" id="appendSubtask${taskID}"><i class="material-icons">&#xe39d;</i>&nbsp;Add Subtask</button>
        <button class="redBTN" onclick="detachSubtask('${taskID}')" id="detachSubtask${taskID}"><i class="material-icons">&#xe15c;</i>&nbsp;Remove Subtask</button>
        <br>
        <br>
    </div>
    <br>
    <h3>Labels</h3>
    <br>
    <div id="configLabels"></div>
    <br>
    <button class="greyBTN" style="float:left" onclick="renderTask('${taskID}')">Cancel</button>
    <button style="float:right" id="changeTask${taskID}" onclick="changeTask('${taskID}')">Save</button>
    <div style="clear:both"></div>
    `;
    var taskTime = new Date(task.time);
    taskTime.setMinutes(taskTime.getMinutes() - taskTime.getTimezoneOffset());
    document.getElementById(`edit${taskID}Time`).value = taskTime.toISOString().slice(0, 16);
    for (var item in task.checklist) {
        document.getElementById(`checklistForTask${taskID}`).appendChild(await generateSubtask(taskID, item, task.checklist[item]));
    }
    if (myLists.length === 0) {
        document.getElementById('configLabels').innerHTML = `<span style="color:grey">No lists/labels&nbsp;&nbsp;<a onclick="alert('Go to your account settings and visit the Lists tab to create a new list/label.')"><i class="material-icons">&#xe88f;</i></a></span>`;
    }
    else {
        for (var i = 0; i < myLists.length; i++) {
            var labelOption = document.createElement('div');
            var checkedToggle = '';
            if (myLists[i].items.includes(taskID)) {
                checkedToggle = ' checked';
            }
            labelOption.innerHTML = `
            <label class="container">
                <input type="checkbox" id="labelToggle${myLists[i].name}For${taskID}"${checkedToggle}>
                <span class="checkmark"></span>
            </label>
            <span style="color:${myLists[i].color};vertical-align:middle">${myLists[i].name}</span>
            <div style="clear:both"></div>
            <br>
            `;
            document.getElementById('configLabels').appendChild(labelOption);
        }
    }
}

function collapseTask(taskID) {
    sessionStorage.removeItem(`${taskID}Expanded`);
    renderTask(taskID);
}

async function expandTask(taskID) {
    let task = myTasks[taskID];
    sessionStorage.setItem(`${taskID}Expanded`, true);
    document.getElementById(`task${taskID}cardCollapse`).style.display = 'inline';
    document.getElementById(`task${taskID}cardExpand`).style.display = 'none';
    let sharingAccess = 'Disabled';
    if (task.shared) {
        sharingAccess = 'Enabled';
    }
    let location = '';
    if (task.location != '') {
        location = `<span>&nbsp;Location: ${task.location}</span><br><br><br>`;
    }
    let deleteBTN = '';
    if (!(task.completed == true && task.time + task.length < new Date().getTime())) {
        deleteBTN = `<button style="float:left" class="redBTN" onclick="deleteTask('${taskID}')">Delete</button>`;
    }
    let labels = '';
    for (var i = 0; i < myLists.length; i++) {
        if (myLists[i].items.includes(taskID)) {
            labels += await generateLabel(myLists[i].name, myLists[i].color);
        }
    }
    if (labels == '') {
        labels = await generateLabel('No label(s)', 'grey');
    }
    document.getElementById(`task${taskID}frame`).innerHTML = `
    <img style="width:100%" src="/media/reminder-banners/banner${task.banner}.svg"></img>
    <br>
    <img style="float:left;background-color:${task.iconColor};width:15%;border-radius:50%;margin-right:2%" src="/media/reminder-icons/icon${task.iconPhoto}.svg"></img>
    <a onclick="shareTask('${taskID}')" style="float:right"><i class="material-icons">&#xe80d;</i></a>
    <h2 id="task${taskID}name" style="font-weight:bold"></h2>
    <div style="clear:both"></div>
    <br>
    <div>${labels}</div>
    <br>
    <p id="task${taskID}desc"></p>
    <br>
    <span id="task${taskID}time"></span>
    <br>
    <span id="task${taskID}time2"></span>
    <br>
    <span id="task${taskID}length"></span>
    <br>
    <br>
    <span>Sharing Access: ${sharingAccess}</span>
    <div class="checklist" id="checklistForTask${taskID}"></div>
    ${location}
    ${deleteBTN}
    <button style="float:right" onclick="editTask('${taskID}')">Edit</button>
    <div style="clear:both"></div>
    `;
    //Use textNode to prevent injections
    document.getElementById(`task${taskID}name`).appendChild(document.createTextNode(task.name));
    document.getElementById(`task${taskID}desc`).appendChild(document.createTextNode(task.desc));
    document.getElementById(`task${taskID}time`).appendChild(document.createTextNode('Start: ' + await formatDate(task.time, true)));
    document.getElementById(`task${taskID}time2`).appendChild(document.createTextNode('End: ' + await formatDate(task.time + task.length, true)));
    document.getElementById(`task${taskID}length`).appendChild(document.createTextNode('Duration: ' + await formatLength(task.length)));
    if (Object.keys(task.checklist).length == 0) {
        document.getElementById(`checklistForTask${taskID}`).innerHTML = '<span style="color:grey">No subtasks</span><br><br>'
    }
    else {
        for (var item in task.checklist) {
            var subtask = task.checklist[item];
            var subtaskCompleted = '';
            if (subtask.completed) {
                subtaskCompleted = 'checked';
            }
            var subtaskRender = `
            <div>
                <label class="container" id="toggleCompleteSubtask${taskID}.${item}">
                    <input type="checkbox" onchange="toggleCompleteSubtask('${taskID}', ${item})" ${subtaskCompleted}>
                    <span class="checkmark"></span>
                </label>
                <img style="float:left;background-color:${subtask.iconColor};width:5%;border-radius:50%;margin-right:2%;vertical-align:middle" src="/media/reminder-icons/icon${subtask.iconPhoto}.svg"></img>
                <span style="vertical-align:middle" id="subtaskName${taskID}.${item}"></span>
            </div>
            <div style="clear:both"></div>
            <br>
            <br>
            `;
            document.getElementById(`checklistForTask${taskID}`).innerHTML += subtaskRender;
            document.getElementById(`subtaskName${taskID}.${item}`).appendChild(document.createTextNode(subtask.name));
        }
    }
}

async function renderTask(taskID) {
    try {
        clearInterval(progressChanger);
    }
    catch {

    }
    if (myTasks[taskID] == null) {
        return;
    }
    let task = myTasks[taskID];
    if (task.checklist == '') {
        task.checklist = {};
    }
    let completed = '';
    let completedState = 'Mark as done';
    if (task.completed) {
        completed = 'checked';
        completedState = 'Completed';
    }
    if (document.getElementById(`task${taskID}card`) == null) {
        var card = document.createElement('div');
        card.id = `task${taskID}card`;
        card.className = 'card';
        document.getElementById('Dashboard').appendChild(card);
    }
    let deleteBTN = '';
    if ((task.completed == true && task.time + task.length < new Date().getTime())) {
        deleteBTN = `<button style="float:left" class="redBTN" onclick="deleteTask('${taskID}')">Delete</button>`;
    }
    var now = new Date().getTime();
    let taskCompletionOverview = '';
    if (task.time > now) {
        taskCompletionOverview = `<center><h3 style="color:blue">Upcoming</h3></center>`;
        setTimeout(function() {
            renderTask(taskID);
        }, task.time - now);
    }
    else if ((task.time <= now) && ((task.time + task.length) > now)) {
        var taskOngoing = true;
        taskCompletionOverview = `<center><h3 style="color:lime" id="progressState${taskID}"></h3></center>
            <br>
            <div class="progressBarContainer">
                <div class="progressBar" style="width:0%" id="progressBar${taskID}"></div>
            </div>`;
        setTimeout(function() {
            renderTask(taskID);
        }, (task.time + task.length) - now);
    }
    else if ((task.time + task.length) < now) {
        if (task.completed) {
            taskCompletionOverview = `<center><h3 style="color:white">Completed</h3></center>`;
        }
        else {
            taskCompletionOverview = `<center><h3 style="color:red">Overdue</h3></center>`;
        }
    }
    document.getElementById(`task${taskID}card`).innerHTML = `
        ${taskCompletionOverview}
        <br>
        <div id="task${taskID}frame"></div>
        <br>
        <br>
        <label class="container" id="toggleComplete${taskID}"><span style="vertical-align:middle">${completedState}</span>
            <input type="checkbox" id="edit${taskID}Completed" onchange="toggleComplete('${taskID}')" ${completed}>
            <span class="checkmark"></span>
        </label>
        <div style="clear:both"></div>
        ${deleteBTN}
        <button style="float:right;display:none" id="task${taskID}cardCollapse" onclick="collapseTask('${taskID}')">Summary&nbsp;<i class="material-icons">&#xe316;</i></button>
        <button style="float:right;display:inline" id="task${taskID}cardExpand" onclick="expandTask('${taskID}')">Details&nbsp;<i class="material-icons">&#xe313;</i></button>
        <div style="clear:both"></div>
        `;
    document.getElementById(`task${taskID}frame`).innerHTML = `
        <img style="float:left;background-color:${task.iconColor};width:15%;border-radius:50%;margin-right:2%" src="/media/reminder-icons/icon${task.iconPhoto}.svg" />
        <h2 id="task${taskID}name" style="font-weight:bold"></h2>
        <div style="clear:both"></div>
        <br>
        <span id="task${taskID}time"></span>
        <br>
        <span id="task${taskID}length"></span>
        <br>
        `;
    //Use textNode to prevent injections
    document.getElementById(`task${taskID}name`).appendChild(document.createTextNode(task.name));
    document.getElementById(`task${taskID}name`).title = task.desc;
    document.getElementById(`task${taskID}time`).appendChild(document.createTextNode(await formatDate(task.time)));
    document.getElementById(`task${taskID}length`).appendChild(document.createTextNode('Duration: ' + await formatLength(task.length)));
    if (taskOngoing) {
        let taskVibrateStart;
        let taskVibrateMiddle;
        let taskVibrateEnd;
        const progressChanger = setInterval(function() {
            if (document.getElementById(`progressBar${taskID}`) == null || document.getElementById(`progressState${taskID}`) == null) {
                clearInterval(progressChanger);
                return;
            }
            var now = new Date().getTime();
            const minutesRaw = (task.time + task.length) - now;
            const duration = task.length;
            const progressTimeRaw = Math.abs(minutesRaw - duration);
            let progressTime = (duration - progressTimeRaw);
            if (progressTime >= 60000) {
                progressTime = Math.floor(progressTime / 60000);
                progressTime = String(progressTime) + ' Minute' + getPlural(progressTime);
            }
            else {
                progressTime = Math.round(progressTime / 1000);
                progressTime = String(progressTime) + ' Second' + getPlural(progressTime);
            }
            const progressPercent = ((duration - progressTimeRaw) / duration) * 100;
            if (progressPercent <= 100 && taskVibrateStart == false && vibrationOngoing == false) {
                taskVibrateStart = true;
                taskVibrate(0);
            }
            if (progressPercent <= 50 && taskVibrateMiddle == false && vibrationOngoing == false) {
                taskVibrateMiddle = true;
                taskVibrate(1);
            }
            if (progressPercent <= 0 && taskVibrateEnd == false && vibrationOngoing == false) {
                taskVibrateEnd = true;
                taskVibrate(2);
            }
            document.getElementById(`progressBar${taskID}`).style.width = String(progressPercent) + '%';
            document.getElementById(`progressState${taskID}`).innerHTML = progressTime + ' Remaining';
            if (progressTime <= 0) {
                clearInterval(progressChanger);
                renderTask(taskID);
            }
        }, 200);
    }
    if (sessionStorage.getItem(`${taskID}Expanded`) == 'true') {
        expandTask(taskID);
    }
}

function addTask(task) {
    if (!task) {
        task = {
            "name": "New Task",
            "desc": `Click "Edit" to configure this task.`,
            "iconPhoto": 0,
            "iconColor": "#0000ff",
            "banner": 0,
            "time": new Date().getTime() + 600000,
            "length": 300000,
            "checklist": {
                "0": {
                    "iconPhoto": 0,
                    "iconColor": "#ffffff",
                    "name": "Example Subtask",
                    "completed": false
                }
            },
            "location": "",
            "completed": false,
            "shared": false
        };
    }
    document.getElementById('addTask').blur();
    db.ref(mainRef + '/data/tasks/' + db.ref(mainRef + '/data/tasks').push().key).set(task).catch((error) => {
        errorAlert(error);
    });
}

function initRender(tasks2) {
    document.getElementById('Dashboard').innerHTML = `<button onclick="addTask()" id="addTask"><i class="material-icons">&#xe146;</i>&nbsp;Add Task</button>`;
    let tasks = [];
    for (var taskID in tasks2) {
        tasks.push([taskID, tasks2[taskID]]);
    }
    tasks.sort(function(a, b) {
        return a[1].time - b[1].time;
    });
    for (var i = 0; i < tasks.length; i++) {
        if (!tasks[i][1].checklist) {
            tasks[i][1].checklist = {};
        }
        myTasks[tasks[i][0]] = tasks[i][1];
        renderTask(tasks[i][0]);
    }
}

function loadReminders() {
    db.ref(mainRef + '/data/tasks').get().then((snapshot) => {
        if (snapshot.exists()) {
            const tasksJSON = snapshot.toJSON();
            initRender(tasksJSON);
        }
        else {
            initRender({});
        }
    }).catch((error) => {
        errorAlert(error);
    });
}

function showError(error) {
    switch (error.code) {
        case error.PERMISSION_DENIED:
            alert('User denied the request for Geolocation');
            break;
        case error.POSITION_UNAVAILABLE:
            alert('Location information is unavailable');
            break;
        case error.TIMEOUT:
            alert('The request to get user location timed out');
            break;
        case error.UNKNOWN_ERROR:
            alert('An unknown error occurred');
            break;
    }
}

var taskFillLocation;

function getLocation(id) {
    taskFillLocation = id;
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(autofillPosition, showError);
    }
    else {
        alert('Geolocation is not supported by this browser');
    }
}

function autofillPosition(position) {
    document.getElementById(`edit${taskFillLocation}Location`).value = position.coords.latitude + ',' + position.coords.longitude;
    taskFillLocation = undefined;
}

let vibrationOngoing = false;

function taskVibrate(mode) {
    vibrationOngoing = true;
    switch (mode) {
        case 0:
            navigator.vibrate([200, 100, 200, 300, 200, 100, 200, 300, 600, 200, 600]);
        case 1:
            navigator.vibrate([200, 100, 200, 300, 200, 100, 200, 300, 600, 200, 600]);
        case 2:
            navigator.vibrate([200, 100, 200, 300, 200, 100, 200, 300, 600, 200, 600]);
        default:
            navigator.vibrate([200, 100, 200]); //[vibration duration, interval, vibration duration, etc.]
    }
    vibrationOngoing = false;
}

//---Icon and Banner Libraries---

let pickIcon;

function openIconPickerRender(id) {
    document.getElementById('iconPicker').innerHTML = '';
    for (var i = 0; i <= iconAmount; i++) {
        var borderColor = 'blue';
        if (document.getElementById(id).innerHTML == String(i)) {
            borderColor = 'lime';
        }
        document.getElementById('iconPicker').innerHTML += `<img onclick="pickIcon(${i})" src="/media/reminder-icons/icon${i}.svg" style="cursor:pointer;margin:2%;width:40%;border: 2px solid ${borderColor};border-radius:20%" />`;
    }
}

function openIconPicker(id) {
    document.getElementById('chooseIcon').style.display = 'block';
    pickIcon = function(icon) {
        document.getElementById(id).innerHTML = icon;
        openIconPickerRender(id);
    }
    openIconPickerRender(id);
}

let pickBanner;

function openBannerPickerRender(id) {
    document.getElementById('bannerPicker').innerHTML = '';
    for (var i = 0; i <= bannerAmount; i++) {
        var borderColor = 'blue';
        if (document.getElementById(id).innerHTML == String(i)) {
            borderColor = 'lime';
        }
        document.getElementById('bannerPicker').innerHTML += `<img onclick="pickBanner(${i})" src="/media/reminder-banners/banner${i}.svg" style="cursor:pointer;margin:5%;width:80%;border: 2px solid ${borderColor};border-radius:20px" />`;
    }
}

function openBannerPicker(id) {
    document.getElementById('chooseBanner').style.display = 'block';
    pickBanner = function(banner) {
        document.getElementById(id).innerHTML = banner;
        openBannerPickerRender(id);
    }
    openBannerPickerRender(id);
}

//---Subtasks---

function toggleCompleteSubtask(taskID, subtaskID) {
    let state = true;
    if (myTasks[taskID].checklist[subtaskID].completed) {
        state = false;
    }
    db.ref(`${mainRef}/data/tasks/${taskID}/checklist/${subtaskID}/completed`).set(state);
}

function generateSubtask(taskID, item, subtask) {
    let element = document.createElement('div');
    element.id = `editSubtask${taskID}.${item}`;
    element.innerHTML = `
    <div>
        <input type="text" style="width:30%" placeholder="Name" id="editSubtask${taskID}.${item}Name" value="${subtask.name}">
        <!--<input type="number" style="width:20%" placeholder="Icon Photo ID" min="0" id="editSubtask${taskID}.${item}IconPhoto" value="${subtask.iconPhoto}" />-->
        <span>Icon <span id="editSubtask${taskID}.${item}IconPhoto">${subtask.iconPhoto}</span></span>
        <a onclick="openIconPicker('editSubtask${taskID}.${item}IconPhoto')"><i class="material-icons">&#xe3c9;</i></a>
        <input type="color" style="width:20%" id="editSubtask${taskID}.${item}IconColor" value="${subtask.iconColor}">
        <!--<span style="color:grey;cursor:pointer;" onclick="deleteSubtask('${taskID}', ${item})">x</span>-->
    </div>
    <div style="clear:both"></div>
    `;
    return element;
}

function deleteSubtask(taskID, item) {
    document.getElementById(`editSubtask${taskID}.${item}`).remove();
}

async function detachSubtask(taskID) {
    deleteSubtask(taskID, document.querySelectorAll(`div[id^='editSubtask${taskID}.']`).length - 1);
}

async function appendSubtask(taskID) {
    var item = document.querySelectorAll(`div[id^='editSubtask${taskID}.']`).length;
    var subtask = {
        name: 'New Subtask',
        iconPhoto: 0,
        iconColor: '#ffffff'
    };
    document.getElementById(`checklistForTask${taskID}`).appendChild(await generateSubtask(taskID, item, subtask));
}

//---Routines---

function newRoutine(name, srcList) {
    if (!srcList || srcList.length == 0) {
        alert("You must select a valid list");
        return;
    }
    if (name.length == 0) {
        alert('Routine name cannot be blank');
        return;
    }
    else if (name.length > 30) {
        alert('Routine name cannot be over 30 characters long');
        return;
    }
    else if (name.includes("<") || name.includes(">")) {
        alert('Routine name cannot include < or >');
        return;
    }
    let routinePayload = {
        name: name,
        items: {}
    };
    const routineID = db.ref(mainRef + '/data/routines').push().key;
    db.ref(mainRef + '/data/routines/' + routineID).set(routinePayload).catch((error) => {
        errorAlert(error);
    });
    srcList = myLists[myListsIndex[srcList]].items;
    for (let i = 0; i < srcList.length; i++) {
        var srcTask = myTasks[srcList[i]];
        db.ref(`${mainRef}/data/routines/${routineID}/items/` + db.ref(`${mainRef}/data/routines/${routineID}/items`).push().key).set({
            name: srcTask.name,
            desc: srcTask.desc,
            iconPhoto: srcTask.iconPhoto,
            iconColor: srcTask.iconColor,
            banner: srcTask.banner,
            length: srcTask.length,
            checklist: srcTask.checklist,
            location: srcTask.location
        }).catch((error) => {
            errorAlert(error);
        });
    }
}

function useRoutine(id, time) {
    if (!time) {
        document.getElementById('useRoutineModal').style.display = 'block';
        eval(`document.getElementById('useRoutineSubmit').onclick = function () {
            useRoutine('${id}', document.getElementById('useRoutineTime').value);
        };`);
        return;
    }
    document.getElementById('useRoutineModal').style.display = 'none';
    time = new Date(time).getTime();
    const data = myRoutines[id].items;
    for (var item in data) {
        item = data[item];
        console.log(item);
        if (!item.checklist) {
            item.checklist = {};
        }
        addTask({
            name: item.name,
            desc: item.desc,
            iconPhoto: item.iconPhoto,
            iconColor: item.iconColor,
            banner: item.banner,
            time: time,
            length: item.length,
            checklist: item.checklist,
            location: item.location,
            completed: false,
            shared: false
        });
        time += item.length;
    }
    changePage('Dashboard');
}

function deleteRoutine(id) {
    if (!confirm('Are you sure that you want to delete this routine? Any tasks added to your schedule from this routine will remain unchanged.'))
        return
    db.ref(`${mainRef}/data/routines/${id}`).remove().catch((error) => {
        errorAlert(error);
    });
}

function expandRoutine(id) {
    const data = myRoutines[id];
    document.getElementById(`Routine${id}`).innerHTML = `
    <div>
        <h2>${data.name}</h2>
        <br>
        <h4 id="Routine${id}Duration"></h4>
    </div>
    <br>
    <div>
        <!--<ul id="Routine${id}List"></ul>-->
        <table id="Routine${id}Table">
            <tr>
                <th>Duration</th>
                <th>Title</th>
                <th>Location</th>
                <th>Subtasks</th>
            </tr>
        </table>
    </div>
    <br>
    <div>
        <button style="float:left" onclick="useRoutine('${id}')">Schedule routine</button>
        <button style="float:right" onclick="renderRoutine('${id}')">Less Info</button>
    </div>
    <div style="clear:both"></div>
    <br>
    <button class="redBTN" onclick="deleteRoutine('${id}')">Delete</button>
    `;
    let totalDuration = [0, 0, 0]; //Hours, Minutes, Seconds
    for (var item in data.items) {
        item = data.items[item];
        var tableRow = document.createElement('tr');
        var subtaskCount = 0;
        if (item.checklist)
            subtaskCount = Object.keys(item.checklist).length;
        var duration = [Math.round(item.length / 3600000), Math.round((item.length % 3600000) / 60000), ((item.length % 3600000) % 60000) / 1000]
        var rowItems = [
            `${duration[0]} : ${duration[1]} : ${duration[2]}`,
            item.name,
            item.location,
            subtaskCount];
        for (var i = 0; i < rowItems.length; i++) {
            var tableData = document.createElement('td');
            tableData.innerHTML = rowItems[i];
            tableRow.appendChild(tableData);
        }
        for (var i = 0; i <= 2; i++) {
            totalDuration[i] += duration[i];
        }
        document.getElementById(`Routine${id}Table`).appendChild(tableRow);
    }
    document.getElementById(`Routine${id}Duration`).innerHTML = `Total Duration: ${totalDuration[0]} : ${totalDuration[1]} : ${totalDuration[2]}&nbsp;&nbsp;&nbsp;(Hours : Minutes : Seconds)`;
}

function renderRoutine(id) {
    const data = myRoutines[id];
    if (document.getElementById(`Routine${id}`) == null){
        var card = document.createElement('div');
        card.className = 'card'
        card.id = `Routine${id}`;
        document.getElementById('Routine Container').appendChild(card);
    }
    document.getElementById(`Routine${id}`).innerHTML = `
    <div>
        <h2>${data.name}</h2>
    </div>
    <div>
        <button style="float:left" onclick="useRoutine('${id}')">Schedule routine</button>
        <button style="float:right" onclick="expandRoutine('${id}')">More Info</button>
    </div>
    <div style="clear:both"></div>
    `;
}

//---Lists---

function parseLists(lists) {
    let reloadTasks = [];
    let parsedLists = [];
    for (var name in lists) {
        let parsedItems = [];
        for (var item in lists[name].items) {
            var taskID = lists[name].items[item];
            if (!reloadTasks.includes(taskID)) {
                reloadTasks.push(taskID);
            }
            parsedItems.push(taskID);
        }
        myListsIndex[name] = parsedLists.length;
        parsedLists.push({
            name: name,
            color: lists[name].color,
            items: parsedItems
        });
    }
    myLists = parsedLists;
    initRender(myTasks);
    loadLists();
}

function newList() {
    db.ref(`${mainRef}/data/lists/New List`).set({
        "items": {},
        "color": '#ffffff'
    }).catch((error) => {
        errorAlert(error);
    });
}

async function changeList(list) {
    const newData = {
        name: document.getElementById(`editList${list}Name`).value,
        color: document.getElementById(`editList${list}Color`).value,
        items: myLists[list].items
    };
    var attribute = 'name';
    var validateResponse = await taskModel.validate(attribute, newData[attribute]);
    if (validateResponse != true) {
        alert(`The list ${taskModel[attribute].name} must ${validateResponse}.`);
        return;
    }
    var attribute = 'color';
    var validateResponse = await taskModel.validate(attribute, newData[attribute]);
    if (validateResponse != true) {
        alert(`The list ${taskModel[attribute].name} must ${validateResponse}.`);
        return;
    }
    db.ref(`${mainRef}/data/lists/${myLists[list].name}`).remove().then(function() {
        db.ref(`${mainRef}/data/lists/${newData.name}`).set({
            "items": newData.items,
            "color": newData.color
        }).catch((error) => {
            errorAlert(error);
        });
    }).catch((error) => {
        errorAlert(error);
    });
}

function deleteList(list) {
    db.ref(`${mainRef}/data/lists/${myLists[list].name}`).remove().catch((error) => {
        errorAlert(error);
    });
}

function editList(list) {
    document.getElementById(`listDisplay${list}`).innerHTML = `
    <div>
        <input type="color" style="width:20%" id="editList${list}Color" value="${myLists[list].color}" />
        <span>&nbsp;</span>
        <input type="text" style="width:70%" id="editList${list}Name" value="${myLists[list].name.replaceAll('"', '&#34;')}" />
    </div>
    <div>
        <button class="redBTN" onclick="deleteList(${list})">Delete</button>
        <span>&nbsp;</span>
        <button class="greyBTN" onclick="loadList(${list})">Cancel</button>
        <span>&nbsp;</span>
        <button onclick="changeList(${list})">Save</button>
    </div>
    <div style="clear:both"></div>
    `;
}

function loadList(list) {
    document.getElementById(`listDisplay${list}`).innerHTML = `
    <div style="float:left">
        <h2 style="color:${myLists[list].color}">${myLists[list].name}</h2>
    </div>
    <div style="float:right">
        <button onclick="editList(${list})">Edit</button>
    </div>
    <div style="clear:both"></div>
    `;
}

function loadLists() {
    document.getElementById('routineSrcList').innerHTML = '';
    document.getElementById('Lists').innerHTML = `<button onclick="newList()" id="newList"><i class="material-icons">&#xe145;</i>&nbsp;Create New List</button>`;
    for (let i = 0; i < myLists.length; i++) {
        document.getElementById('routineSrcList').innerHTML += `
        <option value="${myLists[i].name}">${myLists[i].name}</option>
        `;
        document.getElementById('Lists').innerHTML += `
        <div class="card" id="listDisplay${i}"></div>
        `;
        loadList(i);
    }
}

function generateLabel(text, color) {
    return `<span style="border: 2px solid ${color};border-radius:12px;color:${color}">&nbsp;&nbsp;${text}&nbsp;&nbsp;</span>&nbsp;&nbsp;`;
}

//---Initialization---

function startScript() {
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            //firebase.auth().currentUser for data retrieval on user at any later point in code
            mainRef = '/users/' + user.uid;
            const page = window.location.hash.substr(1);
            if (page == '') {
                changePage('Dashboard');
            }
            else {
                changePage(page);
            }
            db.ref(mainRef + '/deactivate').get().then((snapshot) => {
                if (snapshot.exists() && snapshot.val() == true) {
                    db.ref(`${mainRef}`).remove().then(() => {
                        firebase.auth().currentUser.delete().then(() => {
                            alert('Your ExecAssist.io account has been deleted.');
                            logout(true);
                        }).catch((error) => {
                            logout();
                        });
                    }).catch((error) => {
                        logout();
                    });
                    return;
                }
                const tasksJSON = snapshot.toJSON();
                initRender(tasksJSON);
                loadProfile(user);
                loadReminders();
                db.ref(`${mainRef}/data/lists`).on('value', (data) => {
                    parseLists(data.val());
                });
                db.ref(`${mainRef}/data/routines`).orderByChild('name').on('value', (data) => {
                    if (!data.exists()) {
                        document.getElementById('Routine Container').innerHTML = '<span><br>You have not created any routines yet</span>';
                        return;
                    }
                    data = data.val();
                    document.getElementById('Routine Container').innerHTML = '';
                    myRoutines = data;
                    for (var routineID in myRoutines) {
                        renderRoutine(routineID);
                    }
                });
                db.ref(`${mainRef}/data/tasks`).on('child_added', (data) => {
                    myTasks[data.key] = data.val();
                    initRender(myTasks);
                });
                db.ref(`${mainRef}/data/tasks`).on('child_changed', (data) => {
                    myTasks[data.key] = data.val();
                    initRender(myTasks);
                });
                db.ref(`${mainRef}/data/tasks`).on('child_removed', (data) => {
                    document.getElementById(`task${data.key}card`).remove();
                    delete myTasks[data.key];
                    sessionStorage.removeItem(`${data.key}Expanded`);
                });
                document.getElementById('loadingScreen').remove();
                if (sessionStorage.getItem('isNewUser') != null) {
                    startTutorial();
                }
            }).catch((error) => {
                errorAlert(error);
            });
        }
        else {
            logout();
        }
    });
}

function startTutorial() {
    if (sessionStorage.getItem('isNewUser') == 'true') {
        db.ref(mainRef + '/settings').set({
            "iCalPasscode": randICScode(),
            "publicProfile": true
        }).then(() => {
            db.ref(mainRef + '/profile').set({
                "displayName": firebase.auth().currentUser.displayName,
                "photoURL": firebase.auth().currentUser.photoURL
            }).then(() => {
                sessionStorage.setItem('isNewUser', false);
                window.open('/dashboard', '_self');
            }).catch((error) => {
                logout();
                console.error(error);
            });
        }).catch((error) => {
            logout();
            console.error(error);
        });
    }
    else if (sessionStorage.getItem('isNewUser') == 'false') {
        sessionStorage.removeItem('isNewUser');
        //Start tutorial from prompt with skip option
    }
}

function errorAlert(error) {
    document.getElementById('disconnectAlert').style.display = 'block';
    console.error(error);
}