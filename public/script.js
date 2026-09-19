'use strict';
if (window.location.pathname === '/' && /#(?:confirmation_token|recovery_token|invite_token|access_token|email_change_token)=/.test(window.location.hash)) {
  window.location.replace(`/inbox${window.location.hash}`);
}
const header = document.querySelector('.site-header');
const menuButton = document.querySelector('.menu-button');
const navigation = document.querySelector('.site-nav');
const toast = document.querySelector('#toast');
let toastTimer;
function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('show'), 3000);
}
function closeMenu(returnFocus = false) {
  if (!menuButton || !navigation) return;
  navigation.classList.remove('open');
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.querySelector('.sr-only').textContent = 'Open menu';
  if (returnFocus) menuButton.focus();
}
if (header) {
  const updateHeader = () => header.classList.toggle('scrolled', window.scrollY > 12);
  window.addEventListener('scroll', updateHeader, { passive: true });
  updateHeader();
}
if (menuButton && navigation) {
  menuButton.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.querySelector('.sr-only').textContent = open ? 'Close menu' : 'Open menu';
    navigation.classList.toggle('open', open);
  });
  navigation.querySelectorAll('a').forEach(link => link.addEventListener('click', () => closeMenu()));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') closeMenu(true);
  });
  document.addEventListener('click', event => { if (!header.contains(event.target)) closeMenu(); });
  document.addEventListener('focusin', event => { if (!header.contains(event.target)) closeMenu(); });
  window.matchMedia('(min-width: 981px)').addEventListener('change', event => { if (event.matches) closeMenu(); });
}
const checks = [...document.querySelectorAll('[data-check]')];
const scoreValue = document.querySelector('#score-value');
const scoreTitle = document.querySelector('#score-title');
const scoreMessage = document.querySelector('#score-message');
const scoreRing = document.querySelector('.score-ring');
const scoreCopy = [
  ['Start your check', 'Select the tools your business already has in place.'],
  ['A starting point', 'One essential is in place. A setup plan can help with the rest.'],
  ['Building momentum', 'Your foundation is forming. Look at the unchecked tools next.'],
  ['Halfway there', 'Three essentials are in place. There’s room to connect more.'],
  ['Taking shape', 'Four essentials are in place. Check how well they work together.'],
  ['One more to check', 'Five essentials are in place. A review can help close the last gap.'],
  ['All six checked', 'You’ve checked every essential. A technical review can verify the connections.']
];
function updateScore() {
  if (!checks.length) return;
  const count = checks.filter(input => input.checked).length;
  const percent = Math.round(count / checks.length * 100);
  scoreValue.textContent = `${percent}%`;
  scoreRing.style.setProperty('--score', `${percent * 3.6}deg`);
  scoreTitle.textContent = scoreCopy[count][0];
  scoreMessage.textContent = scoreCopy[count][1];
  const fallback = document.querySelector('#results-text');
  if (fallback) fallback.hidden = true;
}
checks.forEach(input => input.addEventListener('change', updateScore));
updateScore();

const demoTabs = [...document.querySelectorAll('[data-demo-tab]')];
const demoPanels = [...document.querySelectorAll('[data-demo-panel]')];
function selectDemo(name, focus = false) {
  demoTabs.forEach(tab => {
    const selected = tab.dataset.demoTab === name;
    tab.classList.toggle('active', selected);
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    if (selected && focus) tab.focus();
  });
  demoPanels.forEach(panel => {
    const selected = panel.dataset.demoPanel === name;
    panel.classList.toggle('active', selected);
    panel.hidden = !selected;
  });
}
demoTabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectDemo(tab.dataset.demoTab));
  tab.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    let next = event.key === 'Home' ? 0 : event.key === 'End' ? demoTabs.length - 1 : index + (event.key === 'ArrowRight' ? 1 : -1);
    if (next < 0) next = demoTabs.length - 1;
    if (next >= demoTabs.length) next = 0;
    selectDemo(demoTabs[next].dataset.demoTab, true);
  });
});
if (demoTabs.length) selectDemo('website');

