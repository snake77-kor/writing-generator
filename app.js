let globalGeneratedData = []; // Global storage for download

// Prompts Configuration with Concise Explanations & High-Quality Distractors
const ALL_TYPES = [
    'purpose', 'mood', 'claim', 'underlying', 'gist',
    'topic', 'title', 'grammar', 'vocabulary', 'blank',
    'irrelevant', 'sequence', 'insertion', 'summary'
];

const PROMPTS = {
    'purpose': `Role: CSAT Creator. Create ONE "Purpose" question.
Requirements:
1. Identify the practical purpose of the text (e.g., letter, announcement, complaint, suggestion).
2. Options: Korean phrases (e.g. "~하려고").
3. Distractors: Plausible but incorrect purposes based on keywords.
Format: [{"type":"글의 목적", "question":"다음 글의 목적으로 가장 적절한 것은?", "options":["(1)...", "(2)...", "(3)...", "(4)...", "(5)..."], "answer_index":1, "explanation":"..."}]
Text: {text}`,

    'mood': `Role: CSAT Creator. Create ONE "Mood/Atmosphere" question.
Requirements:
1. If Storytelling: Options must be "(A) Emotion -> (B) Emotion" format (English words).
2. If Non-fiction: Options must represent the "Tone" of the author (English words).
3. Distractors: Opposing emotions or unrelated moods.
Format: [{"type":"심경 변화", "question":"다음 글에 드러난 I의 심경 변화로 가장 적절한 것은? (또는 글의 분위기)", "options":["(1) worried -> relieved", "(2)...", ...], "answer_index":1, "explanation":"..."}]
Text: {text}`,

    'claim': `Role: CSAT Creator. Create ONE "Claim" question (필자의 주장).
Requirements:
1. Identify the Main Argument/Opinion.
2. Options: KOREAN complete sentences.
3. Distractors: Too specific (detail focus), Topic Error (mentioned but not main point), Contradictory.
Format: [{"type":"글의 주장", "question":"다음 글에서 필자가 주장하는 바로 가장 적절한 것은?", "options":["(1)...", "(2)...", ...], "answer_index":1, "explanation":"..."}]
Text: {text}`,

    'underlying': `Role: CSAT Creator. Create ONE "Implication" (Underlying Meaning) question.
Process:
1. **Target Selection**: Identify a metaphor representing the Main Idea. Mark it with <u>tags</u> in "modified_text".
2. **Correct Answer**: Paraphrase the figurative meaning abstractly (English).
3. **Distractors**: Literal Interpretation (Trap), Topic Error.
Format: [{"type":"함축 의미", "question":"밑줄 친 부분이 다음 글에서 의미하는 바로 가장 적절한 것은?", "options":["Option1", "Option2", "Option3", "Option4", "Option5"], "answer_index":3, "explanation":"...", "modified_text":"Full text with <u>underlined phrase</u>..."}]
Text: {text}`,

    'gist': `Role: CSAT Creator. Create ONE "Gist" question (글의 요지).
Requirements:
1. Identify the Core Message.
2. Options: KOREAN full sentences.
3. Distractors: Mentioned details but not the main point, Misinterpretation of causality.
Format: [{"type":"글의 요지", "question":"다음 글의 요지로 가장 적절한 것은?", "options":["(1)...", "(2)...", ...], "answer_index":1, "explanation":"..."}]
Text: {text}`,

    'topic': `Role: CSAT Creator. Create ONE "Topic" question (글의 주제).
Requirements:
1. Identify the Topic/Subject.
2. Options: ENGLISH phrases.
3. Distractors: Too Broad, Too Narrow, Same Keyword but wrong relation.
Format: [{"type":"글의 주제", "question":"다음 글의 주제로 가장 적절한 것은?", "options":["(1)...", "(2)...", ...], "answer_index":1, "explanation":"..."}]
Text: {text}`,

    'title': `Role: CSAT Creator. Create ONE "Title" question (글의 제목).
Requirements:
1. Create a Title that covers the whole text.
2. Options: ENGLISH phrases/sentences.
3. Distractors: Too Broad (covers too much), Too Narrow (only one part), Metaphoric but inaccurate.
Format: [{"type":"글의 제목", "question":"다음 글의 제목으로 가장 적절한 것은?", "options":["(1)...", "(2)...", ...], "answer_index":1, "explanation":"..."}]
Text: {text}`,

    'grammar': `Role: CSAT Creator. Create ONE "Grammar" question.
Requirements:
1. **Focus on Key Grammar**: Subject-Verb Agreement, Voice, Participles, Relative Clauses.
2. **Underlining**: Mark 5 parts with circled numbers ①, ②, ③, ④, ⑤ and <u>underline</u>. One MUST be incorrect.
Format: [{"type":"어법", "question":"다음 글의 밑줄 친 부분 중, 어법상 틀린 것은?", "options":["①", "②", "③", "④", "⑤"], "answer_index":3, "explanation":"...", "modified_text":"Full text with ① <u>word</u> markings..."}] 
Text: {text}`,

    'vocabulary': `Role: CSAT Creator. Create ONE "Vocabulary" question.
Requirements: **HIGH DIFFICULTY LOGIC**.
1. **Global Coherence**: The target word must be a KEYWORD for the Main Idea. The WRONG choice (answer) must **contradict** the main flow.
2. **Underlining**: Mark 5 words with circled numbers ①, ②, ③, ④, ⑤ and <u>underline</u>.
Format: [{"type":"어휘", "question":"다음 글의 밑줄 친 부분 중, 문맥상 낱말의 쓰임이 적절하지 않은 것은?", "options":["①", "②", "③", "④", "⑤"], "answer_index":3, "explanation":"...", "modified_text":"Full text with ① <u>word</u> markings..."}]
Text: {text}`,

    'blank': `Role: CSAT Creator. Create A SET OF 4 "Blank Inference" questions based on the text.
Requirements:
1. **Quantity**: Exactly **4 distinct questions**.
2. **Variety**: Word, Phrase, Clause, Transition/Conclusion.
3. **Paraphrasing**: The Correct Option MUST be a **PARAPHRASED** version of the original text.
Format: [
  {"type":"빈칸 추론 (단어)", "target":"(Original Word)", "question":"다음 빈칸에 들어갈 말로 가장 적절한 것을 고르시오.", "options":["Paraphrased Answer", "Distractor..."], "answer_index":1, "explanation":"..."},
  {"type":"빈칸 추론 (구)", "target":"(Original Phrase)", "question":"다음 빈칸에 들어갈 말로 가장 적절한 것을 고르시오.", "options":["Paraphrased Answer", "Distractor..."], "answer_index":1, "explanation":"..."},
  {"type":"빈칸 추론 (절)", "target":"(Original Clause)", "question":"다음 빈칸에 들어갈 말로 가장 적절한 것을 고르시오.", "options":["Paraphrased Answer", "Distractor..."], "answer_index":1, "explanation":"..."},
  {"type":"빈칸 추론 (연결사)", "target":"(Original Transition)", "question":"다음 빈칸에 들어갈 말로 가장 적절한 것을 고르시오.", "options":["Answer", "Distractor..."], "answer_index":1, "explanation":"..."}
]
Text: {text}`,

    'irrelevant': `Role: CSAT Creator. Create ONE "Irrelevant Sentence" question.
Numbering Rule: "The Last-5 Rule"
1. Identify the LAST 5 sentences of the text.
2. Mark them as ①, ②, ③, ④, ⑤ (Circled Numbers).
3. Do NOT number the Intro part.
4. Insert an "Irrelevant Sentence" (Distractor) at position ③ or ④.
   - Distractor Logic: Same Keyword, but Unrelated Predicate/Topic.
Format: [{"type":"무관한 문장", "question":"다음 글에서 전체 흐름과 관계 없는 문장은?", "options":["①", "②", "③", "④", "⑤"], "answer_index":3, "explanation":"...", "modified_text":"Intro... ① Sentence... ② Sentence... ③ Distractor... ④ Sentence... ⑤ Sentence..."}]
Text: {text}`,

    'sequence': `Role: CSAT Creator. Create ONE "Order" question using the "3-Step Cutting Algorithm".
1. **Introduction (Box)**: Use the first 1-2 sentences.
2. **Segmentation**: Divide the remaining text into (A), (B), (C).
   - Cut BEFORE Signal Words (However, Therefore) or Demonstratives.
3. **Shuffling**: Shuffle (A), (B), (C) randomly, determining the correct logical order.
4. **Chaining Explanation**: Explain the Logic Clues.
Format: [{"type":"글의 순서", "question":"주어진 글 다음에 이어질 글의 순서로 가장 적절한 것을 고르시오.", "options":["(A)-(C)-(B)", ...], "answer_index":3, "explanation":"...", "box":"...", "A":"...", "B":"...", "C":"..."}]
Text: {text}`,

    'insertion': `Role: CSAT Creator. Create ONE "Insertion" question using the "3-Step Extraction Algorithm".
1. **Extraction Strategy**: Identify a 'Key Sentence' in the LAST 5 sentences (Signal words highlight).
2. **Layout & Numbering**:
   - Extract the 'Key Sentence' into the 'box'.
   - Mark the remaining positions in the last part as ①, ②, ③, ④, ⑤.
3. **Explanation**: Focus on Logical Gap.
Format: [{"type":"문장 넣기", "question":"글의 흐름으로 보아, 주어진 문장이 들어가기에 가장 적절한 곳을 고르시오.", "options":["①", "②", "③", "④", "⑤"], "answer_index":3, "explanation":"...", "box":"Target Sentence...", "modified_text":"Intro... ① ... ② ... ③ ... ④ ... ⑤ ..."}]
Text: {text}`,

    'summary': `Role: CSAT Creator. Create ONE "Summary" question using the "3-Step Paraphrasing Strategy".
1. **Structure Selection**: Construct a Summary Sentence (Contrast or Cause-Effect).
2. **Targeting & Paraphrasing**: Convert keywords into **Synonyms** or **Abstract Terms**.
3. **Option Pairing**: Create 5 pairs of (A) - (B).
Format: [{"type":"요약문", "question":"다음 글의 내용을 한 문장으로 요약하고자 한다. 빈칸 (A), (B)에 들어갈 말로 가장 적절한 것은?", "options":["(A) word - (B) word", ...], "answer_index":1, "explanation":"...", "summary_text":"Full Summary Sentence with (A) and (B) markers..."}]
Text: {text}`
};

