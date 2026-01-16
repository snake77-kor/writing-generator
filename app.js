let globalGeneratedData = []; // Global storage for download

// Prompts Configuration with Concise Explanations & High-Quality Distractors
const PROMPTS = {
    '통합형': `You are a Korea CSAT Exam Creator (수능 출제위원). Create a COMPLETE SET of 14 High-Difficulty multiple-choice questions based on the text.
Types: Purpose, Mood, Claim, Implication, Gist, Topic, Title, Grammar, Vocabulary, Blank, Irrelevant, Order, Insertion, Summary.

REQUIREMENTS:
1. **High Difficulty & Logic**:
   - **Main Idea**: Distractors must be 'Too Broad', 'Too Narrow', or 'Contradictory'.
   - **Grammar/Vocabulary**: Focus on Key Syntax & Contextual Coherence.
   - **Implication**: Metaphorical Meaning vs Literal Trap.
   - **Blank**: Paraphrased Answers. (Generate 1 representative question).
   - **Irrelevant/Insertion**: "The Last-5 Rule". Circle Numbers ①-⑤.
   - **Order**: "3-Step Cutting" (Introduction Box + Logical Split).
   - **Summary**: "Paraphrasing Strategy" (Abstract Synonyms).
2. **Concise Explanation**: Simple reasoning for the correct answer.
3. **Format**: JSON Array of 14 objects.

Format per object:
{
  "type": "Type Name",
  "question": "Question Stem (Korean)",
  "options": ["(1)...", "(2)...", "(3)...", "(4)...", "(5)..."],
  "answer_index": 3,
  "explanation": "...",
  "modified_text": "(Optional)...",
  "box": "(Optional)...",
  "A": "...", "B": "...", "C": "...",
  "summary_text": "..."
}
Text: {text}`,

    '글의 목적': `Role: CSAT Creator. Create ONE "Purpose" question.
Requirements: High difficulty, concise explanation.
Format: [{"type":"글의 목적", "question":"...", "options":[...], "answer_index":1, "explanation":"..."}]
Text: {text}`,

    '심경 변화': `Role: CSAT Creator. Create ONE "Mood" question.
Requirements: High difficulty, concise explanation.
Format: [{"type":"심경 변화", "question":"...", "options":[...], "answer_index":1, "explanation":"..."}]
Text: {text}`,

    '글의 주장': `Role: CSAT Creator. Create ONE "Claim" question.
Requirements: High difficulty, concise explanation.
Distractor Logic: Use 'Too Broad', 'Too Narrow', 'Contradictory' options.
Format: [{"type":"글의 주장", "question":"...", "options":[...], "answer_index":1, "explanation":"..."}]
Text: {text}`,

    '함축 의미': `Role: CSAT Creator. Create ONE "Implication" (Underlying Meaning) question.
Process:
1. **Target Selection**: Identify a metaphor representing the Main Idea. Mark it with <u>tags</u> in "modified_text".
2. **Correct Answer**: Paraphrase the figurative meaning abstractly.
3. **Distractors**: Include Literal Trap (literal interpretation) and Topic Error.
Format: [{"type":"함축 의미", "question":"밑줄 친 부분이 다음 글에서 의미하는 바로 가장 적절한 것은?", "options":["Option1", "Option2", "Option3", "Option4", "Option5"], "answer_index":3, "explanation":"...", "modified_text":"Full text with <u>underlined phrase</u>..."}]
Text: {text}`,

    '글의 요지': `Role: CSAT Creator. Create ONE "Gist" question.
Requirements: High difficulty, concise explanation.
Distractor Logic: Ensure distractors are Too Broad, Too Narrow, or Contradictory.
Format: [{"type":"글의 요지", "question":"...", "options":[...], "answer_index":1, "explanation":"..."}]
Text: {text}`,

    '글의 주제': `Role: CSAT Creator. Create ONE "Topic" question.
Requirements: High difficulty, concise explanation.
Distractor Logic: Ensure distractors are Too Broad, Too Narrow, or Contradictory.
Format: [{"type":"글의 주제", "question":"...", "options":[...], "answer_index":1, "explanation":"..."}]
Text: {text}`,

    '글의 제목': `Role: CSAT Creator. Create ONE "Title" question.
Requirements: High difficulty, concise explanation.
Distractor Logic: Ensure distractors are Too Broad, Too Narrow, or Contradictory.
Format: [{"type":"글의 제목", "question":"...", "options":[...], "answer_index":1, "explanation":"..."}]
Text: {text}`,

    '어법': `Role: CSAT Creator. Create ONE "Grammar" question.
Requirements:
1. **Focus on Key Grammar**: Subject-Verb Agreement, Voice, Participles, Relative Clauses.
2. **Distribution**: Spread 5 options evenly (approx. 1 per sentence).
3. **Underlining**: ONE option must be incorrect.
Format: [{"type":"어법", "question":"다음 글의 밑줄 친 부분 중, 어법상 틀린 것은?", "options":["Option1", "Option2", "Option3", "Option4", "Option5"], "answer_index":3, "explanation":"...", "modified_text":"Full text with (1) <u>word</u> markings..."}] 
Text: {text}`,

    '어휘': `Role: CSAT Creator. Create ONE "Vocabulary" question.
Requirements: **HIGH DIFFICULTY LOGIC**.
1. **Global Coherence**: The target word must be a KEYWORD for the Main Idea. The WRONG choice (answer) must **contradict** the main flow or author's stance.
2. **Intra-sentence Logic**: Prioritize sentences with Connectives (Although, However, Therefore, Thus, Because).
   - Use the logical relationship (Contrast/Causality) of the clause to determine the validity of the word.
3. **Distribution**: Select 5 words evenly distributed.
4. **Underlining**: Return "modified_text" with 5 numbered underlines around the target words (e.g. "(1) <u>word</u>").
5. **Logic-Based Explanation**: State the logical clue in the explanation.
Format: [{"type":"어휘", "question":"다음 글의 밑줄 친 부분 중, 문맥상 낱말의 쓰임이 적절하지 않은 것은?", "options":["Option1", "Option2", "Option3", "Option4", "Option5"], "answer_index":3, "explanation":"...", "modified_text":"Full text with (1) <u>word</u> markings..."}]
Text: {text}`,

    '빈칸 추론': `Role: CSAT Creator. Create A SET OF 4 "Blank Inference" questions based on the text.
REQUIREMENTS:
1. **Quantity**: You MUST generate exactly **4 distinct questions** in a JSON Array.
2. **Variety**:
   - Question 1: Target a **Key Word** (Core concept).
   - Question 2: Target a **Phrase** (Meaningful chunk).
   - Question 3: Target a **Clause** (Subject + Verb structure).
   - Question 4: Target a **Transition** (However, Therefore) or **Conclusion** at the end.
3. **Paraphrasing**: The Correct Option MUST be a **PARAPHRASED** version of the original text, NOT the exact words.
4. **Format**: Return a JSON ARRAY of 4 objects.
Format: [
  {"type":"빈칸 추론 (단어)", "target":"(Original Word)", "question":"다음 빈칸에 들어갈 말로 가장 적절한 것을 고르시오.", "options":["Paraphrased Answer", "Distractor..."], "answer_index":1, "explanation":"..."},
  {"type":"빈칸 추론 (구)", "target":"(Original Phrase)", "question":"다음 빈칸에 들어갈 말로 가장 적절한 것을 고르시오.", "options":["Paraphrased Answer", "Distractor..."], "answer_index":1, "explanation":"..."},
  {"type":"빈칸 추론 (절)", "target":"(Original Clause)", "question":"다음 빈칸에 들어갈 말로 가장 적절한 것을 고르시오.", "options":["Paraphrased Answer", "Distractor..."], "answer_index":1, "explanation":"..."},
  {"type":"빈칸 추론 (연결사)", "target":"(Original Transition)", "question":"다음 빈칸에 들어갈 말로 가장 적절한 것을 고르시오.", "options":["Answer", "Distractor..."], "answer_index":1, "explanation":"..."}
]
Text: {text}`,

    '무관한 문장': `Role: CSAT Creator. Create ONE "Irrelevant Sentence" question.
Numbering Rule: "The Last-5 Rule"
1. Identify the LAST 5 sentences of the text.
2. Mark them as ①, ②, ③, ④, ⑤ (Circled Numbers).
3. Do NOT number the Intro part.
4. Insert an "Irrelevant Sentence" (Distractor) at position ③ or ④.
   - Distractor Logic: Same Keyword, but Unrelated Predicate/Topic.
Format: [{"type":"무관한 문장", "question":"다음 글에서 전체 흐름과 관계 없는 문장은?", "options":["①", "②", "③", "④", "⑤"], "answer_index":3, "explanation":"...", "modified_text":"Intro... ① Sentence... ② Sentence... ③ Distractor... ④ Sentence... ⑤ Sentence..."}]
Text: {text}`,

    '글의 순서': `Role: CSAT Creator. Create ONE "Order" question using the "3-Step Cutting Algorithm".
1. **Introduction (Box)**: Use the first 1-2 sentences as the 'Given Text'.
2. **Segmentation**: Divide the remaining text into (A), (B), (C).
   - **Cutting Points**: Cut BEFORE Signal Words (However, Therefore, For example) or Demonstratives (This, Such, These).
   - **Balance**: Keep (A), (B), (C) similar in length.
3. **Shuffling**: Shuffle (A), (B), (C) randomly for the question, but determine the correct logical order (e.g., B-C-A).
4. **Chaining Explanation**: Explain the Logic Clues. 
   - e.g. "Box ends with X -> (B) starts with 'This X'..."
Format: [{"type":"글의 순서", "question":"주어진 글 다음에 이어질 글의 순서로 가장 적절한 것을 고르시오.", "options":["(A)-(C)-(B)", "(B)-(A)-(C)", "(B)-(C)-(A)", "(C)-(A)-(B)", "(C)-(B)-(A)"], "answer_index":3, "explanation":"(Simple Chaining Logic)...", "box":"...", "A":"...", "B":"...", "C":"..."}]
Text: {text}`,

    '문장 넣기': `Role: CSAT Creator. Create ONE "Insertion" question using the "3-Step Extraction Algorithm".
1. **Extraction Strategy (Targeting)**: Identify a 'Key Sentence' in the LAST 5 sentences.
   - **Priority A**: Sentences starting with **Contrast** (However, Instead, Yet).
   - **Priority B**: Sentences with **Demonstratives** (This, That, Such + Noun).
   - *Goal*: Removing this sentence MUST create a **Logical Discontinuity (Gap)**.
2. **Layout & Numbering**:
   - Extract the 'Key Sentence' into the 'box'.
   - Mark the remaining positions in the last part as ①, ②, ③, ④, ⑤ (Last-5 Rule).
   - The empty spot where the Key Sentence was is the Correct Answer.
3. **Explanation Rule**: focusing on **Gap & Link**.
   - e.g. "Without the given sentence, the connection between ① and ② is awkward because..."
Format: [{"type":"문장 넣기", "question":"글의 흐름으로 보아, 주어진 문장이 들어가기에 가장 적절한 곳을 고르시오.", "options":["①", "②", "③", "④", "⑤"], "answer_index":3, "explanation":"(Explain the Logical Gap & Link)...", "box":"Target Sentence...", "modified_text":"Intro... ① ... ② ... ③ ... ④ ... ⑤ ..."}]
Text: {text}`,

    '요약문': `Role: CSAT Creator. Create ONE "Summary" question using the "3-Step Paraphrasing Strategy".
1. **Structure Selection**: Construct a Summary Sentence using one of these patterns:
   - **Type A (Contrast)**: "Although [Subject] is (A), it actually results in (B)."
   - **Type B (Cause-Effect)**: "Due to the (A) feature, the result is (B)."
2. **Targeting & Paraphrasing (Crucial)**:
   - Identify keywords from the text for (A) and (B).
   - Convert them into **Synonyms** or **Abstract Terms** (NOT the exact words from text).
   - e.g. Text: 'hard' -> Answer: (A) 'demanding'.
3. **Option Pairing**: Create 5 pairs of (A) - (B).
   - Distractors: Mix correct (A) with distinct wrong (B) (opposite/irrelevant).
Format: [{"type":"요약문", "question":"다음 글의 내용을 한 문장으로 요약하고자 한다. 빈칸 (A), (B)에 들어갈 말로 가장 적절한 것은?", "options":["(A) word - (B) word", ...], "answer_index":1, "explanation":"본문의 'X'는 선지의 '(A) Y'로, 'Z'는 '(B) W'로 재진술되었습니다.", "summary_text":"Full Summary Sentence with (A) and (B) markers..."}]
Text: {text}`
};

