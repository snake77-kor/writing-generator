
document.addEventListener('DOMContentLoaded', () => {
    // === Data & Configuration ===
    const QUESTION_TYPES = [
        { id: 'all', name: '★ 통합형' },
        { id: 'purpose', name: '글의 목적' },
        { id: 'mood', name: '심경 변화' },
        { id: 'claim', name: '글의 주장' },
        { id: 'implication', name: '함축 의미' },
        { id: 'gist', name: '글의 요지' },
        { id: 'topic', name: '글의 주제' },
        { id: 'title', name: '글의 제목' },
        { id: 'grammar', name: '어법' },
        { id: 'vocabulary', name: '어휘' },
        { id: 'blank_word', name: '빈칸(단어)' },
        { id: 'blank_phrase', name: '빈칸(명사구)' },
        { id: 'blank_verb_clause', name: '빈칸(동사절)' },
        { id: 'blank_sentence', name: '빈칸(문장전체)' },
        { id: 'irrelevant', name: '무관한 문장' },
        { id: 'order', name: '글의 순서' },
        { id: 'insertion', name: '문장 넣기' },
        { id: 'summary', name: '요약문' }
    ];

    let currentType = QUESTION_TYPES[0];
    let apiKey = localStorage.getItem('openai_api_key') || '';
    let passages = [];

    // === DOM Elements ===
    const mainTabBtns = document.querySelectorAll('.main-tab-btn');
    const sections = document.querySelectorAll('.section-tab');

    // UI Elements
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const passagesListEl = document.getElementById('passages-list');
    const addPassageBtn = document.getElementById('add-passage-btn');
    const typeTabsEl = document.getElementById('type-tabs');
    const currentTypeTitleEl = document.getElementById('current-type-title');
    const generateBtn = document.getElementById('generate-btn');
    const resultView = document.getElementById('result-view');
    const copyBtn = document.getElementById('copy-btn');
    const downloadBtn = document.getElementById('download-pdf-btn');
    const downloadHtmlBtn = document.getElementById('download-html-btn');

    const apiModal = document.getElementById('api-modal');
    const apiSettingBtn = document.getElementById('api-setting-btn');
    const cancelApiBtn = document.getElementById('cancel-api-btn');
    const saveApiBtn = document.getElementById('save-api-btn');
    const apiKeyInput = document.getElementById('api-key-input');

    // === Init ===
    function init() {
        setupTabs();
        renderTypeTabs();
        renderPassagesList();
        if (apiKey) apiKeyInput.value = apiKey;

        // API Settings Handlers
        if (saveApiBtn) {
            saveApiBtn.addEventListener('click', () => {
                const key = apiKeyInput.value.trim();
                if (key.startsWith('sk-')) {
                    apiKey = key;
                    localStorage.setItem('openai_api_key', key);
                    alert('API Key가 저장되었습니다.');
                    apiModal.classList.add('hidden');
                } else {
                    alert('올바른 OpenAI API Key를 입력해주세요 (sk-로 시작).');
                }
            });
        }
    }

    function setupTabs() {
        mainTabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetId = btn.dataset.target;
                mainTabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                sections.forEach(sec => {
                    if (sec.id === targetId) sec.classList.add('active');
                    else sec.classList.remove('active');
                });
            });
        });
    }

    function renderTypeTabs() {
        typeTabsEl.innerHTML = '';
        QUESTION_TYPES.forEach(type => {
            const btn = document.createElement('button');
            btn.className = 'type-tab';
            if (type.id === currentType.id) btn.classList.add('active');
            btn.textContent = type.name;
            btn.onclick = () => selectType(type, btn);
            typeTabsEl.appendChild(btn);
        });
    }

    function selectType(type, btnElement) {
        currentType = type;
        currentTypeTitleEl.textContent = type.name + (type.id === 'all' ? ' (전체 생성)' : '');
        document.querySelectorAll('.type-tab').forEach(b => b.classList.remove('active'));
        btnElement.classList.add('active');
    }

    // === Passage Management ===
    function renderPassagesList() {
        passagesListEl.innerHTML = '';
        passages.forEach((psg, index) => {
            const card = document.createElement('div');
            card.className = 'passage-card';
            card.innerHTML = `
                <div class="passage-header">
                    <span class="passage-number">${index + 1}</span>
                    <input type="text" class="input-title" placeholder="지문 제목 (예: 2024 수능 31번)" value="${escapeHtml(psg.title)}" oninput="updatePassage(${index}, 'title', this.value)">
                    <button class="btn-remove-passage" onclick="removePassage(${index})" title="삭제">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                <textarea class="input-content" placeholder="영어 지문 본문을 여기에 입력하세요..." oninput="updatePassage(${index}, 'content', this.value)">${escapeHtml(psg.content)}</textarea>
            `;
            passagesListEl.appendChild(card);
        });
    }

    window.updatePassage = (index, field, value) => { if (passages[index]) passages[index][field] = value; };
    window.removePassage = (index) => { if (confirm('이 지문을 삭제하시겠습니까?')) { passages.splice(index, 1); renderPassagesList(); } };
    if (addPassageBtn) addPassageBtn.addEventListener('click', () => { passages.push({ title: '', content: '' }); renderPassagesList(); setTimeout(() => window.scrollTo(0, document.body.scrollHeight), 100); });
    function escapeHtml(text) { if (!text) return ''; return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }

    // === File Upload ===
    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => handleFiles(e.target.files));
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', (e) => { e.preventDefault(); dropZone.classList.remove('drag-over'); if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files); });

    async function handleFiles(files) {
        if (!files.length) return;
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                let text = '';
                if (file.type === 'application/pdf') { text = await extractTextFromPDF(file); }
                else { text = await file.text(); }
                passages.push({ title: file.name.replace(/\.[^/.]+$/, ""), content: text });
            } catch (e) { console.error(e); alert(`Error reading ${file.name}`); }
        }
        renderPassagesList();
    }

    async function extractTextFromPDF(file) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            fullText += textContent.items.map(item => item.str).join(' ') + '\n\n';
        }
        return fullText;
    }

    // === Generator Start ===
    generateBtn.addEventListener('click', async () => {
        const validPassages = passages.filter(p => p.content.trim().length > 0);
        if (validPassages.length === 0) { alert('먼저 [지문 관리] 탭에서 내용을 입력해주세요.'); mainTabBtns[0].click(); return; }

        generateBtn.disabled = true;
        generateBtn.innerHTML = '생성 중...';
        resultView.innerHTML = '<div style="padding:2rem; text-align:center; color:#64748b;">AI가 문제를 분석하고 변형 문제를 생성 중입니다...</div>';

        try {
            let htmlOutput = '';
            let globalAnswerKey = [];
            let globalQIndex = 1;

            if (currentType.id === 'all') {
                htmlOutput = '<div class="all-in-one-container">';
                for (let pIdx = 0; pIdx < validPassages.length; pIdx++) {
                    const psg = validPassages[pIdx];
                    const title = psg.title || `지문 ${pIdx + 1}`;
                    htmlOutput += `<div class="passage-divider" style="margin: 3rem 0 1rem; border-top:2px dashed #94a3b8; padding-top:1.5rem; text-align:center;"><span style="background:#e0e7ff; color:#4338ca; padding:0.4rem 1rem; border-radius:20px; font-weight:700;">${title}</span></div>`;

                    const typesToGen = QUESTION_TYPES.filter(t => t.id !== 'all');
                    for (const type of typesToGen) {
                        const result = await generateQuestionLogic(psg.content, type);
                        htmlOutput += `<div class="question-card" style="margin-bottom:3rem;"><div style="font-size:0.85rem; color:#4f46e5; font-weight:700; margin-bottom:0.5rem;">[${type.name}]</div>${renderSingleResultHTML(result, globalQIndex, false)}</div>`;
                        globalAnswerKey.push({ qNum: globalQIndex, answer: result.answer, explanation: result.explanation || "해설 없음" });
                        globalQIndex++;
                    }
                }
                htmlOutput += '</div>';
                htmlOutput += `<div class="all-answers-section" style="margin-top:4rem; padding-top:2rem; border-top:3px double #333;"><h3 style="margin-bottom:1.5rem; text-align:center;">정답 및 해설</h3><div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:1.5rem;">${globalAnswerKey.map(item => `<div style="background:#f8fafc; padding:1rem; border-radius:6px; font-size:0.9rem; break-inside: avoid; page-break-inside: avoid;"><div style="font-weight:700;">문제 ${item.qNum}</div><div style="color:#4f46e5; margin:0.3rem 0;">정답: ${item.answer}</div><div style="color:#64748b; font-size:0.85rem;"><strong>[해설]</strong> ${item.explanation}</div></div>`).join('')}</div></div>`;
            } else {
                for (let pIdx = 0; pIdx < validPassages.length; pIdx++) {
                    const psg = validPassages[pIdx];
                    const title = psg.title || `지문 ${pIdx + 1}`;
                    const result = await generateQuestionLogic(psg.content, currentType);
                    htmlOutput += `<div style="margin-bottom:2rem; border-bottom:1px solid #f1f5f9; padding-bottom:2rem;"><div style="font-weight:700; color:#64748b; margin-bottom:1rem;">▶ ${title}</div>${renderSingleResultHTML(result, null, true)}</div>`;
                }
            }
            resultView.innerHTML = htmlOutput;
        } catch (error) { console.error(error); resultView.innerHTML = `<p class="error">오류: ${error.message}</p>`; }
        finally { generateBtn.disabled = false; generateBtn.innerHTML = '문제 생성'; }
    });

    // === Router (API vs Mock) ===
    async function generateQuestionLogic(text, typeObj) {
        if (apiKey && apiKey.startsWith('sk-')) {
            try {
                return await generateOpenAIQuestion(text, typeObj);
            } catch (e) {
                console.error("AI Generation Failed, failing back to Mock", e);
                return generateMockQuestion(text, typeObj.id);
            }
        } else {
            // Simulate async delay for mock to feel substantive
            await new Promise(r => setTimeout(r, 400));
            return generateMockQuestion(text, typeObj.id);
        }
    }

    // === AI Generation (GPT) ===
    async function generateOpenAIQuestion(text, typeObj) {
        const typeId = typeObj.id;

        let specificInst = "";

        if (typeId === 'grammar') {
            specificInst = `
            Task: Create a 'Grammar (어법)' question.
            Guidelines:
            1. Select exactly 5 underlined parts based on frequent CSAT grammar points.
            2. Correct Answer Design: Introduce a CLEAR grammatical error in one choice.
            3. SPECIAL RULE for Subject-Verb Agreement: If selecting a Subject-Verb Agreement point, subject and verb MUST be significantly separated. No adjacent pairs.
            4. SPECIAL RULE for Parallelism: When testing Parallelism, underline ONLY the parallel word/phrase itself. DO NOT underline the conjunction (and, or, but).
            5. ABSOLUTELY CRITICAL: The "grammatical error" (answer) MUST be a valid English word existing in the dictionary, just morphologically incorrect in context (e.g. wrong tense, wrong number). 
               - DO NOT invent non-existent words (e.g., 'makeing').
               - DO NOT introduce a random new vocabulary word not related to the original.
               - ALL other text must match the original passage EXACTLY.
            6. Output: Provide full passage with <u>underlined</u> choices marked (①~⑤).
            7. Explanation: Explicitly explain WHY the answer is wrong and correct it.
            `;
        } else if (typeId === 'vocabulary') {
            specificInst = `
            Task: Create a 'Vocabulary (어휘)' question.
            Guidelines:
            1. Select 5 key words.
            2. Choose ONE word to be the correct answer by swapping it with an ANTONYM or contextually opposite word.
            3. CRITICAL: Do NOT modify any other text. Keep the passage original except for the designated distortion.
            4. Output: Passage with <u>underlined</u> choices (①~⑤).
            5. Explanation: Explain the logical contradiction.
            `;
        } else if (typeId === 'blank_word') {
            specificInst = `
            Task: Create a 'Blank Inference (Word)' question.
            Guidelines:
            1. Select a CRITICAL single word (Noun, Verb, Adjective) that is central to the topic.
            2. Replace it with a blank (______).
            3. Provide 5 choices (single words). One is correct, others are distractors.
            `;
        } else if (typeId === 'blank_phrase') {
            specificInst = `
            Task: Create a 'Blank Inference (Noun Phrase)' question.
            Guidelines:
            1. TARGET: Select a LONG, COMPLETE Noun Phrase that serves as a Subject or Object.
               - CRITICAL: The blank MUST start with the Determiner (The, A, This, etc.) and include ALL Adjectives and the Noun.
               - Example: "the rapid technological advancement" -> Remove ALL of it.
               - BAD Example: "the rapid ________ advancement" (DO NOT DO THIS).
               - BAD Example: "_______ rapid technological advancement" (DO NOT LEAVE 'The' OUT).
            2. ACTION: Replace the ENTIRE phrase with a single long blank (__________________).
            3. CHOICES: Provide 5 options. Each option must be a COMPLETE Noun Phrase (Determiner + Adjectives + Noun).
            `;
        } else if (typeId === 'blank_verb_clause') {
            specificInst = `
            Task: Create a 'Blank Inference (Verb Clause)' question.
            Guidelines:
            1. Select a major "Verb Phrase" or "Predicate Clause" (e.g., 'leads to significant cultural changes').
            2. Replace the verb and its following object/complement with a blank (_________________).
            3. Provide 5 choices (verb phrases/clauses).
            `;
        } else if (typeId === 'blank_sentence') {
            specificInst = `
            Task: Create a 'Blank Inference (Full Sentence)' question.
            Guidelines:
            1. Select a CRITICAL full sentence (Topic Sentence or Conclusion) that summarizes the logic.
            2. Replace the ENTIRE sentence with a long blank (_________________________________).
            3. Provide 5 choices (full sentences).
            `;
        } else if (typeId === 'irrelevant') {
            specificInst = `
            Task: Create a 'Unrelated Sentence' question.
            Steps:
            1. Analyze Topic & Main Idea.
            2. Write a new distractor sentence that uses similar keywords/subject but deviates slightly in logic or flow.
            3. Insert this sentence.
            4. IMPORTANT: The choice markers ①~⑤ must be assigned to the LAST 5 sentences of the passage. 
               - Choice ⑤ MUST be the very last sentence.
               - Choice ④ is the sentence immediately before ⑤.
               - Choice ③ is before ④, and so on.
               - The distractor should be one of these (e.g. ③ or ④).
            5. Output the full passage with labeled choices ①~⑤.
            `;
        } else if (typeId === 'order') {
            specificInst = `
            Task: Create 'Sentence Ordering' question (A)-(B)-(C).
            Steps:
            1. Analyze logical flow.
            2. Split text into 3 parts (A, B, C) where each start has clear clues.
            3. Provide the scrambled parts.
            `;
        } else if (typeId === 'insertion') {
            specificInst = `
            Task: Create 'Sentence Insertion' question.
            Steps:
            1. Identify a sentence with strong logical connection (e.g. starts with However, Therefore).
            2. Extract it as the Box content.
            3. Mark insertion points ( ① ~ ⑤ ) in the remaining text.
            4. IMPORTANT: The markers ①~⑤ must be placed at the END of the passage, BUT marker ⑤ MUST NOT be after the very last sentence.
               - Marker ⑤ must be BEFORE the last sentence (between the second-to-last and last sentence).
               - Marker ④ must be before marker ⑤, and so on.
               - Ensure 1~5 are sequential and clustered at the end of the text.
            `;
        } else if (typeId === 'summary') {
            specificInst = `
            Task: Create 'Summary' question.
            Steps:
            1. Read the full passage and identify the main argument and key supporting points.
            2. Synthesize a SINGLE, comprehensive sentence that paraphrases the entire passage's core message. 
               - Do NOT just copy a sentence from the text. 
               - It must be a high-quality paraphrase in English.
            3. Select two distinct keywords (A) and (B) from this summary sentence to be blanks.
            4. Provide 5 pairs of choices for (A) and (B).
            `;
        } else {
            specificInst = `Task: Create '${typeObj.name}' question suitable for Korean CSAT English section.`;
        }

        const prompt = `
        You are an expert Korean CSAT (Su-neung) English test generator.
        Context: The user provided specific analysis steps: "1. Analyze Topic/Logic 2. Extract Clues".
        ${specificInst}
        
        Input Text:
        """${text}"""

        Output strictly in JSON format with keys:
        - passage: (string or array of strings) Full text.
        - question: (string) Question prompt.
        - boxContent: (string/null) For insertion/summary.
        - boxPosition: (string) 'top' or 'bottom'.
        - choices: (array)
        - answer: (string)
        - explanation: (string)
        - explanation: (string) Concise explanation in Korean. Do NOT include prefixes like "해설:" or "Explanation:".
        - footnotes: (string)
        
        IMPORTANT: 
        1. For 'insertion' and 'irrelevant', markers ①②③④⑤ must appear sequentially. Choice ⑤ = Last sentence (irrelevant) or After last sentence (insertion).
        2. Explanation MUST be in Korean and concise (1-2 sentences recommended).
        `;

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: [{ role: "system", content: prompt }],
                temperature: 0.3 // Reduced temperature to prevent hallucinations
            })
        });

        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        const data = await response.json();
        const content = data.choices[0].message.content;

        const jsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim();
        const result = JSON.parse(jsonStr);
        result.typeId = typeId;
        // Ensure explanation exists and clean up
        if (!result.explanation || result.explanation.trim() === "") {
            result.explanation = "제공된 상세 해설이 없습니다.";
        } else {
            // Remove potential prefixes
            result.explanation = result.explanation.replace(/^(해설|Explanation)[:\s]*/i, '').trim();
        }
        return result;
    }

    // === Mock Engine (Robust Fallback) ===
    function generateMockQuestion(text, typeId) {
        let question = "다음 글을 읽고 물음에 답하시오.";
        let choices = ["Choice 1", "Choice 2", "Choice 3", "Choice 4", "Choice 5"];
        let answer = "③";
        let explanation = "이 문제는 글의 전체적인 흐름과 핵심 내용을 파악하여 정답을 도출해야 합니다."; // Default clean mock explanation
        let boxContent = null;
        let boxPosition = 'top';

        let processedLines = text.split('\n');
        let bodyLines = [];
        let footnoteLines = [];

        let isCollectingFootnotes = true;
        for (let i = processedLines.length - 1; i >= 0; i--) {
            const line = processedLines[i].trim();
            if (line === '') continue;
            const looksLikeFootnote = line.startsWith('*') || (line.length < 60 && (!/[.!?]$/.test(line) || line.includes(':') || /[가-힣]/.test(line)));

            if (isCollectingFootnotes && looksLikeFootnote) {
                let cleanedLine = line.replace(/^[^a-zA-Z가-힣0-9]*/, '');
                cleanedLine = cleanedLine.replace(/^(?:Note|참고|주석)[:\s]*/i, '');
                if (cleanedLine.length > 0) {
                    cleanedLine = '* ' + cleanedLine;
                    footnoteLines.unshift(cleanedLine);
                }
            } else {
                isCollectingFootnotes = false;
                bodyLines.unshift(line);
            }
        }
        let footnotes = footnoteLines.join('  ');

        let cleanText = bodyLines.join(' ');
        cleanText = cleanText.replace(/\s+/g, ' ').trim();
        let processedText = cleanText;
        const sentences = cleanText.match(/[^.!?]+[.!?]+/g) || [cleanText];

        switch (typeId) {
            case 'purpose':
                question = "다음 글의 목적으로 가장 적절한 것은?";
                choices = ["신제품 설명회 일정을 변경하려고", "새로 출시된 소프트웨어 사용법을 안내하려고", "프로젝트 참여를 독려하고 감사를 표하려고", "변경된 보안 규정 준수를 요청하려고", "고객 만족도 조사 결과를 보고하려고"];
                break;
            case 'mood':
                question = "다음 글에 드러난 I의 심경 변화로 가장 적절한 것은?";
                choices = ["worried → relieved", "excited → disappointed", "bored → amazed", "scared → calm", "hopeful → frustrated"];
                break;
            case 'claim':
                question = "다음 글에서 필자가 주장하는 바로 가장 적절한 것은?";
                choices = ["지속 가능한 발전을 위해 친환경 에너지를 사용해야 한다.", "창의적인 아이디어는 자유로운 토론에서 나온다.", "성공적인 협상은 상호 신뢰에서 비롯된다.", "개인의 프라이버시 보호를 위한 법적 제도가 필요하다.", "디지털 리터러시 교육을 강화해야 한다."];
                break;
            case 'implication':
                question = "밑줄 친 부분이 글에서 의미하는 바로 가장 적절한 것은?";
                const targetSentIndex = (sentences.length > 2) ? sentences.length - 1 : 0;
                const targetSent = sentences[targetSentIndex];
                const words = targetSent.trim().split(' ');

                if (words.length >= 5) {
                    const randStart = Math.min(Math.floor(Math.random() * (words.length - 4)), words.length - 5);
                    const phrase = words.slice(randStart, randStart + 4).join(' ');
                    const newSent = targetSent.replace(phrase, `<u>${phrase}</u>`);
                    processedText = cleanText.replace(targetSent, newSent);
                } else {
                    processedText = cleanText.replace(targetSent, `<u>${targetSent}</u>`);
                }
                choices = ["what is truly meaningful in life", "what success destroys on its path", "what is happening in our daily lives", "what our enemy truly thinks about us", "what is not already in the mind to see"];
                break;
            case 'gist':
                question = "다음 글의 요지로 가장 적절한 것은?";
                choices = ["무리한 운동은 오히려 건강을 해칠 수 있다.", "규칙적인 수면 습관이 기억력 향상에 도움이 된다.", "다양한 문화 체험은 창의적 사고를 촉진한다.", "실패를 두려워하지 않는 태도가 성공의 열쇠이다.", "효과적인 의사소통을 위해서는 경청하는 자세가 중요하다."];
                break;
            case 'topic':
                question = "다음 글의 주제로 가장 적절한 것은?";
                choices = ["the necessity of protecting endangered species", "positive effects of classical music on studying", "difficulties in adapting to a new environment", "strategies for effective time management", "correlation between diet and physical health"];
                break;
            case 'title':
                question = "다음 글의 제목으로 가장 적절한 것은?";
                choices = ["Why Do We Need Sleep?", "How to Overcome Stage Fright", "The Unexpected Benefits of Boredom", "Artificial Intelligence: Friend or Foe?", "Small Habits Change Your Life"];
                break;

            case 'grammar':
                question = "다음 글의 밑줄 친 부분 중, 어법상 틀린 것은?";
                choices = [];
                const grammarRules = {
                    'to_infinitive': { regex: /\bto\s+[a-z]+/g, label: '부정사 vs 정동사' },
                    'relative_clause': { regex: /\b(which|that|who|whom|what)\b/g, label: '관계사/접속사' },
                    'subject_verb': { regex: /\b(is|are|was|were|has|have)\b/g, label: '수일치/시제' },
                    'participle': { regex: /\b\w+(?:ing|ed)\b/g, label: '분사 (능동/수동)' },
                    'parallel': { regex: /\b(and|or|but)\s+\w+(?:ing|ed|s)?\b/g, label: '병렬구조' },
                    'pronoun': { regex: /\b(one|ones|that|those|its|their|themselves|himself|herself)\b/g, label: '대명사' }
                };

                let candidates = [];
                sentences.forEach((sent, sIdx) => {
                    for (const [type, rule] of Object.entries(grammarRules)) {
                        const sentWords = sent.split(' ');
                        sentWords.forEach((word, wIdx) => {
                            let phrase = word;
                            if (type === 'to_infinitive' && word === 'to' && sentWords[wIdx + 1]) phrase = 'to ' + sentWords[wIdx + 1];
                            else if (type === 'parallel') {
                                // STRICT logic selected
                                if (['and', 'or', 'but'].includes(word) && sentWords[wIdx + 1]) {
                                    phrase = sentWords[wIdx + 1];
                                } else {
                                    return;
                                }
                            }

                            const cleanWord = phrase.replace(/[^a-zA-Z\s]/g, '');
                            if (cleanWord.match(rule.regex)) {
                                if (type === 'subject_verb' && wIdx < 4) return;
                                candidates.push({ text: phrase, sIdx, wIdx, type, label: rule.label });
                            }
                        });
                    }
                });

                let selected = [];
                let usedTypes = new Set();
                let usedSentences = new Set();

                candidates.sort(() => Math.random() - 0.5);
                for (const c of candidates) {
                    if (selected.length >= 5) break;
                    if (!usedTypes.has(c.label) && !usedSentences.has(c.sIdx)) {
                        selected.push(c);
                        usedTypes.add(c.label);
                        usedSentences.add(c.sIdx);
                    }
                }
                if (selected.length < 5) {
                    for (const c of candidates) {
                        if (selected.length >= 5) break;
                        if (!usedSentences.has(c.sIdx) && !selected.includes(c)) {
                            selected.push(c);
                            usedSentences.add(c.sIdx);
                        }
                    }
                }
                selected.sort((a, b) => (a.sIdx - b.sIdx) || (a.wIdx - b.wIdx));

                const answerIndex = (selected.length >= 3) ? 2 : 0;

                const distorters = {
                    'is': 'are', 'are': 'is', 'was': 'were', 'were': 'was',
                    'has': 'have', 'have': 'has',
                    'that': 'what', 'which': 'what', 'what': 'that',
                    'who': 'which',
                    'to': 'ing',
                    'one': 'ones', 'ones': 'one',
                    'its': 'their', 'their': 'its',
                    'themselves': 'them', 'himself': 'him'
                };

                let newSentences = [...sentences];
                selected.forEach((c, i) => {
                    let s = newSentences[c.sIdx];
                    let displayWord = c.text;

                    if (i === answerIndex) {
                        let distor = distorters[c.text];

                        // Strict Safe Distortion logic
                        // Avoid random string addition like 'to ' -> 'ing' which creates non-existent words (e.g. to make -> makeing)

                        if (!distor && c.type === 'to_infinitive') {
                            // Safer: Just remove 'to' to make it a bare infinitive error (always valid english words, just wrong grammar)
                            distor = c.text.replace('to ', '');
                        }

                        if (!distor && c.text.endsWith('ing')) distor = c.text.replace('ing', 'ed');
                        else if (!distor && c.text.endsWith('ed')) distor = c.text.replace('ed', 'ing');

                        if (!distor) {
                            if (c.text.endsWith('s')) distor = c.text.slice(0, -1);
                            else distor = c.text + 's';
                        }

                        displayWord = distor;
                        answer = `①②③④⑤`.charAt(i);
                        explanation = `정답은 ${answer}번입니다. 문맥과 어법 구조상 '(${displayWord})'은 적절하지 않습니다. 올바른 표현은 '${c.text}'이어야 합니다. [출제 의도: ${c.label}]`;
                    }
                    const marker = `①②③④⑤`.charAt(i);
                    s = s.replace(c.text, `${marker} <u>${displayWord}</u>`);
                    newSentences[c.sIdx] = s;
                });
                processedText = newSentences.join(' ');
                break;

            case 'vocabulary':
                question = "다음 글의 밑줄 친 부분 중, 문맥상 낱말의 쓰임이 적절하지 않은 것은?";
                choices = [];
                const forbidden_v = ['in', 'on', 'at', 'by', 'of', 'to', 'for', 'with', 'from', 'about', 'as', 'into', 'like', 'through', 'after', 'over', 'between', 'out', 'against', 'during', 'without', 'before', 'under', 'around', 'among', 'be', 'is', 'are', 'was', 'were', 'have', 'has', 'had', 'do', 'does', 'did', 'can', 'will', 'should', 'must', 'a', 'an', 'the', 'this', 'that', 'it', 'they', 'we', 'you', 'he', 'she'];
                let vCandidates = [];
                sentences.forEach((sent, sIdx) => {
                    const sWords = sent.split(' ');
                    sWords.forEach((word, wIdx) => {
                        const clean = word.replace(/[^a-zA-Z]/g, '');
                        if (clean.length < 5) return;
                        if (forbidden_v.includes(clean.toLowerCase())) return;

                        let pos = 'word';
                        if (clean.endsWith('ly')) pos = 'adverb';
                        else if (clean.endsWith('ed') || clean.endsWith('ing')) pos = 'verb_adj';
                        else if (clean.endsWith('tion') || clean.endsWith('ment')) pos = 'noun';
                        else if (clean.endsWith('al') || clean.endsWith('ive') || clean.endsWith('ous')) pos = 'adjective';

                        vCandidates.push({ word, clean, sIdx, wIdx, pos });
                    });
                });

                vCandidates.sort(() => Math.random() - 0.5);

                let vSelected = [];
                let vUsedSent = new Set();

                for (const c of vCandidates) {
                    if (vSelected.length >= 5) break;
                    if (!vUsedSent.has(c.sIdx)) {
                        vSelected.push(c);
                        vUsedSent.add(c.sIdx);
                    }
                }
                vSelected.sort((a, b) => (a.sIdx - b.sIdx) || (a.wIdx - b.wIdx));

                const vAnswerIndex = (vSelected.length >= 4) ? 3 : 0;
                const v_antonyms = {
                    'increase': 'decrease', 'decrease': 'increase', 'rise': 'fall', 'fall': 'rise',
                    'high': 'low', 'low': 'high', 'positive': 'negative', 'negative': 'positive',
                    'correct': 'incorrect', 'incorrect': 'correct', 'able': 'unable', 'unable': 'able',
                    'presence': 'absence', 'absence': 'presence', 'similar': 'different', 'different': 'similar'
                };

                let vNewSentences = [...sentences];
                vSelected.forEach((c, i) => {
                    let s = vNewSentences[c.sIdx];
                    let displayWord = c.word;
                    if (i === vAnswerIndex) {
                        let distor = null;
                        const lowerClean = c.clean.toLowerCase();

                        if (v_antonyms[lowerClean]) distor = v_antonyms[lowerClean];
                        else {
                            if (lowerClean.startsWith('un')) distor = c.word.replace('un', '');
                            else if (lowerClean.startsWith('in')) distor = c.word.replace('in', '');
                            else if (lowerClean.startsWith('dis')) distor = c.word.replace('dis', '');
                            else if (lowerClean.startsWith('im')) distor = c.word.replace('im', '');
                            else distor = 'un' + c.word;
                        }

                        displayWord = distor;
                        answer = `①②③④⑤`.charAt(i);
                        explanation = `정답은 ${answer}번입니다. 문맥상 '(${displayWord})'은 적절하지 않습니다. 지문의 흐름을 고려할 때, 반대 의미를 가진 '${c.word}'(또는 유사어)가 와야 자연스럽습니다.`;
                    }
                    const marker = `①②③④⑤`.charAt(i);
                    s = s.replace(c.word, `${marker} <u>${displayWord}</u>`);
                    vNewSentences[c.sIdx] = s;
                });
                processedText = vNewSentences.join(' ');
                break;

            case 'blank_word':
                question = "다음 빈칸에 들어갈 말로 가장 적절한 것은?";
                processedText = cleanText.replace(/the/i, "______");
                choices = ["automation", "competition", "specialization", "diversification", "standardization"];
                break;
            case 'blank_phrase':
                question = "다음 빈칸에 들어갈 말로 가장 적절한 것은?";
                // Improved Mock: Try to find "the + adj + noun" pattern
                const npRegex = /\b(the\s+[a-z]+\s+[a-z]{4,})\b/i;
                const match = cleanText.match(npRegex);
                if (match) {
                    processedText = cleanText.replace(match[0], "__________________");
                    choices = ["the rapid development", "an unexpected result", "the cultural heritage", "social interaction", "economic growth"];
                } else {
                    processedText = cleanText.replace(/process/i, "__________");
                    choices = ["the rapid development", "an unexpected result", "the cultural heritage", "social interaction", "economic growth"];
                }
                break;
            case 'blank_verb_clause':
                question = "다음 빈칸에 들어갈 말로 가장 적절한 것은?";
                processedText = cleanText.replace(/make/i, "_________________");
                choices = ["leads to success", "causes the problem", "improves the quality", "requires more time", "changes the perspective"];
                break;
            case 'blank_sentence':
                question = "다음 빈칸에 들어갈 말로 가장 적절한 것은?";
                processedText = cleanText.replace(/that/i, "_________________________________");
                choices = [
                    "what is truly meaningful in life is often invisible to the eye",
                    "what success destroys on its path is the very foundation of it",
                    "what is happening in our daily lives reflects our inner state",
                    "what our enemy truly thinks about us defines our strategy",
                    "what is not already in the mind cannot be seen by the eyes"
                ];
                break;

            case 'irrelevant':
                question = "다음 글에서 전체 흐름과 관계 없는 문장은?";
                choices = [];
                let iSentences = [...sentences];
                const iLen = iSentences.length;
                let iStart = Math.max(0, iLen - 5);
                let indicesToMark = [];
                for (let k = 0; k < 5; k++) {
                    const idx = iLen - 1 - k;
                    if (idx >= 0) indicesToMark.unshift(idx);
                }

                indicesToMark.forEach((targetIdx, i) => {
                    let s = iSentences[targetIdx];
                    iSentences[targetIdx] = `①②③④⑤`.charAt(i) + " " + s;
                });
                processedText = iSentences.join(' ');
                answer = "④";
                break;

            case 'order':
                question = "주어진 글 다음에 이어질 글의 순서로 가장 적절한 것은?";
                const totalLen = cleanText.length;
                const partLen = Math.floor(totalLen / 3.5);
                boxContent = cleanText.substring(0, partLen) + "...";
                let rest = cleanText.substring(partLen);
                const chunks = rest.match(/[^.!?]+[.!?]+/g) || [rest];
                let chunkStep = Math.ceil(chunks.length / 3);
                let partA = chunks.slice(0, chunkStep).join(' ');
                let partB = chunks.slice(chunkStep, chunkStep * 2).join(' ');
                let partC = chunks.slice(chunkStep * 2).join(' ');
                processedText = [partA || "(A) ...", partB || "(B) ...", partC || "(C) ..."];
                choices = ["(A)-(C)-(B)", "(B)-(A)-(C)", "(B)-(C)-(A)", "(C)-(A)-(B)", "(C)-(B)-(A)"];
                break;

            case 'insertion':
                question = "글의 흐름으로 보아, 주어진 문장이 들어가기에 가장 적절한 곳을 고르시오.";
                const connectorRegex = /^(However|But|Therefore|Thus|For example|In contrast|Moreover|Consequently)/i;
                let targetIdx = -1;
                for (let i = 1; i < sentences.length; i++) {
                    if (connectorRegex.test(sentences[i].trim())) { targetIdx = i; break; }
                }
                if (targetIdx === -1) targetIdx = Math.floor(sentences.length / 2);

                boxContent = sentences[targetIdx] || "Target sentence to insert.";
                const remSentences = sentences.filter((_, i) => i !== targetIdx);

                let insText = "";
                let rLen = remSentences.length;
                let slotsMap = {};

                for (let k = 0; k < 5; k++) {
                    let sIdx = rLen - 1 - k;
                    if (sIdx >= 0) slotsMap[sIdx] = 5 - k;
                }

                if (slotsMap[0]) { insText += ` ( ${'①②③④⑤'.charAt(slotsMap[0] - 1)} ) `; }

                remSentences.forEach((s, idx) => {
                    insText += s + " ";
                    let currentSlot = idx + 1;
                    if (slotsMap[currentSlot]) {
                        insText += ` ( ${'①②③④⑤'.charAt(slotsMap[currentSlot] - 1)} ) `;
                    }
                });

                processedText = insText;
                choices = [];
                answer = "③";
                break;

            case 'summary':
                question = "다음 글의 내용을 한 문장으로 요약하고자 한다. 빈칸 (A), (B)에 들어갈 말로 가장 적절한 것은?";
                boxPosition = 'bottom';

                const firstSent = sentences[0] || "";
                const lastSent = sentences[sentences.length - 1] || "";

                boxContent = `The passage discusses how the concept of (A) ____________________ is closely related to the (B) ____________________ observed in the conclusion, emphasizing the overall coherence.`;

                if (sentences.length > 2) {
                    boxContent = `This passage suggests that (A) ______ plays a key role, leading to significant (B) ______ results as described in the text.`;
                }

                choices = [
                    { A: "perspective", B: "outcome" },
                    { A: "perspective", B: "origin" },
                    { A: "strategy", B: "effect" },
                    { A: "method", B: "result" },
                    { A: "problem", B: "solution" }
                ];
                break;
        }

        return { passage: processedText, question, choices, answer, explanation, footnotes, boxContent, boxPosition, typeId };
    }

    function renderSingleResultHTML(data, qNum, showAnswerInline) {
        const { passage, question, choices, answer, explanation, footnotes, boxContent, boxPosition, typeId } = data;
        const isRoundedBoxType = ['order', 'insertion', 'summary'].includes(typeId);
        const justifyStyle = 'text-align: justify; text-justify: inter-word;';

        let boxHtml = '';
        if (boxContent) {
            boxHtml = isRoundedBoxType
                ? `<div class="rounded-box" style="${justifyStyle}">${boxContent}</div>`
                : `<div class="box-content" style="border:1px solid #333; padding:1rem; margin:1rem 0; font-family: 'Pretendard', sans-serif; font-size:1rem; ${justifyStyle}">${boxContent}</div>`;
        }

        let passageHtml = '';
        if (typeId === 'purpose') {
            passageHtml = `
            <div class="browser-window">
                <div class="browser-header">
                    <div class="window-control"><svg width="8" height="2" viewBox="0 0 8 2"><rect width="8" height="2" fill="white"/></svg></div>
                    <div class="window-control"><svg width="8" height="8" viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="8" stroke="white" stroke-width="2" fill="none"/></svg></div>
                    <div class="window-control"><svg width="8" height="8" viewBox="0 0 10 10"><line x1="1" y1="1" x2="9" y2="9" stroke="white" stroke-width="2"/><line x1="9" y1="1" x2="1" y2="9" stroke="white" stroke-width="2"/></svg></div>
                </div>
                <div class="browser-toolbar"><div class="toolbar-icon" style="margin-right:auto">...</div></div>
                <div class="browser-content" style="${justifyStyle}">${typeof passage === 'string' ? passage.replace(/\n/g, '<br>') : ''}</div>
            </div>`;
        } else if (typeId === 'order' && Array.isArray(passage)) {
            passageHtml = `<div class="order-section">
                <div class="order-block"><div class="order-label">(A)</div><div style="${justifyStyle}">${passage[0]}</div></div>
                <div class="order-block"><div class="order-label">(B)</div><div style="${justifyStyle}">${passage[1]}</div></div>
                <div class="order-block"><div class="order-label">(C)</div><div style="${justifyStyle}">${passage[2]}</div></div>
            </div>`;
        } else {
            passageHtml = `<div class="passage-box" style="padding: 0 0.5rem 1.5rem 0.5rem; line-height: 1.8; font-size: 1.05rem; background: #fff; font-family: serif; color: #000; ${justifyStyle}">${typeof passage === 'string' ? passage.replace(/\n/g, '<br>') : ''}</div>`;
        }

        let arrowHtml = (typeId === 'summary') ? `<div class="summary-arrow"><svg class="arrow-down-icon" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg></div>` : '';

        let choiceListHtml = '';
        if (typeId === 'summary' && Array.isArray(choices)) {
            choiceListHtml = `
                <div class="summary-table-container">
                    <div style="display:flex; flex-direction:column; align-items:center; width:100%; max-width:500px;">
                        <div style="display:flex; width:100%; margin-bottom:0.5rem; font-weight:700;">
                            <div style="width:30px;"></div>
                            <div style="flex:1; text-align:center;">(A)</div>
                            <div style="width:50px;"></div>
                            <div style="flex:1; text-align:center;">(B)</div>
                        </div>
                        <style>
                            .summary-row { display:flex; width:100%; padding:0.4rem 0; font-size:0.95rem; }
                            .summary-idx { width:30px; text-align:center; font-weight:700; }
                            .summary-col { flex:1; text-align:center; }
                            .summary-mid { width:50px; text-align:center; color:#94a3b8; }
                        </style>
                        ${choices.map((c, i) => `
                            <div class="summary-row">
                                <div class="summary-idx">${'①②③④⑤'.charAt(i)}</div>
                                <div class="summary-col">${c.A}</div>
                                <div class="summary-mid">......</div>
                                <div class="summary-col">${c.B}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>`;
        } else if (choices.length > 0) {
            const isTwoColumn = ['mood', 'blank_word', 'blank_phrase', 'order'].includes(typeId);
            const choiceStyle = isTwoColumn ? `display: grid; grid-template-columns: 1fr 1fr; gap: 0.8rem;` : `display: flex; flex-direction: column; gap: 0.6rem;`;
            choiceListHtml = `
                <ul class="choices" style="list-style:none; padding-left:0; margin-top:1rem; ${choiceStyle}">
                    ${choices.map((c, i) => `<li class="choice-item" style="display:flex; align-items:flex-start;"><span class="choice-num" style="display:inline-flex; align-items:center; justify-content:center; width:20px; height:20px; border:1px solid #333; border-radius:50%; margin-right:10px; font-size:0.85rem; flex-shrink:0; margin-top:2px; font-weight:500;">${i + 1}</span><span class="choice-text" style="font-size:1rem;">${c}</span></li>`).join('')}
                </ul>`;
        }

        return `<div class="quiz-container">
                <div style="font-weight:700; margin-bottom:1.2rem; font-size:1.1rem; letter-spacing:-0.02em;">${qNum ? qNum + '. ' : ''}${question}</div>
                ${boxPosition === 'top' ? boxHtml : ''}
                ${passageHtml}
                ${footnotes ? `<div class="passage-footnote">${footnotes}</div>` : ''}
                ${arrowHtml}
                ${boxPosition === 'bottom' ? boxHtml : ''}
                ${choiceListHtml}
                ${showAnswerInline ? `<div style="margin-top:2rem; background:#f8fafc; padding:1.2rem; border-radius:8px; border:1px solid #e2e8f0;"><div style="font-weight:700; color:#475569; margin-bottom:0.5rem;">[정답 및 해설]</div><div style="margin-bottom:0.5rem;"><strong>정답:</strong> ${answer}</div><div style="color:#64748b; font-size:0.95rem; line-height:1.6;"><strong>[해설]</strong> ${explanation}</div></div>` : ''}
            </div>`;
    }

    if (apiSettingBtn) apiSettingBtn.addEventListener('click', () => apiModal.classList.remove('hidden'));
    if (cancelApiBtn) cancelApiBtn.addEventListener('click', () => apiModal.classList.add('hidden'));
    if (copyBtn) copyBtn.addEventListener('click', () => { navigator.clipboard.writeText(resultView.innerText).then(() => alert('복사되었습니다.')); });
    if (downloadBtn) downloadBtn.addEventListener('click', () => { window.print(); });

    if (downloadHtmlBtn) {
        downloadHtmlBtn.addEventListener('click', async () => {
            const content = resultView.innerHTML;
            if (!content || content.includes('placeholder-state') || content.trim().length === 0) {
                alert('생성된 문제가 없습니다. 먼저 문제를 생성해주세요.');
                return;
            }

            // Handle CSS Embedding Robustly
            let cssText = '';

            // Try 1: Fetch (Works on Server)
            try {
                const response = await fetch('style.css');
                if (response.ok) {
                    cssText = await response.text();
                }
            } catch (e) {
                console.warn('Fetch failed (likely file:// protocol), trying fallback...');
            }

            // Try 2: Document StyleSheet (Works if rules are accessible)
            if (!cssText) {
                try {
                    for (const sheet of document.styleSheets) {
                        try {
                            if (sheet.href && sheet.href.includes('style.css')) {
                                for (const rule of sheet.cssRules) {
                                    cssText += rule.cssText + '\n';
                                }
                            }
                        } catch (e) {
                            // Accessing cssRules on cross-origin/file-protocol sheets can block
                        }
                    }
                } catch (e) { console.warn('StyleSheet access failed', e); }
            }

            // Fallback Warning
            // Fallback Warning
            if (!cssText) {
                // Use minimal default styles
                cssText = `
                    body { font-family: 'Pretendard', sans-serif; line-height: 1.6; }
                    .quiz-container { margin-bottom: 2rem; border-bottom: 1px solid #ccc; padding-bottom: 2rem; }
                    .passage-box { background: #f9f9f9; padding: 1.5rem; border-radius: 8px; margin-bottom: 1rem; }
                    .choices { list-style: none; padding: 0; }
                    .choice-item { margin-bottom: 0.5rem; }
                    .choice-num { font-weight: bold; margin-right: 0.5rem; }
                    @media print { .btn-ghost { display: none; } }
                `;
                console.warn('Local file restrictions prevented loading of external CSS. Using fallback styles.');
            }

            const fullHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CSAT 변형문제 Export</title>
    <link href="https://fonts.googleapis.com/css2?family=Pretendard:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        ${cssText}
        /* Style Overrides for Exported HTML */
        body { background-color: white !important; height: auto !important; overflow: visible !important; padding: 20px 40px; }
        .result-content { 
            border: none !important; 
            box-shadow: none !important; 
            max-height: none !important; 
            overflow: visible !important; 
            padding: 0 !important;
            max-width: 100% !important; /* Allow full width for 2-column layout */
            margin: 0 auto;
        }
        .quiz-container { break-inside: avoid; page-break-inside: avoid; }
        
        /* Exam Header Table Style */
        .exam-header-table {
            width: 100%;
            border-collapse: collapse;
            border: 2px solid #000;
            margin-bottom: 30px;
            font-family: 'Pretendard', sans-serif;
            text-align: center;
        }
        .exam-header-table td {
            padding: 8px 5px;
            border: 1px solid #000;
        }
        .header-title {
            font-size: 1.8rem;
            font-weight: 800;
            padding: 15px !important;
        }
        .header-info {
            font-size: 1.1rem;
            font-weight: 600;
        }
        .header-notice {
            font-size: 0.8rem;
            color: #333;
        }
        /* Editable highlight */
        [contenteditable]:hover {
            background-color: #f0f9ff;
            cursor: text;
        }
        
        /* CRITICAL: Force 2-column layout for screen AND print */
        .all-in-one-container {
            column-count: 2;
            column-gap: 40px;
            column-rule: 1px solid #e2e8f0;
            width: 100%;
            display: block;
        }
        
        .passage-divider {
            break-inside: avoid;
            page-break-inside: avoid;
            margin-bottom: 2rem;
            -webkit-column-break-inside: avoid;
        }

        .question-card {
            break-inside: avoid;
            page-break-inside: avoid;
            -webkit-column-break-inside: avoid;
            margin-bottom: 2rem;
            display: inline-block;
            width: 100%;
        }

        @media screen and (max-width: 900px) {
            .all-in-one-container { column-count: 1; }
        }

        @media print {
            body { padding: 0; }
            .all-in-one-container { column-count: 2; column-gap: 1cm; }
            .exam-header-table { margin-top: 0; }
        }
    </style>
</head>
<body>
    <!-- Editable Exam Header -->
    <table class="exam-header-table">
        <tr>
            <td colspan="3" class="header-title" contenteditable="true">2025학년도 1학년 2학기 (공통영어2) (중간)고사</td>
        </tr>
        <tr class="header-info">
            <td style="width: 33%; text-align: center;" contenteditable="true">2025. 9. 29. 월요일 3교시</td>
            <td style="width: 34%; text-align: center;" contenteditable="true">[ 과목 코드: 03 ]</td>
            <td style="width: 33%; text-align: center;" contenteditable="true">부산중앙여자고등학교</td>
        </tr>
        <tr>
            <td colspan="3" class="header-notice" contenteditable="true">이 시험 문제의 저작권은 부산광역시교육청(부산중앙여고)에 있습니다. 저작권법에 의해 보호받는 저작물이므로 전재와 복제와 발췌를 금지하며, 이를 어길 시 처벌될 수 있습니다.</td>
        </tr>
    </table>

    <div class="result-content">
        ${content}
    </div>
</body>
</html>`;

            // Add BOM for UTF-8 compatibility
            const blob = new Blob(['\uFEFF' + fullHtml], { type: 'text/html;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `CSAT_Problems_${new Date().toISOString().slice(0, 10)}.html`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }

    init();
});
