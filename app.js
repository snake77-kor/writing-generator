let globalGeneratedData = []; // Global storage for download
let inputCount = 0;

// --- Tab Logic ---
function switchTab(mode, element) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    element.classList.add('active');

    if (mode === 'exam') {
        document.getElementById('sidebar-exam-content').style.display = 'block';
        document.getElementById('sidebar-learning-content').style.display = 'none';
        
        const emptyMsg = document.getElementById('empty-results-msg');
        if (emptyMsg) {
            emptyMsg.innerHTML = `
                <i class="fas fa-check-square" style="font-size:24px; margin-bottom:15px; opacity:0.5;"></i><br>
                왼쪽 사이드바에서 <b>원하는 유형을 체크</b>하고<br>
                <b>[서술형 시험지 생성]</b> 버튼을 눌러주세요.
            `;
        }
    } else {
        document.getElementById('sidebar-exam-content').style.display = 'none';
        document.getElementById('sidebar-learning-content').style.display = 'block';

        const emptyMsg = document.getElementById('empty-results-msg');
        if (emptyMsg) {
            emptyMsg.innerHTML = `
                <i class="fas fa-book" style="font-size:24px; margin-bottom:15px; opacity:0.5;"></i><br>
                왼쪽 사이드바에서 <b>[확인학습지 생성]</b> 버튼을 눌러주세요.<br>
                (주제, 제목, 요지, Q&A, 요약문 영작 훈련)
            `;
        }
    }
}

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