const websitePreview = document.querySelector('.website-preview-shell');
document.querySelectorAll('[data-device]').forEach(button => button.addEventListener('click', () => {
  const mode = button.dataset.device;
  if (websitePreview) websitePreview.dataset.deviceMode = mode;
  document.querySelectorAll('[data-device]').forEach(option => {
    const active = option === button;
    option.classList.toggle('active', active);
    option.setAttribute('aria-pressed', String(active));
  });
}));
const sampleSite = document.querySelector('.sample-site');
document.querySelectorAll('[data-sample-theme]').forEach(button => button.addEventListener('click', () => {
  if (sampleSite) sampleSite.dataset.theme = button.dataset.sampleTheme;
  document.querySelectorAll('[data-sample-theme]').forEach(option => {
    const active = option === button;
    option.classList.toggle('active', active);
    option.setAttribute('aria-pressed', String(active));
  });
}));
let sampleResponseTimer;
document.querySelectorAll('[data-sample-action]').forEach(button => button.addEventListener('click', () => {
  const response = document.querySelector('.sample-response');
  if (!response) return;
  const messages = {
    menu: 'Sample menu opened — this would lead to the restaurant menu.',
    story: 'Brand story selected — every customer path is intentionally planned.',
    reserve: 'Reservation action tracked — the booking handoff is ready.'
  };
  response.textContent = messages[button.dataset.sampleAction];
  response.hidden = false;
  window.clearTimeout(sampleResponseTimer);
  sampleResponseTimer = window.setTimeout(() => { response.hidden = true; }, 3200);
}));

const connectionNodes = [...document.querySelectorAll('[data-connection]')];
const connectionScore = document.querySelector('#connection-score');
const connectionTitle = document.querySelector('#connection-title');
const connectionNote = document.querySelector('#connection-note');
function updateConnections() {
  const connected = connectionNodes.filter(node => node.classList.contains('connected')).length;
  const percent = Math.round(connected / connectionNodes.length * 100);
  if (connectionScore) connectionScore.textContent = `${percent}%`;
  const copy = connected === 6
    ? ['Everything is in sync', 'Customers can move from discovery to inquiry without a broken handoff.']
    : connected >= 4
      ? ['A few handoffs need attention', 'The foundation is strong, but disconnected platforms can hide useful customer activity.']
      : connected >= 2
        ? ['The customer path is fragmented', 'Several touchpoints are isolated, making leads and performance harder to track.']
        : ['Critical connections are missing', 'Customers may struggle to discover the business or reach the owner.'];
  if (connectionTitle) connectionTitle.textContent = copy[0];
  if (connectionNote) connectionNote.textContent = copy[1];
  connectionNodes.forEach(node => {
    const active = node.classList.contains('connected');
    node.setAttribute('aria-pressed', String(active));
    const line = document.querySelector(`[data-line="${node.dataset.connection}"]`);
    if (line) line.classList.toggle('offline', !active);
  });
}
connectionNodes.forEach(node => node.addEventListener('click', () => {
  node.classList.toggle('connected');
  updateConnections();
}));
const resetConnections = document.querySelector('#reset-connections');
if (resetConnections) resetConnections.addEventListener('click', () => {
  connectionNodes.forEach(node => node.classList.add('connected'));
  updateConnections();
});
updateConnections();

