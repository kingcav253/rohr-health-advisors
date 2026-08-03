// ---------------------------------------------------------------- nav
const nav = document.getElementById('nav');
if (nav) {
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 10);
  });
}

const navToggle = document.getElementById('navToggle');
const navLinks  = document.getElementById('navLinks');
if (navToggle && navLinks) {
  navToggle.addEventListener('click', () => {
    navLinks.classList.toggle('open');
  });
  // Close menu when a link is clicked
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => navLinks.classList.remove('open'));
  });
}

// ---------------------------------------------------------------- analytics
// Safe wrapper: a missing or ad-blocked gtag must never break the page.
function track(name, params) {
  try {
    if (typeof window.gtag === 'function') {
      window.gtag('event', name, Object.assign({
        page_location: window.location.href,
        page_path: window.location.pathname
      }, params || {}));
    }
  } catch (_) { /* analytics must never break UX */ }
}

// Delegated tracking for the three ways a lead can actually reach Cavin.
document.addEventListener('click', (e) => {
  const a = e.target.closest && e.target.closest('a[href]');
  if (!a) return;
  const href = a.getAttribute('href') || '';

  if (href.indexOf('calendly.com') !== -1) {
    track('generate_lead', {
      method: 'calendly',
      link_text: (a.textContent || '').trim().slice(0, 60)
    });
  } else if (href.indexOf('tel:') === 0) {
    track('contact', { method: 'phone' });
  } else if (href.indexOf('mailto:') === 0) {
    track('contact', { method: 'email' });
  }
}, true);

// ---------------------------------------------------------------- quote form
const quoteForm   = document.getElementById('quoteForm');
const formSuccess = document.getElementById('formSuccess');

if (quoteForm) {
  // Built up front so it's available even if the network is already down.
  const errorBox = document.createElement('div');
  errorBox.className = 'form-error';
  errorBox.id = 'formError';
  errorBox.setAttribute('role', 'alert');
  errorBox.style.display = 'none';
  errorBox.innerHTML =
    '<p><strong>That didn&rsquo;t go through.</strong> Nothing was sent, so please don&rsquo;t wait on a reply.</p>' +
    '<p>Try again below, or reach Cavin directly &mdash; either works:</p>' +
    '<p><a href="tel:8138934125"><strong>(813) 893-4125</strong></a> &middot; ' +
    '<a href="mailto:rohrhealthyllc@gmail.com">rohrhealthyllc@gmail.com</a> &middot; ' +
    '<a href="https://calendly.com/rohrhealth" target="_blank" rel="noopener">book a call</a></p>';
  quoteForm.parentNode.insertBefore(errorBox, quoteForm);

  quoteForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = quoteForm.querySelector('button[type="submit"]');
    const originalLabel = submitBtn ? submitBtn.textContent : 'Send my request';
    if (submitBtn) {
      submitBtn.textContent = 'Sending…';
      submitBtn.disabled = true;
    }
    errorBox.style.display = 'none';

    const restore = () => {
      if (submitBtn) {
        submitBtn.textContent = originalLabel;
        submitBtn.disabled = false;
      }
    };

    // Never pretend a failed submission worked. The form stays visible with
    // the user's input intact so they can retry without retyping anything.
    const fail = (reason) => {
      restore();
      errorBox.style.display = 'block';
      errorBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
      track('form_error', {
        method: 'quote_form',
        error_reason: String(reason).slice(0, 100)
      });
    };

    if (!quoteForm.action || quoteForm.action.indexOf('formspree.io') === -1) {
      fail('no_endpoint_configured');
      return;
    }

    try {
      const response = await fetch(quoteForm.action, {
        method: 'POST',
        body: new FormData(quoteForm),
        headers: { Accept: 'application/json' }
      });

      if (response.ok) {
        quoteForm.style.display = 'none';
        if (formSuccess) formSuccess.style.display = 'block';
        track('generate_lead', { method: 'quote_form' });
      } else {
        fail('http_' + response.status);
      }
    } catch (err) {
      fail((err && err.message) || 'network_error');
    }
  });
}

// ---------------------------------------------------------------- hero form
// Same failure discipline as the quote form: never fake a success.
const heroForm = document.getElementById('heroForm');
const heroFormSuccess = document.getElementById('heroFormSuccess');

if (heroForm) {
  const heroError = document.createElement('div');
  heroError.className = 'form-error';
  heroError.setAttribute('role', 'alert');
  heroError.style.display = 'none';
  heroError.innerHTML =
    '<p><strong>That didn&rsquo;t send.</strong> Nothing went through, so please don&rsquo;t wait on a reply.</p>' +
    '<p><a href="tel:8138934125"><strong>(813) 893-4125</strong></a> &middot; ' +
    '<a href="https://calendly.com/rohrhealth" target="_blank" rel="noopener">book a call</a></p>';
  heroForm.parentNode.insertBefore(heroError, heroForm);

  heroForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = heroForm.querySelector('button[type="submit"]');
    const label = btn ? btn.textContent : 'See my options';
    if (btn) { btn.textContent = 'Sending…'; btn.disabled = true; }
    heroError.style.display = 'none';

    const fail = (reason) => {
      if (btn) { btn.textContent = label; btn.disabled = false; }
      heroError.style.display = 'block';
      track('form_error', { method: 'hero_form', error_reason: String(reason).slice(0, 100) });
    };

    try {
      const r = await fetch(heroForm.action, {
        method: 'POST',
        body: new FormData(heroForm),
        headers: { Accept: 'application/json' }
      });
      if (r.ok) {
        heroForm.style.display = 'none';
        if (heroFormSuccess) heroFormSuccess.style.display = 'block';
        track('generate_lead', { method: 'hero_form' });
      } else {
        fail('http_' + r.status);
      }
    } catch (err) {
      fail((err && err.message) || 'network_error');
    }
  });
}
