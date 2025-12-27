# CSAT Generator - 멀티 PC 작업 가이드

이 문서는 다른 컴퓨터(윈도우/맥)에서 이 프로젝트를 이어서 작업하고 실행하는 방법을 설명합니다.

---

## 1. 준비물
새로운 컴퓨터에 다음 프로그램들이 설치되어 있어야 합니다. (이미 있다면 패스!)

1.  **Git**: [설치 링크](https://git-scm.com/downloads) (설치 시 계속 Nex만 눌러도 됨)
2.  **VS Code**: [설치 링크](https://code.visualstudio.com/) (코드 편집기)
3.  **Python**: [설치 링크](https://www.python.org/downloads/)
    *   **⚠️ 주의**: 윈도우 설치 시 **"Add Python to PATH"** 체크박스에 반드시 체크해야 합니다!

---

## 2. 처음 한 번만 설정하기 (프로젝트 가져오기)
새로운 PC에서 작업을 시작하려면, GitHub에 있는 코드를 내 컴퓨터로 복사해와야 합니다.

1.  바탕화면이나 원하는 폴더에서 **마우스 우클릭 -> "Open Git Bash here"** (또는 VS Code 터미널 열기)
2.  아래 명령어를 입력하고 엔터:
    ```bash
    git clone https://github.com/snake77-kor/csat-generator.git
    ```
3.  `csat-generator`라는 폴더가 생깁니다. 이 폴더를 VS Code로 열어주세요.

---

## 3. 앱 실행하기

### 🖥️ Windows 사용자
*   폴더 안에 있는 **`run_windows.bat`** 파일을 더블 클릭하세요.
*   (검은 창이 뜨고 서버가 실행됩니다.)

### 🍎 Mac 사용자
*   폴더 안에 있는 **`start_server.command`** 파일을 더블 클릭하세요.
*   (터미널이 뜨고 서버가 실행됩니다.)

👉 실행 후 브라우저 주소창에 `http://localhost:8000` 입력

---

## 4. 작업 루틴 (가장 중요 ⭐)
여러 컴퓨터를 오가며 작업할 때, **데이터가 꼬이지 않게** 아래 습관을 꼭 지켜주세요.

### ✅ 작업을 시작할 때 (출근 도장)
작업하기 전에 무조건 최신 코드를 받아와야 합니다.
```bash
git pull
```

### ✅ 작업을 마칠 때 (퇴근 도장)
수정한 내용을 클라우드에 저장해야 합니다.
```bash
git add .
git commit -m "작업 내용 메모"
git push
```

---
*이 파일은 프로젝트 폴더(`csat-generator`) 안에 저장되어 있으니 언제든 열어보실 수 있습니다.*
