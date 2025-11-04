// timetable.js - frontend-only timetable CRUD using localStorage

document.addEventListener('DOMContentLoaded', () => {
    const STORAGE_KEY = 'timetableEntries';

    const form = document.getElementById('timetableForm');
    const dayInput = document.getElementById('day');
    const startInput = document.getElementById('startTime');
    const endInput = document.getElementById('endTime');
    const subjectInput = document.getElementById('subject');
    const lecturerInput = document.getElementById('lecturer');
    const roomInput = document.getElementById('room');
    const entryIdInput = document.getElementById('entryId');
    const timetableGridBody = document.getElementById('timetableGridBody');
    const saveBtn = document.getElementById('saveSlotBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const clearAllBtn = document.getElementById('clearAllBtn');

    const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const hours = [];
    const START_HOUR = 8;  // 8 AM
    const END_HOUR = 18;   // 6 PM

    // Predefined pleasant colors for slots
    const slotColors = [
        { bg: '#fff3e6', text: '#cc5500' }, // Peach
        { bg: '#e6f3ff', text: '#0066cc' }, // Sky Blue
        { bg: '#f3e6ff', text: '#6600cc' }, // Lavender
        { bg: '#e6ffe6', text: '#008000' }, // Mint
        { bg: '#ffe6e6', text: '#cc0000' }, // Light Pink
        { bg: '#fff2e6', text: '#cc6600' }, // Light Orange
        { bg: '#e6fff2', text: '#00804d' }, // Sea Green
        { bg: '#ffe6f2', text: '#cc0066' }, // Rose
        { bg: '#f2ffe6', text: '#408000' }, // Lime
        { bg: '#e6e6ff', text: '#0000cc' }  // Light Blue
    ];

    // Generate hours array with AM/PM format
    for (let h = START_HOUR; h <= END_HOUR; h++) {
        const ampm = h >= 12 ? 'PM' : 'AM';
        const hour12 = h > 12 ? h - 12 : h;
        hours.push({
            label: `${hour12}:00 ${ampm}`,
            value: String(h).padStart(2,'0') + ':00'
        });
    }

    function loadEntries() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY) || '[]';
            return JSON.parse(raw);
        } catch (e) {
            console.error('Failed to parse timetable entries', e);
            return [];
        }
    }

    function saveEntries(entries) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    }

    function timeToMinutes(t) {
        const [hh, mm] = (t||'00:00').split(':').map(Number);
        return hh*60 + (mm||0);
    }

    function formatTime24to12(time24) {
        const [hours24, minutes] = time24.split(':');
        const period = +hours24 < 12 ? 'AM' : 'PM';
        let hours12 = +hours24 % 12;
        hours12 = hours12 || 12; // Convert '0' to '12'
        return `${hours12}:${minutes} ${period}`;
    }

    function getRandomSlotColor() {
        return slotColors[Math.floor(Math.random() * slotColors.length)];
    }

    function renderGrid() {
        const entries = loadEntries();

        // Map entries by id for quick lookup
        const placed = {};

        // create occupancy map to skip cells covered by rowspan
        const occupied = {};
        days.forEach(d=> occupied[d] = {});

        // start building rows
        let rowsHtml = '';

        for (const hour of hours) {
            rowsHtml += `<tr><th scope="row" class="text-end">${hour.label}</th>`;

            for (const day of days) {
                if (occupied[day][hour.value]) {
                    // this hour cell is covered by a previous rowspan - skip
                    continue;
                }

                // find entry that should start at this hour (snap start to hour)
                const entry = entries.find(e => {
                    if (e.day !== day) return false;
                    const startMin = timeToMinutes(e.start);
                    const startHour = Math.floor(startMin/60)*60;
                    return startHour === timeToMinutes(hour.value);
                });

                if (entry) {
                    const startMin = timeToMinutes(entry.start);
                    const endMin = timeToMinutes(entry.end) || (startMin + 60);
                    let spanHours = Math.max(1, Math.ceil((endMin - startMin) / 60));
                    // cap span to remaining rows
                    spanHours = Math.min(spanHours, hours.length - hours.findIndex(h => h.value === hour.value));

                    // mark occupied for subsequent hours
                    for (let k=0; k<spanHours; k++) {
                        const hourIndex = hours.findIndex(h => h.value === hour.value) + k;
                        if (hourIndex < hours.length) {
                            occupied[day][hours[hourIndex].value] = true;
                        }
                    }

                    const slotColor = entry.color || getRandomSlotColor();
                    rowsHtml += `<td rowspan="${spanHours}" class="align-middle position-relative timetable-slot" 
                        data-id="${entry.id}" 
                        style="background-color: ${slotColor.bg}; color: ${slotColor.text}; transition: transform 0.2s;">
                        <div><strong>${escapeHtml(entry.subject||'')}</strong></div>
                        <div class="small" style="color: ${slotColor.text}88">${formatTime24to12(entry.start)} - ${formatTime24to12(entry.end)} ${entry.room?(' • '+escapeHtml(entry.room)):''}</div>
                        <div class="position-absolute" style="top:6px; right:6px;">
                            <button class="btn btn-sm me-1" data-id="${entry.id}" data-action="edit" 
                                style="color: ${slotColor.text}; border-color: ${slotColor.text}88">✎</button>
                            <button class="btn btn-sm" data-id="${entry.id}" data-action="delete" 
                                style="color: ${slotColor.text}; border-color: ${slotColor.text}88">🗑</button>
                        </div>
                    </td>`;
                } else {
                    // empty cell
                    rowsHtml += `<td data-day="${day}" data-time="${hour.value}" class="timetable-empty-cell text-center" style="cursor:pointer; height:60px"></td>`;
                }
            }

            rowsHtml += `</tr>`;
        }

        timetableGridBody.innerHTML = rowsHtml;
    }

    function escapeHtml(s){
        if (!s) return '';
        return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    }

    function resetForm() {
        form.reset();
        entryIdInput.value = '';
        cancelEditBtn.classList.add('d-none');
        saveBtn.textContent = 'Save Slot';
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const entries = loadEntries();

        const payload = {
            id: entryIdInput.value || Date.now().toString(),
            day: dayInput.value,
            start: startInput.value,
            end: endInput.value,
            subject: subjectInput.value.trim(),
            lecturer: lecturerInput.value.trim(),
            room: roomInput.value.trim(),
            color: entryIdInput.value ? entries.find(x => x.id === entryIdInput.value)?.color : getRandomSlotColor()
        };

        if (!payload.day || !payload.start || !payload.end || !payload.subject) {
            showAlert('Please fill day, time and subject', 'warning');
            return;
        }

        const existing = entries.findIndex(x=>x.id===payload.id);
        if (existing >= 0) {
            entries[existing] = payload;
            showAlert('Slot updated', 'success');
        } else {
            entries.push(payload);
            showAlert('Slot added', 'success');
        }

        saveEntries(entries);
        renderGrid();
        resetForm();
    });

    // delegate clicks on grid for edit/delete and empty cells
    timetableGridBody.addEventListener('click', (e)=>{
        const btn = e.target.closest('button');
        if (btn) {
            const id = btn.getAttribute('data-id');
            const action = btn.getAttribute('data-action');
            if (!id || !action) return;

            const entries = loadEntries();
            const idx = entries.findIndex(x=>x.id===id);
            if (idx < 0) return;

            if (action === 'edit') {
                const entry = entries[idx];
                entryIdInput.value = entry.id;
                dayInput.value = entry.day;
                startInput.value = entry.start;
                endInput.value = entry.end;
                subjectInput.value = entry.subject;
                lecturerInput.value = entry.lecturer;
                roomInput.value = entry.room;
                saveBtn.textContent = 'Update Slot';
                cancelEditBtn.classList.remove('d-none');
                window.scrollTo({top:0, behavior:'smooth'});
            }

            if (action === 'delete') {
                if (!confirm('Delete this slot?')) return;
                entries.splice(idx,1);
                saveEntries(entries);
                renderGrid();
                showAlert('Slot deleted', 'success');
            }

            return;
        }

        // empty cell clicked
        const cell = e.target.closest('td.timetable-empty-cell');
        if (!cell) return;
        const day = cell.getAttribute('data-day');
        const time = cell.getAttribute('data-time');
        if (!day || !time) return;

        dayInput.value = day;
        startInput.value = time;
        // default end time +1 hour
        const endMin = timeToMinutes(time) + 60;
        const endHour = String(Math.floor(endMin/60)).padStart(2,'0');
        endInput.value = `${endHour}:00`;
        subjectInput.focus();
    });

    cancelEditBtn.addEventListener('click', ()=> resetForm());

    clearAllBtn.addEventListener('click', ()=>{
        if (!confirm('Clear all timetable slots?')) return;
        localStorage.removeItem(STORAGE_KEY);
        renderGrid();
        showAlert('All slots cleared', 'success');
    });

    // initial render
    renderGrid();
});
