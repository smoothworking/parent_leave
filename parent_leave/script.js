// ---------- CONFIGURATION ----------
const holidays = [
    '2026-01-01', '2026-02-16', '2026-02-17', '2026-02-18', '2026-03-01', '2026-03-02',
    '2026-05-05', '2026-05-24', '2026-05-25', '2026-06-06', '2026-08-15', '2026-08-17',
    '2026-09-24', '2026-09-25', '2026-09-26', '2026-10-03', '2026-10-05', '2026-10-09', '2026-12-25'
];

const TIMELINE_START = new Date('2026-01-01');
const TIMELINE_END = new Date('2027-12-31');
const TOTAL_DAYS = (TIMELINE_END - TIMELINE_START) / (1000 * 60 * 60 * 24);

// ---------- UTILS ----------
function isBusinessDay(date) {
    const day = date.getDay();
    if (day === 0 || day === 6) return false;
    const dateString = date.toISOString().split('T')[0];
    return !holidays.includes(dateString);
}

function dateToPercent(dateObj) {
    let diff = (dateObj - TIMELINE_START) / (1000 * 60 * 60 * 24);
    let pct = (diff / TOTAL_DAYS) * 100;
    return Math.max(0, Math.min(100, pct));
}

function formatDateShort(dateObj) {
    return `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
}

function formatDateKorean(dateObj) {
    const y = dateObj.getFullYear() % 100;
    const m = dateObj.getMonth() + 1;
    const d = dateObj.getDate();
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const dayName = days[dateObj.getDay()];
    return `'${y}년 ${m}월 ${d}일 (${dayName})`;
}

// ---------- INITIALIZATION ----------
function initTimelineGrid() {
    const header = document.getElementById('t-header');
    const grid = document.getElementById('t-grid');

    for (let i = 0; i < 24; i++) {
        const year = 2026 + Math.floor(i / 12);
        const month = (i % 12) + 1;

        const mCol = document.createElement('div');
        mCol.className = 'month-col';

        const span = document.createElement('span');
        if (month === 1) span.innerText = `${year % 100}.1`;
        else span.innerText = month;
        span.style.fontSize = month === 1 ? '0.75rem' : '0.65rem';
        span.style.fontWeight = month === 1 ? '700' : '400';
        span.style.color = month === 1 ? '#333' : '#bbb';

        mCol.appendChild(span);
        header.appendChild(mCol);

        const gLine = document.createElement('div');
        gLine.className = 'grid-line';
        grid.appendChild(gLine);
    }
}

// ---------- CALCULATION ----------
function updateBar(barId, labelId, start, end) {
    if (start > end) {
        document.getElementById(barId).classList.remove('active');
        return;
    }

    const startPct = dateToPercent(start);
    const endPct = dateToPercent(end);
    let widthPct = endPct - startPct;
    if (widthPct < 0.5) widthPct = 0.5;

    const bar = document.getElementById(barId);
    bar.style.left = startPct + '%';
    bar.style.width = widthPct + '%';
    bar.classList.add('active');

    const lbl = document.getElementById(labelId);
    lbl.innerText = `${formatDateShort(start)}~${formatDateShort(end)}`;
    if (widthPct < 5) lbl.style.display = 'none';
    else lbl.style.display = 'inline';
}

