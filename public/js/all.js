function logout(option) {
    sessionStorage.clear();
    localStorage.clear();
    firebase.auth().signOut();
    if (option) {
        window.open('/', '_top');
    }
    else {
        window.open('/login', '_self');
    }
}

window.onload = function() {
    try {
        const appCheck = firebase.appCheck();
        appCheck.activate('6LdW5EMbAAAAAPToCEmg0B213HTURXpInnhvFV8Q');
        startScript();
    }
    catch {

    }
}

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const periods = ['AM', 'PM'];

function formatTime(time) {
    const rawDate = new Date(time);
    var minutes = rawDate.getMinutes();
    var hours = rawDate.getHours();
    if (minutes < 10) {
        minutes = '0' + String(minutes);
    }
    else {
        minutes = String(minutes);
    }
    if (hours > 12) {
        hours -= 12;
    }
    else if (hours == 0) {
        hours = 12;
    }
    return `${hours}:${minutes} ${periods[Math.floor(rawDate.getHours() / 12)]}`;
}

function formatDate(time, extra) {
    const rawDate = new Date(time);
    let yearSection = '';
    let timeSection = '';
    if (extra) {
        timeSection = `${formatTime(time)}, `;
        yearSection = `, ${rawDate.getFullYear()}`;
    }
    else if (rawDate.getFullYear() != new Date().getFullYear()) {
        yearSection = `, ${rawDate.getFullYear()}`;
    }
    else {
        timeSection = `${formatTime(time)}, `;
    }
    return `${timeSection}${weekDays[rawDate.getDay()]}, ${months[rawDate.getMonth()]} ${rawDate.getDate()}${yearSection}`;
}

function getPlural(num) {
    if (num > 1 || num == 0) {
        return 's';
    }
    else {
        return '';
    }
}

function formatLength(length) {
    let minutes = Math.round(length / 60000);
    const hours = Math.floor(minutes / 60);
    minutes -= (hours * 60);
    let hoursFormatted;
    let minutesFormatted;
    let divider = '';
    if (hours == 0) {
        hoursFormatted = '';
    }
    else {
        hoursFormatted = `${hours} Hour${getPlural(hours)}`;
    }
    if (minutes == 0) {
        minutesFormatted = '';
    }
    else {
        minutesFormatted = `${minutes} Minute${getPlural(minutes)}`;
    }
    if (hours > 0 && minutes > 0) {
        divider = ', and '
    }
    return hoursFormatted + divider + minutesFormatted;
}

function copyText(txt) {
    var m = document;
    txt = m.createTextNode(txt);
    var w = window;
    var b = m.body;
    b.appendChild(txt);
    if (b.createTextRange) {
        var d = b.createTextRange();
        d.moveToElementText(txt);
        d.select();
        m.execCommand('copy');
    }
    else {
        var d = m.createRange();
        var g = w.getSelection;
        d.selectNodeContents(txt);
        g().removeAllRanges();
        g().addRange(d);
        m.execCommand('copy');
        g().removeAllRanges();
    }
    txt.remove();
}

function sortByKey(array, key) {
    return array.sort(function(a, b) {
        var x = a[key]; var y = b[key];
        return ((x < y) ? 1 : ((x > y) ? -1 : 0));
    });
}