# RPG Maker MV/MZ Cheat UI + 번역 (Real-time Machine Translation)

RPG Maker MV/MZ 게임을 위한 강력한 GUI 기반 치트 툴이며, **실시간 기계 번역** 기능을 지원합니다.

---

## 📸 UI 샘플
<p float="left">
  <img src="https://user-images.githubusercontent.com/99193603/153754676-cee2b96e-c03a-491f-b71c-3c57d6dcc474.JPG" width="24%"/>
  <img src="https://user-images.githubusercontent.com/99193603/153754683-4e7a09a5-2d31-436d-8546-7a5d658eb282.JPG" width="24%"/>
  <img src="https://user-images.githubusercontent.com/99193603/153754687-732648c8-3483-42bb-9634-dd22d674dfed.JPG" width="24%"/>
  <img src="https://user-images.githubusercontent.com/99193603/153754696-0cbc76f9-99fa-47a7-a0d0-6510a2f76e01.JPG" width="24%"/>
</p>

---

## 🔥 주요 기능
- **새로운 유틸리티**: 
  - **Force Save**: 게임 내 저장 제한을 무시하고 강제로 저장 기능을 활성화합니다.
  - **디버그 메뉴**: NW.js 콘솔 및 RPG Maker 디버그(F9) 메뉴에 즉시 접근 가능.
  - **전술 맵 패널**: 플레이어, 이벤트, 적군, 보물 상자를 실시간으로 추적하는 인터랙티브 맵 오버레이.
  - **마우스 텔레포트**: 맵 클릭 또는 `Alt + M` 키로 즉시 이동할 수 있는 기능.
  - **토스트 알림**: 노클립, 강제 저장, 인카운트 상태 변경 시 화면 레이어 알림.
  - **팝업 윈도우**: 치트 UI를 별도의 독립된 창에서 실행하여 멀티태스킹 최적화.
- **스마트 번역**: 실시간으로 변수, 스위치, 맵 이름, 아이템 설명 번역.
  - **Lingva Translate** 지원 (개인 정보 보호 및 무료 구글 번역 대안).
  - **Translation Bank**: 번역된 내용을 캐시하여 다음 로드 시 즉시 반영.
  - **일괄 처리 (Batch Processing)**: 수백 개의 항목을 몇 초 만에 번역.
- **단축키 커스텀**: 원하는 모든 키에 치트 기능 할당 가능.

---

## 🛠️ 빠른 설치 방법 (MV/MZ)

1. **다운로드**: [Releases](https://github.com/Eduwilll/RPG-Maker-MV-MZ-Cheat-UI-Plugin/releases)에서 최신 zip 파일을 받으세요.
2. **파일 복사**: 압축을 풀고 `js` 및 `cheat` 폴더를 게임 폴더에 복사합니다:
   - **MV**: `{game_dir}/www/` 에 복사.
   - **MZ**: `{game_dir}/` 에 복사.
   > ⚠️ **주의**: `main.js` 파일이 덮어씌워지므로 반드시 미리 백업하세요!
3. **실행**: 게임 실행 후 **`Ctrl + C`** 키를 눌러 치트 메뉴를 엽니다.

---

## 🐳 Lingva 셀프 호스팅 (Docker)
더 빠른 번역 속도와 완벽한 개인 정보 보호를 위해 자신의 PC에서 직접 Lingva를 실행할 수 있습니다.

### 옵션 1: 단일 인스턴스 (Fast)
```bash
docker run -d -p 3000:3000 thedaviddelta/lingva-translate
```
- 플러그인 설정에서 **"Local Lingva Docker (Port 3000)"**를 선택하세요.

### 옵션 2: 3-노드 클러스터 (Balanced/Extreme Speed)
이 레포지토리의 `docker-compose.yml`을 사용하여 3000, 3001, 3002 포트에서 실행되는 3중화 클러스터를 구성할 수 있습니다.
```bash
docker-compose up -d
```
- 플러그인 설정에서 **"Local Lingva Docker (Ports 3000, 3001, 3002 Balanced)"**를 선택하세요.

---

## 🌍 번역 세팅 방법
1. 메뉴 열기 (**`Ctrl + C`**) -> **Translation** 탭으로 이동.
2. **Enable** 스위치를 ON으로 설정.
3. **End Point** 선택 (예: **Lingva JA → EN**).
4. **Targets** 에서 번역할 항목(Variables, Items 등)을 체크하고 **"Start Translation"**을 누릅니다.

---

## 🛠️ 개발 및 UI 미리보기 (Development)

우리는 UI 개발 및 게임 통합 속도를 높이기 위한 전문적인 도구를 제공합니다.

### 1. Web-UI 미리보기 (브라우저 개발)
게임 재시작 없이 브라우저에서 직접 Vue/Vuetify UI를 실시간으로 개발할 수 있습니다.
- **참고**: 미리보기용 종속성 설치가 필요하지 않습니다 (`cheat/libs/`의 로컬 라이브러리 사용).

```powershell
# Python 가상 환경에서 미리보기 실행
.venv\Scripts\python.exe start-preview.py
```
- 브라우저에서 `http://localhost:8080/preview/index.html`을 엽니다.

### 2. Dev-Sync (자동 주입 및 심볼릭 링크)
개발 폴더를 테스트 게임에 연결합니다. IDE에서 저장한 변경 사항은 게임에서 즉시 확인 가능합니다 (`F5` 키).
```powershell
# 임의의 게임에 설정
.venv\Scripts\python.exe deploy\dev.py --game-path "C:/MyTestGame"

# 로컬 테스트 폴더 빠른 설정 (인터랙티브 선택 포함)
.venv\Scripts\python.exe deploy\dev.py --mv
.venv\Scripts\python.exe deploy\dev.py --mz

# 선택 사항: cheat-version-description.json 에 커스텀 버전 명시
.venv\Scripts\python.exe deploy\dev.py --mz --version v1.2.3-alpha
```

### 3. 자동 포맷팅 (Prettier & Husky)
일관된 코드 스타일 유지를 위해 **Prettier**를 사용하며, **Husky**를 통해 모든 커밋 전에 자동으로 포맷이 적용됩니다.
- **수동 포맷**: `pnpm run format`
- **Pre-commit Hook**: `git commit` 시 `lint-staged`가 자동으로 변경 사항을 정리합니다.

### 4. 기술 아키텍처
개발자 및 기여자는 핵심 엔진, UI 후킹 및 데이터 관리 기초에 대한 자세한 내용을 **[Architecture Overview](docs/guide/technical/architecture.md)**에서 확인하세요.

---

## 📜 Credits
- **Original Plugin**: [paramonos](https://github.com/paramonos/RPG-Maker-MV-MZ-Cheat-UI-Plugin)
- **Translation Idea**: [sieucapoccho3717](https://github.com/sieucapoccho3717/RPG-Maker-MV-MZ-Cheat-UI-Plugin)
- **Maintained & Enhanced by**: [Eduwilll](https://github.com/Eduwilll/RPG-Maker-MV-MZ-Cheat-UI-Plugin)
