import {
  getUser,
  handleAuthCallback,
  login,
  logout,
  requestPasswordRecovery,
  signup,
  updateUser
} from '@netlify/identity';

const accessPanel = document.querySelector('[data-access-panel]');
const loginForm = document.querySelector('[data-login-form]');
const resetForm = document.querySelector('[data-reset-form]');
const accessStatus = document.querySelector('[data-access-status]');
const loadingPanel = document.querySelector('[data-loading-panel]');
const dashboard = document.querySelector('[data-dashboard]');
const dashboardStatus = document.querySelector('[data-dashboard-status]');
const accountTools = document.querySelector('[data-account-tools]');
const accountEmail = document.querySelector('[data-account-email]');
const summary = document.querySelector('[data-summary]');
const toast = document.querySelector('[data-toast]');

let inbox = { leads: [], consultations: [], agentRuns: [] };
let activeTab = 'consultations';
let toastTimer;

const LEAD_STAGES = ['New', 'Qualified', 'Draft Ready', 'Contacted', 'Replied', 'Consultation', 'Proposal', 'Won', 'Lost', 'Disqualified'];
const CONSULTATION_STATUSES = ['new', 'contacted', 'qualified', 'closed'];
const PRIORITIES = ['Unreviewed', 'Hot', 'Warm', 'Cold'];

function element(tag, className, value) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (value != null) node.textContent = String(value);
  return node;
}

function setAccessStatus(message, error = false) {
  accessStatus.textContent = message || '';
  accessStatus.style.color = error ? 'var(--danger)' : 'var(--warning)';
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('show'), 3200);
}

function setUser(user) {
  accountTools.hidden = !user;
  accountEmail.textContent = user?.email || '';
}

function showAccess(message = '', user = null) {
  dashboard.hidden = true;
  loadingPanel.hidden = true;
  accessPanel.hidden = false;
  resetForm.hidden = true;
  loginForm.hidden = Boolean(user);
  setUser(user);
  setAccessStatus(message, Boolean(message && user));
}

function showLoading(user) {
  accessPanel.hidden = true;
  dashboard.hidden = true;
  loadingPanel.hidden = false;
  setUser(user);
}

function friendlyError(error) {
  const message = error instanceof Error ? error.message : '';
  if (/invalid login|invalid credentials/i.test(message)) return 'That email and password did not match.';
  if (/already registered|already exists/i.test(message)) return 'That account already exists. Sign in instead.';
  if (/password/i.test(message) && /short|length|weak/i.test(message)) return 'Use a stronger password with at least 8 characters.';
  if (/identity|configured|endpoint/i.test(message)) return 'Owner login is not available yet. Please try again after deployment finishes.';
  return message || 'Something went wrong. Please try again.';
}

