// =====================================================================
// AMIVEST VOICE & NLP ENGINE (src/utils/voiceEngine.js)
// Handles Wake Word Detection, Number Normalization, Category Resolution,
// Levenshtein Distance Matching, and Intent Parsing.
// =====================================================================

// ---------------------------------------------------------------------
// 1. CONSTANTS & DICTIONARIES
// ---------------------------------------------------------------------

export const WAKE_WORDS = [
    "suno",
    "sunoo",
    "sunno",
    "heysuno",
    "hey suno",
    "siri",
    "amivest",
    "ami",
    "alexa",
    "saathi",
    "assistant",
];

export const CATEGORIES = [
    { key: "Food", match: ["food", "khana", "restaurant", "lunch", "dinner", "zomato", "swiggy", "chai", "coffee", "cafe", "burger", "pizza", "nashta"], icon: "🍔" },
    { key: "Shopping", match: ["shopping", "shop", "amazon", "flipkart", "clothes", "myntra", "shoes", "mall", "kapde"], icon: "🛍️" },
    { key: "Transport", match: ["transport", "uber", "ola", "auto", "cab", "metro", "bus", "taxi", "rapido", "rickshaw"], icon: "🚗" },
    { key: "Fuel", match: ["petrol", "diesel", "fuel", "gas", "cng"], icon: "⛽" },
    { key: "Bills", match: ["bill", "bills", "electricity", "wifi", "recharge", "water", "rent", "broadband", "bijli"], icon: "⚡" },
    { key: "Healthcare", match: ["health", "medicine", "medical", "doctor", "hospital", "clinic", "pharmacy", "dawa", "dawakhana"], icon: "🏥" },
    { key: "Entertainment", match: ["movie", "cinema", "netflix", "prime", "hotstar", "game", "gaming", "party", "theatre"], icon: "🎬" },
    { key: "Education", match: ["education", "college", "school", "books", "tuition", "fee", "fees", "course", "exam", "padhai"], icon: "🎓" },
    { key: "Travel", match: ["travel", "flight", "trip", "hotel", "tour", "train", "vacation", "yatra", "chutti"], icon: "✈️" },
    { key: "Investments", match: ["sip", "mutual fund", "stocks", "crypto", "gold", "share", "shares", "bonds", "fd", "rd"], icon: "📈" },
    { key: "General", match: ["other", "misc", "general", "extra", "kharcha"], icon: "📦" },
];

const NUMBER_WORDS = {
    zero: 0,
    sifar: 0,
    shunya: 0,
    one: 1,
    ek: 1,
    first: 1,
    two: 2,
    do: 2,
    second: 2,
    three: 3,
    teen: 3,
    third: 3,
    four: 4,
    chaar: 4,
    char: 4,
    five: 5,
    paanch: 5,
    panch: 5,
    six: 6,
    che: 6,
    chhah: 6,
    seven: 7,
    saat: 7,
    eight: 8,
    aath: 8,
    nine: 9,
    nau: 9,
    ten: 10,
    das: 10,
    eleven: 11,
    gyarah: 11,
    twelve: 12,
    barah: 12,
    thirteen: 13,
    terah: 13,
    fourteen: 14,
    chaudah: 14,
    fifteen: 15,
    pandrah: 15,
    sixteen: 16,
    solah: 16,
    seventeen: 17,
    satrah: 17,
    eighteen: 18,
    atharah: 18,
    nineteen: 19,
    unnis: 19,
    twenty: 20,
    bees: 20,
    thirty: 30,
    tees: 30,
    forty: 40,
    chalis: 40,
    fifty: 50,
    pachaas: 50,
    pachas: 50,
    sixty: 60,
    saath: 60,
    seventy: 70,
    sattar: 70,
    eighty: 80,
    assi: 80,
    ninety: 90,
    nabbe: 90,
    hundred: 100,
    sau: 100,
    so: 100,
    thousand: 1000,
    hazar: 1000,
    hazara: 1000,
    k: 1000,
    lakh: 100000,
    lakhs: 100000,
    lac: 100000,
    lacs: 100000,
    crore: 10000000,
    crores: 10000000,
    cr: 10000000,
};

// ---------------------------------------------------------------------
// 2. LEVENSHTEIN DISTANCE & FUZZY MATCHING
// ---------------------------------------------------------------------

/**
 * Computes edit distance between two strings to allow speech recognition tolerance.
 */
export function levenshtein(a, b) {
    if (!a || !b) return (a || b || "").length;
    const matrix = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));

    for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + cost
            );
        }
    }
    return matrix[a.length][b.length];
}

/**
 * Checks if the spoken transcript contains any configured wake word (exact or fuzzy).
 */