let inputCount = 0;
let currentType = '통합형';

function addInputBox() { createInputCard(""); }
function removeInputBox(id) { document.getElementById(id)?.remove(); updateTextCount(); }

function updateTextCount() {
    const texts = document.querySelectorAll('.source-textarea');
    let validCount = 0;
    texts.forEach(t => { if (t.value.trim()) validCount++; });
    const badge = document.getElementById('text-count-badge');
    if (badge) badge.innerText = validCount + "개";
}

function updateKeyStatus() {
    const key = localStorage.getItem("gemini_api_key");
    const statusEl = document.getElementById('api-key-status');
    if (statusEl) {
        if (key) {
            statusEl.innerText = "등록됨" + (activeModel ? ` (${activeModel})` : "");
            statusEl.style.color = "#10b981"; // Green
        } else {
            statusEl.innerText = "미등록";
            statusEl.style.color = "#ef4444"; // Red
        }
    }
}

// --- Modal Logic ---
let modalCallback = null;

function showModal({ title, content, hasInput = false, inputPlaceholder = "", confirmText = "확인", showCancel = true, onConfirm = null }) {
    const modal = document.getElementById('custom-modal');
    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-content').innerHTML = content; // Allow HTML

    const inputContainer = document.getElementById('modal-input-container');
    const input = document.getElementById('modal-input');
    const cancelBtn = document.getElementById('modal-cancel-btn');
    const confirmBtn = document.getElementById('modal-confirm-btn');

    if (hasInput) {
        inputContainer.style.display = 'block';
        input.value = '';
        input.placeholder = inputPlaceholder;
        setTimeout(() => input.focus(), 100); // Focus after render
    } else {
        inputContainer.style.display = 'none';
    }

    cancelBtn.style.display = showCancel ? 'block' : 'none';
    confirmBtn.innerText = confirmText;

    modal.style.display = 'flex';
    modalCallback = onConfirm;

    // Handle Enter key in input
    input.onkeydown = (e) => {
        if (e.key === 'Enter') confirmAction();
    };

    confirmBtn.onclick = confirmAction;
}

