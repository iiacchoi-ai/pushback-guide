# 영문판 용어집 (AIP RKSI 표기 기준)

□ 근거: AIP REPUBLIC OF KOREA, RKSI AD 2 (Aircraft Stands / Pushback procedures). 영문 문장은 AIP 원문을 우선하고, AIP 에 없는 문장만 아래 규칙으로 작성

## 1. 용어 대조표 (spec 6절)

| 한글 | 영문 | 근거·주의 |
|---|---|---|
| 주기장 | stand (탑승교 주기장은 gate) | AIP "Aircraft Stands". 화면 라벨은 Stand 통일 |
| 유도선 (R1 등) | taxilane R1 | AIP "onto taxilane R1" |
| 유도선 | taxilane | 항공기 주기·이동용 유도선. 핸드북이 "R1 유도로" 라 써도 R1·R2·R3·R4·R6·R7·R9·R10·R11·R12·R17·AS·RA·RC·RF·RG·M18·M19·D9 는 **taxilane** (AIP 본문 표기 기준) |
| 유도로 | taxiway | 유도로 명칭(A4·M5·M6 등). 유도선과 섞어 쓰지 않는다 |
| 관제탑 | the tower (ATC) | 국토교통부 소관. 계류장관제(Incheon Apron)와 구분 |
| Blue Line 따라 정대 | along blue line until its nosewheel is at spot N | AIP 원문. 앱 키워드 Point N 은 별칭 처리 |
| 기수방향 북쪽 | to face north | AIP phraseology "Pushback approved to face north" |
| 후류 | jet blast | AIP "to minimize jet blast effect" |
| 견인(토잉) | towed forward | AIP "pushed back … and then towed forward" |
| 관제 지시별 후방견인 절차 | Pushback procedures by phraseology | AIP 표 제목 "Phraseology". instruction / control 표현은 AIP 직접 인용 외 사용 안 함 |
| 계류장관제(호출부호) | Incheon Apron | AIP 호출부호 |
| 경로이탈 감지 (시범) | Route deviation alert (trial) | 단말 위치 기준 고지 문구 동일 유지 |
| 작업자 단말 위치이며 항공기 위치가 아닙니다 | This is the position of the worker's device, not the aircraft | 안전 고지, 완화 불가 |
| 주의사항 | Cautions | |
| 홈화면 | Home | |
| 기본 시점 / 작업자 시점 | Standard view / Crew view | 도면 세그먼트 |
| 운항관리처 | Flight Operations Division | 푸터 |

□ 앱 이름 "밀어요"는 번역하지 않음. 헤더 제목 "항공기 PUSHBACK 절차 안내"는 "Aircraft Pushback Guide"

## 2. 잔여 문장 번역 규칙 (src: tr)

- 문장 구조는 AIP 를 따른다: "The aircraft shall be pushed back … to face <방향>." 방향은 north/south/east/west 소문자.
- 정대 = "until its nosewheel is at spot N" / "with its nosewheel and fuselage on taxilane R1".
- 유도로 이동 항공기 = "aircraft taxiing on taxiway A4". 후류 = "jet blast". 견인 = "towed forward".
- 핸드북의 "* 주의 문구" 는 영문에서도 같은 순서로 유지하되, 앞뒤에 공백을 둔 ` * ` 로 구분한다. 한글 `*` 하나당 영문 ` * ` 구간 하나 (`<기준문> * <주의문 1> * <주의문 2>`). 앱(`index.html` `procDesc`)이 이 구분자를 기준으로 각 구간을 새 줄·빨간색으로 렌더하고, 같은 문구가 도면 재생 안내문(`hbNotes`)으로도 그대로 쓰인다. 개수가 어긋나면 `coverage.mjs` 의 "주의 문구 개수 불일치" 에서 걸린다.
- 주의 문구는 명령형을 쓰지 않고 수동·사실 서술로 둔다. 구간이 독립된 줄로 보이므로 첫 글자는 대문자로 시작한다.
  예: "…푸쉬백한다 * 후류 주의" → "… to face south. * Jet blast affects the area behind the aircraft."
  예: "…푸쉬백한다 * R2 유도선을 개방" → "… to face east or west. * Leaving taxilane R2 clear."
