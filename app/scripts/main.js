const spiral = require('./spiral');

function partDragStart(e) {
  const dt = e.originalEvent.dataTransfer;
  dt.effectAllowed = 'copy';
  const jqe = $(e.target);
  dt.setData('application/x-need-text', JSON.stringify({
    url: jqe.data('part-url'),
    name: `${jqe.data('part-type')}: ${jqe.text()}`
  }));
}

const parts = [
  {plural: 'inductions', singular: 'induction'},
  {plural: 'bodies', singular: 'body'},
  {plural: 'awakeners', singular: 'awakener'}
];

let dataLoaded = false;
function loadData() {
  if (dataLoaded) {
    return;
  }
  $.getJSON('data.json')
    .then(data => {
      if (dataLoaded) {
        return;
      }
      dataLoaded = true;
      parts.forEach(section => {
        const list = $(`#${section.plural}`);
        for (const item of data[section.plural]) {
          list.append($('<li/>', {
            draggable: true,
            text: item
          })
          .data('part-type', section.singular)
          .data('part-url', `${section.plural}/${item}.txt`)
          .on('dragstart', partDragStart));
        }
      });
      $('#playlist').on('dragover', function(e) {
        const dt = e.originalEvent.dataTransfer;
        if (dt.types.includes('application/x-need-text')) {
          e.preventDefault();
          dt.dropEffect = 'copy';
        }
      }).on('drop', function (e) {
        const dt = e.originalEvent.dataTransfer;
        if (dt.types.includes('application/x-need-text')) {
          e.stopPropagation();
          const item = JSON.parse(dt.getData('application/x-need-text'));
          $('#playlist').append($('<li/>', {
            draggable: true,
            text: item.name
          })
          .data('part-url', item.url));
        }
      });
    });
}

// make sections collapse
parts.forEach(section => {
  const header = $(`#${section.plural}Header`),
        expand = header.find('.expandArrow'),
        list   = $(`#${section.plural}`);
  header.click(e => {
    list.toggleClass('collapse');
    if (list.is('.collapse')) {
      expand.text('▶');
    } else {
      expand.text('▼');
    }
  });
});

function getValueOrPlaceholder(selector) {
  const element = $(selector).get(0);
  return element.value || element.placeholder;
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const element = document.createElement('img');
    element.onload = () => {
      resolve(element);
    };
    element.onerror = () => {
      reject(new Error('Unable to load spiral'));
    };
    element.src = url;
  });
}

function updateHash() {
  $('body').toggleClass('running', false);
  $('body').toggleClass('loading', false);

  if (window.location.hash.startsWith('#run?')) {
    const params = {};
    window.location.hash.substring(5).split('&').map(p => {
      const kv = p.match(/([^=]+)=(.*)/);
      params[kv[1]] = decodeURIComponent(kv[2]);
    });
    const subject      = params.subject,
          trainer      = params.trainer,
          playlist     = JSON.parse(params.playlist),
          names        = {'0': trainer, '1': subject},
          messagePause = parseFloat(params.messagePause),
          textColor    = params.textColor,
          spiralUrl    = params.spiral;
    $('body').toggleClass('running', true);
    $('body').toggleClass('loading', true);
    const playlistPromises = playlist.map(url => $.get(url).then(d => {
      const lines = d.split(/\n/).map(l => l.replace(/\{([01])\}/g, (_, i) => names[i]));
      // remove the trailing blank line
      if (lines.length > 0 && lines[lines.length - 1] === '') {
        lines.splice(lines.length - 1, 1);
      }
      return lines;
    }));
    const textPromise = Promise.all(playlistPromises).then(r => {
      return r.reduce((a, b) => a.concat(b), []);
    });
    const spiralPromise = loadImage(spiralUrl);
    Promise.all([textPromise, spiralPromise]).then(t => {
      const text = t[0];
      const spiralImage = t[1];
      spiral($('#spiral-canvas').get(0), spiralImage);
      $('body').toggleClass('loading', false);
      if (text.length === 0) {
        window.location.hash = '';
        checkHash();
        return;
      }
      let line = 0;
      $('#spiral-text').text(text[line]);
      let timer = setInterval(() => {
        line++;
        if (line >= text.length) {
          window.location.hash = '';
          checkHash();
          clearInterval(timer);
          return;
        }
        $('#spiral-text').text(text[line]);
      }, messagePause * 1000.0);
    });
  } else {
    loadData();
  }
}

$('#startButton').click(e => {
  e.preventDefault();
  window.location.hash = '#run?' +
    `subject=${encodeURIComponent(getValueOrPlaceholder('#subjectName'))}&` +
    `trainer=${encodeURIComponent(getValueOrPlaceholder('#trainerName'))}&` +
    `spiral=${encodeURIComponent(getValueOrPlaceholder('#spiralUrl'))}&` +
    `textColor=${encodeURIComponent($('#textColor').val())}&` +
    `messagePause=${encodeURIComponent($('#messagePause').val())}&` +
    `playlist=${encodeURIComponent(JSON.stringify($('#playlist > li').map((_, i) => $(i).data('part-url')).get()))}`;
  if (!window.HashChangeEvent) {
    updateHash();
  }
});

updateHash();
function checkHash() {
  if (!window.HashChangeEvent) {
    updateHash();
  }
}
if (window.HashChangeEvent) {
  $(window).on('hashchange', updateHash);
}