const journeySteps = [...document.querySelectorAll('[data-journey-step]')];
const journeyText = document.querySelector('#journey-status-text');
const journeyTime = document.querySelector('#journey-time');
const journeyToggle = document.querySelector('#journey-toggle');
const journeyMessages = [
  'New local search impression detected.',
  'Customer arrived on the mobile website.',
  'Private dining inquiry submitted and conversion recorded.',
  'Lead saved and delivered to the business owner.'
];
let journeyIndex = 0;
let journeyPaused = false;
function showJourneyStep(index) {
  journeyIndex = index;
  journeySteps.forEach((step, stepIndex) => step.classList.toggle('active', stepIndex === index));
  if (journeyText) journeyText.textContent = journeyMessages[index];
  if (journeyTime) journeyTime.textContent = `00:0${index + 1}`;
}
journeySteps.forEach((step, index) => step.addEventListener('click', () => showJourneyStep(index)));
if (journeyToggle) journeyToggle.addEventListener('click', () => {
  journeyPaused = !journeyPaused;
  journeyToggle.setAttribute('aria-pressed', String(journeyPaused));
  journeyToggle.innerHTML = journeyPaused ? '<span aria-hidden="true">▶</span> Play animation' : '<span aria-hidden="true">Ⅱ</span> Pause animation';
});
if (journeySteps.length && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  window.setInterval(() => {
    if (!journeyPaused && !document.querySelector('#demo-journey')?.hidden) showJourneyStep((journeyIndex + 1) % journeySteps.length);
  }, 2100);
}

const analyticsData = {
  7: { visits: '721', leads: '21', clicks: '286', rate: '5.2%' },
  30: { visits: '2,846', leads: '74', clicks: '1,092', rate: '4.8%' },
  90: { visits: '8,914', leads: '226', clicks: '3,487', rate: '4.6%' }
};
document.querySelectorAll('[data-range]').forEach(button => button.addEventListener('click', () => {
  const data = analyticsData[button.dataset.range];
  Object.entries(data).forEach(([key, value]) => {
    const metric = document.querySelector(`[data-metric="${key}"]`);
    if (metric) metric.textContent = value;
  });
  document.querySelectorAll('[data-range]').forEach(option => option.classList.toggle('active', option === button));
}));

const packagePlans = [
  { name:'Website Build', price:'$249', value:'Website Build — $249', reason:'A focused, mobile-ready website with a clean launch handoff.', includes:['Custom small-business website','Mobile-responsive design','Core page and content structure','Website files and launch handoff'] },
  { name:'Connected Launch', price:'$500', value:'Connected Launch — $500', reason:'A new website connected to the business platforms you already use.', includes:['Everything in Website Build','Up to 3 existing platform connections','Basic analytics and tracking','Hosting setup and launch support'] },
  { name:'Business Setup', price:'$899', value:'Business Setup — $899', reason:'A business-ready system with account setup, conversion tracking, and a year of support.', includes:['Everything in Connected Launch','Up to 5 platform connections','Core account and business email setup','1 year of maintenance and support'] },
  { name:'Full SiteSync', price:'$1,499', value:'Full SiteSync — $1,499', reason:'The complete connected system for businesses ready to grow, advertise, and measure performance.', includes:['Everything in Business Setup','Up to 10 platform connections','Advertising and campaign setup','Analytics monitoring and 2 years of support'] }
];
let recommendedPlan = packagePlans[0];
function updateBuilder() {
  const goal = document.querySelector('[name="builder-goal"]:checked')?.value || 'website';
  const platforms = Number(document.querySelector('[name="builder-platforms"]:checked')?.value || 0);
  const support = document.querySelector('[name="builder-support"]:checked')?.value || 'handoff';
  let level = { website:0, connect:1, setup:2, growth:3 }[goal];
  if (platforms >= 10 || support === 'two-years') level = 3;
  else if (platforms >= 5 || support === 'year') level = Math.max(level, 2);
  else if (platforms >= 3) level = Math.max(level, 1);
  recommendedPlan = packagePlans[level];
  const name = document.querySelector('#builder-package');
  const price = document.querySelector('#builder-price');
  const reason = document.querySelector('#builder-reason');
  const includes = document.querySelector('#builder-includes');
  if (name) name.textContent = recommendedPlan.name;
  if (price) price.textContent = recommendedPlan.price;
  if (reason) reason.textContent = recommendedPlan.reason;
  if (includes) includes.innerHTML = recommendedPlan.includes.map(item => `<li>${item}</li>`).join('');
  const column = level + 2;
  document.querySelectorAll('.comparison-table th,.comparison-table td').forEach(cell => cell.classList.remove('recommended'));
  document.querySelectorAll(`.comparison-table tr > :nth-child(${column})`).forEach(cell => cell.classList.add('recommended'));
}
const builder = document.querySelector('#setup-builder');
if (builder) {
  builder.addEventListener('change', updateBuilder);
  updateBuilder();
}
document.querySelector('#use-recommendation')?.addEventListener('click', () => {
  const choice = document.querySelector('#package-choice');
  const goals = document.querySelector('#project-goals');
  const business = document.querySelector('#builder-business')?.value || 'small business';
  if (choice) choice.value = recommendedPlan.value;
  if (goals) goals.value = `I’m interested in the ${recommendedPlan.name} direction for a ${business.toLowerCase()}. I’d like to confirm the scope and next steps.`;
  document.querySelector('#consultation')?.scrollIntoView({ behavior:'smooth' });
  showToast(`${recommendedPlan.name} added to your consultation.`);
});

