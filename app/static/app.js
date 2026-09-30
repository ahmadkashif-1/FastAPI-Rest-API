const API_BASE_URL = '';
const state = {
  token: localStorage.getItem('meridian_token'),
  user: null,
  posts: [],
  authMode: 'login',
  chatBusy: false,
  theme: localStorage.getItem('meridian_theme') || 'night',
  density: localStorage.getItem('meridian_density') || 'balanced',
  editingPostId: null,
  readerArticleId: null
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]));
}

function formatDate(value) {
  if (!value) return 'Date not recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function initials(value) {
  return String(value || '?').split(/[@.\s_-]+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?';
}

function setStatus(element, message, type = 'success') {
  element.textContent = message;
  element.className = `status-box show ${type}`;
}

function setView(viewName) {
  $$('.nav-item').forEach((item) => item.classList.toggle('active', item.dataset.view === viewName));
  $$('.header-nav-item').forEach((item) => item.classList.toggle('active', item.dataset.view === viewName));
  $$('.view').forEach((view) => view.classList.toggle('active', view.id === `${viewName}-view`));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function applyPreferences() {
  document.documentElement.dataset.theme = state.theme;
  document.documentElement.dataset.density = state.density;
  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) themeColor.setAttribute('content', state.theme === 'night' ? '#101d2a' : state.theme === 'contrast' ? '#ffffff' : '#f5f7f4');
  $$('.appearance-option').forEach((option) => option.classList.toggle('active', option.dataset.theme === state.theme));
  $$('.density-option').forEach((option) => option.classList.toggle('active', option.dataset.density === state.density));
}

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.detail || 'The request could not be completed.');
  return payload;
}

