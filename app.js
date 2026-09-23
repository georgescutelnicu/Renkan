let kanjiData = {};
let radicalsData = {};

function init() {
    Promise.all([
        fetch('data/kanji_db.json').then(res => {
            if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
            return res.json();
        }),
        fetch('data/radicals_db.json').then(res => {
            if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
            return res.json();
        })
    ])
    .then(([kanji, radicals]) => {
        kanjiData = kanji;
        radicalsData = radicals;

        renderKanjiTab();
        renderRadicalsTab();
    })
    .catch(err => {
        console.error("Error loading JSON:", err);
    });
}

function handleSearch(query) {
    const term = query.toLowerCase().trim();

    document.querySelectorAll('#kanjiContainer .kanji-button').forEach(btn => {
        const meaning = (btn.title || '').toLowerCase();
        const symbol = btn.textContent.toLowerCase();
        const matches = meaning.includes(term) || symbol.includes(term);
        btn.style.display = matches ? 'flex' : 'none';
    });

    document.querySelectorAll('#kanjiContainer .kanji-lesson').forEach(lesson => {
        const visibleButtons = lesson.querySelectorAll('.kanji-button[style="display: flex;"], .kanji-button:not([style*="display: none"])');
        lesson.style.display = visibleButtons.length > 0 ? 'block' : 'none';
    });

    document.querySelectorAll('#radicalsGrid .kanji-button').forEach(btn => {
        const name = (btn.title || '').toLowerCase();
        const symbol = btn.textContent.toLowerCase();
        const matches = name.includes(term) || symbol.includes(term);
        btn.style.display = matches ? 'flex' : 'none';
    });
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));

    if (tabName === 'kanji') {
        document.getElementById('kanjiView').classList.add('active');
        document.getElementById('kanjiTabBtn').classList.add('active');
    } else {
        document.getElementById('radicalsView').classList.add('active');
        document.getElementById('radicalTabBtn').classList.add('active');
    }
}

function renderKanjiTab() {
    const container = document.getElementById('kanjiContainer');
    container.innerHTML = '';

    const grades = {
        "Grade 1": [],
        "Grade 2": [],
        "Grade 3": [],
        "Grade 4": [],
        "Grade 5": [],
        "Grade 6": [],
        "Grade 7+": []
    };

    for (const [symbol, info] of Object.entries(kanjiData)) {
        const grade = Number(info.grade);
        if (grade >= 1 && grade <= 6) {
            grades[`Grade ${grade}`].push({ symbol, info });
        } else {
            grades["Grade 7+"].push({ symbol, info });
        }
    }

    for (const [gradeName, items] of Object.entries(grades)) {
        if (items.length === 0) continue;

        const lessonDiv = document.createElement('div');
        lessonDiv.className = 'kanji-lesson';

        const h3 = document.createElement('h3');
        h3.textContent = gradeName;

        const p = document.createElement('p');
        p.textContent = `${items.length} Kanji characters`;

        const grid = document.createElement('div');
        grid.className = 'kanji-grid';

        items.forEach(({ symbol, info }) => {
            const btn = document.createElement('button');
            btn.className = 'kanji-button';
            btn.textContent = symbol;
            btn.title = (info.meanings || []).join(', ');
            btn.onclick = () => openKanjiModal(symbol);
            grid.appendChild(btn);
        });

        const hr = document.createElement('hr');
        hr.className = 'lesson-divider';

        lessonDiv.appendChild(h3);
        lessonDiv.appendChild(p);
        lessonDiv.appendChild(grid);
        lessonDiv.appendChild(hr);

        container.appendChild(lessonDiv);
    }
}

function renderRadicalsTab() {
    const grid = document.getElementById('radicalsGrid');
    grid.innerHTML = '';

    for (const [symbol, info] of Object.entries(radicalsData)) {
        const btn = document.createElement('button');
        btn.className = 'kanji-button';
        btn.textContent = symbol;
        btn.title = info.name || '';
        btn.onclick = () => openRadicalModal(symbol);
        grid.appendChild(btn);
    }
}

function animateSvgStrokes(svgElement) {
    const strokePaths = svgElement.querySelectorAll("path");
    if (strokePaths.length === 0) return;

    const strokeDuration = 0.45;
    const pauseDuration = 3.0;
    const pathLengths = [];

    strokePaths.forEach((path) => {
        const length = path.getTotalLength();
        pathLengths.push(length);
        path.style.strokeDasharray = length;
        path.style.strokeDashoffset = length;
    });

    function startDrawingLoop() {
        let totalTime = 0;

        strokePaths.forEach((path, index) => {
            const length = pathLengths[index];
            path.style.transition = 'none';
            path.style.strokeDashoffset = length;

            path.getBoundingClientRect();

            path.style.transition = `stroke-dashoffset ${strokeDuration}s ease-in-out ${totalTime}s`;
            path.style.strokeDashoffset = '0';

            totalTime += strokeDuration;
        });

        const cycleTotalMs = (totalTime + pauseDuration) * 1000;

        if (svgElement.dataset.loopTimer) {
            clearTimeout(Number(svgElement.dataset.loopTimer));
        }

        const timerId = setTimeout(() => {
            startDrawingLoop();
        }, cycleTotalMs);

        svgElement.dataset.loopTimer = timerId;
    }

    startDrawingLoop();
}

