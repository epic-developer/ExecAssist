'use strict';
require('dotenv').config();
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const fs = require('fs');
const firebase = require('firebase-admin');
const ical = require('ical-generator');
const serviceAccount = require("./firebaseKey.json");

firebase.initializeApp({
    credential: firebase.credential.cert(serviceAccount),
    databaseURL: "https://execassist.firebaseio.com"
});

const db = firebase.database();

app.set('trust proxy', true);

const helmet = require('helmet');
app.use(helmet.frameguard());

app.get('/api/calendar/:uid/:iCalPass/ical', async function(request, response) {
    const ical = await iCalCreate(request.params.uid, request.params.iCalPass, request.query.list);
    if (ical[0] == 200) {
        response.setHeader('content-type', 'text/calendar');
        ical[1].serve(response);
    }
    else {
        response.status(ical[0]).send(ical[1]);
    }
});

app.get('/', async function(request, response) {
    response.status(200).send(await getPage('Home'));
});

app.get('/login', async function(request, response) {
    response.status(200).send(await getPage('Login'));
});

app.get('/Privacy-Policy', async function(request, response) {
    response.status(200).send(await getPage('privacy-policy'));
});

app.get('/Terms-of-Service', async function(request, response) {
    response.status(200).send(await getPage('terms-of-use'));
});

app.get('/profile/:uid', async function(request, response) {
    response.status(200).send(await getPage('Profile', true, 'profileRender(param1)', request.params.uid));
});

app.get('/task/:uid/:taskID', async function(request, response) {
    response.status(200).send(await getPage('Task', true, 'taskRender(param1, param2)', request.params.uid, request.params.taskID));
});

app.get('/dashboard', async function(request, response) {
    response.status(200).send(await getPage('Dashboard'));
});

app.get('/contributors', async function(request, response) {
    response.status(200).send(await getPage('Contributors'));
});

app.use(express.static('public'));

app.use((request, response, next) => {
    response.status(404).send(getPage('404'));
});

const pageHeads = {
    'login': `<script src="https://www.gstatic.com/firebasejs/ui/4.8.0/firebase-ui-auth.js"></script><link type="text/css" rel="stylesheet" href="https://www.gstatic.com/firebasejs/ui/4.8.0/firebase-ui-auth.css" />`
};

async function getPage(page, dynamicRender, renderFunc, param1, param2) {
    let title = 'ExecAssist.io';
    if (page != 'Home') {
        title = page + ' - ExecAssist.io';
    }
    page = page.toLowerCase();
    let pageContent;
    if (dynamicRender) {
        pageContent = await eval(renderFunc);
    }
    else {
        pageContent = fs.readFileSync('./public/html/' + page + '.html');
    }
    let bodyAttributes;
    bodyAttributes = ' bgcolor="#030045"';
    /*if (fs.readFileSync('./public/css/' + page + '.css').includes('background-image')) {
        //bodyAttributes = '';
        bodyAttributes = ' bgcolor="#030045"';
    }
    else {
        bodyAttributes = ' bgcolor="#030045"';
    }*/
    let pageHead = '';
    if (pageHeads[page] != null) {
        pageHead = pageHeads[page];
    }
    return `
        <!DOCTYPE html>
        <html>

        <head>
            <title>${title}</title>
            <link rel="icon" type="image/svg" href="/media/brain.svg" />
            <link rel="shortcut icon" type="image/svg" href="/media/brain.svg" />
            <noscript>Please enable JavaScript to continue using ExecAssist.io</noscript>
            <script src="https://www.gstatic.com/firebasejs/8.6.8/firebase-app.js"></script>
            <script src="https://www.gstatic.com/firebasejs/8.6.8/firebase-analytics.js"></script>
            <script src="https://www.gstatic.com/firebasejs/8.6.8/firebase-auth.js"></script>
            <script src="https://www.gstatic.com/firebasejs/8.6.8/firebase-app-check.js"></script>
            <script src="https://www.gstatic.com/firebasejs/8.6.8/firebase-database.js"></script>
            <meta property="og:title" content="ExecAssist.io" />
            <meta property="og:description" content="Executive Dysfunction Assistance App for Autism and ADHD" />
            <meta property="og:image" content="https://www.execassist.io/media/icon.webp" />
            <meta property="og:type" content="website" />
            <meta property="og:url" content="execassist.io" />
            ${pageHead}
            <script>
                firebase.initializeApp({
                    apiKey: "AIzaSyDsAAPD3FVXZtrkhJnX3ZBoFtlpzuZdQXM",
                    authDomain: "execassist-io.firebaseapp.com",
                    databaseURL: "https://execassist.firebaseio.com/",
                    projectId: "execassist-io",
                    storageBucket: "execassist.appspot.com",
                    messagingSenderId: "611057206346",
                    appId: "1:611057206346:web:759764e6f7f5535c6b12b3"
                });
                firebase.analytics();
            </script>
            <!--<script src="/js/jquery.js"></script>
            <script src="/js/socketioSource.js"></script>
            <script src="/js/socketio.js"></script>-->
            <script src="/js/all.js"></script>
            <script src="/js/${page}.js"></script>
            <meta name="theme-color" content="#5100ff" />
            <meta charset="UTF-8" />
            <meta charset="UTF-8"><meta http-equiv="X-UA-Compatible" content="IE=edge">
            <meta name="description" content="Executive dysfunction tool for ADHD and Autism">
            <meta name="apple-mobile-web-app-capable" content="yes">
            <meta name="apple-mobile-web-app-status-bar-style" content="black">
            <meta name="apple-mobile-web-app-title" content="ExecAssist.io">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link rel="manifest" href="/pwa.json">
            <link rel="apple-touch-icon" href="/media/icon.svg">
            <link rel="stylesheet" href="/css/all.css">
            <link rel="stylesheet" href="/css/${page}.css">
            <link href="https://fonts.googleapis.com/css?family=Comfortaa" rel="stylesheet">
            <link href="https://fonts.googleapis.com/css?family=Orbitron" rel="stylesheet">
            <!--<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">-->
            <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
            <!--<script src="https://polyfill.io/v3/polyfill.min.js?version=3.52.1&features=fetch"></script>-->
        </head>

        <body${bodyAttributes}>
            <banner style="display:none">Coming soon... Website/App are not functional yet and are still in development.<span class="bannerClose">x</span></banner>
            ${pageContent}
        </body>

        </html>
    `;
}