// --- Writing Test Generator Logic ---
async function runAI_Writing() {
    // 0. Input Validation
    const textareas = document.querySelectorAll('.source-textarea');
    const titleInputs = document.querySelectorAll('.passage-title-input');

    let combinedSourceText = "";
    let validCount = 0;

    textareas.forEach((area, idx) => {
        const text = area.value.trim();
        const title = titleInputs[idx].value.trim() || `Passage ${idx + 1}`;
        if (text) {
            combinedSourceText += `\n[${title}]\n${text}\n\n`;
            validCount++;
        }
    });

    if (validCount === 0) {
        alert("지문을 먼저 입력해주세요.");
        return;
    }

    let apiKey = localStorage.getItem("gemini_api_key");
    if (!apiKey) {
        alert("API 키가 필요합니다. 설정 메뉴에서 등록해주세요.");
        return;
    }

    // 1. Get Settings
    const examTitle = document.getElementById('exam-title-input').value || "2026학년도 1학기 중간고사 대비";
    const examSubtitle = document.getElementById('exam-subtitle-input').value || "영어 교과서 서술형 대비";
    const difficulty = document.getElementById('writing-difficulty').value;

    const isAutoRecommend = document.getElementById('ai-auto-recommend') && document.getElementById('ai-auto-recommend').checked;

    let targetTypes = [];
    if (isAutoRecommend) {
        targetTypes = ["단순 배열", "변형 배열", "조건 영작", "요약문 빈칸", "문장 전환", "밑줄 고쳐 쓰기", "양자택일형", "밑줄 없이 찾기", "오류 이유 서술형", "우리말 해석", "함축 의미 추론"];
    } else {
        const checkedBoxes = document.querySelectorAll('input[name="wtype"]:checked');
        targetTypes = Array.from(checkedBoxes).map(cb => cb.value);
    }

    // 2. Prepare UI
    const loading = document.getElementById('loading');
    const statusText = document.getElementById('statusText');
    const resultsContainer = document.getElementById('results-container');
    const emptyMsg = document.getElementById('empty-results-msg');

    if (targetTypes.length === 0) {
        alert("생성할 문제 유형을 최소 1개 이상 선택해주세요.");
        return;
    }

    resultsContainer.innerHTML = "";
    if (emptyMsg) emptyMsg.style.display = 'none';
    if (loading) loading.style.display = 'block';
    statusText.innerText = `서술형 문제 생성 중... (모델: ${activeModel})`;

    // 3. Construct Prompt
    const typeInstructions = [];

    targetTypes.forEach(qType => {
        if (qType.includes("단순 배열") || qType.includes("변형 배열") || qType.includes("조건 영작")) {
            typeInstructions.push(`
            ### Type: 1. 단어 배열 및 조건 영작 (Word Arrangement & Conditional Writing) - ${qType}
            - **Target Selection:** 지문 내에서 특수 구문(도치, 강조, 가정법, the 비교급 등)이나 명사절(간접의문문 등)이 포함된 핵심 문장을 타깃으로 설정.
            - **Difficulty Strategy:** 제시어는 동사 원형 등 기본 형태로만 제공하고, 문맥에 맞게 시제(과거완료 등)나 태(수동태)를 학생이 직접 변형하도록 유도하는 조건을 반드시 추가할 것.
            - **예제:**
              [지시문] 위 글의 밑줄 친 우리말과 같도록 <조건>의 말을 활용하여 영작하시오. (필요시 단어를 추가/변형하시오.)
              [우리말] 그것은 과거에는 개인들이 어떻게 그들 자신과 그들의 사회를 바라보았는지에 대한 더 명확한 이해를 제공할 수 있다.
              [제시어] a clearer understanding of / view / can / individuals / it / themselves and their societies / provide
              [정답] It can provide a clearer understanding of how individuals viewed themselves and their societies in the past.
            - **CRITICAL:** You must MODIFY the **Source Text**. Replace the target sentence with a blank underline \`__________________ (가) __________________.\` Keeping the original period(.). DO NOT show any original English words.
            `);
        } else if (qType.includes("요약문 빈칸")) {
            typeInstructions.push(`
            ### Type: 3. 요약문 완성 및 주제/제목 쓰기 (Summary & Theme Completion)
            - **Task:** Create a summary paragraph.
            - **Difficulty Strategy:** 원문의 핵심 키워드를 그대로 정답으로 쓰게 하지 말고, 유의어(Synonym)로 대체하거나 품사를 변형(예: important → importance)하여 작성하도록 출제하여 독해력과 어휘력을 동시 평가할 것.
            - **Condition:** 학생에게 힌트이자 제약이 되도록 '주어진 철자로 시작할 것'이라는 조건을 줄 것.
            - **예제:**
              [지시문] 아래는 이 글의 요약문이다. 주어진 철자로 시작하되 본문의 단어를 어법에 맞게 품사 변형하여 빈칸을 채우시오. (각 빈칸 1단어)
              [요약문] In order not to be (1) t____ by (2) i____ pleasure, children use various kinds of methods and get their behavior (3) r____ by themselves.
              [정답] (1) tempted (2) immediate (3) regulated (원문의 temptation, immediately, regulate 변형)
            - **MARKER RULE:** NO markers in text for this type.
            `);
        } else if (qType.includes("문장 전환")) {
            typeInstructions.push(`
            ### Type: 5. 문장 구조 전환 (Sentence Transformation)
            - **Target Selection:** 능동태↔수동태 전환, 부사절↔분사구문 전환, 직설법↔가정법 전환, It is ~ that 강조 구문으로의 전환을 최우선으로 출제할 것.
            - **Difficulty Strategy:** 문장 전환 시 시제 일치나 주어가 다를 때의 처리(독립분사구문 등)에서 함정을 만들어 변별력을 확보할 것.
            - **예제:**
              [지시문] 다음 글의 밑줄 친 부분을 분사구문을 활용하여 바꿔 쓰시오.
              [원문 / 밑줄] <u>As they have new and improved scientific knowledge</u>, scientists are able to...
              [정답] Having new and improved scientific knowledge
            - **CRITICAL:** MODIFY Source Text with \`(a)\` or \`(b)\` + \`<u>...</u>\`. 문장 구조를 전환할 때 원문의 사실 관계(Fact)와 핵심 주제를 철저히 유지하세요.
            `);
        } else if (qType.includes("밑줄 고쳐 쓰기") || qType.includes("양자택일형") || qType.includes("밑줄 없이 찾기") || qType.includes("오류 이유 서술형")) {
            typeInstructions.push(`
            ### Type: 2. 어법 및 어휘 오류 수정 (Grammar & Vocabulary Correction) - ${qType}
            - **Difficulty Strategy:** 주어와 동사 사이에 긴 수식어구(전명구, 관계사절 등)를 배치하여 '수 일치' 함정을 만들거나, 능동태/수동태 전환, 형용사/부사 쓰임, 관계대명사/관계부사 구별에 오류를 발생시킬 것.
            - **Answer Requirement:** 단순히 틀린 단어를 고치는 것에 그치지 않고, 어법상 틀린 이유를 우리말로 구체적으로 설명하도록 요구할 것.
            - **예제:**
              [지시문] 다음 문장에서 틀린 부분을 찾아 바르게 고치고, 그 이유를 쓰시오.
              [오류 부분] Writing down whatever is bothering you help you better understand how you feel.
              [정답] help → helps
              [이유] 문장의 주어가 동명사구 및 명사절(Writing down whatever is bothering you)로 이루어져 있으며, 구나 절이 주어일 때는 단수 취급하므로 단수 동사인 helps를 써야 한다.
            - **CRITICAL:** MODIFY Source Text safely based on the type (e.g. 5 underlines with 1 error, or 3 brackets, or hidden errors). Ensure space for \`이유(Reason):\` is provided.
            `);
        } else if (qType.includes("우리말 해석") || qType.includes("함축 의미 추론")) {
            typeInstructions.push(`
            ### Type: 4. 세부 내용 파악 및 지칭 추론 (Detail & Reference Inference) - ${qType}
            - **Target Selection:** 지문 내의 추상적 지칭어(예: this factor, this unconscious function 등) 혹은 비유적 표현을 타깃으로 삼을 것.
            - **Difficulty Strategy:** 지문에서 그대로 찾아 영어 문장으로 쓰게 하거나, 난이도를 높이기 위해 글의 문맥적/함축적 의미를 우리말로 풀어서 서술(예: 30자 이내)하도록 요구할 것.
            - **예제:**
              [지시문] 다음 글의 밑줄 친 'this factor'가 가리키는 내용을 본문에서 찾아 조건에 맞게 쓰시오. (조건: 12~16단어의 완벽한 영어 문장으로 쓰시오.)
              [본문 일부] We are extremely responsive to what we perceive people around us to be doing. (...) A study has shown how powerful <u>this factor</u> is.
              [정답] We are extremely responsive to what we perceive people around us to be doing.
            - **CRITICAL:** MODIFY Source Text. Label target with \`㉠\` or \`㉡\` + \`<u>...</u>\`.
            `);
        }
    });

    const prompt = `
    # Role & Objective
    You are an expert AI specialized in creation "Korean High School English Internal Exams (Naesin)".
    Your goal is to transform the user's input English text into a high-quality "Short-Answer Variation Problem Set" (서답형 변형문제).
    
    [UPDATED TASK INSTRUCTION]
    Target Level: ${difficulty}
    Exam Title: ${examTitle}
    Exam Subtitle: ${examSubtitle}
    
    ${isAutoRecommend
            ? "**[AUTO RECOMMENDATION MODE]**\\n    Analyze the Source Text carefully and CHOOSE the 2~3 MOST APPROPRIATE question types per passage from the following list.\\n    DO NOT generate all of them. Only pick the best 2~3 types that fit the passage's characteristics.\\n    AVAILABLE TYPES POOL:"
            : `GENERATE ONLY THE FOLLOWING ${targetTypes.length} QUESTIONS:`}
    ${typeInstructions.join('\n')}

    [MULTI_PASSAGE HANDLING]
    - The user provided MULTIPLE passages. The input text contains headers like \`[Title]\`.
    - **Separation Rule:** Do NOT mix contents of different passages in a single question.
    - **Context Awareness:** clearly understand which passage each question belongs to.
    - Keep questions balanced across the provided passages.

    [CRITICAL AI PROMPTING GUIDELINES]
    - **Scoring Rubric (채점 기준 추가):** 모든 서술형 문항에 대해 구체적인 채점 기준을 제공하세요. (예: "시제나 수 일치 오류 시 -1점 감점", "핵심 단어 'tempted' 누락 시 0점 처리" 등)
    - **No Hallucination (원문 훼손 금지):** 문장 구조를 전환하거나 요약문을 만들 때 원문의 사실 관계(Fact)와 핵심 주제를 절대 왜곡하거나 누락하지 마세요.

    Source Text:
    ${combinedSourceText}

    [DESIGN & LAYOUT SPECIFICATIONS - CRITICAL]
    You must generate a COMPLETE HTML document starting with \`<!DOCTYPE html>\`.
    
    1. **Page Layout (B4 Size & 2-Column):**
       - Use the following CSS in \`<style>\`:
         @page { size: B4 portrait; margin: 10mm; }
         body { font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; line-height: 1.6; padding: 20px; background-color: #ffffff !important; color: #000000 !important; }
         .page-container { width: 100%; box-sizing: border-box; background-color: #ffffff !important; }
         .header-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; border: 2px solid #000; background-color: #ffffff; }
         .answer-line { display: block; width: 100%; border-bottom: 1px solid #000; margin-top: 40px; margin-bottom: 20px; height: 30px; }
         .footer { text-align: center; font-size: 10px; color: #888; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px; }
         .answer-key-section { page-break-before: always; display: block; margin-top: 50px; border-top: 2px dashed #000; padding-top: 20px; background-color: #ffffff; }
         .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 80px; font-weight: bold; color: rgba(0, 0, 0, 0.08); white-space: nowrap; z-index: 0; pointer-events: none; user-select: none; font-family: 'Helvetica', sans-serif; }
         .content-wrapper { position: relative; z-index: 10; column-count: 2; column-gap: 5mm; column-rule: 0.5px solid #ccc; text-align: justify; }
         .question-box { break-inside: avoid; margin-bottom: 60px; background-color: #ffffff; }
         .scoring-rubric { font-size: 0.85em; color: #d97706; background-color: #fffbeb; border-left: 3px solid #f59e0b; padding: 10px; margin-top: 15px; }
         ul { list-style-type: none; padding-left: 0; }
         li { margin-bottom: 5px; }

    2. **Editable Capability:**
       - **CRITICAL:** Add \`contenteditable="true"\` to the \`<body>\` tag.

    3. **Structure & Instruction:**
       - **Watermark:** Immediately inside \`<body>\`, add \`<div class="watermark">Top English Academy</div>\`.
       - **Header:** Insert the Title and Student Info Table at the very top. Use "${examTitle}" and "${examSubtitle}".
       - **Main Instruction:** Immediately after the header, add: \`<h3><b>※ 다음 글을 읽고 물음에 답하시오.</b></h3>\`
       - **NO LABELS:** Do NOT add headers like \`[Passage]\` before the text.
       - **Body:** Wrap all the questions and reading passages inside \`<div class="content-wrapper">\`.
       - **Question Format & Output Format Strictness:** 
         Inside each \`.question-box\`, strictly follow this structure:
         \`<div class="q-instruction"><b>[Question Header / Instruction]</b></div>\`
         \`<div class="q-condition"><i>[Condition] (If explicitly requested)</i></div>\`
         \`<div class="q-passage">[Modified Source Text / Passage]</div>\`
         \`<div class="q-answer-space"><div class="answer-line"></div></div>\`
       - **Footer:** Insert the Branding Footer at the very bottom.
       - **Answer Key:** Place the Answer Key at the very end of the document, OUTSIDE the \`.content-wrapper\`, wrapped in \`<div class="answer-key-section">\`.
         - In the Answer Key section, include the **[채점 기준] (Scoring Rubric)** using the \`<div class="scoring-rubric">\` class right below each answer.

    4. **Header HTML (Student Info):**
       <table class="header-table">
           <tr style="height: 40px;">
               <td style="width: 10%; text-align: center; border-right: 1px solid #000; border-bottom: 1px solid #000; font-weight: bold; background-color: #f0f0f0;">Date</td>
               <td style="width: 25%; border-right: 1px solid #000; border-bottom: 1px solid #000;"></td>
               <td style="width: 15%; text-align: center; border-right: 1px solid #000; border-bottom: 1px solid #000; font-weight: bold; background-color: #f0f0f0;">Score</td>
               <td style="width: 50%; border-bottom: 1px solid #000;"> &nbsp; / 100</td>
           </tr>
           <tr style="height: 40px;">
               <td style="width: 10%; text-align: center; border-right: 1px solid #000; font-weight: bold; background-color: #f0f0f0;">Class</td>
               <td style="width: 25%; border-right: 1px solid #000;"></td>
               <td style="width: 15%; text-align: center; border-right: 1px solid #000; font-weight: bold; background-color: #f0f0f0;">Name</td>
               <td style="width: 50%;"></td>
           </tr>
       </table>

    [OUTPUT FORMAT]
    Output ONLY the RAW HTML Code (Full design with B4 size, 2 columns, Editable body, and separated Answer Key with Rubrics). 
    Do not output markdown code blocks. Just start with <!.
    `;

    // 4. API Call
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }]
            })
        });

        if (!response.ok) throw new Error(`API Error: ${response.status}`);

        const data = await response.json();

        if (!data.candidates || !data.candidates[0].content) {
            throw new Error("결과 생성 실패 (Safety Block 등)");
        }

        let rawHtml = data.candidates[0].content.parts[0].text;

        // Cleanup HTML string
        rawHtml = rawHtml.replace(/```html|```/g, "").trim();

        // Render Result
        renderWritingResult(rawHtml);

    } catch (e) {
        alert("오류 발생: " + e.message);
        console.error(e);
    } finally {
        if (loading) loading.style.display = 'none';
        statusText.innerText = "문제 생성 완료";
    }
}