function renderArticleCard(article) {
  const preview = String(article.content || '').replace(/[#*_>`~-]/g, '').replace(/\s+/g, ' ').trim();
  return `<article class="research-card" data-article-id="${article.id}"><button class="article-hit-area" type="button" data-open-article="${article.id}" aria-label="Read ${escapeHtml(article.title || 'research article')}"><span class="tag">Published work</span><h3>${escapeHtml(article.title || 'Untitled research')}</h3><p>${escapeHtml(preview.slice(0, 145))}${preview.length > 145 ? '...' : ''}</p></button><div class="card-footer"><button class="author-link" type="button" data-open-researcher="${escapeHtml(article.author_email || 'Independent researcher')}"><span class="avatar">${escapeHtml(initials(article.author_email))}</span><span>${escapeHtml(article.author_email || 'Independent researcher')}</span></button><span>·</span><span>${escapeHtml(formatDate(article.created_at))}</span><button class="read-link" type="button" data-open-article="${article.id}">Read <i data-lucide="arrow-up-right"></i></button></div></article>`;
}

function renderLatest() {
  const sorted = [...state.posts].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  const featured = sorted[0];
  const feature = $('#featuredArticle');
  if (!featured) {
    feature.innerHTML = '<p class="empty-state">Your network is ready for its first publication.</p>';
    $('#latestList').innerHTML = '';
    return;
  }
  feature.innerHTML = `<button class="feature-hit-area" type="button" data-open-article="${featured.id}"><span class="eyebrow">Featured in the archive</span><h2>${escapeHtml(featured.title)}</h2><p>${escapeHtml(String(featured.content || '').replace(/\s+/g, ' ').slice(0, 210))}...</p><span class="feature-read">Read full paper <i data-lucide="arrow-up-right"></i></span></button><div class="feature-meta"><button class="author-link" type="button" data-open-researcher="${escapeHtml(featured.author_email || 'Independent researcher')}"><span class="avatar">${escapeHtml(initials(featured.author_email))}</span>${escapeHtml(featured.author_email || 'Independent researcher')}</button> <span>·</span> ${escapeHtml(formatDate(featured.created_at))}</div>`;
  $('#latestList').innerHTML = sorted.slice(1, 5).map((article) => `<article class="latest-item"><button class="latest-hit-area" type="button" data-open-article="${article.id}"><span class="tag">New publication</span><h3>${escapeHtml(article.title || 'Untitled research')}</h3><span class="item-meta">${escapeHtml(article.author_email || 'Independent researcher')} · ${escapeHtml(formatDate(article.created_at))}</span></button></article>`).join('') || '<p class="empty-state">More work will appear here as it is published.</p>';
  lucide.createIcons();
}

function renderDiscover(query = '') {
  const needle = query.trim().toLowerCase().replace(/^#/, '');
  const filtered = state.posts.filter((article) => [article.id, article.title, article.content, article.author_email].join(' ').toLowerCase().includes(needle));
  $('#resultCount').textContent = `${filtered.length} ${filtered.length === 1 ? 'work' : 'works'}`;
  $('#articlesGrid').innerHTML = filtered.length ? filtered.map(renderArticleCard).join('') : '<p class="empty-state">No work matches that search yet.</p>';
  lucide.createIcons();
}

function openArticle(id) {
  const article = state.posts.find((post) => String(post.id) === String(id));
  if (!article) return;
  state.readerArticleId = article.id;
  $('#readerTitle').textContent = article.title || 'Untitled research';
  $('#readerByline').innerHTML = `<button class="author-link" type="button" data-open-researcher="${escapeHtml(article.author_email || 'Independent researcher')}"><span class="avatar">${escapeHtml(initials(article.author_email))}</span>${escapeHtml(article.author_email || 'Independent researcher')}</button><span>·</span><span>${escapeHtml(formatDate(article.created_at))}</span>`;
  $('#readerContent').innerHTML = escapeHtml(article.content || '').replace(/\n/g, '<br><br>');
  const isOwner = Boolean(state.user) && article.owner_id === state.user.id;
  $('#readerOwnerActions').hidden = !isOwner;
  $('#readerModal').classList.add('open');
  $('#readerModal').setAttribute('aria-hidden', 'false');
}

function openResearcher(email) {
  const identity = email || 'Independent researcher';
  const works = state.posts.filter((post) => (post.author_email || 'Independent researcher') === identity);
  $('#researcherAvatar').textContent = initials(identity);
  $('#researcherName').textContent = identity.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  $('#researcherEmail').textContent = identity;
  $('#researcherWorks').innerHTML = works.length ? works.map((post) => `<button class="researcher-work" type="button" data-open-article="${post.id}"><strong>${escapeHtml(post.title)}</strong><span>${escapeHtml(formatDate(post.created_at))}</span></button>`).join('') : '<p class="empty-state">No published work yet.</p>';
  $('#researcherModal').classList.add('open');
  $('#researcherModal').setAttribute('aria-hidden', 'false');
}

function closeReader() { $('#readerModal').classList.remove('open'); $('#readerModal').setAttribute('aria-hidden', 'true'); state.readerArticleId = null; }
function closeResearcher() { $('#researcherModal').classList.remove('open'); $('#researcherModal').setAttribute('aria-hidden', 'true'); }

function renderProfile() {
  if (!state.user) {
    $('#profileName').textContent = 'Your Meridian profile';
    $('#profileEmail').textContent = 'Sign in to claim your profile.';
    $('#profileAvatar').textContent = '?';
    $('#profileWorks').innerHTML = '<p class="empty-state">Sign in to see your published work.</p>';
    $('#contextSummary').textContent = 'Sign in to give the assistant useful context about your discipline and published work.';
    return;
  }
  const name = state.user.email.split('@')[0].replace(/[._-]/g, ' ');
  $('#profileName').textContent = name.replace(/\b\w/g, (letter) => letter.toUpperCase());
  $('#profileEmail').textContent = state.user.email;
  $('#profileAvatar').textContent = initials(state.user.email);
  $('#contextSummary').textContent = `The assistant knows you are ${state.user.email} and can use your ${state.posts.filter((post) => post.owner_id === state.user.id).length} published work as context.`;
  const ownPosts = state.posts.filter((post) => post.owner_id === state.user.id);
  $('#profileWorks').innerHTML = ownPosts.length ? ownPosts.map((post) => `<div class="profile-work"><button class="profile-work-open" type="button" data-open-article="${post.id}"><h3>${escapeHtml(post.title)}</h3><p>#${post.id} · ${escapeHtml(formatDate(post.created_at))} · Publicly available in the archive</p></button><div class="profile-work-actions"><button type="button" class="icon-text-button" data-edit-article="${post.id}" title="Edit"><i data-lucide="pencil"></i>Edit</button><button type="button" class="icon-text-button danger" data-delete-article="${post.id}" title="Delete"><i data-lucide="trash-2"></i>Delete</button></div></div>`).join('') : '<p class="empty-state">You have not published a work yet.</p>';
  lucide.createIcons();
}

async function loadPosts() {
  try {
    state.posts = await api('/posts/');
  } catch (error) {
    state.posts = [];
    $('#featuredArticle').innerHTML = `<p class="empty-state">${escapeHtml(error.message)} <button class="text-button" id="retryLoad">Try again</button></p>`;
    return;
  }
  renderLatest();
  renderDiscover($('#discoverSearch').value);
  renderProfile();
}

function openAuth() { $('#authModal').classList.add('open'); $('#authModal').setAttribute('aria-hidden', 'false'); $('#authEmail').focus(); }
function closeAuth() { $('#authModal').classList.remove('open'); $('#authModal').setAttribute('aria-hidden', 'true'); }
function updateAuthUi() {
  const signedIn = Boolean(state.user);
  $('#headerAvatar').textContent = signedIn ? initials(state.user.email) : '?';
  $('#headerIdentity').textContent = signedIn ? state.user.email.split('@')[0] : 'Sign in';
  $('#profileAuth').textContent = signedIn ? 'Sign out' : 'Sign in';
}

async function loadUserFromToken() {
  if (!state.token) return;
  try {
    const tokenPayload = JSON.parse(atob(state.token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    state.user = await api(`/users/${tokenPayload.user_id}`);
  } catch (error) {
    localStorage.removeItem('meridian_token');
    state.token = null;
  }
  updateAuthUi();
}

async function submitAuth(event) {
  event.preventDefault();
  const email = $('#authEmail').value.trim();
  const password = $('#authPassword').value;
  const submit = $('#authSubmit');
  submit.disabled = true;
  try {
    if (state.authMode === 'register') {
      await api('/users/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    }
    const body = new URLSearchParams({ username: email, password });
    const token = await api('/login', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
    state.token = token.access_token;
    localStorage.setItem('meridian_token', state.token);
    await loadUserFromToken();
    closeAuth();
    await loadPosts();
  } catch (error) {
    setStatus($('#authStatus'), error.message, 'error');
  } finally { submit.disabled = false; }
}

function toggleAuthMode() {
  state.authMode = state.authMode === 'login' ? 'register' : 'login';
  const register = state.authMode === 'register';
  $('#authEyebrow').textContent = register ? 'Join the network' : 'Welcome back';
  $('#authTitle').textContent = register ? 'Give your work a home.' : 'Return to the conversation.';
  $('#authSubmit').innerHTML = `${register ? 'Create account' : 'Sign in'} <i data-lucide="arrow-right"></i>`;
  $('#authSwitch').innerHTML = `${register ? 'Already have an account?' : 'New to Meridian?'} <button type="button">${register ? 'Sign in' : 'Create an account'}</button>`;
  lucide.createIcons();
}

async function submitArticle(event) {
  event.preventDefault();
  if (!state.token) { openAuth(); return; }
  const title = $('#articleTitle').value.trim();
  const content = $('#articleContent').value.trim();
  try {
    await api('/posts/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, content, published: true }) });
    setStatus($('#publishStatus'), 'Your work is now part of the Meridian archive.', 'success');
    event.target.reset();
    await loadPosts();
    setView('latest');
  } catch (error) { setStatus($('#publishStatus'), error.message, 'error'); }
}

function openEditModal(id) {
  const article = state.posts.find((post) => String(post.id) === String(id));
  if (!article) return;
  if (!state.user || article.owner_id !== state.user.id) return;
  state.editingPostId = article.id;
  $('#editTitle').value = article.title || '';
  $('#editContent').value = article.content || '';
  $('#editStatus').className = 'status-box';
  $('#editModal').classList.add('open');
  $('#editModal').setAttribute('aria-hidden', 'false');
  $('#editTitle').focus();
}

function closeEditModal() {
  state.editingPostId = null;
  $('#editModal').classList.remove('open');
  $('#editModal').setAttribute('aria-hidden', 'true');
}

async function submitEditArticle(event) {
  event.preventDefault();
  if (!state.editingPostId) return;
  const title = $('#editTitle').value.trim();
  const content = $('#editContent').value.trim();
  const submit = $('#editSubmit');
  submit.disabled = true;
  try {
    await api(`/posts/${state.editingPostId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, content, published: true }) });
    closeEditModal();
    await loadPosts();
    if (state.readerArticleId != null) openArticle(state.readerArticleId);
  } catch (error) {
    setStatus($('#editStatus'), error.message, 'error');
  } finally { submit.disabled = false; }
}

async function deleteArticle(id) {
  const article = state.posts.find((post) => String(post.id) === String(id));
  if (!article) return;
  if (!state.user || article.owner_id !== state.user.id) return;
  const confirmed = window.confirm(`Delete "${article.title}"? This cannot be undone.`);
  if (!confirmed) return;
  try {
    await api(`/posts/${id}`, { method: 'DELETE' });
    if (String(state.readerArticleId) === String(id)) closeReader();
    await loadPosts();
  } catch (error) {
    window.alert(error.message);
  }
}

function setChatBusy(isBusy) {
  state.chatBusy = isBusy;
  ['#chatInput', '#floatingChatInput'].forEach((selector) => { const input = $(selector); if (input) input.disabled = isBusy; });
  ['#chatForm button[type="submit"]', '#floatingChatForm button[type="submit"]'].forEach((selector) => { const button = $(selector); if (button) button.disabled = isBusy; });
  ['#newChat', '#newFloatingChat'].forEach((selector) => { const button = $(selector); if (button) button.disabled = isBusy; });
}

function resetChat(messagesSelector) {
  if (state.chatBusy) return;
  const messages = $(messagesSelector);
  if (!messages) return;
  const isFloating = messagesSelector === '#floatingMessages';
  messages.innerHTML = `<div class="message assistant-message"><span class="avatar ai-avatar" aria-hidden="true"><span class="ai-mark"><span>M</span><small>AI</small></span></span><div><strong>Meridian AI</strong><p>${isFloating ? 'I can help frame a question, synthesize a draft, or find the next useful angle.' : 'I can help you shape a research question, compare ideas, or find the signal in a long draft. What are you working through?'}</p></div></div>`;
}

async function submitChat(event, inputSelector, messagesSelector) {
  event.preventDefault();
  if (state.chatBusy) return;
  const input = $(inputSelector);
  const prompt = input.value.trim();
  if (!prompt) return;
  const messages = $(messagesSelector);
  messages.insertAdjacentHTML('beforeend', `<div class="message"><span class="avatar">${escapeHtml(initials(state.user?.email))}</span><div><strong>You</strong><p>${escapeHtml(prompt)}</p></div></div>`);
  messages.insertAdjacentHTML('beforeend', '<div class="message assistant-message typing-message"><span class="avatar ai-avatar" aria-hidden="true"><span class="ai-mark"><span>M</span><small>AI</small></span></span><div><strong>Meridian AI</strong><p class="typing-dots"><i></i><i></i><i></i></p></div></div>');
  input.value = '';
  setChatBusy(true);
  try {
    const response = await api('/assistant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: prompt }) });
    messages.querySelector('.typing-message')?.remove();
    messages.insertAdjacentHTML('beforeend', `<div class="message assistant-message"><span class="avatar ai-avatar" aria-hidden="true"><span class="ai-mark"><span>M</span><small>AI</small></span></span><div><strong>Meridian AI</strong><p>${escapeHtml(response.reply)}</p></div></div>`);
  } catch (error) {
    messages.querySelector('.typing-message')?.remove();
    messages.insertAdjacentHTML('beforeend', `<div class="message assistant-message"><span class="avatar ai-avatar">!</span><div><strong>Assistant unavailable</strong><p>${escapeHtml(error.message)}</p></div></div>`);
  } finally {
    setChatBusy(false);
  }
}

function sendChat(event) { return submitChat(event, '#chatInput', '#chatMessages'); }
function sendFloatingChat(event) { return submitChat(event, '#floatingChatInput', '#floatingMessages'); }
function toggleGemini() {
  const popover = $('#geminiPopover');
  const isOpen = popover.classList.toggle('open');
  popover.setAttribute('aria-hidden', String(!isOpen));
  $('#geminiFab').setAttribute('aria-expanded', String(isOpen));
  if (isOpen) $('#floatingChatInput').focus();
}

function ensureChatControls() {
  const mainForm = $('#chatForm');
  if (mainForm && !$('#newChat')) {
    const button = document.createElement('button');
    button.className = 'chat-reset';
    button.id = 'newChat';
    button.type = 'button';
    button.title = 'Start a new chat';
    button.innerHTML = '<i data-lucide="refresh-cw"></i> New chat';
    mainForm.insertAdjacentElement('afterend', button);
  }
  const popoverActions = $('.gemini-popover-head');
  if (popoverActions && !$('#newFloatingChat')) {
    const button = document.createElement('button');
    button.className = 'chat-reset icon-only';
    button.id = 'newFloatingChat';
    button.type = 'button';
    button.title = 'Start a new chat';
    button.innerHTML = '<i data-lucide="refresh-cw"></i>';
    popoverActions.append(button);
  }
  lucide.createIcons();
}

$$('[data-view]').forEach((element) => element.addEventListener('click', () => setView(element.dataset.view)));
$('#globalSearch').addEventListener('input', (event) => { setView('discover'); $('#discoverSearch').value = event.target.value; renderDiscover(event.target.value); });
$('#discoverSearch').addEventListener('input', (event) => renderDiscover(event.target.value));
$$('.topic-links button').forEach((button) => button.addEventListener('click', () => { setView('discover'); $('#discoverSearch').value = button.dataset.query; renderDiscover(button.dataset.query); }));
$('.filter-button').addEventListener('click', () => { $('#discoverSearch').focus(); $('#discoverSearch').placeholder = 'Search by discipline, title, or author...'; });
$('#openAssistant').addEventListener('click', () => setView('assistant'));
$('#openLogin').addEventListener('click', () => state.user ? setView('profile') : openAuth());
$('#profileAuth').addEventListener('click', () => { if (state.user) { state.user = null; state.token = null; localStorage.removeItem('meridian_token'); updateAuthUi(); renderProfile(); } else openAuth(); });
$('#closeLogin').addEventListener('click', closeAuth);
$('#authModal').addEventListener('click', (event) => { if (event.target === $('#authModal')) closeAuth(); });
$('#authForm').addEventListener('submit', submitAuth);
$('#authSwitch').addEventListener('click', toggleAuthMode);
$('#publishForm').addEventListener('submit', submitArticle);
$('#chatForm').addEventListener('submit', sendChat);
$('#geminiFab').addEventListener('click', toggleGemini);
$('#closeGemini').addEventListener('click', toggleGemini);
$('#floatingChatForm').addEventListener('submit', sendFloatingChat);
ensureChatControls();
$('#newChat').addEventListener('click', () => resetChat('#chatMessages'));
$('#newFloatingChat').addEventListener('click', () => resetChat('#floatingMessages'));
$$('.appearance-option').forEach((option) => option.addEventListener('click', () => { state.theme = option.dataset.theme; localStorage.setItem('meridian_theme', state.theme); applyPreferences(); }));
$$('.density-option').forEach((option) => option.addEventListener('click', () => { state.density = option.dataset.density; localStorage.setItem('meridian_density', state.density); applyPreferences(); }));
document.addEventListener('click', (event) => {
  const articleTarget = event.target.closest('[data-open-article]');
  const researcherTarget = event.target.closest('[data-open-researcher]');
  const editTarget = event.target.closest('[data-edit-article]');
  const deleteTarget = event.target.closest('[data-delete-article]');
  if (editTarget) openEditModal(editTarget.dataset.editArticle);
  else if (deleteTarget) deleteArticle(deleteTarget.dataset.deleteArticle);
  else if (articleTarget) openArticle(articleTarget.dataset.openArticle);
  else if (researcherTarget) openResearcher(researcherTarget.dataset.openResearcher);
  else if (event.target.closest('#retryLoad')) loadPosts();
});
$('#closeReader').addEventListener('click', closeReader);
$('#closeResearcher').addEventListener('click', closeResearcher);
$('#readerModal').addEventListener('click', (event) => { if (event.target === $('#readerModal')) closeReader(); });
$('#researcherModal').addEventListener('click', (event) => { if (event.target === $('#researcherModal')) closeResearcher(); });
$('#readerEditBtn').addEventListener('click', () => { if (state.readerArticleId != null) openEditModal(state.readerArticleId); });
$('#readerDeleteBtn').addEventListener('click', () => { if (state.readerArticleId != null) deleteArticle(state.readerArticleId); });
$('#closeEdit').addEventListener('click', closeEditModal);
$('#editModal').addEventListener('click', (event) => { if (event.target === $('#editModal')) closeEditModal(); });
$('#editForm').addEventListener('submit', submitEditArticle);
document.addEventListener('keydown', (event) => { if (event.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') { event.preventDefault(); $('#globalSearch').focus(); } if (event.key === 'Escape') { closeAuth(); closeReader(); closeResearcher(); closeEditModal(); } });

$$('[data-lucide="sparkles"]').forEach((icon) => icon.setAttribute('data-lucide', 'bot'));
lucide.createIcons();
applyPreferences();
loadUserFromToken().finally(loadPosts);