let inputCount = 0;
let currentType = '통합형';

// Tab Switch
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

    const targetTab = document.getElementById('tab-' + tabName);
    const targetNav = document.getElementById('nav-' + tabName);

    if (targetTab && targetNav) {
        targetTab.classList.add('active');
        targetNav.classList.add('active');
        if (tabName === 'generate') updateTextCount();
    }
}

function addInputBox() { createInputCard(""); }
function removeInputBox(id) { document.getElementById(id)?.remove(); updateTextCount(); }

function updateTextCount() {
    const texts = document.querySelectorAll('.source-textarea');
    let validCount = 0;
    texts.forEach(t => { if (t.value.trim()) validCount++; });
    document.getElementById('text-count-badge').innerText = validCount || 1;
}

function resetKey() {
    const currentKey = localStorage.getItem("gemini_api_key");

    if (currentKey) {
        // If key exists, ask if user wants to change it
        if (!confirm("현재 저장된 API 키가 있습니다.\n새로운 키로 변경하시겠습니까?")) {
            return;
        }
    }

    const newKey = prompt("새로운 Google API Key (AIza...)를 입력하세요:");
    if (newKey) {
        localStorage.setItem("gemini_api_key", newKey.trim());
        alert("API 키가 성공적으로 저장되었습니다!");
    }
}