function renderWritingResult(htmlContent) {
    const container = document.getElementById('results-container');
    container.innerHTML = `
        <div style="background:var(--card-bg); padding:20px; border-radius:12px; border:1px solid #e2e8f0; margin-bottom:20px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                <h3 style="margin:0; font-size:18px; color:#1e293b;"><i class="fas fa-check-circle" style="color:#10b981;"></i> 서술형 시험지 생성 완료</h3>
                <button onclick="downloadWritingHTML()" style="background:#2563eb; color:#fff; border:none; padding:8px 16px; border-radius:6px; font-weight:600; cursor:pointer;">
                    <i class="fas fa-download"></i> 다운로드 (.html)
                </button>
            </div>
            <div style="width:100%; height:800px; border:1px solid #ddd; border-radius:8px; overflow:hidden;">
                <iframe id="preview-frame" style="width:100%; height:100%; border:none; background:#fff;"></iframe>
            </div>
        </div>
    `;

    // Store global for download
    window.lastGeneratedHTML = htmlContent;

    // Inject into iframe
    const iframe = document.getElementById('preview-frame');
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(htmlContent);
    doc.close();
}

function downloadWritingHTML() {
    if (!window.lastGeneratedHTML) return;
    
    let htmlContent = window.lastGeneratedHTML;
    if (!htmlContent.includes('contenteditable')) {
        htmlContent = htmlContent.replace(/<body([^>]*)>/i, '<body$1 contenteditable="true">');
    }

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Writing_Exam_${new Date().toISOString().slice(0, 10)}.html`;
    link.click();
}

// --- Learning Mode Generator Logic ---
async function runAI_Learning() {
    // 0. Input Validation
    const textareas = document.querySelectorAll('.source-textarea');
    const titleInputs = document.querySelectorAll('.passage-title-input');

    let combinedSourceText = "";
    let validCount = 0;

    textareas.forEach((area, idx) => {
        const text = area.value.trim();
        const title = titleInputs[idx].value.trim() || `Passage ${idx + 1}`;
        if (text) {
            combinedSourceText += `\n[${title}]\n${text}\n\n`;
            validCount++;
        }
    });

    if (validCount === 0) {
        alert("지문을 먼저 입력해주세요.");
        return;
    }

    let apiKey = localStorage.getItem("gemini_api_key");
    if (!apiKey) {
        alert("API 키가 필요합니다. 설정 메뉴에서 등록해주세요.");
        return;
    }

    // 1. Get Settings
    const examTitle = document.getElementById('learning-title-input').value || "서술형 대비 확인학습";
    const examSubtitle = document.getElementById('learning-subtitle-input').value || "주제/요지/요약문 영작 훈련";

    // 2. Prepare UI
    const loading = document.getElementById('loading');
    const statusText = document.getElementById('statusText');
    const resultsContainer = document.getElementById('results-container');
    const emptyMsg = document.getElementById('empty-results-msg');

    resultsContainer.innerHTML = "";
    if (emptyMsg) emptyMsg.style.display = 'none';
    if (loading) loading.style.display = 'block';
    statusText.innerText = `확인학습지 생성 중... (모델: ${activeModel})`;

    // 3. Construct Prompt
    const prompt = `
    # Role & Objective
    You are an expert English teacher. Create a "Korean High School English Descriptive Preparation Learning Sheet" (서술형 확인학습지).
    
    Target Tasks (For EVERY passage provided):
    For EACH passage independently, generate:
    1. 주제 영작 (Topic English writing) - Ask to write the topic of the text in English.
    2. 제목 영작 (Title English writing) - Ask to write the title of the text in English.
    3. 요지쓰기 (Main idea writing) - Ask to write the main idea of the text in Korean (한글로 작성).
    4. 구조화 빈칸 영작 (Structured Cloze Writing) - Provide a key sentence from the text with some parts left blank (especially key patterns like 'not only A but B') to help students practice partial English writing.
    5. 질문-응답 (Question-answer) - Provide an English question about the passage and leave space for an English answer.
    6. 요약문 영작 (Summary English writing) - Provide a summary sentence with 3~4 blank words based on initial letters (e.g. T____) and word form transformation.
    7. 고난도 조건 영작 (Conditioned Writing) - Select a key sentence and provide root-form words. Ask the student to arrange and modify verbs (voice, tense) adding new words if necessary.
    8. 함축 의미 (Implied Meaning) - Ask for the implied meaning of a specific phrase/sentence from the text.
    9. 지칭 추론 (Reference Inference) - Ask what a specific pronoun or phrase refers to in the text.
    10. 파생 어휘 리스트 (Vocabulary List) - Provide a table of synonyms and antonyms for 3~5 key vocabulary words from the text.
    
    Source Text:
    ${combinedSourceText}

    [DESIGN & LAYOUT SPECIFICATIONS - CRITICAL]
    You must generate a COMPLETE HTML document starting with \`<!DOCTYPE html>\`.
    
    1. **Page Layout (B4 Size, 1 Page per Passage, 2-Column):**
       - Use the following CSS in \`<style>\`:
         @page { size: B4 portrait; margin: 10mm; }
         body { font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; line-height: 1.6; padding: 20px; background-color: #ffffff !important; color: #000000 !important; }
         .page-container { width: 100%; box-sizing: border-box; background-color: #ffffff !important; }
         .header-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; border: 2px solid #000; background-color: #ffffff; }
         .answer-line { display: block; width: 100%; border-bottom: 1px dashed #777; margin-top: 20px; margin-bottom: 20px; height: 30px; }
         .footer { text-align: center; font-size: 10px; color: #888; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px; }
         .answer-key-section { page-break-before: always; display: block; margin-top: 50px; border-top: 2px dashed #000; padding-top: 20px; background-color: #ffffff; }
         .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 80px; font-weight: bold; color: rgba(0, 0, 0, 0.08); white-space: nowrap; z-index: 0; pointer-events: none; user-select: none; font-family: 'Helvetica', sans-serif; }
         .content-wrapper { position: relative; z-index: 10; text-align: justify; }
         .passage-section { page-break-after: always; margin-bottom: 0; background-color: #ffffff; padding: 10px; display: flex; gap: 5mm; min-height: 800px; }
         .left-column { flex: 1; border-right: 1px solid #ccc; padding-right: 5mm; }
         .right-column { flex: 1; }
         .passage-text { margin-bottom: 25px; font-family: 'Times New Roman', serif; font-size: 1.1em; line-height: 1.8; }
         .task-item { margin-bottom: 25px; }
         .task-title { font-weight: bold; font-size: 1.05em; margin-bottom: 8px; display:flex; align-items:flex-start; }
         .task-title::before { content: "▶"; color: #3b82f6; margin-right: 6px; font-size: 0.9em; margin-top: 2px; }

    2. **Editable Capability:**
       - **CRITICAL:** Add \`contenteditable="true"\` to the \`<body>\` tag.

    3. **Structure & Instruction:**
       - **Watermark:** Immediately inside \`<body>\`, add \`<div class="watermark">Top English Academy</div>\`.
       - **Header:** Insert the Title and Student Info Table at the very top. Use "${examTitle}" and "${examSubtitle}".
       - **Main Instruction:** Immediately after the header, add: \`<h3><b>※ 다음 글을 읽고 각 빈칸이나 질문에 알맞게 논술/영작하시오.</b></h3>\`
       - **Body:** Wrap all the content inside \`<div class="content-wrapper">\`.
       - For EACH passage, create a \`<div class="passage-section">\`:
         - Inside \`.passage-section\`, add \`<div class="left-column">\` and \`<div class="right-column">\`.
         - **Left Column:** Put the passage text inside \`<div class="passage-text"><b>[Passage Title]</b><br><br>[Original Passage]</div>\`.
         - **Right Column:** Add the 10 tasks consecutively. Each task needs enough \`<div class="answer-line"></div>\` for the student to write their answer. Keep the questions inside \`.task-item\` blocks.
       - **Answer Key:** Place the expected/model Answer Key at the very end of the document, OUTSIDE the \`.content-wrapper\`, wrapped in \`<div class="answer-key-section">\`. Give a clear model answer for the 10 tasks for each passage.

    4. **Header HTML (Student Info):**
       <table class="header-table">
           <tr style="height: 40px;">
               <td style="width: 10%; text-align: center; border-right: 1px solid #000; border-bottom: 1px solid #000; font-weight: bold; background-color: #f0f0f0;">Date</td>
               <td style="width: 25%; border-right: 1px solid #000; border-bottom: 1px solid #000;"></td>
               <td style="width: 15%; text-align: center; border-right: 1px solid #000; border-bottom: 1px solid #000; font-weight: bold; background-color: #f0f0f0;">Score</td>
               <td style="width: 50%; border-bottom: 1px solid #000;"> &nbsp; / 100</td>
           </tr>
           <tr style="height: 40px;">
               <td style="width: 10%; text-align: center; border-right: 1px solid #000; font-weight: bold; background-color: #f0f0f0;">Class</td>
               <td style="width: 25%; border-right: 1px solid #000;"></td>
               <td style="width: 15%; text-align: center; border-right: 1px solid #000; font-weight: bold; background-color: #f0f0f0;">Name</td>
               <td style="width: 50%;"></td>
           </tr>
       </table>

    [OUTPUT FORMAT]
    Output ONLY the RAW HTML Code (Full design with B4 size, 2 columns, Editable body, and separated Answer Key). 
    Do not output markdown code blocks. Just start with \`<!DOCTYPE html>\`.
    `;

    // 4. API Call
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }]
            })
        });

        if (!response.ok) throw new Error(`API Error: ${response.status}`);

        const data = await response.json();

        if (!data.candidates || !data.candidates[0].content) {
            throw new Error("결과 생성 실패 (Safety Block 등)");
        }

        let rawHtml = data.candidates[0].content.parts[0].text;

        // Cleanup HTML string
        rawHtml = rawHtml.replace(/```html|```/g, "").trim();

        // Render Result
        renderLearningResult(rawHtml);

    } catch (e) {
        alert("오류 발생: " + e.message);
        console.error(e);
    } finally {
        if (loading) loading.style.display = 'none';
        statusText.innerText = "문제 생성 완료";
    }
}