- 핸드북이 AIP 보다 상세하면 AIP 문장 뒤에 보충문을 붙이고 src 를 `aip+tr` 로 둔다.
- 지시·통제 뉘앙스 금지: "instruct", "instruction", "control", "must comply", "violation" 을 쓰지 않는다. 절차는 "shall be pushed back" (AIP 원문) 또는 "Push back …" 명령형.

## 3. 문형 표준 (AIP 틀)

| 유형 | 영문 틀 |
|---|---|
| 유도선 정대 | `The aircraft shall be pushed back onto taxilane <X> to face <dir>.` |
| 지점 정대 | `The aircraft shall be pushed back to face <dir> until its nosewheel is at spot <N>.` |
| 후방견인 후 전방견인 | `The aircraft shall be pushed back (to face <dir>) and then towed forward along taxilane <X> until its nosewheel is at spot <N>.` |
| 주기장까지 후방견인 | `The aircraft shall be pushed back onto the stand <N> to face <dir>.` |
| 지시 주기장까지 | `The aircraft shall be pushed back to face <dir> along taxilane <X> until the specific gate position.` |

## 4. 세부 규칙 (Task 8 적용분)

1. AIP 문장 틀을 그대로 쓴다. 새 어순을 만들지 않는다.
2. 복합 방향 "남쪽/북쪽", "동쪽/서쪽" 은 `or` 로 잇는다 → `to face south or north`. 같은 주기장의 AIP 후보에 방향별 행이 따로 있으면 그것을 합치고 `src: "aip+tr"`, 없으면 `src: "tr"`.
3. "Point 31 또는 32에 정대" → `until its nosewheel is at spot 31 or 32`. AIP 는 본문에서 spot, phraseology 에서 point 를 쓰므로 본문은 **spot**. 앱 키워드 "Point N" 은 `i18n.js kwRegex` 가 별칭 처리.
4. "RA(지시받는 경우 RF) 유도선" → `taxilane RA (or RF when so cleared)`. "지시" 를 instruction 으로 옮기지 않는다.
5. "후방견인 한 후 … 견인하여" → `pushed back … and then towed forward along taxilane <X> until …` (AIP: "pushed back … and then towed forward").
6. "Nose Gear 및 동체가 R4 유도선에 위치하도록" → AIP 원문이 있으면 `onto taxilane R4`, 없으면 `with its nosewheel and fuselage on taxilane R4`.
7. "… 유도선/유도로 개방" → `leaving taxilane <X> clear` / `so that taxiway <X> remains clear`. "개방" 을 open 으로 직역하지 않는다.
8. "후류 영향이 없도록" → `to minimize jet blast effect` (AIP 원문 표현).
9. "관제 지시에 따라", "지시받는 경우" → `as cleared` / `when so cleared`. 행위 주체를 명시하지 않는다.
10. 제목이 한글인 항목만 `title_en` 을 채운다 (예: "MRO 이동절차" → "MRO towing procedure"). 영문 제목은 손대지 않는다.
11. 같은 한글 원문은 어느 주기장이든 **같은 영문**을 쓴다.
12. 안전·규제 표현: 방향·위치·정대는 사실 서술로만 쓴다. 준수 의무를 만들어내는 표현을 쓰지 않는다.
13. **stand / gate 구분** — 제1여객터미널 탑승교 주기장(1~50, 101~132)은 본문에서 `gate N` (소문자). 원격·화물 주기장(8xx 등)과 그 밖의 주기장은 `stand N`. 따옴표로 인용한 phraseology 안의 `Gate` 는 대문자 그대로 둔다 (예: "abeam Gate 47"). 같은 카드의 AIP 문장 표기와 맞춘다.

## 5. src 값

| 값 | 뜻 |
|---|---|
| `aip` | AIP 원문 그대로 (match.mjs 자동 매칭) |
| `aip+tr` | 해당 주기장의 AIP 후보 문장을 바탕으로 합치거나 보충한 문장 |
| `tr` | AIP 후보가 없어 용어집 규칙만으로 작성한 문장 |

□ `status` 는 팀 검수 전까지 전건 `review`. 검수자가 `ok` 로 바꾼 항목만 배포 대상