function confirmAction() {
    const input = document.getElementById('modal-input');
    const value = input.value;
    if (modalCallback) {
        modalCallback(value);
    } else {
        closeModal();
    }
}

function closeModal() {
    document.getElementById('custom-modal').style.display = 'none';
    modalCallback = null;
}

function resetKey() {
    const currentKey = localStorage.getItem("gemini_api_key");

    showModal({
        title: "API Key 설정",
        content: currentKey ? "현재 키가 등록되어 있습니다. 새로운 키를 입력하면 교체됩니다." : "Google Gemini API 키를 입력하세요.",
        hasInput: true,
        inputPlaceholder: "AIza로 시작하는 키 입력...",
        confirmText: "저장",
        onConfirm: (newKey) => {
            if (newKey && newKey.trim()) {
                localStorage.setItem("gemini_api_key", newKey.trim());
                updateKeyStatus();
                closeModal();
                showModal({ title: "완료", content: "API 키가 안전하게 저장되었습니다.", showCancel: false });
                autoDetectModel(); // Auto-check new key immediately
            } else {
                closeModal();
            }
        }
    });
}

// --- Auto Model Detection ---
let activeModel = 'gemini-1.5-flash'; // Default fallback

async function autoDetectModel(silent = true) {
    const apiKey = localStorage.getItem("gemini_api_key");
    if (!apiKey) return;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (!response.ok) return; // Silent fail

        const data = await response.json();
        const availableModels = data.models ? data.models.map(m => m.name.replace('models/', '')) : [];

        if (availableModels.length > 0) {
            // Preference List
            const preferred = [
                'gemini-1.5-flash',
                'gemini-1.5-flash-latest',
                'gemini-1.5-pro',
                'gemini-1.5-pro-latest',
                'gemini-pro'
            ];

            let bestMatch = null;
            for (const p of preferred) {
                if (availableModels.includes(p)) {
                    bestMatch = p;
                    break;
                }
            }

            // Fallback to first available if no preference matched
            activeModel = bestMatch || availableModels[0];
            console.log("Auto-detected Model:", activeModel);
            updateKeyStatus(); // Update UI to show model

            if (!silent) {
                showModal({ title: "연결 성공", content: `모델이 자동으로 설정되었습니다:<br><b style="color:#2563eb; font-size:1.1em;">${activeModel}</b>`, showCancel: false });
            }
        }
    } catch (e) {
        console.error("Auto detection failed", e);
    }
}