server.listen(8080);

//Dynamic render functions:

function profileRender(uid) {
    const errorMSG = `
    <center>
        <h3>An error occured whilst retrieving the profile. Please try again later.</h3>
    </center>
    `;
    const notFoundMSG = `
    <center>
        <h3>This user/profile does not exist</h3>
    </center>
    `;
    return new Promise((resolve, reject) => {
        db.ref(`/users/${uid}/settings`).get().then((user) => {
            if (user.exists()) {
                user = user.toJSON();
                if (user.publicProfile) {
                    db.ref(`/users/${uid}/profile`).get().then((profile) => {
                        if (profile.exists()) {
                            profile = profile.toJSON();
                            if (profile.bio == null) {
                                profile.bio = '<u><b>This user has not created a profile bio yet.</b></u>';
                            }
                            firebase.auth().getUser(uid).then((data) => {
                                data = data.toJSON();
                                resolve(`
                                <div style="text-align:center;vertical-align:middle">
                                    <center>
                                        <img class="profileIMG" src="${data.photoURL.split('=')[0]}"></img>
                                        <br>
                                        <br>
                                        <h2>${data.displayName}</h2>
                                        <br>
                                        <hr style="width:20%" />
                                        <br>
                                        <span>${profile.bio}</span>
                                    </center>
                                </div>
                                `);
                            }).catch((error) => {
                                resolve(notFoundMSG);
                            });
                        }
                        else {
                            resolve(notFoundMSG);
                        }
                    }).catch((error) => {
                        console.error(error);
                        resolve(errorMSG);
                    });
                }
                else {
                    resolve(`
                    <center>
                        <h3>You do not have permission to view this profile</h3>
                        <span>This profile is not published. The owner can publish their profile by enabling "Public Profile" in their settings.</span>
                    </center>
                    `);
                }
            }
            else {
                resolve(notFoundMSG);
            }
        }).catch((error) => {
            console.error(error);
            resolve(errorMSG);
        });
    });
}