function calculate() {
    // TOGGLE CHECK
    const annualEnabled = document.getElementById('a-toggle').checked;

    // 1. Get Dates
    const aStartInput = document.getElementById('a-start');
    const aEndInput = document.getElementById('a-end');

    // Sync disabled state
    aStartInput.disabled = !annualEnabled;
    aEndInput.disabled = !annualEnabled;
    aStartInput.style.opacity = annualEnabled ? '1' : '0.5';
    aEndInput.style.opacity = annualEnabled ? '1' : '0.5';

    let aStart = annualEnabled ? new Date(aStartInput.value) : new Date(NaN);
    let aEnd = annualEnabled ? new Date(aEndInput.value) : new Date(NaN);

    // Maternity Calc
    const mStartInput = document.getElementById('m-start').value;
    const mDuration = parseInt(document.getElementById('m-duration').value || 90);
    let mStart = new Date(mStartInput);
    let mEnd = new Date(mStart);
    if (!isNaN(mStart.getTime())) {
        mEnd.setDate(mStart.getDate() + (mDuration - 1));
    } else {
        mEnd = new Date(NaN);
    }

    // Parental Calc
    const pStartInput = document.getElementById('p-start').value;
    const pDuration = parseInt(document.getElementById('p-duration').value || 365);
    let pStart = new Date(pStartInput);
    let pEnd = new Date(pStart);
    if (!isNaN(pStart.getTime())) {
        pEnd.setDate(pStart.getDate() + (pDuration - 1));
    } else {
        pEnd = new Date(NaN);
    }

    // 2. Individual Text & Logic
    // Annual
    let workDays = 0;
    if (annualEnabled && aStart <= aEnd) {
        for (let d = new Date(aStart); d <= aEnd; d.setDate(d.getDate() + 1)) {
            if (isBusinessDay(new Date(d))) workDays++;
        }
    }
    if (annualEnabled) {
        document.getElementById('a-res').innerHTML = `${workDays}일 <span class="hint-text">(주말/공휴일 제외)</span>`;
    } else {
        document.getElementById('a-res').innerHTML = `<span style="color:#ccc; font-weight:400;">미사용</span>`;
    }

    // Updated Result Text to show END DATE
    if (!isNaN(mEnd.getTime())) {
        document.getElementById('m-res-date').innerText = formatDateKorean(mEnd);
    }
    if (!isNaN(pEnd.getTime())) {
        document.getElementById('p-res-date').innerText = formatDateKorean(pEnd);
    }

    // 3. Update Timeline
    if (annualEnabled) updateBar('bar-annual', 'lbl-annual', aStart, aEnd);
    else document.getElementById('bar-annual').classList.remove('active');

    updateBar('bar-maternity', 'lbl-maternity', mStart, mEnd);
    updateBar('bar-parental', 'lbl-parental', pStart, pEnd);

    // 4. Update Summary Dashboard

    // Find earliest start and latest end
    const dates = [aStart, aEnd, mStart, mEnd, pStart, pEnd];
    const validStarts = [aStart, mStart, pStart].filter(d => !isNaN(d));
    const validEnds = [aEnd, mEnd, pEnd].filter(d => !isNaN(d));

    if (validStarts.length > 0 && validEnds.length > 0) {
        const earliest = new Date(Math.min(...validStarts));
        const latest = new Date(Math.max(...validEnds));

        // Return Date (Next Day)
        const returnDate = new Date(latest);
        returnDate.setDate(returnDate.getDate() + 1);
        document.getElementById('return-date').innerText = formatDateKorean(returnDate);

        // Total Span (Simple difference between Earliest start and Latest end)
        // Note: This assumes continuous leave. If there are gaps, this measures the span, not sum of days.
        // Let's use Span for "Period".
        const totalSpanDays = Math.ceil((latest - earliest) / (1000 * 60 * 60 * 24)) + 1;
        document.getElementById('total-days-off').innerText = `${totalSpanDays}일`;
        document.getElementById('total-months-off').innerText = `약 ${(totalSpanDays / 30).toFixed(1)}개월`;

        // D-Day (from today)
        // Ideally "Today" is real today. 
        // For demo I will use a fixed date or new Date(). 
        // Users might want "D-Day to first leave".
        const today = new Date(); // Real today
        // Reset time for clean day diff
        today.setHours(0, 0, 0, 0);
        earliest.setHours(0, 0, 0, 0);

        const diffTime = earliest - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let dDayStr = "-";
        if (diffDays > 0) dDayStr = `D-${diffDays}`;
        else if (diffDays === 0) dDayStr = "D-Day";
        else dDayStr = `D+${Math.abs(diffDays)}`;

        document.getElementById('d-day-val').innerText = dDayStr;
        document.getElementById('d-day-val').style.color = diffDays <= 7 && diffDays >= 0 ? '#ef4444' : '#1f2937';
    }
}

window.onload = function () {
    initTimelineGrid();
    calculate();
};