// AI Engine
async function runAI() {
    const textareas = document.querySelectorAll('.source-textarea');
    const texts = [];
    textareas.forEach(area => { if (area.value.trim()) texts.push(area.value.trim()); });

    const btn = document.getElementById('runBtn');
    const loading = document.getElementById('loading');
    const emptyMsg = document.getElementById('empty-msg');
    const resultsContainer = document.getElementById('results-container');
    const statusText = document.getElementById('statusText');

    if (!texts.length) { alert("지문을 입력해주세요."); switchTab('input'); return; }

    let apiKey = localStorage.getItem("gemini_api_key");
    if (!apiKey) {
        apiKey = prompt("Google API Key (AIza...):");
        if (!apiKey) return;
        localStorage.setItem("gemini_api_key", apiKey.trim());
    }

    resultsContainer.innerHTML = "";
    globalGeneratedData = []; // Clear previous data
    emptyMsg.style.display = 'none';
    loading.style.display = 'block';
    btn.disabled = true;

    try {
        statusText.innerText = "서버 연결 중...";
        const listResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (!listResponse.ok) throw new Error("API Key Error");
        const listData = await listResponse.json();
        const validModel = listData.models.find(m => m.supportedGenerationMethods?.includes("generateContent"));
        const modelName = validModel ? validModel.name.replace("models/", "") : "gemini-pro";

        // Determine Prompt
        let template = PROMPTS[currentType] || PROMPTS['통합형'];


        // Remove {rule} placeholder if it exists in any prompt to strictly follow new prompts
        template = template.replace("{rule}", "");


        for (let i = 0; i < texts.length; i++) {
            const text = texts[i];
            const index = i + 1;
            statusText.innerText = `생성 중... 지문 ${index}/${texts.length} (${currentType})`;

            const finalPrompt = template.replace("{text}", text);

            const genResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ parts: [{ text: finalPrompt }] }] })
            });

            if (genResponse.ok) {
                const genData = await genResponse.json();
                const rawText = genData.candidates[0].content.parts[0].text;
                const jsonText = rawText.replace(/```json|```|```/g, "").trim();
                let questions;
                try {
                    questions = JSON.parse(jsonText);
                } catch (err) {
                    console.error("JSON Parse Error", err);
                    renderErrorCard(index, "결과 파싱 실패: " + err.message);
                    continue;
                }

                // Handle single object or array
                const qList = Array.isArray(questions) ? questions : [questions];

                // Save to global data for download
                globalGeneratedData.push({
                    index: index,
                    text: text,
                    questions: qList,
                    type: currentType
                });

                renderCardResult(index, text, qList, currentType);
            } else {
                renderErrorCard(index, "API 호출 실패 (" + genResponse.status + ")");
            }
        }
    } catch (e) {
        alert("Error: " + e.message);
    } finally {
        loading.style.display = 'none';
        btn.disabled = false;
    }
}

// Universal Renderer for Separate Question/Answer Sections
function renderCardResult(index, originalText, questions, globalType) {
    const container = document.getElementById('results-container');

    // Initialize sections if not exist
    let examLayout = document.getElementById('exam-layout');
    let answerSection = document.getElementById('answer-section');

    if (!examLayout) {
        // Create wrappers
        examLayout = document.createElement('div');
        examLayout.id = 'exam-layout';
        examLayout.className = 'exam-layout';

        // Add Exam Header (Editable) - ONLY ONCE
        const headerHtml = `
            <div class="exam-header-container" contenteditable="true">
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
            </div>
        `;
        examLayout.innerHTML = headerHtml;

        const divider = document.createElement('hr');
        divider.className = 'print-divider';
        divider.style.cssText = "margin: 50px 0; border: 0; border-top: 2px dashed #ccc; display:block;";

        answerSection = document.createElement('div');
        answerSection.id = 'answer-section';
        answerSection.className = 'answer-section';
        answerSection.innerHTML = "<h2 style='margin-bottom:20px; text-align:center;'>[ 정답 및 해설 ]</h2>";

        container.appendChild(examLayout);
        container.appendChild(divider);
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
                <div style="font-weight:bold; color:#555; font-size:12px; margin-bottom:4px;">[${qType}]</div>
                <div style="font-family:'Pretendard'; font-size:16px; font-weight:700; color:#000; margin-bottom:12px;">
                    <span style="font-size:18px;">${qNum}.</span> ${q.question || "다음 물음에 답하시오."}
                </div>
                
                ${qType !== '글의 순서' && qType !== '문장 넣기' && qType !== '요약문' && !q.box ? `<div style="font-family:'Times New Roman'; font-size:16px; line-height:1.6; margin-bottom:15px; text-align:justify;">${questionBody}</div>` : ''}
                ${qType === '글의 순서' ? `<div style="font-family:'Times New Roman'; font-size:16px; margin-bottom:15px;">${questionBody}</div>` : ''}
                 ${q.box && qType !== '글의 순서' ? `<div style="font-family:'Times New Roman'; font-size:16px; margin-bottom:15px;">${questionBody}</div>` : ''}
                
                <div class="options-list" style="display:grid; grid-template-columns:1fr; gap:6px; font-size:15px;">
                    ${q.options.map((o, k) => `<div>${k + 1}. ${o}</div>`).join('')}
                </div>
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

function selectType(el) {
    document.querySelectorAll('.type-pill').forEach(p => p.classList.remove('active'));
    el.classList.add('active');
    currentType = el.innerText.replace(' 통합형', '통합형').trim();
    document.querySelector('.page-title h2').innerText = currentType;

}


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