const conceptData = {
  restaurant:{image:'./assets/harbor-pine-dish.png',alt:'Seasonal coastal restaurant dish',type:'RESTAURANT / HOSPITALITY',name:'Harbor & Pine Kitchen',summary:'An editorial website that turns local discovery into reservations and private dining inquiries.',action:'Reserve a table',connected:'Google · Instagram · Booking · Analytics',measured:'Reservations and inquiry sources'},
  contractor:{image:'./assets/concept-contractor.webp',alt:'Coastal home-service professional improving a residential exterior',type:'CONTRACTOR / HOME SERVICE',name:'TideLine Home Services',summary:'A confident local-service website that makes trust visible and routes quote requests to the owner.',action:'Request an estimate',connected:'Google · Facebook · Lead inbox · Analytics',measured:'Calls, quote requests, and service areas'},
  salon:{image:'./assets/concept-salon.webp',alt:'Modern salon interior with warm daylight',type:'SALON / RETAIL',name:'Halo & Hue Studio',summary:'A refined, welcoming presence that moves discovery into appointments and repeat visits.',action:'Book an appointment',connected:'Instagram · Google · Booking · Email',measured:'Bookings, campaigns, and returning visitors'}
};
let activeConcept = 'restaurant';
document.querySelectorAll('[data-concept]').forEach(button => button.addEventListener('click', () => {
  activeConcept = button.dataset.concept;
  const data = conceptData[activeConcept];
  document.querySelectorAll('[data-concept]').forEach(option => { const active = option === button; option.classList.toggle('active',active); option.setAttribute('aria-selected',String(active)); });
  const stage = document.querySelector('.concept-stage');
  if (stage) stage.dataset.activeConcept = activeConcept;
  const image = document.querySelector('#concept-image');
  if (image) { image.src = data.image; image.alt = data.alt; }
  [['#concept-type','type'],['#concept-name','name'],['#concept-summary','summary'],['#concept-action','action'],['#concept-connected','connected'],['#concept-measured','measured']].forEach(([selector,key]) => { const node=document.querySelector(selector); if(node) node.textContent=data[key]; });
}));
document.querySelector('#concept-consult')?.addEventListener('click', () => {
  const data = conceptData[activeConcept];
  const goals = document.querySelector('#project-goals');
  if (goals) goals.value = `I’d like to explore a direction similar to the ${data.name} fictional concept, adapted for my business. My priority action is: ${data.action}.`;
  document.querySelector('#consultation')?.scrollIntoView({ behavior:'smooth' });
  showToast('Concept direction added to your consultation.');
});

