let globalGeneratedData = []; // Global storage for download
let inputCount = 0;

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

    const checkedBoxes = document.querySelectorAll('input[name="wtype"]:checked');
    const targetTypes = Array.from(checkedBoxes).map(cb => cb.value);

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
        if (qType.includes("단순 배열")) {
            typeInstructions.push(`
            ### Type: 단순 배열 영작
            - **CRITICAL:** You must MODIFY the **Source Text**.
              1. Select a key sentence.
              2. **MARKER RULE:** Label it \`(가)\` or \`(나)\` and wrap with \`<u>...</u>\`.
            - **Question Header:** "다음 글의 밑줄 친 (가)와 같은 의미가 되도록, 괄호 안의 단어를 모두 사용하여 배열하시오."
            - Content:
              1. Korean: [Translation]
              2. Words: ( [scrambled words] )
            `);
        } else if (qType.includes("변형 배열")) {
            typeInstructions.push(`
            ### Type: 변형 배열 영작 (어형 변화)
            - **CRITICAL:** MODIFY Source Text with \`(가)\` or \`(나)\` + \`<u>...</u>\`.
            - **Question Header:** "다음 글의 밑줄 친 (가)와 같은 의미가 되도록, 괄호 안의 단어를 알맞게 변형하여 배열하시오."
            - Content:
              1. Korean: [Translation]
              2. Words: ( [scrambled words, some in root form] )
            `);
        } else if (qType.includes("조건 영작")) {
            typeInstructions.push(`
            ### Type: 조건 영작
            - **CRITICAL:** MODIFY Source Text with \`(가)\` or \`(나)\` + \`<u>...</u>\`.
            - **Question Header:** "다음 글의 밑줄 친 (나)를 <보기>의 조건에 맞게 영작하시오."
            - **Condition Box:** Use \`<ul><li>...</li></ul>\` (e.g., Use 'not only', change form).
            `);
        } else if (qType.includes("요약문 빈칸")) {
            typeInstructions.push(`
            ### Type: 요약문 빈칸 완성
            - **Task:** Create a summary paragraph.
            - **MARKER RULE:** NO markers in text for this type.
            - **Question Header:** "다음 글의 내용을 한 문장으로 요약하고자 한다. 빈칸 (A), (B)에 들어갈 말로 적절한 것은?"
            - **Output:** Summary text with blanks \`(A) __________\`, \`(B) __________\`.
            `);
        } else if (qType.includes("문장 전환")) {
            typeInstructions.push(`
            ### Type: 문장 전환
            - **CRITICAL:** MODIFY Source Text with \`(a)\` or \`(b)\` + \`<u>...</u>\`.
            - **Question Header:** "다음 글의 밑줄 친 (a)를 같은 의미의 문장으로 전환할 때 빈칸을 채우시오."
            - **Output:** Provide target sentence structure with blanks.
            `);
        } else if (qType.includes("밑줄 고쳐 쓰기")) {
            typeInstructions.push(`
            ### Type: 어법 수정 (밑줄 고쳐 쓰기)
            - **CRITICAL:** MODIFY Source Text.
              - Select 5 parts labeled \`(A)~(E)\` with \`<u>...</u>\`.
              - One error among them.
            - **Question Header:** "다음 글의 밑줄 친 (A)~(E) 중 어법상 틀린 것을 찾아 고쳐 쓰시오."
            `);
        } else if (qType.includes("양자택일형")) {
            typeInstructions.push(`
            ### Type: 어법 (양자택일)
            - **CRITICAL:** MODIFY Source Text.
              - Create 3 parts like \`(A) [is / are]\`.
            - **Question Header:** "다음 글의 괄호 (A), (B), (C) 안에서 어법에 맞는 표현을 고르시오."
            `);
        } else if (qType.includes("밑줄 없이 찾기")) {
            typeInstructions.push(`
            ### Type: 어법 (밑줄 없음)
            - **CRITICAL:** MODIFY Source Text to have 3 errors, NO underlines.
            - **Question Header:** "다음 글에서 어법상 틀린 곳을 3군데 찾아 바르게 고치시오."
            `);
        } else if (qType.includes("오류 이유 서술형")) {
            typeInstructions.push(`
            ### Type: 어법 (이유 서술)
            - **CRITICAL:** MODIFY Source Text with \`(A)~(E)\` + \`<u>...</u>\`. One error.
            - **Question Header:** "틀린 것을 찾아 고치고, 그 이유를 설명하시오."
            - **Answer Space:** Add \`Reason: ____________________\`.
            `);
        } else if (qType.includes("우리말 해석")) {
            typeInstructions.push(`
            ### Type: 우리말 해석
            - **CRITICAL:** MODIFY Source Text.
              - Label target with \`㉠\` or \`㉡\` + \`<u>...</u>\`.
            - **Question Header:** "밑줄 친 ㉠을 우리말로 정확히 해석하시오."
            `);
        } else if (qType.includes("함축 의미 추론")) {
            typeInstructions.push(`
            ### Type: 함축 의미 추론
            - **CRITICAL:** MODIFY Source Text.
              - Label target with \`㉠\` or \`㉡\` + \`<u>...</u>\`.
            - **Question Header:** "밑줄 친 ㉡이 문맥상 의미하는 바로 가장 적절한 것은?"
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
    
    GENERATE ONLY THE FOLLOWING ${targetTypes.length} QUESTIONS:
    ${typeInstructions.join('\n')}

    [MULTI_PASSAGE HANDLING]
    - The user provided MULTIPLE passages. The input text contains headers like \`[Title]\`.
    - **Separation Rule:** Do NOT mix contents of different passages in a single question.
    - **Context Awareness:** clearly understand which passage each question belongs to.
    - Keep questions balanced across the provided passages.

    Source Text:
    ${combinedSourceText}

    [DESIGN & LAYOUT SPECIFICATIONS - CRITICAL]
    You must generate a COMPLETE HTML document starting with \`<!DOCTYPE html>\`.
    
    1. **Page Layout (B4 Size & 2-Column):**
       - Use the following CSS in \`<style>\`:
         @page { size: B4 portrait; margin: 20mm; }
         body { font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; line-height: 1.6; padding: 20px; background-color: #ffffff !important; color: #000000 !important; }
         .page-container { width: 100%; box-sizing: border-box; background-color: #ffffff !important; }
         .header-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; border: 2px solid #000; background-color: #ffffff; }
         .answer-line { display: block; width: 100%; border-bottom: 1px solid #000; margin-top: 40px; margin-bottom: 20px; height: 30px; }
         .footer { text-align: center; font-size: 10px; color: #888; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px; }
         .answer-key-section { page-break-before: always; display: block; margin-top: 50px; border-top: 2px dashed #000; padding-top: 20px; background-color: #ffffff; }
         .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 80px; font-weight: bold; color: rgba(0, 0, 0, 0.08); white-space: nowrap; z-index: 0; pointer-events: none; user-select: none; font-family: 'Helvetica', sans-serif; }
         .content-wrapper { position: relative; z-index: 10; column-count: 2; column-gap: 15mm; column-rule: 0.5px solid #ccc; text-align: justify; }
         .question-box { break-inside: avoid; margin-bottom: 60px; background-color: #ffffff; }
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
       - **Question Format:** Inside each \`.question-box\`, proivde the question text first, then add \`<div class="answer-line"></div>\` for the student to write the answer.
       - **Footer:** Insert the Branding Footer at the very bottom.
       - **Answer Key:** Place the Answer Key at the very end of the document, OUTSIDE the \`.content-wrapper\`, wrapped in \`<div class="answer-key-section">\`.

    4. **Header HTML (Student Info):**
       <table class="header-table">
           <tr style="height: 40px;">
               <td style="width: 15%; text-align: center; border-right: 1px solid #000; border-bottom: 1px solid #000; font-weight: bold; background-color: #f0f0f0;">Date</td>
               <td style="width: 35%; border-right: 1px solid #000; border-bottom: 1px solid #000;"></td>
               <td style="width: 15%; text-align: center; border-right: 1px solid #000; border-bottom: 1px solid #000; font-weight: bold; background-color: #f0f0f0;">Score</td>
               <td style="width: 35%; border-bottom: 1px solid #000;"> &nbsp; / 100</td>
           </tr>
           <tr style="height: 40px;">
               <td style="width: 15%; text-align: center; border-right: 1px solid #000; font-weight: bold; background-color: #f0f0f0;">Class</td>
               <td style="width: 35%; border-right: 1px solid #000;"></td>
               <td style="width: 15%; text-align: center; border-right: 1px solid #000; font-weight: bold; background-color: #f0f0f0;">Name</td>
               <td style="width: 35%;"></td>
           </tr>
       </table>

    [OUTPUT FORMAT]
    Output ONLY the RAW HTML Code (Full design with B4 size, 2 columns, Editable body, and separated Answer Key). 
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
    const blob = new Blob([window.lastGeneratedHTML], { type: 'text/html' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Writing_Exam_${new Date().toISOString().slice(0, 10)}.html`;
    link.click();
}