async function responseBody(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

async function loadInbox(user, quiet = false) {
  if (!quiet) showLoading(user);
  else dashboardStatus.textContent = 'Refreshing…';

  const response = await fetch('/api/inbox', {
    headers: { Accept: 'application/json' },
    credentials: 'same-origin'
  });
  const body = await responseBody(response);

  if (response.status === 401) {
    showAccess('Your session ended. Sign in again.');
    return;
  }
  if (response.status === 403) {
    showAccess(body.error || 'This account is not authorized for the SiteSync inbox.', user);
    return;
  }
  if (!response.ok || !body.ok) throw new Error(body.error || 'The inbox could not be loaded.');

  inbox = {
    leads: Array.isArray(body.leads) ? body.leads : [],
    consultations: Array.isArray(body.consultations) ? body.consultations : [],
    agentRuns: Array.isArray(body.agentRuns) ? body.agentRuns : []
  };
  accessPanel.hidden = true;
  loadingPanel.hidden = true;
  dashboard.hidden = false;
  dashboardStatus.textContent = '';
  renderInbox();
}

function formatDate(value) {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not set';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function localDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function isoOrNull(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function safeWebUrl(value) {
  if (!value || value === 'Not provided') return null;
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function detail(label, value, linkType) {
  const wrapper = document.createElement('div');
  wrapper.append(element('dt', '', label));
  const description = document.createElement('dd');
  const display = value == null || value === '' ? 'Not provided' : Array.isArray(value) ? (value.join(', ') || 'None') : String(value);
  let href = null;
  if (linkType === 'email' && display !== 'Not provided') href = `mailto:${display}`;
  if (linkType === 'phone' && display !== 'Not provided') href = `tel:${display.replace(/[^+0-9]/g, '')}`;
  if (linkType === 'web') href = safeWebUrl(display);
  if (href) {
    const link = element('a', '', display);
    link.href = href;
    if (linkType === 'web') {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }
    description.append(link);
  } else {
    description.textContent = display;
  }
  wrapper.append(description);
  return wrapper;
}

function badge(value, tone = '') {
  const node = element('span', `badge${tone ? ` ${tone}` : ''}`, value || 'Unreviewed');
  return node;
}

function emptyState(title, message) {
  const box = element('div', 'empty-state');
  box.append(element('h2', '', title), element('p', '', message));
  return box;
}

function selectField(label, name, options, selected) {
  const wrapper = element('label', 'field');
  wrapper.append(document.createTextNode(label));
  const select = document.createElement('select');
  select.name = name;
  for (const value of options) {
    const option = element('option', '', value);
    option.value = value;
    option.selected = value === selected;
    select.append(option);
  }
  wrapper.append(select);
  return wrapper;
}

function dateField(label, name, value) {
  const wrapper = element('label', 'field');
  wrapper.append(document.createTextNode(label));
  const input = document.createElement('input');
  input.name = name;
  input.type = 'datetime-local';
  input.value = localDateTime(value);
  wrapper.append(input);
  return wrapper;
}

function textareaField(label, name, value, copyable = false) {
  const wrapper = element('label', `field wide${copyable ? ' draft-field' : ''}`);
  wrapper.append(document.createTextNode(label));
  const textarea = document.createElement('textarea');
  textarea.name = name;
  textarea.value = value || '';
  wrapper.append(textarea);
  if (copyable) {
    const button = element('button', 'copy-button', 'Copy draft');
    button.type = 'button';
    button.addEventListener('click', async () => {
      if (!textarea.value.trim()) return showToast('There is no draft to copy yet.');
      try {
        await navigator.clipboard.writeText(textarea.value);
        showToast('Draft copied. Review it before sending.');
      } catch {
        showToast('Copy failed. Select the draft text manually.');
      }
    });
    wrapper.append(button);
  }
  return wrapper;
}

function checkboxField(label, name, checked) {
  const wrapper = element('label', 'checkbox-field');
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.name = name;
  input.checked = Boolean(checked);
  wrapper.append(input, document.createTextNode(label));
  return wrapper;
}

function recordCopy(label, value) {
  const wrapper = element('div', 'record-copy');
  wrapper.append(element('h3', '', label), element('p', '', value || 'Not provided'));
  return wrapper;
}

function saveButton(form) {
  const actions = element('div', 'record-actions');
  const button = element('button', 'save-button', 'Save changes');
  button.type = 'submit';
  actions.append(button);
  form.append(actions);
  return button;
}

async function saveRecord(kind, id, changes, button) {
  const previous = button.textContent;
  button.disabled = true;
  button.textContent = 'Saving…';
  try {
    const response = await fetch('/api/inbox', {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ kind, id, changes })
    });
    const body = await responseBody(response);
    if (response.status === 401 || response.status === 403) {
      const user = await getUser();
      showAccess(body.error || 'Your inbox access is no longer available.', user);
      return;
    }
    if (!response.ok || !body.ok) throw new Error(body.error || 'The update could not be saved.');
    const key = kind === 'lead' ? 'leads' : 'consultations';
    inbox[key] = inbox[key].map(record => record.id === id ? body.record : record);
    renderInbox();
    showToast('Changes saved.');
  } catch (error) {
    dashboardStatus.textContent = friendlyError(error);
    button.disabled = false;
    button.textContent = previous;
  }
}