function taskRender(uid, taskID) {
    return new Promise((resolve, reject) => {
        db.ref(`/users/${uid}/data/tasks/${taskID}`).get().then((task) => {
            if (task.exists()) {
                task = task.toJSON();
                if (task.shared) {
                    let location = '';
                    if (task.location != '')
                        location = `<span>Location: ${task.location}</span><br>`;
                    resolve(`
                    <center>
                        <div class="card">
                            <img style="width:100%" src="/media/reminder-banners/banner${task.banner}.svg"></img>
                            <br>
                            <img style="float:left;background-color:${task.iconColor};width:15%;border-radius:50%;margin-right:2%" src="/media/reminder-icons/icon${task.iconPhoto}.svg"></img>
                            <h2 id="task${taskID}name" style="font-weight:bold"></h2>
                            <div style="clear:both"></div>
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
                            <div class="checklist" id="checklistForTask${taskID}"></div>
                            ${location}
                            <div style="clear:both"></div>
                        </div>
                    </center>
                    <script>
                        let task = ${JSON.stringify(task)};
                        let taskID = '${taskID}';
                    </script>
                    `);
                }
                else {
                    resolve(`
                    <center>
                        <h3>You do not have permission to view this task</h3>
                        <span>The owner must enable sharing for this task for this link to work.</span>
                    </center>
                    `);
                }
            }
            else {
                resolve(`
                <center>
                    <h3>This task does not exist</h3>
                </center>
                `);
            }
        }).catch((error) => {
            console.error(error);
            resolve(`
            <center>
                <h3>An error occured whilst retrieving the task. Please try again later.</h3>
            </center>
            `);
        });
    });
}

function iCalCreate(uid, passcode, list) {
    const errorCode = [500, `
    <center>
        <h3>An error occured whilst retrieving the calendar</h3>
    </center>
    `];
    const invalidCode = [400, `
    <center>
        <h3>Invalid list. Refused to retrieve calendar with list query parameter provided.</h3>
    </center>
    `];
    const forbiddenCode = [403, `
    <center>
        <h3>Permission denied to access calendar. The iCal passcode (URL parameter) is invalid.</h3>
    </center>
    `];
    return new Promise((resolve, reject) => {
        db.ref(`/users/${uid}/settings/iCalPasscode`).get().then((correctPasscode) => {
            if (correctPasscode.exists()) {
                if (passcode == correctPasscode.val()) {
                    if (!list)
                        list = '';
                    db.ref(`/users/${uid}/data/lists/${list}/items`).get().then((listData) => {
                        db.ref(`/users/${uid}/data/tasks`).get().then((tasks) => {
                            tasks = tasks.toJSON();
                            const cal = ical({
                                domain: 'execassist.io',
                                name: 'ExecAssist.io Tasks',
                                ttl: 300 //Prompt to update/fetch every 5 minutes
                            });
                            let filters = false;
                            if (list && listData.exists()) {
                                filters = [];
                                listData = listData.toJSON();
                                for (var listItem in listData)
                                    filters.push(listData[listItem]);
                            }
                            if (!tasks || tasks.length == 0 || (filters != false && filters.length == 0)) { //iCal will be invalid without events. This adds a placeholder events if there are no tasks.
                                cal.createEvent({
                                    start: new Date(new Date().getTime() - 2592000000), //30 days ago
                                    end: new Date(new Date().getTime() - 2591700000), //5 minutes after start
                                    summary: 'Placeholder Task',
                                    description: 'Just a placeholder event from ExecAssist.io. This task will disappear after you create tasks. This placeholder task is invisible on your ExecAssist.io dashboard. This is necessary because some calendars will stop syncing if there are no events.',
                                    status: 'CANCELLED'
                                });
                            }
                            else {
                                for (var taskID in tasks) {
                                    if (filters != false && !filters.includes(taskID))
                                        continue;
                                    var task = tasks[taskID];
                                    var event = {
                                        start: new Date(task.time),
                                        end: new Date(task.time + task.length),
                                        summary: task.name,
                                        description: task.desc,
                                        url: `https://www.execassist.io/task/${uid}/${taskID}`,
                                        id: taskID,
                                        location: task.location
                                    };
                                    var event = cal.createEvent(event);
                                    event.createAlarm({
                                        type: 'display',
                                        trigger: new Date(task.time - 300000),
                                        description: `Task ${task.name} is starting in 5 minutes...`
                                    });
                                    event.createAlarm({
                                        type: 'display',
                                        trigger: new Date(task.time),
                                        description: `Task ${task.name} has started`
                                    });
                                    event.createAlarm({
                                        type: 'display',
                                        trigger: new Date(task.time + (task.length / 2)),
                                        description: `Halfway through with ${task.name}!`
                                    });
                                    event.createAlarm({
                                        type: 'display',
                                        trigger: new Date(task.time + task.length),
                                        description: `Finished with ${task.name}!`
                                    });
                                }
                            }
                            resolve([200, cal]);
                        });
                    });
                }
                else {
                    resolve(forbiddenCode);
                }
            }
            else {
                resolve(errorCode);
            }
        }).catch((error) => {
            console.error(error);
            resolve(errorCode);
        });
    });
}