function openKanjiModal(symbol) {
    const info = kanjiData[symbol];
    if (!info) return;

    const modalBody = document.getElementById('modalBody');
    const meanings = (info.meanings || []).join(', ');
    const onyomi = (info.onyomi || []).join(', ') || '-';
    const kunyomi = (info.kunyomi || []).join(', ') || '-';
    const radicals = info.radicals || [];
    const strokeSvgUrl = info.stroke_order_svg || null;

    const gradeNum = Number(info.grade);
    const displayGrade = (gradeNum >= 7) ? '7+' : (info.grade || 'N/A');

    let radicalsHTML = '';
    if (radicals.length > 0) {
        radicalsHTML = `
            <div class="section-subhead">Decomposed Radicals</div>
            <div class="kanji-grid modal-grid">
                ${radicals.map(r => `
                    <button class="kanji-button" onclick="openRadicalModal('${r.symbol}')" title="${r.name}">
                        ${r.symbol}
                    </button>
                `).join('')}
            </div>
        `;
    } else {
        radicalsHTML = `
            <div class="section-subhead">Decomposed Radicals</div>
            <p class="text-muted">No child radicals listed.</p>
        `;
    }

    modalBody.innerHTML = `
        <div class="kanji-character">
            <div class="kanji-display-box" id="kanjiSvgContainer"></div>
            <h2 class="kanji-meaning">${meanings}</h2>
        </div>

        <div class="readings">
            <div class="reading-card">
                <div class="reading-title">Onyomi</div>
                <div>${onyomi}</div>
            </div>
            <div class="reading-card">
                <div class="reading-title">Kunyomi</div>
                <div>${kunyomi}</div>
            </div>
        </div>

        <p class="grade-info">
            <strong>Grade:</strong> ${displayGrade} &nbsp;|&nbsp; 
            <strong>Strokes:</strong> ${info.strokes || 'N/A'}
        </p>

        ${radicalsHTML}
    `;

    document.getElementById('modalOverlay').classList.add('active');

    if (strokeSvgUrl) {
        fetch(strokeSvgUrl)
            .then(res => res.text())
            .then(svgText => {
                const parser = new DOMParser();
                const svgDoc = parser.parseFromString(svgText, "image/svg+xml");
                const svgElement = svgDoc.querySelector("svg");

                if (svgElement) {
                    svgElement.setAttribute("width", "100%");
                    svgElement.setAttribute("height", "100%");

                    const container = document.getElementById('kanjiSvgContainer');
                    if (container) {
                        container.innerHTML = '';
                        container.appendChild(svgElement);
                        animateSvgStrokes(svgElement);
                    }
                }
            })
            .catch(err => {
                console.warn("SVG fetch failed, loading text fallback:", err);
                const container = document.getElementById('kanjiSvgContainer');
                if (container) {
                    container.innerHTML = `<span class="kanji-text-fallback">${symbol}</span>`;
                }
            });
    } else {
        const container = document.getElementById('kanjiSvgContainer');
        if (container) {
            container.innerHTML = `<span class="kanji-text-fallback">${symbol}</span>`;
        }
    }
}

function openRadicalModal(symbol) {
    const info = radicalsData[symbol];
    if (!info) return;

    const modalBody = document.getElementById('modalBody');
    const kanjiSymbols = info.kanji_symbols || [];

    let formedKanjiHTML = '';
    if (kanjiSymbols.length > 0) {
        formedKanjiHTML = `
            <div class="section-subhead">Used in ${kanjiSymbols.length} Kanji Characters</div>
            <div class="kanji-grid modal-grid">
                ${kanjiSymbols.map(k => `
                    <button class="kanji-button" onclick="openKanjiModal('${k}')">${k}</button>
                `).join('')}
            </div>
        `;
    } else {
        formedKanjiHTML = `<p class="text-muted">No Kanji found for this radical.</p>`;
    }

    modalBody.innerHTML = `
        <div class="kanji-character">
            <div class="kanji-display-box">
                <span class="kanji-text-fallback">${symbol}</span>
            </div>
            <h2 class="kanji-meaning">Radical: "${info.name || ''}"</h2>
        </div>

        ${formedKanjiHTML}
    `;

    document.getElementById('modalOverlay').classList.add('active');
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('active');
}

function closeModalOnOuterClick(event) {
    if (event.target.id === 'modalOverlay') {
        closeModal();
    }
}

init();