const transformationSlider = document.querySelector('#transformation-slider');
if (transformationSlider) transformationSlider.addEventListener('input', () => {
  document.querySelector('#transformation-demo')?.style.setProperty('--reveal', `${transformationSlider.value}%`);
  const value = document.querySelector('#transformation-value');
  if (value) value.textContent = `${transformationSlider.value}%`;
});

function getPlatformSummary() {
  const label = input => input.closest('label').querySelector('b').textContent;
  const ready = checks.filter(input => input.checked).map(label);
  const missing = checks.filter(input => !input.checked).map(label);
  return { ready, missing, text:`My SiteSync self-check: ${ready.length} of ${checks.length} tools in place (${Math.round(ready.length / checks.length * 100)}%)\n\nIn place: ${ready.join(', ') || 'None selected'}\n\nTo review: ${missing.join(', ') || 'All tools checked; connections still need verification'}` };
}

const copyButton = document.querySelector('#copy-results');
if (copyButton) copyButton.addEventListener('click', async () => {
  const summary = getPlatformSummary().text;
  try {
    await navigator.clipboard.writeText(summary);
    showToast('Your setup checklist is copied.');
  } catch {
    const fallback = document.querySelector('#results-text');
    fallback.value = summary;
    fallback.hidden = false;
    fallback.focus();
    fallback.select();
    showToast('Select and copy the results below.');
  }
});
document.querySelector('#use-check-results')?.addEventListener('click', () => {
  const summary = getPlatformSummary();
  const goals = document.querySelector('#project-goals');
  if (goals) goals.value = `${summary.text}\n\nI’d like help reviewing the missing pieces and confirming how these tools connect.`;
  const platformMap = {google:'Google',ads:null,analytics:null,website:null,search:null,leads:null};
  checks.filter(input => input.checked).forEach(input => {
    const platform = platformMap[input.dataset.check];
    if (!platform) return;
    const checkbox = document.querySelector(`[name="Platform: ${platform}"]`);
    if (checkbox) checkbox.checked = true;
  });
  document.querySelector('#consultation')?.scrollIntoView({ behavior:'smooth' });
  showToast('Your Platform Check is ready in the form.');
});
const form = document.querySelector('#consultation-form');
const packageChoice = document.querySelector('#package-choice');
document.querySelectorAll('[data-package]').forEach(link => {
  link.addEventListener('click', () => {
    if (!form || !packageChoice) return;
    packageChoice.value = link.dataset.package;
    packageChoice.dispatchEvent(new Event('change', { bubbles: true }));
    form.classList.remove('selected');
    window.requestAnimationFrame(() => form.classList.add('selected'));
    showToast(`${link.dataset.package} selected.`);
  });
});
if (form) {
  const button = form.querySelector('button[type="submit"]');
  const status = document.querySelector('#form-status');
  let submitting = false;
  const resetButton = () => {
    submitting = false;
    button.disabled = false;
    button.innerHTML = 'Send consultation request <span aria-hidden="true">↗</span>';
    form.removeAttribute('aria-busy');
  };
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (submitting || !form.reportValidity()) return;
    submitting = true;
    button.disabled = true;
    button.textContent = 'Sending your request…';
    form.setAttribute('aria-busy', 'true');
    status.hidden = true;
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 22000);
    try {
      const response = await fetch(form.action, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(form).entries())),
        signal: controller.signal
      });
      const result = await response.json();
      if (!response.ok || result.ok !== true) throw new Error(result.error || 'We couldn’t send your request. Please try again in a moment.');
      form.reset();
      window.location.assign('/thanks.html');
    } catch (error) {
      status.textContent = error.name === 'AbortError'
        ? 'Delivery is taking longer than expected. Your details are still here; please try again.'
        : 'We couldn’t send your request right now. Your details are still here; please try again in a moment.';
      status.hidden = false;
      status.setAttribute('tabindex', '-1');
      status.focus();
    } finally {
      window.clearTimeout(timer);
      resetButton();
    }
  });
  window.addEventListener('pageshow', resetButton);
}
const year = document.querySelector('#year');
if (year) year.textContent = new Date().getFullYear();
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const progressBar = document.querySelector('.scroll-progress span');
let scrollFrame = 0;
function updatePageMotion() {
  scrollFrame = 0;
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const progress = scrollable > 0 ? Math.min(window.scrollY / scrollable, 1) : 0;
  if (progressBar) progressBar.style.transform = `scaleX(${progress})`;
  document.documentElement.style.setProperty('--page-progress', progress.toFixed(3));
  document.documentElement.style.setProperty('--ambient-x', `${16 + (progress * 28)}%`);
}
function requestPageMotion() {
  if (!scrollFrame) scrollFrame = window.requestAnimationFrame(updatePageMotion);
}
window.addEventListener('scroll', requestPageMotion, { passive: true });
window.addEventListener('resize', requestPageMotion);
updatePageMotion();

