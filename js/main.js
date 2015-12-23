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
    for (var i = 0; i < json.length; i += 1) {
        pane.innerHTML += '<a href="' + json[i].url + '" target="_blank" class="presence-link"><img src="img/' + json[i].path + '.png" alt="' + json[i].path + '"/>'
    }
}

function appendSkills(pane, json) {
    for (var i = 0; i < json.length; i += 1) {
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

    var mail = document.getElementsByClassName('mail')[0];

    mail.addEventListener('keyup', function (e) {
        if (e.keyCode === 9)
            this.style.color = '#ffeb3b';
    });

    mail.addEventListener('blur', function () {
        this.style.color = '#525252';
    });

    for (var i = 0; i < tabs.length; i += 1) {

        tabs[i].addEventListener('blur', function () {
            for (var i = 0; i < tabs.length; i += 1)
                tabs[i].firstElementChild.style.border = 0
        });

        tabs[i].addEventListener('click', function () {
            for (var i = 0; i < tabs.length; i += 1) {
                tabs[i].firstElementChild.style.border = 0
                tabs[i].setAttribute('aria-selected', 'false');
            }

            this.setAttribute('aria-selected', 'true')
        });

        tabs[i].addEventListener('keyup', function (e) {
            if (e.keyCode === 13 && e.target.classList.contains('tab-label-content'))
                this.firstElementChild.click();

            if (e.keyCode === 9) {
                for (var o = 0; o < tabs.length; o += 1)
                    tabs[o].firstElementChild.style.border = 0

                this.firstElementChild.style.border = e.target.classList.contains('presence-link') ? 0 : 'dotted 1px white'
            }
        });
    }
}());