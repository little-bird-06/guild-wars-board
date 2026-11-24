const CHAMPION_STORAGE_KEY = 'hw_selected_champion';
const DEFAULT_WIN_POINTS_THRESHOLD = 20;

function getGuildChampionsList(membersMap) {
    if (!(membersMap instanceof Map)) return [];

    const champions = [];
    membersMap.forEach((member) => {
        const name = String(member?.name || '').trim();
        if (name) {
            champions.push(name);
        }
    });

    return Array.from(new Set(champions)).sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: 'base' })
    );
}

function getSavedChampionName(championsList) {
    try {
        const savedName = localStorage.getItem(CHAMPION_STORAGE_KEY);
        if (!savedName) return '';
        if (Array.isArray(championsList) && championsList.includes(savedName)) {
            return savedName;
        }
        localStorage.removeItem(CHAMPION_STORAGE_KEY);
        return '';
    } catch (err) {
        console.warn("Erreur lecture champion localStorage :", err);
        return '';
    }
}

function onChampionSelectChange(selectedName) {
    const cleanName = String(selectedName || '').trim();
    try {
        if (cleanName) {
            localStorage.setItem(CHAMPION_STORAGE_KEY, cleanName);
        } else {
            localStorage.removeItem(CHAMPION_STORAGE_KEY);
        }
    } catch (err) {
        console.warn("Erreur sauvegarde champion localStorage :", err);
    }

    if (typeof renderDashboard === 'function') {
        renderDashboard();
    }
}

function renderChampionSelectorHTML(sourceData, escapeFn = (s) => String(s)) {
    const champions = getGuildChampionsList(sourceData);
    const activeChampion = getSavedChampionName(champions);

    const optionsHTML = champions
        .map((name) => {
            const selectedAttr = name === activeChampion ? ' selected' : '';
            return `<option value="${escapeFn(name)}"${selectedAttr}>${escapeFn(name)}</option>`;
        })
        .join('');

    return `
        <div class="flex items-center gap-2">
            <label for="championSelect" class="text-xs text-slate-400 font-semibold">Champion:</label>
            <select
                id="championSelect"
                onchange="onChampionSelectChange(this.value)"
                class="text-xs bg-slate-950 hover:bg-slate-900 text-amber-300 border border-slate-700 rounded-lg px-3 py-1.5 font-semibold outline-none focus:border-amber-400 transition cursor-pointer"
                title="Select your champion to highlight previously beaten defenders"
            >
                <option value=""${!activeChampion ? ' selected' : ''}>select your champion</option>
                ${optionsHTML}
            </select>
        </div>
    `;
}

function hasChampionBeatenDefender(
    championName,
    defenderId,
    defenderName,
    battleType,
    heroRows,
    titanRows,
    winPointsThreshold = DEFAULT_WIN_POINTS_THRESHOLD
) {
    const cleanChamp = String(championName || '').trim().toLowerCase();
    if (!cleanChamp) return false;

    const isTitanSlot = String(battleType || '').trim().toLowerCase() === 'titan';
    const targetRows = isTitanSlot ? titanRows : heroRows;

    if (!Array.isArray(targetRows) || targetRows.length === 0) {
        return false;
    }

    const cleanDefId = String(defenderId || '').trim();
    const cleanDefName = String(defenderName || '').trim().toLowerCase();
    const threshold = Number(winPointsThreshold);
    const minPts = isNaN(threshold) ? DEFAULT_WIN_POINTS_THRESHOLD : threshold;

    return targetRows.some((row) => {
        if (!row || typeof row !== 'object') return false;

        const attName = String(row['att name'] || row['attacker name'] || '').trim().toLowerCase();
        if (attName !== cleanChamp) return false;

        const rowDefId = String(row['defender id'] || '').trim();
        const rowDefName = String(row['def name'] || '').trim().toLowerCase();

        const sameDefender =
            (cleanDefId && rowDefId && rowDefId === cleanDefId) ||
            (cleanDefName && rowDefName && rowDefName === cleanDefName);

        if (!sameDefender) return false;

        const pts = parseInt(row['points'], 10);
        return !isNaN(pts) && pts >= minPts;
    });
}

function getChampionSlotHighlightClass(isHighlighted) {
    return isHighlighted
        ? '!border-2 !border-emerald-400 !bg-emerald-900/50 ring-2 ring-inset ring-emerald-400/50 shadow-[inset_0_0_16px_rgba(16,185,129,0.45)] animate-pulse'
        : '';
}
