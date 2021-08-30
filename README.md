# [ExecAssist.io](https://www.execAssist.io)
## Open Source Executive Dysfunction Assistance App for Autism and ADHD
### Submit bugs and suggestions to the [Issues Section](https://github.com/epic-developer/ExecAssist/issues). Anyone can post to this page.
### [Login / Sign Up](https://www.execAssist.io/login) today to join and connect with a growing community of users
## Adding Icons and/or Banners:
#### Rather than commiting directly to this repository, you can submit icons/banners via [this form](https://forms.gle/cwsXMePCYzVArDA77).
## [Developers] Quickstart Guide on Contributing:
#### ExecAssist is a [Progressive Web App](https://web.dev/progressive-web-apps/) or *PWA*
### ExecAssist Technologies:
* Node.js
* Express
* DNS: Google Domains
* Hosting: [Repl.it](https://replit.com/)
* Firebase ([Authentication](https://firebase.google.com/docs/auth), [Realtime Database](https://firebase.google.com/docs/database))
### Prerequisite Knowledge
* Tasks are synced to the user's device(s) in realtime. This is accomplished with the use of event listeners on the Firebase Realtime Database. The UI is generated and updated in realtime based on the JSON in the database.
* Lists are essentially just color-coded and named labels. Multiple labels (or "lists") can be assigned to a task. ("Lists" and "Labels" are used interchangeably)
* Routines are sets of tasks that can be appended to any part of the user's schedule.
### User Notification Process
iOS does not support PWAs due to the absence of support for service workers. 
This restricts us from notifying our iOS users which is the most important feature of a reminder app. 
To get around this restriction, users are able to link calendar apps with the use of iCal files.
ExecAssist.io notifies users through other calendar apps.
This is conducted via the webcal protocol and iCal files (.ics file extension) which users can import into most modern calendar apps by pasting a URL.
The iCal file url looks similar to *webcal://www.execassist.io/api/calendar/${userID}/${iCalSecurityCode}/ical?list=${listname}*.
Omitting the "list" url query parameter in the request will return an iCal file that includes all tasks rather than just a particular list.
Requests to a URL like the example above will return an iCal file that is dynamically generated using the JSON task data from the Firebase Realtime Database.
The calendar app will GET this URL at any interval decided by the user or the app. The frequency of this update can range from 5 minutes to 24 hours.
### Local Firebase Emulation
#### If you would like to test database functionality in a development environment, learn more about [Firebase Local Emulator Suite](https://firebase.google.com/docs/emulator-suite)
#### Contact me if you would like an updated rules.json file for local emulation: [david@execassist.io](mailto:david@execassist.io)