function consultationCard(record) {
  const card = element('article', 'record-card');
  const header = document.createElement('header');
  const title = document.createElement('div');
  title.append(
    element('p', 'record-type', `Inbound consultation · ${formatDate(record.created_at)}`),
    element('h2', '', record.business),
    element('p', '', record.name)
  );
  const badges = element('div', 'badges');
  const tone = record.priority === 'Hot' ? 'hot' : record.priority === 'Warm' ? 'warm' : '';
  badges.append(badge(record.priority, tone), badge(record.status), badge(record.selected_package));
  header.append(title, badges);

  const body = element('div', 'record-body');
  const details = element('dl', 'detail-grid');
  details.append(
    detail('Email', record.email, 'email'),
    detail('Phone', record.phone, 'phone'),
    detail('Website', record.website, 'web'),
    detail('Budget', record.budget),
    detail('Platforms', record.platforms),
    detail('Extended support', record.extended_support ? 'Requested' : 'No'),
    detail('Source', record.source),
    detail('Next follow-up', formatDate(record.next_follow_up))
  );
  body.append(details, recordCopy('Project goals', record.goals));

  const form = element('form', 'workflow-grid');
  form.append(
    selectField('Priority', 'priority', PRIORITIES, record.priority),
    selectField('Status', 'status', CONSULTATION_STATUSES, record.status),
    dateField('Last contact', 'last_contact', record.last_contact),
    dateField('Next follow-up', 'next_follow_up', record.next_follow_up),
    textareaField('Response draft · review before sending', 'response_draft', record.response_draft, true),
    textareaField('Private notes', 'notes', record.notes)
  );
  const button = saveButton(form);
  form.addEventListener('submit', event => {
    event.preventDefault();
    saveRecord('consultation', record.id, {
      priority: form.elements.priority.value,
      status: form.elements.status.value,
      last_contact: isoOrNull(form.elements.last_contact.value),
      next_follow_up: isoOrNull(form.elements.next_follow_up.value),
      response_draft: form.elements.response_draft.value,
      notes: form.elements.notes.value
    }, button);
  });
  body.append(form);
  card.append(header, body);
  return card;
}

function leadCard(record) {
  const card = element('article', 'record-card');
  const header = document.createElement('header');
  const title = document.createElement('div');
  title.append(
    element('p', 'record-type', `Outbound prospect · ${formatDate(record.created_at)}`),
    element('h2', '', record.business_name),
    element('p', '', [record.contact_name, record.location].filter(Boolean).join(' · ') || 'Contact not identified')
  );
  const badges = element('div', 'badges');
  const tone = record.lead_score === 'Hot' ? 'hot' : record.lead_score === 'Warm' ? 'warm' : '';
  badges.append(badge(record.lead_score || 'Unscored', tone), badge(record.stage));
  if (record.fit_score != null) badges.append(badge(`${record.fit_score}/100 fit`));
  header.append(title, badges);

  const body = element('div', 'record-body');
  const details = element('dl', 'detail-grid');
  details.append(
    detail('Email', record.email, 'email'),
    detail('Phone', record.phone, 'phone'),
    detail('Website', record.website, 'web'),
    detail('Source', record.source),
    detail('Industry', record.industry),
    detail('Recommended package', record.recommended_package),
    detail('Need signals', record.need_signals),
    detail('Next follow-up', formatDate(record.next_follow_up))
  );
  body.append(details);

  const form = element('form', 'workflow-grid');
  form.append(
    selectField('Stage', 'stage', LEAD_STAGES, record.stage),
    checkboxField('Do not contact', 'do_not_contact', record.do_not_contact),
    dateField('Last contact', 'last_contact', record.last_contact),
    dateField('Next follow-up', 'next_follow_up', record.next_follow_up),
    textareaField('Outreach draft · review before sending', 'outreach_draft', record.outreach_draft, true),
    textareaField('Follow-up draft · review before sending', 'follow_up_draft', record.follow_up_draft, true),
    textareaField('Private notes', 'notes', record.notes)
  );
  const button = saveButton(form);
  form.addEventListener('submit', event => {
    event.preventDefault();
    saveRecord('lead', record.id, {
      stage: form.elements.stage.value,
      do_not_contact: form.elements.do_not_contact.checked,
      last_contact: isoOrNull(form.elements.last_contact.value),
      next_follow_up: isoOrNull(form.elements.next_follow_up.value),
      outreach_draft: form.elements.outreach_draft.value,
      follow_up_draft: form.elements.follow_up_draft.value,
      notes: form.elements.notes.value
    }, button);
  });
  body.append(form);
  card.append(header, body);
  return card;
}