function renderLearningResult(htmlContent) {
    const container = document.getElementById('results-container');
    container.innerHTML = `
        <div style="background:var(--card-bg); padding:20px; border-radius:12px; border:1px solid #e2e8f0; margin-bottom:20px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                <h3 style="margin:0; font-size:18px; color:#1e293b;"><i class="fas fa-check-circle" style="color:#10b981;"></i> 서술형 학습지 생성 완료</h3>
                <button onclick="downloadLearningHTML()" style="background:#2563eb; color:#fff; border:none; padding:8px 16px; border-radius:6px; font-weight:600; cursor:pointer;">
                    <i class="fas fa-download"></i> 다운로드 (.html)
                </button>
            </div>
            <div style="width:100%; height:800px; border:1px solid #ddd; border-radius:8px; overflow:hidden;">
                <iframe id="preview-frame" style="width:100%; height:100%; border:none; background:#fff;"></iframe>
            </div>
        </div>
    `;

    // Store global for download
    window.lastGeneratedHTML = htmlContent;

    // Inject into iframe
    const iframe = document.getElementById('preview-frame');
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(htmlContent);
    doc.close();
}

function downloadLearningHTML() {
    if (!window.lastGeneratedHTML) return;

    let htmlContent = window.lastGeneratedHTML;
    if (!htmlContent.includes('contenteditable')) {
        htmlContent = htmlContent.replace(/<body([^>]*)>/i, '<body$1 contenteditable="true">');
    }

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Learning_Sheet_${new Date().toISOString().slice(0, 10)}.html`;
    link.click();
}