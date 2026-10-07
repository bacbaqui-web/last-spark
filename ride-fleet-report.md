# 소형 탈것 10종 제작 보고서

2026-10-07 · LAST SPARK 비교용 시제품

오토바이 4종, 자전거 4종, 킥보드 2종을 제작했습니다. 기존 자동차 테스트와 같은 평면 위주의 메시와 UV 텍스처 방식을 사용합니다. 색상만 바꾼 복제본이 아니라 바퀴 크기, 휠베이스, 차체, 프레임, 핸들, 안장 구조가 각각 다릅니다.

## 모델과 참고 자료

|종류|참고 자료|삼각형|
|---|---|---:|
|스포츠 바이크|[kawasaki-ninja-h2r](https://drawingdatabase.com/kawasaki-ninja-h2r/)|2,918|
|크루저|[royal-enfield-lightning-350](https://drawingdatabase.com/royal-enfield-lightning-350/)|2,822|
|오프로드 바이크|[honda-crf300l](https://drawingdatabase.com/honda-crf300l/)|3,526|
|클래식 스쿠터|[vyatka-vp-150m-1976](https://drawingdatabase.com/vyatka-vp-150m-1976/)|2,430|
|로드 자전거|[road-bicycle](https://aicma.org/wp-content/uploads/2019/07/BICYCLE_FORMS_AND_PARTS.pdf)|3,272|
|산악 자전거|[mountain-bicycle](https://aicma.org/wp-content/uploads/2019/07/BICYCLE_FORMS_AND_PARTS.pdf)|3,176|
|BMX|[bmx-bicycle](https://www.the-blueprints.com/vectordrawings/show/15830/bmx_bike/)|3,304|
|접이식 자전거|[folding-bicycle](https://commons.wikimedia.org/wiki/File:Colourful-brompton-layered-handlebars-adjusted-wp.svg)|3,204|
|일반 킥보드|[manual-kick-scooter](https://global.razor.com/uk/wp-content/uploads/sites/2/2020/08/A5_LUX_US_MAN_200121.pdf)|1,930|
|전동 킥보드|[electric-kick-scooter](https://www.segwayisrael.com/wp-content/uploads/2023/01/MAX-G30E-guide-2022.pdf)|2,070|

오토바이는 다면 도면, BMX는 다면 구조도, 로드/산악 자전거는 AICMA 부품 구조 그림, 접이식은 Brompton 접이 구조 그림, 킥보드는 제품 매뉴얼의 구조 그림을 참고했습니다. 모두 원본 CAD 재현이 아닌 게임용 근사 모델입니다. 수치가 없는 자료의 크기는 일반적인 비례로 정했습니다. 원본 참고 이미지를 게임에 재배포하지 않고 출처 링크를 남겼습니다.

## 메시와 표면

- 차체의 모서리를 여덟 면 단면으로 깎았으며 곡면 subdivision은 사용하지 않습니다.
- 오토바이 외피는 연속된 단면으로 연결하고, 엔진 부분은 어두운 내부 덩어리로 막았습니다.
- 자전거 프레임과 바퀴살은 실제 3D 형상입니다. 프레임 내부와 림 안쪽은 막지 않아 회전했을 때도 공간이 유지됩니다.
- 종류마다 AI로 생성한 고정 텍스처 아틀라스 한 장을 사용합니다. 녹, 흙 묻은 타이어, 갈라진 안장, 더러운 금속과 전조등이 포함됩니다. 녹 양 슬라이더는 없습니다.
- 차체 측면은 아틀라스의 측면 이미지에 UV를 투영하고, 나머지 파츠는 소재별 UV 영역을 사용합니다. 타이어와 튜브는 둘레를 따라 펼쳐 무늬의 반복을 줄였습니다.
- 도장 색은 셰이더에서 남아 있는 청록색 도장만 변경합니다. 부식과 오염은 고정됩니다.
- 각 모델은 1 메시, 1 재질입니다. 텍스처 10장 합계 약 6.9 MiB이며 JPEG로 저장했습니다.

## 비교 페이지

`ride-fleet.html`: 전체 비교, 개별 선택, 정면/측면/윗면/입체, 회전, 확대, 도장 색 변경, 와이어프레임 확인을 지원합니다. 도면과 텍스처 원본 링크도 있습니다. 필요할 때만 렌더링합니다.

현재는 비교 페이지용 모델입니다. 실제 게임의 맵 배치나 운전 기능은 이 작업에 포함하지 않았습니다.

## 검증

10개 메시의 형상이 모두 다른 것을 해시로 확인했습니다. 좌표와 UV의 유한성, UV 0~1 범위, 지면 아래로 내려가지 않는 바퀴를 확인했습니다. 브라우저에서 모델 선택과 시점 변경을 확인했고 페이지 JavaScript 오류는 없었습니다. Vite 프로덕션 빌드는 통과했습니다. 기존 게임 번들의 큰 청크 경고는 남아 있습니다.

## 생성 기록과 파일

- `ride-fleet-models.js`: 실제 메시 생성 코드
- `ride-fleet-data.json`: 종류, 비례, 색, 참고 자료
- `ride-fleet-prompts.json`: 10개의 정확한 생성 프롬프트, 입력 이미지 경로, 모드, 원본 생성 결과 경로, 최종 저장 경로
- `public/textures/vehicles/rides/*.jpg`: 최종 10개 텍스처

원본 AI PNG는 Codex generated_images에 유지했습니다. JPG 변환만 수행했으며 생성 표면을 절차적 그림으로 대체하지 않았습니다.

접이식 참고 그림: Sladen, “Colourful-brompton-layered-handlebars-adjusted-wp.svg”, Wikimedia Commons, [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/). 도식의 구조를 참고해 낡은 표면과 3D 비례로 변경했습니다. 이 그림을 바탕으로 제작한 접이식 모델 정의와 folding-bicycle.jpg는 같은 라이선스로 제공합니다.
