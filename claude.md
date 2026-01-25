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
