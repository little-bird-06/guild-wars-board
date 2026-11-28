/*function planGoodAttacks(
    ourMembersMap,
    enemySlots,
    heroRows,
    titanRows,
    attacksPerChampion = 2,
    winThreshold = 20
) {
    if (!ourMembersMap || typeof ourMembersMap.forEach !== 'function') {
        return [];
    }

    // 1. Lister les slots adverses valides identifiés par l'ID du défenseur
    const slotsList = [];
    for (const [slotKey, slotInfo] of Object.entries(enemySlots || {})) {
        const slotNum = parseInt(slotKey, 10);
        const defenderId = String(slotInfo?.user?.id || '').trim();
        if (isNaN(slotNum) || !slotInfo || !defenderId) continue;

        const isTitan = isTitanSlot(slotNum);
        const rows = isTitan ? titanRows : heroRows;
        if (!Array.isArray(rows) || rows.length === 0) continue;

        slotsList.push({
            slot: slotNum,
            defenderId,
            defenderName: String(slotInfo.user.name || '').trim(),
            type: isTitan ? 'Titan' : 'Hero',
            rows
        });
    }

    // 2. Pour chaque champion (identifié par son ID), trouver les slots qu'il sait battre dans l'historique
    const champions = [];
    ourMembersMap.forEach((member, uId) => {
        const champId = String(uId || member?.id || '').trim();
        if (!champId) return;

        const champName = String(member?.name || '').trim();
        const allowedSlots = new Map(); // slotNum -> bestPastPoints

        for (const s of slotsList) {
            let bestPts = -1;
            for (const row of s.rows) {
                const attId = String(row['attacker id'] || '').trim();
                if (!attId || attId !== champId) continue;

                const rowDefId = String(row['defender id'] || '').trim();
                if (!rowDefId || rowDefId !== s.defenderId) continue;

                const pts = parseInt(row['points'], 10);
                if (!isNaN(pts) && pts >= winThreshold && pts > bestPts) {
                    bestPts = pts;
                }
            }

            if (bestPts >= winThreshold) {
                allowedSlots.set(s.slot, bestPts);
            }
        }

        if (allowedSlots.size > 0) {
            champions.push({
                id: champId,
                name: champName,
                allowedSlots,
                assignedSlots: new Set()
            });
        }
    });

    // 3. Prioriser les champions ayant le moins d'options (MRV)
    champions.sort((a, b) => a.allowedSlots.size - b.allowedSlots.size);

    // slotNum -> champion object qui attaque ce slot
    const slotOwner = new Map();
    const slotMeta = new Map(slotsList.map((s) => [s.slot, s]));

    // Cherche si le champion `champ` peut obtenir un slot (directement ou en poussant un autre champion)
    function tryAssignOneAttack(champ, visitedChamps) {
        if (champ.assignedSlots.size >= attacksPerChampion) return false;
        if (visitedChamps.has(champ.id)) return false;
        visitedChamps.add(champ.id);

        const candidateSlots = Array.from(champ.allowedSlots.keys())
            .filter((slotNum) => !champ.assignedSlots.has(slotNum))
            .sort((slotA, slotB) => {
                const ownerA = slotOwner.get(slotA);
                const ownerB = slotOwner.get(slotB);
                if (!ownerA && ownerB) return -1;
                if (ownerA && !ownerB) return 1;
                return slotA - slotB;
            });

        // Essai 1 : prendre un slot totalement libre
        console.log('Process ', champ.name);
        for (const slotNum of candidateSlots) {
            if (!slotOwner.has(slotNum)) {
                slotOwner.set(slotNum, champ);
                champ.assignedSlots.add(slotNum);
                console.log('alloue ', champ.name, ' au slot libre ', slotNum);
                return true;
            }
        }

        // Essai 2 : réallouer l'occupant actuel d'un de ces slots vers un autre slot
        for (const slotNum of candidateSlots) {
            const currentOwner = slotOwner.get(slotNum);
            if (currentOwner && currentOwner.id !== champ.id && !visitedChamps.has(currentOwner.id)) {
                //currentOwner.assignedSlots.delete(slotNum);
                //slotOwner.delete(slotNum);
                //console.log('--> DESALLOUE ', currentOwner.name, 'du slot ', slotNum);

                if (tryAssignOneAttack(currentOwner, new Set(visitedChamps))) {
                	currentOwner.assignedSlots.delete(slotNum);
                	slotOwner.delete(slotNum);
                	console.log('--> DESALLOUE ', currentOwner.name, 'du slot ', slotNum);
                
                    slotOwner.set(slotNum, champ);
                    champ.assignedSlots.add(slotNum);
                    console.log('!!! Remplace ', currentOwner.name, ' par ', champ.name, ' au slot ', slotNum);
                    return true;
                }

                slotOwner.set(slotNum, currentOwner);
                currentOwner.assignedSlots.add(slotNum);
            }
        }

        return false;
    }

    // 4. Allouer jusqu'à `attacksPerChampion` attaques parfaites par champion
    for (let round = 0; round < attacksPerChampion; round++) {
    	console.log('***** Allocation des slots, vague no ', round, ' *****');
        for (const champ of champions) {
            if (champ.assignedSlots.size < attacksPerChampion) {
        		console.log('Essaie d allouer ', champ.name);
                tryAssignOneAttack(champ, new Set());
            }
        }
    }

    // 5. Formater le résultat (noms conservés pour l'affichage)
    const assignments = [];
    for (const champ of champions) {
        for (const slotNum of champ.assignedSlots) {
            const meta = slotMeta.get(slotNum);
            assignments.push({
                championId: champ.id,
                championName: champ.name || champ.id,
                slot: slotNum,
                defenderId: meta?.defenderId || '',
                defenderName: meta?.defenderName || meta?.defenderId || '',
                type: meta?.type || 'Hero',
                pastPoints: champ.allowedSlots.get(slotNum)
            });
        }
    }

    assignments.sort((a, b) => a.slot - b.slot);
    return assignments;
}*/

