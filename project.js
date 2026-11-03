(() => {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const main = $('#film-content');
  const stage = $('#project-stage');
  const player = $('#project-player');
  const poster = $('#project-poster');
  const playButton = $('#project-play');
  const stopButton = $('#project-stop');
  const status = $('#project-player-status');
  const dialog = $('#still-dialog');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let P;
  let project;
  let stills = [];
  let frameIndex = 0;
  let frameTrigger = null;
  let playing = false;
  let motionFrame = 0;
  let revealObserver;

  const text = (value) => typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
  const number = (value) => String(value).padStart(2, '0');

  function setStatus(message = '') {
    status.textContent = message;
  }

  function safeResource(value) {
    if (!text(value)) return null;
    const resource = P.asset(text(value));
    if (!resource) return null;
    try {
      const url = new URL(resource, location.href);
      return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
    } catch (_) {
      return null;
    }
  }

  function filmSource() {
    const resolve = P.mediaVideo || window.PortfolioMedia?.videoSource;
    return typeof resolve === 'function' ? resolve(project.videoUrl) : { type: text(project.videoUrl) ? 'unknown' : 'placeholder' };
  }

  function stopFilm(message = '', focus = true) {
    player.querySelectorAll('video').forEach((video) => video.pause());
    player.replaceChildren();
    player.hidden = true;
    poster.hidden = false;
    stopButton.hidden = true;
    playing = false;
    stage.classList.remove('is-playing');
    playButton.disabled = false;
    setStatus(message);
    if (focus && !playButton.hidden) playButton.focus();
    updateMotion();
  }

  function playFilm() {
    if (playing) return;
    playButton.disabled = true;
    player.replaceChildren();
    let mounted = false;
    try {
      mounted = P.mountVideo(player, project.videoUrl, project.image, { autoplay: true, muted: false, loop: false, controls: true, title: text(project.title) + ' — film player' });
    } catch (_) {
      mounted = false;
    }
    if (!mounted) {
      stopFilm('This film could not be loaded. Please try again later.');
      return;
    }
    player.hidden = false;
    poster.hidden = true;
    stopButton.hidden = false;
    playing = true;
    stage.classList.add('is-playing');
    const video = player.querySelector('video');
    if (video) {
      video.addEventListener('error', () => { if (player.contains(video)) stopFilm('This film could not be loaded. Please try again later.'); }, { once: true });
      video.addEventListener('ended', () => { if (player.contains(video)) setStatus('Film finished. Replay using the player, or stop to return to the frame.'); });
    }
    stopButton.focus({ preventScroll: true });
    setStatus('Film player loaded.');
  }

  function renderHero() {
    const cover = $('#project-cover');
    const fallback = cover.querySelector('.project-cover-fallback');
    if (text(project.image)) {
      P.image(cover, project.image, text(project.imageAlt), false);
      const img = cover.querySelector('img');
      if (img) img.addEventListener('error', () => { fallback.hidden = false; }, { once: true });
      else fallback.hidden = false;
    } else fallback.hidden = false;
    const source = filmSource();
    if (['iframe', 'video', 'unknown'].includes(source.type)) {
      playButton.hidden = false;
      playButton.setAttribute('aria-label', 'Play ' + text(project.title));
      playButton.addEventListener('click', playFilm);
      $('#project-stage-caption').textContent = ['Watch film', text(project.duration)].filter(Boolean).join(' / ');
    } else if (source.type === 'external' && safeResource(project.videoUrl)) {
      const link = P.node('a', 'project-play');
      link.href = safeResource(project.videoUrl);
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.setAttribute('aria-label', 'Watch ' + text(project.title));
      const icon = P.node('span', 'project-play-circle', '↗');
      icon.setAttribute('aria-hidden', 'true');
      link.append(icon, P.node('span', '', 'Watch film'));
      poster.append(link);
      $('#project-stage-caption').textContent = 'Film link';
    } else {
      $('#project-stage-caption').textContent = 'Selected frame';
    }
  }

  function factList(target, entries) {
    entries.forEach(([label, value]) => {
      const row = P.node('div');
      row.append(P.node('dt', '', label), P.node('dd', '', value));
      target.append(row);
    });
  }

  function renderInformation() {
    const description = text(project.description);
    $('#project-description').textContent = description;
    $('#project-synopsis').hidden = !description;
    const credits = Array.isArray(project.credits) ? project.credits.filter((credit) => credit && text(credit.role) && text(credit.name)).map((credit) => [text(credit.role), text(credit.name)]) : [];
    if (text(project.director) && !credits.some(([role]) => role.toLowerCase() === 'director')) credits.unshift(['Director', text(project.director)]);
    if (credits.length) {
      factList($('#project-credits'), credits);
      $('#project-credits-section').hidden = false;
    }
    const equipment = Array.isArray(project.equipment) ? project.equipment.filter((item) => item && text(item.label) && text(item.value)).map((item) => [text(item.label), text(item.value)]) : [];
    if (equipment.length) {
      factList($('#project-equipment'), equipment);
      $('#project-equipment-section').hidden = false;
    }
    const pressKit = safeResource(project.pressKitUrl);
    if (pressKit) {
      $('#project-press-kit').href = pressKit;
      $('#project-press-kit').hidden = false;
    }
    const hasFacts = credits.length || equipment.length || pressKit;
    $('.project-facts').hidden = !hasFacts;
    $('#project-information').hidden = !description && !hasFacts;
    $('#project-information').classList.toggle('has-no-synopsis', !description);
  }

  function showFrame(index) {
    frameIndex = (index + stills.length) % stills.length;
    const frame = stills[frameIndex];
    const holder = $('#still-image');
    holder.replaceChildren();
    P.image(holder, frame.image, frame.alt, false);
    const img = holder.querySelector('img');
    if (img) img.addEventListener('error', () => {
      if (holder.contains(img)) holder.replaceChildren(P.node('p', 'still-image-error', 'This frame could not be loaded.'));
    }, { once: true });
    $('#still-counter').textContent = number(frameIndex + 1) + ' / ' + number(stills.length);
    $('#still-caption').textContent = frame.caption;
    $('#still-caption').hidden = !frame.caption;
    $('#still-previous').hidden = stills.length < 2;
    $('#still-next').hidden = stills.length < 2;
  }

  function openFrame(index, trigger) {
    if (playing) stopFilm('', false);
    frameTrigger = trigger;
    showFrame(index);
    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
      document.body.classList.add('modal-open');
      $('#still-close').focus();
    }
  }

  function renderStills() {
    stills = Array.isArray(project.stills) ? project.stills.filter((frame) => frame && text(frame.image)).map((frame) => ({ image: text(frame.image), alt: text(frame.alt), caption: text(frame.caption) })) : [];
    if (!stills.length && text(project.image)) stills = [{ image: text(project.image), alt: text(project.imageAlt), caption: '' }];
    if (!stills.length) return;
    $('#project-stills-section').hidden = false;
    $('#project-stills-count').textContent = number(stills.length);
    stills.forEach((frame, index) => {
      const figure = P.node('figure', 'project-still project-reveal');
      const button = P.node('button');
      button.type = 'button';
      button.setAttribute('aria-label', 'View frame ' + (index + 1) + (frame.alt ? ': ' + frame.alt : ''));
      P.image(button, frame.image, frame.alt);
      const img = button.querySelector('img');
      if (img) img.addEventListener('error', () => {
        button.disabled = true;
        button.replaceChildren(P.node('span', 'project-still-fallback', 'Frame unavailable'));
      }, { once: true });
      const expand = P.node('span', 'project-still-overlay', '↗');
      expand.setAttribute('aria-hidden', 'true');
      button.append(expand);
      button.addEventListener('click', () => openFrame(index, button));
      const caption = P.node('figcaption');
      caption.append(P.node('span', '', frame.caption), P.node('span', '', number(index + 1)));
      figure.append(button, caption);
      $('#project-stills').append(figure);
    });
  }

  function renderPagination(projects, index) {
    const pagination = $('#project-pagination');
    const neighbours = [[projects[index - 1], 'previous', '← Previous film'], [projects[index + 1], 'next', 'Next film →']];
    neighbours.forEach(([film, direction, label]) => {
      if (!film) return;
      const link = P.node('a');
      link.href = P.projectUrl(film);
      link.dataset.direction = direction;
      link.append(P.node('span', '', label), P.node('span', '', text(film.title)));
      pagination.append(link);
    });
    pagination.hidden = !pagination.childElementCount;
  }

  function updateMotion() {
    if (motionFrame) return;
    motionFrame = requestAnimationFrame(() => {
      motionFrame = 0;
      const img = $('#project-cover img');
      if (!img) return;
      if (reducedMotion.matches) {
        img.style.transform = '';
        return;
      }
      if (playing) return;
      const bounds = stage.getBoundingClientRect();
      if (bounds.bottom < 0 || bounds.top > window.innerHeight) return;
      const distance = (window.innerHeight / 2 - bounds.top - bounds.height / 2) / Math.max(window.innerHeight, bounds.height);
      img.style.transform = 'translateY(' + Math.max(-18, Math.min(18, distance * 28)).toFixed(2) + 'px)';
    });
  }

  function setupMotion() {
    const items = [...document.querySelectorAll('.project-reveal:not([hidden])')];
    if (!reducedMotion.matches && 'IntersectionObserver' in window) {
      try {
        revealObserver = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          });
        }, { threshold: 0.08 });
        items.forEach((item) => { item.classList.add('will-reveal'); revealObserver.observe(item); });
      } catch (_) {
        items.forEach((item) => item.classList.remove('will-reveal'));
      }
    }
    window.addEventListener('scroll', updateMotion, { passive: true });
    window.addEventListener('resize', updateMotion, { passive: true });
    reducedMotion.addEventListener?.('change', () => {
      if (reducedMotion.matches) {
        revealObserver?.disconnect();
        items.forEach((item) => item.classList.remove('will-reveal'));
      }
      updateMotion();
    });
    updateMotion();
  }

  function showError(message) {
    $('#project-content').hidden = true;
    $('#project-error-message').textContent = message;
    $('#project-error').hidden = false;
    main.setAttribute('aria-busy', 'false');
  }

  async function init() {
    try {
      P = window.PortfolioP || window.Portfolio;
      if (!P) throw new Error('Unavailable');
      const data = await P.load();
      P.chrome(data, 'film');
      const projects = Array.isArray(data.projects) ? data.projects : [];
      const embedded = document.body.dataset.project || '';
      const requested = embedded && !embedded.startsWith('__') ? embedded : new URLSearchParams(location.search).get('id');
      const index = projects.findIndex((film) => film && (film.id === requested || film.slug === requested));
      if (index < 0) {
        showError('The film you’re looking for could not be found.');
        return;
      }
      project = projects[index];
      const title = text(project.title) || 'Film';
      document.title = title + ' — ' + (text(data.profile?.name) || 'Cinematography');
      const description = $('meta[name="description"]');
      if (description) description.content = text(project.description) || title + ' — film information and selected frames.';
      $('#project-title').textContent = title;
      $('#project-meta').textContent = [text(project.category), text(project.year), text(project.duration)].filter(Boolean).join(' / ');
      $('#project-position').textContent = number(index + 1) + ' / ' + number(projects.length);
      renderHero();
      renderInformation();
      renderStills();
      renderPagination(projects, index);
      $('#project-content').hidden = false;
      main.setAttribute('aria-busy', 'false');
      setupMotion();
    } catch (_) {
      showError('This film could not be loaded. Please try again later.');
    }
  }

  stopButton.addEventListener('click', () => stopFilm());
  $('#still-close').addEventListener('click', () => dialog.close());
  $('#still-previous').addEventListener('click', () => showFrame(frameIndex - 1));
  $('#still-next').addEventListener('click', () => showFrame(frameIndex + 1));
  dialog.addEventListener('keydown', (event) => {
    if (stills.length < 2) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      showFrame(frameIndex + (event.key === 'ArrowLeft' ? -1 : 1));
    }
  });
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    $('#still-image').replaceChildren();
    document.body.classList.remove('modal-open');
    frameTrigger?.focus();
  });
  window.addEventListener('pagehide', () => {
    if (playing) stopFilm('', false);
    revealObserver?.disconnect();
    if (motionFrame) cancelAnimationFrame(motionFrame);
    motionFrame = 0;
    document.querySelectorAll('.project-reveal.will-reveal').forEach((item) => item.classList.remove('will-reveal'));
  });
  init();
})();
