좋아. **“반자동 = 프롬프트/로그/아카이빙은 자동, 모델 호출(웹)은 사람이 Ctrl+V/Ctrl+C로 넘기는 방식”**으로 시작하면 안정적으로 굴러가.

아래 순서대로 하면 바로 돌아가.

---

## 0) 오늘 바로 할 최소 셋업 (한 번만)

### A. 폴더/규칙(가드레일)부터 박기

새 프로젝트(또는 실험용 repo) 하나 만들고, 루트에 **`CLAUDE.md`**만 먼저 만들어.

```markdown
# CLAUDE.md (Project Rules)

## Definition of Done
- 빌드/테스트 명령이 문서에 있음
- 로컬에서 테스트 통과 (최소 smoke test)
- 보안: 비밀키/토큰/패스워드 하드코딩 금지
- 변경은 작은 단위로 커밋(또는 최소한 단계별로 diff 정리)

## Workflow (must)
1) 먼저 계획(plan)을 따른다 (계획 없으면 /plan부터)
2) TDD 가능하면 RED → GREEN → REFACTOR
3) 기능 구현 후 반드시 리뷰용 요약을 남긴다:
   - 변경 파일 목록
   - 실행 방법
   - 테스트 결과
```

> 이 파일은 Claude Code가 프로젝트 컨텍스트로 계속 참고하는 “헌법” 역할.

---

### B. “프롬프트 생성 + 클립보드 + run 폴더”용 미니 CLI 넣기

## 1) 실제로 굴리는 방법 (MVP 루프)

### Step 1 — “기획” (ChatGPT)

```bash
python agency.py new "만들고 싶은 것 한 줄로 설명" --open
```

* 클립보드에 **기획 프롬프트**가 복사됨 → ChatGPT에 붙여넣고 결과를 전체 복사
* 그리고 터미널:

```bash
python agency.py ingest plan
```

### Step 2 — “구현” (Claude Code)

* ChatGPT plan을 **Claude Code에 붙여넣고 구현 시작**
* 구현하면서는 무조건 git으로 변경 추적 추천:

```bash
git init
git add -A
git commit -m "chore: init"
# 구현 후
git add -A
git commit -m "feat: implement v1"
```

### Step 3 — “리뷰” (ChatGPT)

1. 리뷰 재료로 **diff** 만들기:

```bash
python agency.py diff
```

2. 리뷰 프롬프트 생성(+원하면 브라우저 열기):

```bash
python agency.py prompt review --open
```

* ChatGPT에 붙여넣고 나온 JSON 결과 전체 복사
* 저장:

```bash
python agency.py ingest review_json
```

### Step 4 — “수정” (Claude Code)

* `review_json.txt` 내용을 Claude Code에 붙여넣고:

  * “CRITICAL/HIGH부터 수정”
  * “테스트/빌드 재실행”
  * 수정 후 다시 diff→review 반복(필요한 만큼)

### Step 5 — “리팩토링/문서” (Gemini)

* 프롬프트 생성:

```bash
python agency.py prompt refactor --open
```

* Gemini에 붙여넣고 나온 제안서 전체 복사
* 저장:

```bash
python agency.py ingest refactor
```

* 그리고 Claude Code에 “Gemini 작업지시 체크리스트”만 전달해서 적용시키면 끝.

---

## 2) 시작할 때 딱 하나만 더 하면 좋은 것

**리뷰는 ‘전체 코드’보다 `git diff` 중심**으로 가는 게 핵심이야.

* 컨텍스트가 작아지고,
* 복붙이 쉬워지고,
* 모델들이 “변경분 중심”으로 정확하게 잡아줘.

---

원하면, 네가 평소 만드는 프로젝트 타입(예: **Python 패키지 / 웹앱(Next) / FastAPI / Flutter** 등) 기준으로

* `CLAUDE.md`를 더 빡세게(테스트/린트/포맷/보안 체크리스트 포함)
* plan/review/refactor 프롬프트를 그 스택에 맞춰
  “템플릿 완성본”으로 한 번에 커스터마이징해줄게.