function planPerfectAttacks(
    ourMembersMap,
    enemySlots,
    heroRows,
    titanRows,
    attacksPerChampion,
    winThreshold
) {
    const forts = typeof FORTIFICATIONS !== 'undefined' && Array.isArray(FORTIFICATIONS)
        ? FORTIFICATIONS
        : [];

    const slotToFort = new Map();
    forts.forEach((fort) => {
        (fort.slots || []).forEach((s) => slotToFort.set(Number(s), fort));
    });

    // 1. Lister les slots adverses valides
    const slotsList = [];
    for (const [slotKey, slotInfo] of Object.entries(enemySlots || {})) {
        const slotNum = parseInt(slotKey, 10);
        if (isNaN(slotNum) || !slotInfo || !slotInfo.user) continue;

        const isTitan = isTitanSlot(slotNum);
        const rows = isTitan ? titanRows : heroRows;
        if (!Array.isArray(rows) || rows.length === 0) continue;

        slotsList.push({
            slot: slotNum,
            defenderId: String(slotInfo.user.id || '').trim(),
            defenderName: String(slotInfo.user.name || '').trim(),
            type: isTitan ? 'Titan' : 'Hero',
            fort: slotToFort.get(slotNum) || null,
            rows
        });
    }

    if (slotsList.length === 0) return [];

    // 2. Construire les victoires historiques valides par champion et par slot
    const champions = [];
    ourMembersMap.forEach((member, uId) => {
        const champId = String(uId).trim();
        const champName = String(member?.name || '').trim();
        if (!champId || !champName) return;

        const allowedSlots = new Map(); // slotNum -> bestPastPoints

        for (const s of slotsList) {
            let bestPts = -1;
            for (const row of s.rows) {
                const attId = String(row['attacker id'] || '').trim();
                if (!attId || attId !== champId) continue;

                const rowDefId = String(row['defender id'] || '').trim();
                if (!rowDefId || rowDefId !== s.defenderId) continue;

                const pts = parseInt(row['points'], 10);
                if (!isNaN(pts) && pts >= winThreshold && pts > bestPts) {
                    bestPts = pts;
                }
            }

            if (bestPts >= winThreshold) {
                allowedSlots.set(s.slot, bestPts);
            }
        }

        if (allowedSlots.size > 0) {
            champions.push({
                id: champId,
                name: champName,
                allowedSlots
            });
        }
    });

    if (champions.length === 0) return [];

    // Ordre déterministe : moins d'options d'abord, puis ID
    champions.sort((a, b) => (a.allowedSlots.size - b.allowedSlots.size) || a.id.localeCompare(b.id));

    // Filtrer les slots qu'au moins un champion sait battre
    const reachableSlots = slotsList
        .filter((s) => champions.some((c) => c.allowedSlots.has(s.slot)))
        .sort((a, b) => a.slot - b.slot);

    if (reachableSlots.length === 0) return [];

    const slotMeta = new Map(slotsList.map((s) => [s.slot, s]));

    // Fonction d'évaluation : maximise les points réels (slots + bonus forts)
    // et départage par progression / moindre risque sur les forts longs
    function evaluateAssignment(slotOwnerMap) {
        let basePoints = 0;
        let bonusPoints = 0;
        let tieBreaker = 0;

        const wonSlotsByFort = new Map();
        slotOwnerMap.forEach((champ, slotNum) => {
            basePoints += 20;
            tieBreaker += champ.allowedSlots.get(slotNum) || 20;

            // Légère priorité stratégique aux slots du Pont (7-9)
            if (slotNum >= 7 && slotNum <= 9) {
                tieBreaker += 0.5;
            }

            const fort = slotMeta.get(slotNum)?.fort;
            if (fort) {
                if (!wonSlotsByFort.has(fort.name)) {
                    wonSlotsByFort.set(fort.name, new Set());
                }
                wonSlotsByFort.get(fort.name).add(slotNum);
            }
        });

        for (const fort of forts) {
            const fortSlots = fort.slots || [];
            if (fortSlots.length === 0) continue;

            const wonSet = wonSlotsByFort.get(fort.name);
            const wonCount = wonSet ? wonSet.size : 0;

            if (wonCount === fortSlots.length) {
                bonusPoints += Number(fort.bonus || 0);
                // Légère préférence déterministe pour les forts courts à gain égal (moins de risque tout-ou-rien)
                tieBreaker += Math.max(0, 10 - fortSlots.length);
            } else if (wonCount > 0) {
            	const ratio = wonCount / fortSlots.length;
    			tieBreaker += ratio * 3;
    			// Forte incitation quand il ne reste qu'un seul slot pour fermer la fortification
    			if (fortSlots.length - wonCount === 1) {
        			tieBreaker += 12;
    			}
                // Petite incitation à finir une fortification entamée plutôt qu'à l'abandonner
                //tieBreaker += (wonCount / fortSlots.length) * 2;
            }
        }

        return {
            totalScore: basePoints + bonusPoints,
            tieBreaker
        };
    }

    // Borne supérieure optimiste : points actuels + gain max des slots restants jouables
    function upperBoundScore(slotIndex, currentScore, champRemainingQuota) {
        let remainingQuotaTotal = 0;
        champRemainingQuota.forEach((q) => {
            remainingQuotaTotal += Math.max(0, q);
        });

        let potentialSlots = 0;
        for (let i = slotIndex; i < reachableSlots.length; i++) {
            const sNum = reachableSlots[i].slot;
            const hasChamp = champions.some(
                (c) => c.allowedSlots.has(sNum) && (champRemainingQuota.get(c.id) || 0) > 0
            );
            if (hasChamp) potentialSlots++;
        }

        const maxExtraAttacks = Math.min(remainingQuotaTotal, potentialSlots);
        // Au mieux, chaque attaque supplémentaire rapporte 20 pts + ~20 pts de bonus de fort
        return currentScore + maxExtraAttacks * 40;
    }

    const currentOwner = new Map(); // slotNum -> champ
    const remainingQuota = new Map(champions.map((c) => [c.id, attacksPerChampion]));

    let bestScore = -1;
    let bestTieBreaker = -Infinity;
    let bestOwner = new Map();

    // Limite de nœuds pour garantir une réponse instantanée même sur un gros historique
    let nodesVisited = 0;
    const MAX_NODES = 120000;

    function dfs(slotIndex) {
        if (nodesVisited >= MAX_NODES) return;
        nodesVisited++;

        const evalNow = evaluateAssignment(currentOwner);
        if (
            evalNow.totalScore > bestScore ||
            (evalNow.totalScore === bestScore && evalNow.tieBreaker > bestTieBreaker)
        ) {
            bestScore = evalNow.totalScore;
            bestTieBreaker = evalNow.tieBreaker;
            bestOwner = new Map(currentOwner);
        }

        if (slotIndex >= reachableSlots.length) return;
        if (upperBoundScore(slotIndex, evalNow.totalScore, remainingQuota) < bestScore) return;

        const slotObj = reachableSlots[slotIndex];
        const slotNum = slotObj.slot;

        // Candidats pouvant battre ce slot et ayant encore du quota
        const candidates = champions.filter(
            (c) => c.allowedSlots.has(slotNum) && (remainingQuota.get(c.id) || 0) > 0
        );

        // Essayer d'abord d'assigner un champion valide
        for (const champ of candidates) {
            currentOwner.set(slotNum, champ);
            remainingQuota.set(champ.id, remainingQuota.get(champ.id) - 1);

            dfs(slotIndex + 1);

            remainingQuota.set(champ.id, remainingQuota.get(champ.id) + 1);
            currentOwner.delete(slotNum);
            if (nodesVisited >= MAX_NODES) return;
        }

        // Option : laisser ce slot non assigné (pour garder les attaques d'un champion sur une autre fortification)
        dfs(slotIndex + 1);
    }

    dfs(0);

    // Formater la sortie triée par numéro de slot
    const assignments = [];
    bestOwner.forEach((champ, slotNum) => {
        const meta = slotMeta.get(slotNum);
        assignments.push({
            championId: champ.id,
            championName: champ.name,
            slot: slotNum,
            defenderId: meta?.defenderId || '',
            defenderName: meta?.defenderName || '',
            type: meta?.type || 'Hero',
            pastPoints: champ.allowedSlots.get(slotNum)
        });
    });

    assignments.sort((a, b) => a.slot - b.slot);
    return assignments;
}
