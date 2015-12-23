function get(url, cb) {

    var xmlhttp = new XMLHttpRequest();

    xmlhttp.onreadystatechange = function () {
        if (xmlhttp.readyState === 4 && xmlhttp.status === 200)
            cb(JSON.parse(xmlhttp.responseText || '{}'));
    }

    xmlhttp.open('GET', url, true);
    xmlhttp.send();
}

function appendAbout(pane, json) {
    pane.innerHTML = '<p>' + json + '</p>'
}

function appendPresence(pane, json) {
    for(var i = 0; i < json.length; i += 1) {
        pane.innerHTML += '<a href="' + json[i].url + '" alt="' + json[i].path + '" target="_blank"><img src="img/' + json[i].path + '.png" />'
    }
}

function appendSkills(pane, json) {
    for(var i = 0; i < json.length; i += 1) {
        pane.innerHTML += '<span class="skill">' + json[i] + '</span>'
    }
}

(function () {
    var panes = {
        about: document.getElementsByClassName('about')[0],
        presence: document.getElementsByClassName('presence')[0],
        skills: document.getElementsByClassName('skills')[0]
    }

    get('http://localhost:3005/api', function (response) {
        appendAbout(panes.about, response.about);
        appendPresence(panes.presence, response.presence);
        appendSkills(panes.skills, response.skills);
    });

    var tabs = document.getElementsByClassName('tab-label-content');

    for(var i = 0; i < tabs.length; i += 1) {
        tabs[i].addEventListener('keydown', function(e) {

            if(e.keyCode === 13) {
                this.firstElementChild.click()
            }
        });
    }
}());