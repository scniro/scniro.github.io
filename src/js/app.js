document.addEventListener('DOMContentLoaded', function () {

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
        tabs[i].firstElementChild.style.border = 0;
    });

    tabs[i].addEventListener('click', function () {
      for (var i = 0; i < tabs.length; i += 1) {
        tabs[i].firstElementChild.style.border = 0;
        tabs[i].setAttribute('aria-selected', 'false');
      }

      this.setAttribute('aria-selected', 'true');
    });

    tabs[i].addEventListener('keyup', function (e) {
      if (e.keyCode === 13 && e.target.classList.contains('tab-label-content'))
        this.firstElementChild.click();

      if (e.keyCode === 9) {
        for (var o = 0; o < tabs.length; o += 1)
          tabs[o].firstElementChild.style.border = 0;

        this.firstElementChild.style.border = e.target.classList.contains('presence-link') ? 0 : 'dotted 1px white';
      }
    });
  }

  window.kyvl.init({
    tenant: 'scniro.github.io',
    pattern: '%%',
    target: document.body,
    override: 'http://localhost:4000' // remove by EOD
  }).then(function(worker) {
    worker.transform();
  });
});