# RPG-Maker-MV-MZ-Cheat-UI-Plugin

- GUI 기반 쯔꾸르 MV/MZ 게임 치트 툴
- [English README](https://github.com/Eduwilll/RPG-Maker-MV-MZ-Cheat-UI-Plugin/blob/main/README.md)

# 소개

## UI 샘플
<p float="left">
  <img src="https://user-images.githubusercontent.com/99193603/153754676-cee2b96e-c03a-491f-b71c-3c57d6dcc474.JPG" width="500"/>
  <img src="https://user-images.githubusercontent.com/99193603/153754683-4e7a09a5-2d31-436d-8546-7a5d658eb282.JPG" width="500"/>
  <img src="https://user-images.githubusercontent.com/99193603/153754687-732648c8-3483-42bb-9634-dd22d674dfed.JPG" width="500"/>
  <img src="https://user-images.githubusercontent.com/99193603/153754692-38e04218-7726-4827-a45b-95485de51a3c.JPG" width="500"/>
  <img src="https://user-images.githubusercontent.com/99193603/153754696-0cbc76f9-99fa-47a7-a0d0-6510a2f76e01.JPG" width="500"/>
</p>

## Credits

- **Original RPG Maker Cheat Plugin**: [paramonos](https://github.com/paramonos/RPG-Maker-MV-MZ-Cheat-UI-Plugin)
- **Translation Feature Inspiration**: [sieucapoccho3717](https://github.com/sieucapoccho3717/RPG-Maker-MV-MZ-Cheat-UI-Plugin)
- **Maintained & Enhanced by**: [Eduwilll](https://github.com/Eduwilll/RPG-Maker-MV-MZ-Cheat-UI-Plugin)
- **Lingva Translate**: https://github.com/thedaviddelta/lingva-translate
- **Public Instance**: https://lingva.ml

## 기능
- GUI 기반 편한 사용성.
- 쯔꾸르 MV/MZ 게임 동시 지원.
- 스탯, 돈, 스피드, 아이템, 변수, 스위치 등 편집 기능.
- 게임 가속 (x0.1 ~ x10)
- 벽뚫, 캐릭터 무적 지원.
- 배틀 랜덤 인카운트 비활성화 (맵에서 돌아다닐 때 전투 일어나지 않게 하기).
- 강제로 전투 승리/패배/도망/취소.
- 여러 단축키 지원 (변경 가능).
    - 세이브/로드 창 호출, 퀵 세이브/로드, 타이틀로, 벽뚫 ON/OFF, 아군/적 피 1/회복 등등
- 아이템, 스위치, 변수 등에 대해 검색 기능.
- 위치 저장&이동, 특정 맵 순간이동 기능.
- 개발자 툴 지원 (f12)
- **향상된 번역 시스템** (Lingva Translate 지원):
  - 일본어, 중국어, 한국어 변수/스위치/맵 이름을 영어로 번역
  - 빠른 재사용을 위한 번역 캐시 기능
  - 대량 번역 처리 최적화
  - 여러 번역 서버(Lingva) 자동 전환 및 폴백 기능
- 레거시 번역 지원 ([ezTransWeb](https://github.com/HelloKS/ezTransWeb) 필요: 한국어만 지원)

# 세팅

## 적용 방법
1. 게임이 exe 파일만 있다면 언팩 툴로 언팩.
2. **[releases](https://github.com/Eduwilll/RPG-Maker-MV-MZ-Cheat-UI-Plugin/releases)** 에서 최신 버전의 치트(`rpg-{mv|mz}-cheat-{버전}.zip`) 다운로드 후 압축 해제.
3. 압축을 푼 폴더의 `js`, `cheat` 폴더를 `{게임폴더}/www` 에 덮어쓰기 (RPG MZ 게임에서는, `{게임폴더}` 에 덮어쓰기).
    - `www/js/main.js` 파일을 덮어씌우기 때문에 해당 파일은 백업해두기를 권장합니다.

## 사용 방법
- 기본 설정으로 `Ctrl + C` 입력 시 치트 창이 나타납니다.
- "Shortcuts" 탭에서 해당 키 설정을 바꿀 수 있습니다.
- 치트 창에 마우스를 올리지 않은 경우 좀 투명하기 때문에 잘 안 보일 수 있습니다. (게임 창의 우측 상단에 나타납니다)

## 오류 관련 대처
... (이하 생략 또는 기존 내용 유지)