const navLinks = [...document.querySelectorAll('.site-nav a[href^="#"]')];
if ('IntersectionObserver' in window && navLinks.length) {
  const navTargets = navLinks
    .map(link => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);
  const navObserver = new IntersectionObserver(entries => {
    const visible = entries
      .filter(entry => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    navLinks.forEach(link => {
      const active = link.hash === `#${visible.target.id}`;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }, { rootMargin: '-28% 0px -58% 0px', threshold: [0, 0.1, 0.35] });
  navTargets.forEach(target => navObserver.observe(target));
}

if ('IntersectionObserver' in window && !reducedMotion) {
  const elements = [...document.querySelectorAll('.reveal')];
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.remove('pending');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.04 });
  document.documentElement.classList.add('motion-ready');
  document.querySelectorAll('.service-grid,.platform-grid,.pricing-grid,.process-list,.fit-columns').forEach(group => {
    [...group.querySelectorAll(':scope > .reveal,:scope > li')].forEach((element, index) => {
      element.style.setProperty('--reveal-delay', `${Math.min(index * 55, 275)}ms`);
    });
  });
  elements.forEach(element => {
    // First-screen content is always visible, even if an animation never starts.
    if (element.getBoundingClientRect().top > window.innerHeight) element.classList.add('pending');
    observer.observe(element);
  });
  document.querySelectorAll('a[href^="#"]').forEach(link => link.addEventListener('click', () => {
    const target = document.getElementById(link.hash.slice(1));
    if (target) {
      target.classList.remove('pending');
      target.querySelectorAll('.pending').forEach(element => element.classList.remove('pending'));
    }
  }));
  // Reveal everything if a browser cannot deliver intersection updates promptly.
  window.setTimeout(() => elements.forEach(element => element.classList.remove('pending')), 6000);
}
if (!reducedMotion && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
  let pointerFrame = 0;
  window.addEventListener('pointermove', event => {
    if (pointerFrame) return;
    pointerFrame = window.requestAnimationFrame(() => {
      document.documentElement.style.setProperty('--mouse-x', `${event.clientX}px`);
      document.documentElement.style.setProperty('--mouse-y', `${event.clientY}px`);
      pointerFrame = 0;
    });
  }, { passive: true });

  document.querySelectorAll('.network-card,.service-card,.price-card,.platform-chip,.demo-lab,.concept-stage').forEach(card => {
    let scheduled = false;
    card.addEventListener('pointermove', event => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(() => {
        const rect = card.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        card.style.setProperty('--pointer-x', `${x}px`);
        card.style.setProperty('--pointer-y', `${y}px`);
        card.style.setProperty('--tilt-x', `${((rect.height / 2 - y) / rect.height) * 4}deg`);
        card.style.setProperty('--tilt-y', `${((x - rect.width / 2) / rect.width) * 4}deg`);
        scheduled = false;
      });
    });
    card.addEventListener('pointerleave', () => {
      card.style.setProperty('--tilt-x', '0deg');
      card.style.setProperty('--tilt-y', '0deg');
    });
  });
}
