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

let data = null;
function loadData() {
  if (data) {
    return Promise.resolve(data);
  }
  return $.getJSON('data.json')
    .then(d => {
      if (data != null) {
        return;
      }
      data = d;

      $('#themes').append(Object.keys(data.themes).map(t => $('<option/>', {value: t, text: t})));
      const selectedTheme = $('#themes').val();
      $('#image-preview > .carousel-inner').append(data.themes[selectedTheme].map(i => $('<div/>', {class: 'item'}).append($('<img/>', {src: `themes/${encodeURIComponent(selectedTheme)}/${encodeURIComponent(i)}`}))));
      $('#image-preview > .carousel-inner > .item').first().toggleClass('active');

      $('#spirals').append(data.spirals.map(t => $('<option/>', {value: `spirals/${t}`, text: t.replace(/\.[^\.]+$/, '')})));
      $('#spiralUrl').val($('#spirals').val());

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
        //firefox hack: https://bugzilla.mozilla.org/show_bug.cgi?id=1298243
        console.log(dt.types.prototype);
        var func = dt.types.includes || dt.types.contains;
        if (func.call(dt.types, 'application/x-need-text')) {
          e.preventDefault();
          dt.dropEffect = 'copy';
        }
      }).on('drop', function (e) {
        const dt = e.originalEvent.dataTransfer;
        //firefox hack: https://bugzilla.mozilla.org/show_bug.cgi?id=1298243
        var func = dt.types.includes || dt.types.contains;
        if (func.call(dt.types, 'application/x-need-text')) {
          e.stopPropagation();
          const item = JSON.parse(dt.getData('application/x-need-text'));
          $('#playlist').append($('<li/>', {
            draggable: true,
            text: item.name
          })
          .data('part-url', item.url));
        }
      });
      return data;
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
    element.crossOrigin = 'Anonymous';
    element.src = url;
  });
}

let stop = () => {};
let stopSpiralPreview = () => {};

function updateHash() {
  stop();
  stop = () => {};
  stopSpiralPreview = () => {};

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
          spiralUrl    = params.spiral,
          themeName    = params.theme;
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
    const themePromise = loadData().then(() => {
      return data.themes[themeName].map(i => `themes/${encodeURIComponent(themeName)}/${encodeURIComponent(i)}`);
    });
    let aborted = false;
    stop = () => {
      aborted = true;
    };
    Promise.all([textPromise, spiralPromise, themePromise]).then(t => {
      if (aborted) {
        return;
      }
      const text = t[0];
      const spiralImage = t[1];
      const theme = t[2];

      const spiralTimer = spiral($('#spiral-canvas').get(0), spiralImage);
      stop = () => {
        spiralTimer.stop();
      };

      $('body').toggleClass('loading', false);
      if (text.length === 0) {
        window.location.hash = '';
        checkHash();
        return;
      }

      let currentImage = Math.trunc(Math.random(theme.length));
      $('#image').attr({src: theme[currentImage]});
      const imageTimer = setInterval(() => {
        let nextRand = Math.trunc(Math.random(theme.length - 1));
        if (nextRand >= currentImage) {
          nextRand++;
        }
        currentImage = nextRand;
        $('#image').attr({src: theme[currentImage]});
      }, 5000.0);

      let line = 0;
      $('#spiral-text').css('color', textColor).text(text[line]);
      const lineTimer = setInterval(() => {
        line++;
        if (line >= text.length) {
          window.location.hash = '';
          checkHash();
          return;
        }
        $('#spiral-text').text(text[line]);
      }, messagePause * 1000.0);
      stop = () => {
        spiralTimer.stop();
        clearInterval(imageTimer);
        clearInterval(lineTimer);
      };
    });
  } else {
    loadData().then(() => {
      stop = () => {
        stopSpiralPreview();
      };
      startSpiralPreview();
    });
  }
}

function startSpiralPreview() {
  const spiralPromise = loadImage(getValueOrPlaceholder('#spiralUrl'));
  let aborted = false;
  stopSpiralPreview = () => { aborted = true; };
  spiralPromise.then(spiralImage => {
    if (aborted) {
      return;
    }
    const spiralTimer = spiral($('#spiral-preview canvas').get(0), spiralImage);
    stopSpiralPreview = () => {
      spiralTimer.stop();
    };
  });
}

$('#spiralUpdate').click(e => {
  e.preventDefault();
  stopSpiralPreview();
  startSpiralPreview();
});

$('#spirals').change(e => {
  stopSpiralPreview();
  $('#spiralUrl').val($('#spirals').val());
  startSpiralPreview();
});

$('#startButton').click(e => {
  e.preventDefault();
  window.location.hash = '#run?' +
    `subject=${encodeURIComponent(getValueOrPlaceholder('#subjectName'))}&` +
    `trainer=${encodeURIComponent(getValueOrPlaceholder('#trainerName'))}&` +
    `spiral=${encodeURIComponent(getValueOrPlaceholder('#spiralUrl'))}&` +
    `textColor=${encodeURIComponent($('#textColor').val())}&` +
    `messagePause=${encodeURIComponent($('#messagePause').val())}&` +
    `theme=${encodeURIComponent($('#themes').val())}&` +
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