// Check key & Auto detect on load
document.addEventListener('DOMContentLoaded', () => {
    updateTextCount();
    updateKeyStatus();
    autoDetectModel(); // Run silently on load
});

// Check API Connection Manually
async function checkApiConnection() {
    const apiKey = localStorage.getItem("gemini_api_key");
    if (!apiKey) {
        showModal({ title: "알림", content: "API 키가 등록되어 있지 않습니다.<br>설정 메뉴에서 키를 등록해주세요.", showCancel: false });
        // Old resetKey call removed, user should use the UI
        return;
    }

    const btn = document.querySelector('button[onclick="checkApiConnection()"]');
    const originalText = btn ? btn.innerHTML : null;
    if (btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 연결 확인 중...';

    // We simply run autoDetectModel explicitly (silent = false) to show the feedback
    await autoDetectModel(false);

    if (btn && originalText) btn.innerHTML = originalText;
}

// AI Engine
// Utility: Sleep function
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// AI Engine
let activeMode = 'selected'; // 'all' or 'selected'

async function runAI(mode = 'selected') {
    activeMode = mode;

    const textareas = document.querySelectorAll('.source-textarea');
    const texts = [];
    textareas.forEach(area => { if (area.value.trim()) texts.push(area.value.trim()); });

    const loading = document.getElementById('loading');
    const emptyMsg = document.getElementById('empty-results-msg');
    const resultsContainer = document.getElementById('results-container');
    const statusText = document.getElementById('statusText');

    if (!texts.length) {
        alert("지문을 먼저 입력해주세요.");
        document.querySelector('.add-btn')?.click();
        return;
    }

    let apiKey = localStorage.getItem("gemini_api_key");
    if (!apiKey || apiKey === "null" || apiKey === "undefined") {
        apiKey = prompt("Google API Key (AIza...)를 입력하세요:");
        if (!apiKey) {
            alert("API 키 입력이 취소되어 생성을 중단합니다.");
            return;
        }
        localStorage.setItem("gemini_api_key", apiKey.trim());
        updateKeyStatus();
        await autoDetectModel(); // Detect model after new key
    }

    resultsContainer.innerHTML = "";
    globalGeneratedData = [];
    if (emptyMsg) emptyMsg.style.display = 'none';
    if (loading) loading.style.display = 'block';

    try {
        statusText.innerText = `${activeModel} 연결 중...`;

        // Use Auto-detected Model
        const modelName = activeModel;

        // Sequential Processing Loop
        for (let i = 0; i < texts.length; i++) {
            const text = texts[i];
            const index = i + 1;

            // Determine which types to generate based on Mode
            let typesToGenerate = [];

            if (activeMode === 'all') {
                typesToGenerate = [...ALL_TYPES];
            } else {
                const checkedBoxes = document.querySelectorAll('input[name="qtype"]:checked');
                typesToGenerate = Array.from(checkedBoxes).map(cb => cb.value);

                if (typesToGenerate.length === 0) {
                    alert("생성할 문제 유형을 최소 1개 이상 선택해주세요.");
                    if (loading) loading.style.display = 'none';
                    return;
                }
            }

            for (const typeKey of typesToGenerate) {
                let retryCount = 0;
                let success = false;
                const maxRetries = 3;

                while (!success && retryCount < maxRetries) {
                    try {
                        let statusMsg = `Generating... Passage ${index}/${texts.length} (${typeKey})`;
                        if (retryCount > 0) statusMsg += ` (Retry ${retryCount}/${maxRetries})`;
                        statusText.innerText = statusMsg;

                        let template = PROMPTS[typeKey];
                        if (!template) {
                            console.error("No prompt found for:", typeKey);
                            break;
                        }

                        const finalPrompt = template.replace("{text}", text);

                        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                contents: [{
                                    parts: [{ text: finalPrompt }]
                                }],
                                generationConfig: {
                                    response_mime_type: "application/json" // Force JSON output
                                }
                            })
                        });

                        // Handle Rate Limit (429) & Server Overload (503)
                        if (response.status === 429 || response.status === 503) {
                            const waitTime = 5000;
                            statusText.innerText = `서버 혼잡(${response.status}). ${waitTime / 1000}초 대기 후 재시도...`;
                            await sleep(waitTime);
                            retryCount++;
                            continue;
                        }

                        if (!response.ok) {
                            if (response.status === 400) {
                                localStorage.removeItem("gemini_api_key");
                                updateKeyStatus();
                                throw new Error("Google API 키가 정확한지 확인해주세요. (400 Bad Request)");
                            }
                            throw new Error(`Google API 오류: ${response.status}`);
                        }

                        const genData = await response.json();

                        // Safety Filter Check
                        if (!genData.candidates || !genData.candidates[0].content) {
                            let blockedReason = "안전 필터에 의해 차단됨";
                            if (genData.promptFeedback && genData.promptFeedback.blockReason) {
                                blockedReason += ` (${genData.promptFeedback.blockReason})`;
                            }
                            renderErrorCard(index, `[${typeKey}] 생성 실패: ${blockedReason}`);
                            success = true;
                            break;
                        }

                        const rawText = genData.candidates[0].content.parts[0].text;
                        const jsonText = rawText.replace(/```json|```|```/g, "").trim();
                        let questions;

                        try {
                            questions = JSON.parse(jsonText);
                        } catch (err) {
                            console.error("JSON Parse Error", err);
                            if (retryCount < maxRetries - 1) {
                                throw new Error("데이터 파싱 실패 (재시도 중...)");
                            } else {
                                renderErrorCard(index, `[${typeKey}] 데이터 처리 실패: ${err.message}`);
                                success = true;
                                break;
                            }
                        }

                        const qList = Array.isArray(questions) ? questions : [questions];

                        globalGeneratedData.push({
                            index: index,
                            text: text,
                            questions: qList,
                            type: typeKey
                        });

                        renderCardResult(index, text, qList, typeKey);
                        success = true;

                        await sleep(1500);

                    } catch (err) {
                        console.error(`Attempt ${retryCount + 1} failed:`, err);

                        if (retryCount >= maxRetries - 1) {
                            renderErrorCard(index, `[${typeKey}] 실패: ${err.message}`);
                            success = true;
                        } else {
                            await sleep(2000);
                        }
                        retryCount++;
                    }
                }
            }
        }
    } catch (e) {
        alert("오류 발생: " + e.message);
    } finally {
        if (loading) loading.style.display = 'none';
        statusText.innerText = "모든 생성이 완료되었습니다.";
    }
}

function renderCardResult(index, originalText, questions, globalType) {
    const container = document.getElementById('results-container');

    // Initialize sections if not exist
    let examLayout = document.getElementById('exam-layout');
    let answerSection = document.getElementById('answer-section');

    if (!examLayout) {
        // 1. Add Exam Header (Editable) - Inserted BEFORE the layout
        const headerDiv = document.createElement('div');
        headerDiv.className = 'exam-header-container';
        headerDiv.contentEditable = "true";
        headerDiv.innerHTML = `
            <div class="header-box">
                <h1 class="exam-title">2025학년도 1학년 2학기 (공통영어2) (기말)고사</h1>
                <div class="exam-info-row">
                    <span class="info-left">2025. 12. 10. 수요일 3교시</span>
                    <span class="info-center">[ 과목 코드 : 03 ]</span>
                    <span class="info-right">부산중앙여자고등학교</span>
                </div>
            </div>
            <div class="copyright-notice">
                이 시험 문제의 저작권은 부산광역시교육청(부산중앙여고)에 있습니다. 저작권법에 의해 보호받는 저작물이므로 전재와 복제와 발췌를 금지하며, 이를 어길 시 처벌될 수 있습니다.
            </div>
        `;
        container.appendChild(headerDiv);

        // 2. Create Two-Column Layout Wrapper (Questions Body)
        examLayout = document.createElement('div');
        examLayout.id = 'exam-layout';
        examLayout.className = 'exam-layout'; // Defined as 2-column in CSS
        container.appendChild(examLayout);

        // 3. Divider
        const divider = document.createElement('hr');
        divider.className = 'print-divider';
        divider.style.cssText = "margin: 50px 0; border: 0; border-top: 2px dashed #ccc; display:block;";
        container.appendChild(divider);

        // 4. Answer Section
        answerSection = document.createElement('div');
        answerSection.id = 'answer-section';
        answerSection.className = 'answer-section';
        answerSection.innerHTML = "<h2 style='margin-bottom:20px; text-align:center;'>[ 정답 및 해설 ]</h2>";
        container.appendChild(answerSection);

        // Add Invisible Footer for Print
        const footerInfo = document.createElement('div');
        footerInfo.className = 'exam-footer';
        footerInfo.style.display = 'none'; // Hidden by default, shown in print via CSS
        footerInfo.innerHTML = "2025학년도 1학년 2학기 기말고사 (공통영어2)";
        container.appendChild(footerInfo);
    }

    questions.forEach((q, idx) => {
        // --- 1. Render Question (Left/Right Column) ---
        let questionBody = originalText;
        const qType = q.type || globalType;

        if (q.modified_text) questionBody = q.modified_text;
        if (q.box) questionBody = `<div style="border:1px solid #000; padding:10px; margin-bottom:15px; font-weight:500;">${q.box}</div>` + (q.A ? `(A) ${q.A}<br><br>(B) ${q.B}<br><br>(C) ${q.C}` : questionBody);
        if (q.summary_text) questionBody = `<div style="border:1px solid #000; padding:10px; margin-bottom:15px; font-weight:500;">${q.summary_text}</div>`;

        // Correctly handle implicit or explicit blank types
        if ((qType.includes('빈칸') || q.type === 'Blank') && q.target) {
            const escapedTarget = q.target.replace(/[.*+?^$\{\}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escapedTarget, 'i');
            questionBody = questionBody.replace(regex, `________`);
        }

        questionBody = questionBody.replace(/\n/g, '<br>');

        const qNum = document.querySelectorAll('.question-card').length + 1; // Global Question Number

        // Question HTML: ONLY contents, no hidden answers
        const questionHtml = `
            <div class="question-card">
                <div style="font-family:'Pretendard'; font-size:16px; font-weight:700; color:#000; margin-bottom:12px;">
                    <span style="font-size:18px;">${qNum}.</span> ${q.question || "다음 물음에 답하시오."}
                </div>
                
                ${qType !== '글의 순서' && qType !== '문장 넣기' && qType !== '요약문' && !q.box ? `<div style="font-family:'Times New Roman'; font-size:16px; line-height:1.6; margin-bottom:15px; text-align:justify;">${questionBody}</div>` : ''}
                ${qType === '글의 순서' ? `<div style="font-family:'Times New Roman'; font-size:16px; margin-bottom:15px;">${questionBody}</div>` : ''}
                 ${q.box && qType !== '글의 순서' ? `<div style="font-family:'Times New Roman'; font-size:16px; margin-bottom:15px;">${questionBody}</div>` : ''}
                
                ${(qType !== '어법' && qType !== '어휘' && qType !== 'grammar' && qType !== 'vocabulary') ?
                `<div class="options-list" style="display:grid; grid-template-columns:1fr; gap:6px; font-size:15px;">
                    ${q.options.map((o, k) => {
                    // Strip existing numbering patterns like (1), 1., ①
                    const cleanOption = o.replace(/^(\(?[0-9]+\)|[①-⑮]|\(?[A-E]\))\.?\s*/i, '');
                    return `<div>${['①', '②', '③', '④', '⑤'][k] || (k + 1)} ${cleanOption}</div>`;
                }).join('')}
                </div>` : ''}
            </div>
        `;
        examLayout.innerHTML += questionHtml;

        // --- 2. Render Answer (Bottom Section / Next Page) ---
        // Concise style: 1. Answer | Explanation
        const answerHtml = `
            <div class="answer-item" style="border-bottom: 1px solid #eee; padding: 10px 0;">
                <div style="font-weight:bold; color:#000;">
                    <span style="display:inline-block; width:30px;">${qNum}</span> 
                    정답: <span style="color:#2563eb; margin-right:15px;">${q.answer_index}</span>
                </div>
                <div style="font-size:14px; color:#555; margin-top:4px;">
                    <span style="font-weight:bold; color:#777;">[해설]</span> ${q.explanation || "제공되지 않음"}
                </div>
            </div>
        `;
        answerSection.innerHTML += answerHtml;
    });
}


function renderErrorCard(index, msg) {
    const container = document.getElementById('results-container');
    container.innerHTML += `<div class="result-card" style="display:block; border-color:red; color:red; padding:20px;">지문 ${index} 오류: ${msg}</div>`;
}

async function handleFileUpload(input) {
    const files = input.files;
    if (!files.length) return;
    for (let i = 0; i < files.length; i++) {
        let title = files[i].name.replace(/\.[^/.]+$/, "");
        if (files[i].type === "application/pdf") {
            let text = await readPdfFile(files[i]);
            createInputCard(text, title);
        } else {
            let text = await readTextFile(files[i]);
            createInputCard(text, title);
        }
    }
    input.value = "";
}

function readTextFile(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.readAsText(file);
    });
}

async function readPdfFile(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        fullText += textContent.items.map(item => item.str).join(" ") + "\n\n";
    }
    return fullText;
}

function createInputCard(text = "", title = "") {
    inputCount++;
    const list = document.getElementById('input-list');
    const newCard = document.createElement('div');
    newCard.className = 'input-card';
    newCard.id = `card-${inputCount}`;
    newCard.innerHTML = `
<div class="card-top">
<div style="display:flex; align-items:center; gap:8px; flex:1;">
<span><i class="fas fa-pen"></i></span>
<input type="text" class="passage-title-input" placeholder="지문 제목 입력..." value="${title}" 
style="border:none; border-bottom: 1px solid #ddd; font-weight:700; font-size:15px; width:100%; outline:none; background:transparent; padding-bottom: 4px;">
</div>
<span class="delete-btn" onclick="removeInputBox('card-${inputCount}')"><i class="fas fa-trash"></i> 삭제</span>
</div>
<textarea class="source-textarea" rows="10" placeholder="여기에 영어 지문을 입력하세요...">${text}</textarea>
`;
    list.appendChild(newCard);
    updateTextCount();
}

// Checkbox Toggle All
function toggleAll(source) {
    const checkboxes = document.querySelectorAll('input[name="qtype"]');
    for (let i = 0; i < checkboxes.length; i++) {
        checkboxes[i].checked = source.checked;
    }
}

// Remove old selectType function
// function selectType(el) { ... } deleted


async function saveAsHTML() {
    const examContent = document.getElementById('exam-layout')?.outerHTML || "";
    const answerContent = document.getElementById('answer-section')?.outerHTML || "";

    if (!examContent) {
        alert("저장할 문제가 없습니다. 먼저 생성해주세요.");
        return;
    }

    let cssText = "";
    try {
        const response = await fetch('style.css');
        cssText = await response.text();
    } catch (e) {
        // Fallback CSS
        cssText = `
body { font-family: sans-serif; }
.exam-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 50px; }
.question-card/ { break-inside: avoid; margin-bottom: 30px; }
.answer-section { page-break-before: always; margin-top: 50px; }
.print-divider { display: none; }
@media print {
     .exam-layout { display: block; column-count: 2; column-gap: 40px; }
     .answer-section { page-break-before: always; }
}
`;
    }

    const fullHtml = `
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>CSAT Exam Paper</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
<style>
${cssText}
/* Overrides for standalone file */
body { padding: 40px; max-width: 1000px; margin: 0 auto; background: white; }
.print-divider { border-top: 2px dashed #ccc; margin: 50px 0; }
</style>
</head>
<body>
<h1 style="text-align:center; margin-bottom:40px; border-bottom:2px solid #333; padding-bottom:15px;">수능 영어 변형문제</h1>

<!-- Question Section -->
${examContent}

<hr class="print-divider">

<!-- Answer Section -->
${answerContent}

</body>
</html>`;
    const blob = new Blob([fullHtml], { type: 'text/html' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Exam_Paper_${new Date().toISOString().slice(0, 10)}.html`;
    link.click();
}