function startScript() {
    document.querySelector('.bannerClose').addEventListener('click', function() {
        document.querySelector('banner').style.display = 'none';
    });
}

const tutorials = [
    {
        title: `How to Link Calendar App (iOS)`,
        time: 0,
        content: [
            `Visit ExecAssist.io on your iPhone or iPad in Safari (Chrome will not work for this tutorial)`,
            `Sign into your account`,
            `On the dashboard, select your profile photo`,
            `In your settings, select "Sync Task Feed" under "External Calendar Sync"`,
            `You will recieve a prompt to add "ExecAssist.io Tasks" to your calendar. Select "OK".`,
            `On the success alert, select "View Events"`,
            `You should see your ExecAssist.io tasks in your iOS calendar`,
            `Extra (Optional) Steps:`,
            `Go to your device settings`,
            `Search for "Calendar" to edit your calendar app settings. Select the settings for the calendar app with the app icon. Do not select the iCloud settings for your calendar.`,
            `Select "Accounts"`,
            `Select "Fetch New Data"`,
            `Change the frequency to "Every 15 Minutes"`
        ]
    },
    {
        title: `Get Reminders on Fitbit Watch(es) (iOS)`,
        time: 0,
        content: [
            `Notice: Only newer Fitbit trackers and smartwatches can display reminders`,
            `Prerequisite: Complete the tutorial "How to Link Calendar App (iOS)"`,
            `Download the Fitbit app if you haven't already`,
            `Link your Fitbit watch if you haven't already linked it to the app`,
            `Go to your Fitbit account by selecting your profile in the top left`,
            `Select the Fitbit watch you wish to get reminders on`,
            `Select "Apps"`,
            `Select "Agenda"`,
            `Select "Settings"`,
            `Confirm that "Show account" for "ExecAssist.io Tasks" under "SUBSCRIBED CALENDARS" is toggled on`
        ]
    }
];

async function openTutorials() {
    tutorials.sort(function(a, b) {
        return b.time - a.time;
    });
    const list = document.createElement('ul');
    for (var i = 0; i < tutorials.length; i++) {
        var item = document.createElement('li');
        var link = document.createElement('a');
        eval(`link.onclick = function () {
            openTutorial(${i});
        }`);
        link.appendChild(document.createTextNode(tutorials[i].title));
        item.appendChild(link);
        //item.appendChild(document.createTextNode(' - ' + await formatDate(tutorials[i].time, true)))
        list.appendChild(item);
    }
    document.getElementById('tutorialFinderDisplay').appendChild(list);
    document.getElementById('tutorialFinderModal').style.display = 'block';
}

async function openTutorial(id) {
    let content = tutorials[id].content;
    if (typeof content != 'string') {
        let tempContent = '<ul>';
        for (var i = 0; i < content.length; i++) {
            tempContent += `<li>${content[i]}</li>`;
        }
        tempContent += '</ul>';
        content = tempContent;
    }
    document.getElementById('tutorialViewer').innerHTML = `
    <div class="modalContent">
		<div class="modalHeader">
			<span onclick="document.getElementById('tutorialViewer').style.display = 'none'" class="modalClose">&times;</span>
            <br />
			<h2>${tutorials[id].title}</h2>
            <!--<h4>${await formatDate(tutorials[id].time, true)}</h4>-->
            <br />
		</div>
		<div class="modalBody" style="background-color:black">
            <br />
            <br />
            ${content}
            <br />
            <br />
        </div>
    </div>
    `;
    document.getElementById('tutorialViewer').style.display = 'block';
}