function renderRecords(panelName, records, factory, emptyTitle, emptyMessage) {
  const panel = document.querySelector(`[data-panel="${panelName}"]`);
  if (!records.length) {
    panel.replaceChildren(emptyState(emptyTitle, emptyMessage));
    return;
  }
  const list = element('div', 'record-list');
  for (const record of records) list.append(factory(record));
  panel.replaceChildren(list);
}

function renderAgents() {
  const panel = document.querySelector('[data-panel="agents"]');
  if (!inbox.agentRuns.length) {
    panel.replaceChildren(emptyState('No agent runs yet', 'Run history will appear here after an agent reports its first result.'));
    return;
  }
  const wrap = element('div', 'agent-table-wrap');
  const table = element('table', 'agent-table');
  const head = document.createElement('thead');
  const headRow = document.createElement('tr');
  for (const label of ['Run', 'Agent', 'Status', 'Found', 'Changed', 'Summary']) headRow.append(element('th', '', label));
  head.append(headRow);
  const body = document.createElement('tbody');
  for (const run of inbox.agentRuns) {
    const row = document.createElement('tr');
    row.append(element('td', '', formatDate(run.created_at)), element('td', '', run.agent_name));
    const status = document.createElement('td');
    status.append(badge(run.status, run.status === 'error' ? 'error' : ''));
    row.append(status, element('td', '', run.items_found), element('td', '', run.items_changed));
    const runSummary = document.createElement('td');
    runSummary.append(document.createTextNode(run.summary || 'No summary'));
    if (run.error) runSummary.append(element('div', 'agent-error', run.error));
    row.append(runSummary);
    body.append(row);
  }
  table.append(head, body);
  wrap.append(table);
  panel.replaceChildren(wrap);
}

function isDue(record) {
  if (!record.next_follow_up || record.do_not_contact || record.status === 'closed') return false;
  const time = Date.parse(record.next_follow_up);
  return Number.isFinite(time) && time <= Date.now();
}

function renderSummary() {
  const values = [
    ['New consultations', inbox.consultations.filter(record => record.status === 'new').length, ''],
    ['Prospects', inbox.leads.length, ''],
    ['Follow-ups due', [...inbox.leads, ...inbox.consultations].filter(isDue).length, ''],
    ['Agent errors', inbox.agentRuns.filter(run => run.status === 'error').length, 'alert']
  ];
  summary.replaceChildren(...values.map(([label, value, tone]) => {
    const card = element('article', `summary-card${tone ? ` ${tone}` : ''}`);
    card.append(element('span', '', label), element('strong', '', value));
    return card;
  }));
  document.querySelector('[data-count="consultations"]').textContent = inbox.consultations.length;
  document.querySelector('[data-count="leads"]').textContent = inbox.leads.length;
  document.querySelector('[data-count="agents"]').textContent = inbox.agentRuns.length;
}

