function startScript() {
    //task = JSON.parse(task);
    document.getElementById(`task${taskID}name`).appendChild(document.createTextNode(task.name));
    document.getElementById(`task${taskID}desc`).appendChild(document.createTextNode(task.desc));
    document.getElementById(`task${taskID}time`).appendChild(document.createTextNode('Start: ' + formatDate(task.time, true)));
    document.getElementById(`task${taskID}time2`).appendChild(document.createTextNode('End: ' + formatDate(task.time + task.length, true)));
    document.getElementById(`task${taskID}length`).appendChild(document.createTextNode('Duration: ' + formatLength(task.length)));
    for (var item in task.checklist) {
        var subtask = task.checklist[item];
        var subtaskCompleted = '';
        if (subtask.completed) {
            subtaskCompleted = 'checked';
        }
        var subtaskRender = `
        <div>
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