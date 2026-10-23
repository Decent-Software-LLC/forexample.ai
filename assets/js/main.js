/**
 * For Example AI - Main JavaScript
 */

document.addEventListener('DOMContentLoaded', function() {
    initThemeToggle();
    initSearchAndFilters();
    initTableOfContents();
    initReadingProgress();
});

/* ---------- Theme toggle ---------- */
function initThemeToggle() {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    btn.addEventListener('click', function() {
        const root = document.documentElement;
        const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        root.setAttribute('data-theme', next);
        try { localStorage.setItem('theme', next); } catch(e) {}
    });
}

/* ---------- Search + difficulty + topic filters ---------- */
function initSearchAndFilters() {
    const searchInput = document.getElementById('search');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const topicSelect = document.getElementById('topic-select');
    const topicBtn = document.getElementById('topic-select-btn');
    const topicLabel = document.querySelector('.topic-select-label');
    const topicOptions = document.querySelectorAll('.topic-option');
    const cards = document.querySelectorAll('.guide-card');
    const noResults = document.getElementById('no-results');
    const resultsCount = document.getElementById('results-count');
    const clearBtn = document.getElementById('clear-filters');

    if (!searchInput || cards.length === 0) return;

    let activeDifficulty = 'all';
    let activeTag = null;

    // Populate topic option counts
    const tagCounts = {};
    cards.forEach(function(card) {
        const tags = (card.getAttribute('data-tags') || '').split(',').filter(Boolean);
        tags.forEach(function(t) { tagCounts[t] = (tagCounts[t] || 0) + 1; });
    });
    topicOptions.forEach(function(opt) {
        const tag = opt.getAttribute('data-tag');
        const countEl = opt.querySelector('.count');
        if (countEl && tag && tagCounts[tag]) countEl.textContent = tagCounts[tag];
    });

    function setTopic(tag) {
        activeTag = tag || null;
        if (topicLabel) topicLabel.textContent = activeTag ? (activeTag.replace(/-/g, ' ')) : 'All topics';
        topicOptions.forEach(function(opt) {
            const on = (opt.getAttribute('data-tag') || '') === (activeTag || '');
            opt.classList.toggle('active', on);
            opt.setAttribute('aria-selected', on ? 'true' : 'false');
        });
    }

    function applyFilters() {
        const query = searchInput.value.trim().toLowerCase();
        let visible = 0;

        cards.forEach(function(card) {
            const difficulty = card.getAttribute('data-difficulty');
            const tagList = (card.getAttribute('data-tags') || '').split(',').map(function(t){return t.trim().toLowerCase();}).filter(Boolean);
            const title = card.getAttribute('data-title') || '';
            const desc = card.getAttribute('data-description') || '';

            const matchesDifficulty = activeDifficulty === 'all' || difficulty === activeDifficulty;
            const matchesTag = !activeTag || tagList.indexOf(activeTag) !== -1;
            const matchesQuery = !query || title.indexOf(query) !== -1 ||
                                 desc.indexOf(query) !== -1 || tagList.join(' ').indexOf(query) !== -1;

            const show = matchesDifficulty && matchesTag && matchesQuery;
            card.style.display = show ? '' : 'none';
            if (show) visible++;
        });

        if (noResults) noResults.style.display = visible === 0 ? 'block' : 'none';
        if (resultsCount) {
            resultsCount.textContent = visible + (visible === 1 ? ' guide' : ' guides');
        }
        const hasFilters = query || activeDifficulty !== 'all' || activeTag;
        if (clearBtn) clearBtn.classList.toggle('show', !!hasFilters);
    }

    searchInput.addEventListener('input', applyFilters);

    filterBtns.forEach(function(btn) {
        btn.addEventListener('click', function() {
            filterBtns.forEach(function(b) { b.classList.remove('active'); });
            btn.classList.add('active');
            activeDifficulty = btn.getAttribute('data-difficulty');
            applyFilters();
        });
    });

    // Topic dropdown open/close
    if (topicSelect && topicBtn) {
        topicBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            const open = topicSelect.classList.toggle('open');
            topicBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
        document.addEventListener('click', function(e) {
            if (!topicSelect.contains(e.target)) {
                topicSelect.classList.remove('open');
                topicBtn.setAttribute('aria-expanded', 'false');
            }
        });
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                topicSelect.classList.remove('open');
                topicBtn.setAttribute('aria-expanded', 'false');
            }
        });
    }

    topicOptions.forEach(function(opt) {
        opt.addEventListener('click', function() {
            setTopic(opt.getAttribute('data-tag'));
            if (topicSelect) topicSelect.classList.remove('open');
            applyFilters();
        });
    });

    if (clearBtn) {
        clearBtn.addEventListener('click', function() {
            searchInput.value = '';
            activeDifficulty = 'all';
            filterBtns.forEach(function(b) { b.classList.toggle('active', b.getAttribute('data-difficulty') === 'all'); });
            setTopic(null);
            applyFilters();
        });
    }

    // Honor ?tag= from the landing page topic strip
    const urlTag = new URLSearchParams(window.location.search).get('tag');
    if (urlTag) {
        const exists = Array.prototype.some.call(topicOptions, function(o) { return o.getAttribute('data-tag') === urlTag; });
        if (exists) setTopic(urlTag);
    }

    applyFilters();
}

/* ---------- Table of Contents ---------- */
function initTableOfContents() {
    const toc = document.querySelector('.table-of-contents');
    if (!toc) return;

    const toggleBtn = toc.querySelector('.toc-toggle');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', function() {
            toc.classList.toggle('collapsed');
            const guide = document.querySelector('.guide');
            if (guide) guide.classList.toggle('toc-collapsed', toc.classList.contains('collapsed'));
        });
    }

    // Mobile: start collapsed by default
    if (window.innerWidth < 768) {
        toc.classList.add('collapsed');
        const guide = document.querySelector('.guide');
        if (guide) guide.classList.add('toc-collapsed');
    }

    const headings = document.querySelectorAll('.guide-main-content h2[id], .guide-main-content h3[id]');
    const tocLinks = document.querySelectorAll('.toc-list a[href^="#"]');
    if (headings.length === 0) return;

    const linkMap = {};
    tocLinks.forEach(function(link) {
        linkMap[link.getAttribute('href').substring(1)] = link;
    });

    function updateActiveToc() {
        let current = null;
        const scrollPos = window.scrollY + 120;
        headings.forEach(function(h) {
            if (h.offsetTop <= scrollPos) current = h.id;
        });
        tocLinks.forEach(function(link) { link.classList.remove('active'); });
        if (current && linkMap[current]) linkMap[current].classList.add('active');
    }

    let ticking = false;
    window.addEventListener('scroll', function() {
        if (!ticking) {
            window.requestAnimationFrame(function() { updateActiveToc(); ticking = false; });
            ticking = true;
        }
    });
    updateActiveToc();
}

/* ---------- Reading Progress ---------- */
function initReadingProgress() {
    const bar = document.querySelector('.reading-progress-bar');
    if (!bar) return;

    function update() {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = docHeight > 0 ? Math.min(100, (scrollTop / docHeight) * 100) : 0;
        bar.style.width = progress + '%';
    }

    let ticking = false;
    window.addEventListener('scroll', function() {
        if (!ticking) {
            window.requestAnimationFrame(function() { update(); ticking = false; });
            ticking = true;
        }
    });
    update();
}