export function checkFuzzyWakeWord(transcript) {
    const cleaned = String(transcript || "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .trim();
    const words = cleaned.split(/\s+/).filter(Boolean);

    for (let i = 0; i < words.length; i++) {
        const singleWord = words[i];
        const twoWords = i < words.length - 1 ? `${words[i]} ${words[i + 1]}` : "";

        for (const target of WAKE_WORDS) {
            if (singleWord === target || twoWords === target) {
                return { matched: true, wakeWord: target };
            }
            if (singleWord.length >= 4) {
                const dist = levenshtein(singleWord, target);
                if (dist <= 1) return { matched: true, wakeWord: singleWord };
            }
        }
    }
    return { matched: false, wakeWord: null };
}

// ---------------------------------------------------------------------
// 3. TEXT & NUMBER NORMALIZATION
// ---------------------------------------------------------------------

/**
 * Converts words like "paanch hazar", "2k", "rupees" into standard digits.
 */
export function normalizeSpokenText(text) {
    let normalized = String(text || "").toLowerCase().trim();

    // Strip currency prefixes and suffixes
    normalized = normalized.replace(/\b(rupees|rupee|rs\.?|rupaye|rupay|inr|₹)\b/gi, " ");

    // Common compounding shortcuts
    normalized = normalized.replace(/\b(five thousand)\b/gi, "5000");
    normalized = normalized.replace(/\b(ten thousand)\b/gi, "10000");
    normalized = normalized.replace(/\b(twenty thousand)\b/gi, "20000");
    normalized = normalized.replace(/\b(fifty thousand)\b/gi, "50000");
    normalized = normalized.replace(/\b(one lakh|1 lakh)\b/gi, "100000");

    const tokens = normalized.split(/\s+/).filter(Boolean);
    const result = [];
    let currentNum = 0;
    let hasNum = false;

    for (const token of tokens) {
        const cleanToken = token.replace(/[^a-z0-9]/g, "");

        // Handle "5k", "10k" formats
        if (/^\d+k$/i.test(cleanToken)) {
            const numericPart = parseInt(cleanToken.replace(/k/i, ""), 10);
            result.push((numericPart * 1000).toString());
            continue;
        }

        if (NUMBER_WORDS[cleanToken] !== undefined) {
            const val = NUMBER_WORDS[cleanToken];
            if (val >= 100) {
                currentNum = (currentNum || 1) * val;
            } else {
                currentNum += val;
            }
            hasNum = true;
        } else {
            if (hasNum) {
                result.push(currentNum.toString());
                currentNum = 0;
                hasNum = false;
            }
            result.push(token);
        }
    }

    if (hasNum) {
        result.push(currentNum.toString());
    }

    return result.join(" ");
}

/**
 * Resolves spoken raw category or synonyms to standard category key.
 */
export function resolveCategory(rawCategory) {
    const text = String(rawCategory || "").toLowerCase().trim();
    for (const cat of CATEGORIES) {
        if (cat.match.some((keyword) => text.includes(keyword))) {
            return cat.key;
        }
    }
    return rawCategory ? String(rawCategory).trim().replace(/^./, (c) => c.toUpperCase()) : "General";
}

/**
 * Extracts a clean float or integer from a text string.
 */
export function extractNumber(text) {
    const match = String(text || "").replace(/,/g, "").match(/\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : null;
}

/**
 * Cleans stop words from goal or loan names.
 */
export function cleanEntityName(raw) {
    return String(raw || "")
        .replace(/\b(my|the|goal|target|loan|emi|please|ka|ki|ko|ke|liye|saving|plan)\b/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
}

// ---------------------------------------------------------------------
// 4. PARSER INTENT ROUTER
// ---------------------------------------------------------------------

/**
 * Parses a voice transcript into an actionable intent object.
 */
export function parseVoiceCommand(rawTranscript) {
    const text = normalizeSpokenText(rawTranscript);
    const lower = text.toLowerCase();
    let m;

    // 1. SETTINGS & LANGUAGE
    if (lower.includes("hindi me") || lower.includes("speak in hindi") || lower.includes("hindi mode")) {
        return { section: "SETTINGS", action: "LANG_HI" };
    }
    if (lower.includes("english me") || lower.includes("speak in english") || lower.includes("english mode")) {
        return { section: "SETTINGS", action: "LANG_EN" };
    }

    // 2. QUICK AI INTELLIGENCES
    if (/(audit|check anomalies|suspicious|fraud|gadbad)/i.test(lower)) {
        return { section: "AI", action: "AUDIT_EXPENSES" };
    }
    if (/(savings tip|tips|save money|advice|batao kaise bache)/i.test(lower)) {
        return { section: "AI", action: "GET_SAVINGS_TIP" };
    }
    if (/(today'?s? spend|aaj ka kharcha|aaj kitna spend kiya)/i.test(lower)) {
        return { section: "AI", action: "GET_TODAY_SPEND" };
    }

    // 3. TRANSACTIONS
    if (/(show|list|view|dikhao)\s+(my\s+)?(transactions|expenses|spending|kharcha|hisab)/i.test(lower)) {
        return { section: "TRANSACTIONS", action: "VIEW" };
    }
    if (/(delete|remove|undo|hatao)\s+(my\s+)?(last|latest|aakhri|pehle wala)\s+(transaction|expense)/i.test(lower)) {
        return { section: "TRANSACTIONS", action: "DELETE_LAST" };
    }

    // Add Income
    m = lower.match(/(?:received|earned|got|added|income|credited|credit)\s*(\d+(?:\.\d+)?)\s*(?:from|as|in|for|par)?\s*(.+)?/i);
    if (!m) m = lower.match(/(\d+(?:\.\d+)?)\s*(?:rupaye|income|credit)\s*(?:aaye|mili|mila|received)/i);
    if (m && extractNumber(m[1]) && (lower.includes("income") || lower.includes("credit") || lower.includes("earned") || lower.includes("salary"))) {
        return {
            section: "TRANSACTIONS",
            action: "ADD",
            txType: "credit",
            amount: extractNumber(m[1]),
            category: "Income & Deposits",
            text: rawTranscript,
        };
    }

    // Add Expense
    m = lower.match(/(?:add|record|spent|spend|kharcha|kharch|paid|diye)\s*(\d+(?:\.\d+)?)\s*(?:in|to|for|on|par|mein)?\s*(.+)/i);
    if (!m) m = lower.match(/(\d+(?:\.\d+)?)\s+(.+?)\s+(?:mein|me|par)\s+(?:add|spent|gaye|diye)/i);
    if (m && extractNumber(m[1])) {
        return {
            section: "TRANSACTIONS",
            action: "ADD",
            txType: "debit",
            amount: extractNumber(m[1]),
            category: resolveCategory(m[2]),
            text: rawTranscript,
        };
    }

    // 4. GOALS
    if (/(show|list|view|dikhao)\s+(my\s+)?(goals|goal|target|bachat)/i.test(lower)) {
        return { section: "GOALS", action: "VIEW" };
    }
    m = lower.match(/(?:add|save|deposit|daalo|jama karo)\s*(\d+(?:\.\d+)?)\s*(?:to|in|into|mein)?\s*(?:my\s+)?(.+?)(?:\s+goal|\s+target)?$/i);
    if (m && extractNumber(m[1])) {
        return { section: "GOALS", action: "ADD_MONEY", amount: extractNumber(m[1]), goalName: cleanEntityName(m[2]) };
    }
    m = lower.match(/(?:create|set|new)\s+(?:goal|target)\s+(.+?)\s+(?:of|for|amount)\s*(\d+(?:\.\d+)?)/i);
    if (m && extractNumber(m[2])) {
        return { section: "GOALS", action: "CREATE", goalName: cleanEntityName(m[1]), amount: extractNumber(m[2]) };
    }
    m = lower.match(/(?:delete|remove|erase|hatao)\s+(?:my\s+)?(?:goal\s+)?(.+?)(?:\s+goal|\s+target)?$/i);
    if (m && (lower.includes("goal") || lower.includes("target"))) {
        return { section: "GOALS", action: "DELETE", goalName: cleanEntityName(m[1]) };
    }

    // 5. BUDGET
    if (/(show|view|dikhao)\s+(my\s+)?(budgets|limits|spending limits)/i.test(lower)) {
        return { section: "BUDGET", action: "VIEW" };
    }
    m = lower.match(/(?:set|make|create|change|update)\s*(?:my\s*)?(.+?)\s*(?:limit|budget)\s*(?:to|at|of|as)?\s*(\d+(?:\.\d+)?)/i);
    if (m && extractNumber(m[2])) {
        return { section: "BUDGET", action: "SET", category: resolveCategory(m[1]), amount: extractNumber(m[2]) };
    }
    m = lower.match(/(?:delete|remove)\s+(?:my\s+)?(.+?)\s+(?:budget|limit)/i);
    if (m) {
        return { section: "BUDGET", action: "DELETE", category: resolveCategory(m[1]) };
    }

    // 6. INVESTMENTS
    if (/(show|view|dikhao)\s+(my\s+)?(investments|portfolio|stocks|mutual funds|sip)/i.test(lower)) {
        return { section: "INVESTMENTS", action: "VIEW" };
    }
    m = lower.match(/(?:invest|add investment|bought)\s*(\d+(?:\.\d+)?)\s*(?:in|into)\s*(.+)/i);
    if (m && extractNumber(m[1])) {
        return { section: "INVESTMENTS", action: "ADD", amount: extractNumber(m[1]), assetName: cleanEntityName(m[2]) };
    }

    // 7. LOANS
    if (/(show|view|dikhao)\s+(my\s+)?(loans|emi|debt)/i.test(lower)) {
        return { section: "LOANS", action: "VIEW" };
    }
    m = lower.match(/(?:add loan|took loan|borrowed)\s*(\d+(?:\.\d+)?)\s*(?:for|from|as)\s*(.+)/i);
    if (m && extractNumber(m[1])) {
        return { section: "LOANS", action: "ADD", amount: extractNumber(m[1]), loanName: cleanEntityName(m[2]) };
    }

    // 8. PROFILE
    if (/(who am i|my profile|account details|mera account)/i.test(lower)) {
        return { section: "PROFILE", action: "VIEW" };
    }

    // 9. GENERAL AI CHAT FALLBACK
    return { section: "AI", action: "CHAT", text: rawTranscript };
}