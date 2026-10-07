# 폐차 10종 제작 보고

2026-10-07

## 결과

서로 다른 10개 차종의 인터넷 도면 이미지를 직접 확인하고, 차체 길이·폭·높이와 측면 윤곽을 참고해 별도 메시를 만들었습니다. 도면 원본 이미지는 배포 파일에 포함하지 않았으며 아래 원문 출처로 연결했습니다. 실제 제조사의 정밀 CAD 복제물이 아닌 게임용 근사 모델입니다.

| 종류 | 참고 차량 / 도면 출처 | 삼각형 |
|---|---|---:|
| 세단 | [ford-taunus-12m-1968](https://drawingdatabase.com/ford-taunus-12m-1968/) | 842 |
| 경차 해치백 | [daewoo-matiz-2003](https://drawingdatabase.com/daewoo-matiz-2003/) | 842 |
| 스테이션 왜건 | [volvo-v70-wagon-2006](https://drawingdatabase.com/volvo-v70-wagon-2006/) | 842 |
| 오프로드 SUV | [mahindra-thar-2021](https://drawingdatabase.com/mahindra-thar-2021/) | 814 |
| 오픈 지프 | [willys-mb](https://drawingdatabase.com/willys-mb/) | 914 |
| 클래식 픽업 | [ford-f-100-1956](https://drawingdatabase.com/ford-f-100-1956/) | 888 |
| 패널 밴 | [citroen-hy-1957](https://drawingdatabase.com/citroen-hy-1957/) | 828 |
| 미니버스 | [nissan-civilian](https://drawingdatabase.com/nissan-civilian/) | 814 |
| 소형 탑차 | [daihatsu-gran-max-box-van](https://drawingdatabase.com/daihatsu-gran-max-box-van/) | 842 |
| 스포츠 쿠페 | [nissan-silvia-s14-1994](https://drawingdatabase.com/nissan-silvia-s14-1994/) | 856 |

## 구조와 텍스처

- 곡면 대신 평면을 사용하고 모서리에 작은 면을 추가했습니다.
- 픽업은 열린 적재함, 지프는 열린 객실과 좌석, 왜건은 긴 지붕, 탑차는 높은 화물칸 등 차종별 구조를 구별했습니다.
- 휠 아치를 차체 경계에 만들고 안쪽에 닫힌 차콜 코어를 넣었습니다. 바퀴는 차체 폭 안쪽으로 넣었습니다.
- 차종별 도면과 UV 안내 이미지를 imagegen에 입력해 각각 독립된 낡은 텍스처를 만들었습니다.
- 녹, 벗겨진 도장, 금 간 오염 유리, 진흙 묻은 휠·타이어는 텍스처에 고정했습니다. 녹 양 슬라이더는 없습니다. 남아 있는 도장색만 변경 가능합니다.
- 차량당 메시 1개 / 재질 1개, 총 8,482개 삼각형. 배포용 JPEG 10개 합계 약 8.67 MB.
- 정확한 입력 프롬프트와 원본 생성 경로: [vehicle-fleet-prompts.json](./vehicle-fleet-prompts.json). 생성 모드는 UV 안내 + 도면 참조 이미지 편집입니다. 배포 자산은 `public/textures/vehicles/fleet/*.jpg`입니다.

## 비교 화면

[차량 10종 비교](https://bacbaqui-web.github.io/last-spark/vehicle-fleet.html)

전체 비교, 개별 차량 선택, 드래그 회전, 휠 확대, 정면·측면·위·입체 보기, 메시 표시와 도장 색 변경을 지원합니다. 각 차량 카드에서 도면 출처와 텍스처를 열 수 있습니다.

## 검증과 범위

- 10종 모두 선택 동작을 브라우저에서 확인했습니다.
- 모든 메시의 위치 / UV / 색상 값이 유한한지, 측면 프로필이 중복되지 않는지 확인했습니다.
- Vite 프로덕션 빌드 통과.
- 게임 맵 교체는 포함하지 않았습니다. 비교 페이지에서 검토하는 단계입니다.
- 저해상도 도면에서 추정한 비율과 AI 텍스처 사이에 세부 선·창문 경계의 오차가 있습니다. 실제 차량을 정확하게 재현한 모델이라는 의미는 아닙니다.
