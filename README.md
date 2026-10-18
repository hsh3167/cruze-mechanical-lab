# R6+ — Engine bay and cabin completion

Live viewer: https://hsh3167.github.io/cruze-mechanical-lab/

63 additional objects; 608 web display objects, 604 exported meshes, 17 systems. Preserves R6 and all R4/V2 features. Adds front cooling detail, latch and wiring, cabin/trunk trim and interactive rear seat folding. R10 was not recovered; this version is R6+.

R6 backup branch: backup/r6-20261018 (original commit 42aa4fcbf43bba3c915eb141060dadb0e191258b). Original R4 and R6 GLBs remain available.

Run npm test for all 10 checks. Run node export-plus.mjs to reproduce the new GLB. Rear folding is a viewer function; the download has the rear seat upright. See RECOVERY.md for scope and validation limitations.

---

# R6 — Engine bay expansion

The R6 release adds 76 selectable engine-bay components to the intact R4 geometry and V2 learning features. The web platform displays 545 objects across 17 systems. It opens in the engine-bay view; the hood control opens/closes around its rear hinge. Added geometry is educational and schematic, not OEM dimensional CAD.

Additions include the radiator supports and fan shroud, firewall/cowl, side aprons and strut-tower panels, headlamp backs, hood reinforcement and prop, washer tank/filler/cap, oil/coolant/brake caps, battery tray/terminals/cables, air inlet duct, ECU connections, ABS pipes and wiring detail. Existing battery, airbox, radiator, condenser and major assemblies are retained without duplicates.

Reference for service-point component types: Chevrolet 2014 Cruze Owner Manual, 1.4L L4 Engine, pages 10-6 and 10-7. This North American reference does not validate Korean equipment, dimensions or routing.
https://www.chevrolet.com/ownercenter/content/dam/gmownercenter/gmna/dynamic/manuals/2014/chevrolet/cruze/2014_chevrolet_cruze_owners.pdf

- `engine-bay.js`: reproducible component geometry and labels.
- `export-r6.mjs`: exports `cruze-full-r6.glb` and updates the integration manifest. The exchange model has 541 meshes with the hood open; four V2 combustion effects are web-only.
- `cruze-full-r4.glb`: unchanged original archive.
- `node export-r6.mjs` to rebuild the exchange model.
- `npm test` runs 8 integration checks, including original geometry preservation and hood transform checks.

The older Python generators below are retained as R5 history. They overwrite viewer or manifest files and should not be run over R6 without reapplying the R6 changes.

---
# Cruze Mechanical Lab — R5

2014 Chevrolet Cruze 1.4T의 전체 차량 구조와 엔진 작동을 살펴보는 웹 플랫폼입니다.

## 통합 내용

- R4 원본 GLB의 465개 표시 객체와 17개 계통을 그대로 사용합니다.
- V2의 부품 설명, 4행정 학습, 점화순서 1–3–4–2, 연소 시점 표시 4개, 윤활 경로를 통합했습니다.
- 전체 차량, 엔진룸, 엔진 내부, 냉각, 워터펌프, 서모스탯, 흡배기, 윤활, 점화, 구동, 하부, 실내, 외장을 한 화면에서 선택합니다.
- R4 냉각 경로 19개의 중심선을 원본 튜브 단면의 중심에서 추출했습니다. 원본 GLB는 수정하지 않았습니다.
- 외부 CDN·npm 패키지 없이 WebGL 2와 브라우저 기본 기능으로 실행합니다.

## 보기

GitHub Pages에 배포된 주소를 Chrome 또는 Edge에서 엽니다. 다른 PC에서도 같은 주소를 사용하며 Python 설치는 필요하지 않습니다.

로컬 개발 시 이 폴더에서 `python -m http.server 8766 --bind 127.0.0.1`을 실행하고 `http://127.0.0.1:8766`에 접속합니다. `file://`로 열면 브라우저의 파일 로딩 제한 때문에 작동하지 않습니다.

## 조작

왼쪽 드래그 회전, 휠 확대/축소, 오른쪽 드래그 이동, 부품 클릭 설명입니다. 하단의 재생, +30°, 각도 슬라이더와 실린더 선택으로 엔진 운동을 관찰합니다. 냉각 순환은 별도로 재생/정지합니다. 케이스 투시, 단면, 분해, 선택 숨김, 단독 보기를 지원합니다.

## 개발과 검증

- `node --test integration.test.mjs`: 모델 보존, 중복 방지, 냉각 경로 추출, 기구 폐합, 파일 참조 검사
- `python prepare_assets.py`: R4에서 냉각 경로 중심선과 통합 정보를 다시 추출
- `python integrate_viewer.py`: 보존한 `v2-viewer-source.js`를 바탕으로 통합 뷰어 재생성
- `integration-check.json`: 원본 R4 SHA-256과 표시 객체 수

## 한계

이 모델은 OEM CAD가 아닌 자체 제작 교육용 개념 형상입니다. 실차 치수, 국내 트림별 부품 사양, 장착점, 치합, 접촉, 유량, 온도, 압력, 성능은 검증되지 않았습니다. 크랭크·로드·피스톤의 기구 폐합을 계산하지만 실제 밸브 타이밍이나 캠 접촉 해석은 아닙니다. 냉각 입자와 서모스탯 개도는 원리 설명용이며 CFD 결과가 아닙니다. 절개면은 마감하지 않습니다.

## 이력

- V2: 엔진 학습용 뷰어와 절차적 모델
- R4: 전체 차량 17개 계통, 465개 표시 객체, 상세 엔진·냉각 구조
- R5: R4 형상과 V2 학습 기능을 단일 웹 플랫폼으로 통합. 원본 조립체를 중복 추가하지 않았습니다.