function selectTab(name, focus = false) {
  activeTab = name;
  const tabs = [...document.querySelectorAll('[data-tab]')];
  tabs.forEach(tab => {
    const selected = tab.dataset.tab === name;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    if (selected && focus) tab.focus();
  });
  document.querySelectorAll('[data-panel]').forEach(panel => {
    panel.hidden = panel.dataset.panel !== name;
  });
}

function renderInbox() {
  renderSummary();
  renderRecords('consultations', inbox.consultations, consultationCard, 'No consultation requests yet', 'New website inquiries will appear here.');
  renderRecords('leads', inbox.leads, leadCard, 'No prospects yet', 'Qualified prospects and draft outreach will appear here after the agents run.');
  renderAgents();
  selectTab(activeTab);
}

loginForm.addEventListener('submit', async event => {
  event.preventDefault();
  const button = loginForm.querySelector('[type="submit"]');
  button.disabled = true;
  setAccessStatus('Signing in…');
  try {
    const user = await login(loginForm.elements.email.value.trim(), loginForm.elements.password.value);
    await loadInbox(user);
  } catch (error) {
    setAccessStatus(friendlyError(error), true);
  } finally {
    button.disabled = false;
  }
});

document.querySelector('[data-signup]').addEventListener('click', async () => {
  if (!loginForm.reportValidity()) return;
  setAccessStatus('Creating owner access…');
  try {
    await signup(loginForm.elements.email.value.trim(), loginForm.elements.password.value, { full_name: 'SiteSync Owner' });
    const user = await getUser();
    if (user) await loadInbox(user);
    else setAccessStatus('Check your email and confirm the account, then return here to sign in.');
  } catch (error) {
    setAccessStatus(friendlyError(error), true);
  }
});

document.querySelector('[data-recovery]').addEventListener('click', async () => {
  const email = loginForm.elements.email.value.trim();
  if (!email || !loginForm.elements.email.reportValidity()) return;
  setAccessStatus('Sending password reset email…');
  try {
    await requestPasswordRecovery(email);
    setAccessStatus('Check your email for the password reset link.');
  } catch (error) {
    setAccessStatus(friendlyError(error), true);
  }
});

resetForm.addEventListener('submit', async event => {
  event.preventDefault();
  const button = resetForm.querySelector('[type="submit"]');
  button.disabled = true;
  setAccessStatus('Updating password…');
  try {
    await updateUser({ password: resetForm.elements.password.value });
    const user = await getUser();
    if (!user) throw new Error('Sign in with your new password.');
    await loadInbox(user);
  } catch (error) {
    setAccessStatus(friendlyError(error), true);
  } finally {
    button.disabled = false;
  }
});

document.querySelector('[data-signout]').addEventListener('click', async () => {
  try {
    await logout();
  } finally {
    showAccess('Signed out.');
  }
});

document.querySelector('[data-refresh]').addEventListener('click', async () => {
  const user = await getUser();
  if (!user) return showAccess('Your session ended. Sign in again.');
  try {
    await loadInbox(user, true);
    showToast('Inbox refreshed.');
  } catch (error) {
    dashboardStatus.textContent = friendlyError(error);
  }
});

const tabs = [...document.querySelectorAll('[data-tab]')];
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectTab(tab.dataset.tab));
  tab.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    let next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : index + (event.key === 'ArrowRight' ? 1 : -1);
    if (next < 0) next = tabs.length - 1;
    if (next >= tabs.length) next = 0;
    selectTab(tabs[next].dataset.tab, true);
  });
});

async function boot() {
  try {
    const callback = await handleAuthCallback();
    if (callback?.type === 'recovery') {
      accessPanel.hidden = false;
      loginForm.hidden = true;
      resetForm.hidden = false;
      setUser(callback.user);
      setAccessStatus('Choose a new password to finish recovering your account.');
      return;
    }
    const user = callback?.user || await getUser();
    if (!user) return showAccess();
    await loadInbox(user);
  } catch (error) {
    showAccess(friendlyError(error));
  }
}

boot();
