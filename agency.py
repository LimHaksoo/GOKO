import argparse
import datetime as dt
import json
import os
import re
import subprocess
import sys
import textwrap
import webbrowser
from pathlib import Path

try:
    import pyperclip  # pip install pyperclip
except Exception:
    pyperclip = None

AGENCY_DIR = Path(".agency")
CURRENT_FILE = AGENCY_DIR / "current.json"

EXCLUDE_DIRS = {".git", ".agency", "node_modules", ".venv", "venv", "__pycache__", "dist", "build", ".next"}

def slugify(s: str) -> str:
    s = s.strip().lower()
    s = re.sub(r"[^a-z0-9가-힣]+", "-", s)
    s = re.sub(r"-+", "-", s).strip("-")
    return s[:60] if s else "task"

def now_stamp() -> str:
    return dt.datetime.now().strftime("%Y%m%d-%H%M%S")

def ensure_agency():
    AGENCY_DIR.mkdir(exist_ok=True)
    (AGENCY_DIR / "runs").mkdir(exist_ok=True)

def save_current(run_dir: Path):
    ensure_agency()
    CURRENT_FILE.write_text(json.dumps({"run_dir": str(run_dir)}, ensure_ascii=False, indent=2), encoding="utf-8")

def load_current() -> Path:
    if not CURRENT_FILE.exists():
        raise SystemExit("No active run. Start with: python agency.py new \"<task>\"")
    data = json.loads(CURRENT_FILE.read_text(encoding="utf-8"))
    return Path(data["run_dir"])

def copy_clipboard(text: str):
    if pyperclip is None:
        print("\n[!] pyperclip not installed. Printing prompt instead:\n")
        print(text)
        return
    pyperclip.copy(text)
    print("✅ Copied to clipboard.")

def read_clipboard_or_stdin() -> str:
    if not sys.stdin.isatty():
        return sys.stdin.read()
    if pyperclip is None:
        raise SystemExit("pyperclip not installed and no stdin provided.")
    return pyperclip.paste()

def git(*args) -> str:
    try:
        out = subprocess.check_output(["git", *args], stderr=subprocess.STDOUT)
        return out.decode("utf-8", errors="replace")
    except subprocess.CalledProcessError as e:
        raise SystemExit(e.output.decode("utf-8", errors="replace"))

def repo_tree(max_files=400) -> str:
    lines = []
    count = 0
    for root, dirs, files in os.walk("."):
        root_path = Path(root)
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        rel_root = root_path.relative_to(".")
        if str(rel_root) == ".":
            rel_root = Path("")
        for f in sorted(files):
            if f.endswith((".png", ".jpg", ".jpeg", ".gif", ".zip", ".pdf")):
                continue
            p = (root_path / f)
            rel = p.relative_to(".")
            lines.append(str(rel))
            count += 1
            if count >= max_files:
                lines.append(f"... (truncated, >={max_files} files)")
                return "\n".join(lines)
    return "\n".join(lines)

def make_plan_prompt(task: str) -> str:
    return textwrap.dedent(f"""
    당신은 시니어 PM + 테크리드입니다.
    목표: 아래 작업을 실제 개발 가능한 수준으로 “계획서”로 만드세요.
    **질문하지 말고**, 합리적인 가정은 명시하고 진행하세요.

    ## 작업
    {task}

    ## 출력 형식(반드시 지킬 것)
    1) Problem / Scope / Non-goals
    2) Assumptions (명시)
    3) Architecture (간단히)
    4) File Plan (테이블: file path | purpose | key functions)
    5) Step-by-step TODO (체크리스트)
    6) Tests (최소 smoke + 핵심 유닛)
    7) Risks & Edge cases
    8) Acceptance criteria (완료 조건)

    *가능하면: 작은 PR/커밋 단위로 쪼개진 계획으로 작성*
    """).strip()

def make_review_prompt(plan: str, diff_text: str) -> str:
    return textwrap.dedent(f"""
    당신은 매우 깐깐한 시니어 엔지니어/보안리뷰어입니다.
    아래 PLAN과 GIT DIFF를 기반으로 문제를 찾아주세요.
    **코드를 직접 고치지 말고**, 이슈 목록만 내세요.

    ## PLAN
    {plan}

    ## GIT DIFF
    {diff_text}

    ## 출력(JSON만)
    {{
      "summary": "전체 요약 3~5줄",
      "issues": [
        {{
          "severity": "CRITICAL|HIGH|MEDIUM|LOW",
          "area": "security|bug|perf|design|test|style|dx",
          "file": "path or null",
          "problem": "무엇이 문제인지",
          "why": "왜 중요한지",
          "fix": "어떻게 고치면 되는지(지시 수준)"
        }}
      ],
      "quick_wins": ["바로 개선 가능한 것들"],
      "missing_tests": ["추가하면 좋은 테스트들"]
    }}
    """).strip()

def make_gemini_refactor_prompt(tree: str, plan: str) -> str:
    return textwrap.dedent(f"""
    당신은 리팩토링/문서화 담당입니다.
    아래 Repo Tree와 Plan을 보고, 코드베이스를 더 유지보수 가능하게 만들 “리팩토링 제안서”를 작성하세요.
    (코드를 직접 실행할 수 없다고 가정)

    ## Repo Tree
    {tree}

    ## Plan
    {plan}

    ## 출력 형식(마크다운)
    - 리팩토링 목표 3개
    - 모듈/레이어링 제안(파일/폴더 재구성 포함)
    - 네이밍/스타일 통일 규칙
    - 위험한 부분(버그/보안/성능) 추정
    - Claude에게 적용시키기 위한 “구체적 작업 지시 리스트”(체크리스트)
    """).strip()

def cmd_new(args):
    ensure_agency()
    # task source priority: --file > positional task > stdin/clipboard
    if args.file:
        task = Path(args.file).read_text(encoding="utf-8")
    elif args.task is not None:
        task = args.task
    else:
        task = read_clipboard_or_stdin()

    slug = slugify(task)
    run_dir = AGENCY_DIR / "runs" / f"{now_stamp()}-{slug}"
    run_dir.mkdir(parents=True, exist_ok=True)
    (run_dir / "inputs").mkdir(exist_ok=True)
    (run_dir / "outputs").mkdir(exist_ok=True)

    (run_dir / "task.txt").write_text(task, encoding="utf-8")
    save_current(run_dir)

    prompt = make_plan_prompt(task)
    (run_dir / "inputs" / "01_plan_chatgpt.txt").write_text(prompt, encoding="utf-8")
    copy_clipboard(prompt)

    if args.open:
        webbrowser.open("https://chatgpt.com")
        print("🌐 Opened ChatGPT in browser.")
    print(f"📁 Active run: {run_dir}")

def cmd_ingest(args):
    run_dir = load_current()
    text = read_clipboard_or_stdin()
    out = run_dir / "outputs" / f"{args.stage}.txt"
    out.write_text(text, encoding="utf-8")
    print(f"✅ Saved: {out}")

def cmd_diff(args):
    run_dir = load_current()

    # 1. staged + unstaged diff
    diff_text = git("diff", "HEAD")

    # 2. untracked 파일 목록 수집 (보안 리뷰에서 누락 방지)
    try:
        status_out = subprocess.check_output(
            ["git", "status", "--porcelain", "-uall"],
            stderr=subprocess.STDOUT
        ).decode("utf-8", errors="replace")

        untracked = []
        for line in status_out.splitlines():
            if line.startswith("??"):
                untracked.append(line[3:])

        if untracked:
            diff_text += "\n\n## UNTRACKED FILES (not in diff above)\n"
            for f in untracked:
                diff_text += f"  - {f}\n"
            diff_text += "\n(These files are new and not yet tracked by git)\n"
    except subprocess.CalledProcessError:
        pass  # git status 실패 시 무시

    # 3. diff가 비어있으면 최근 커밋 패치 표시 (포맷 최소화)
    if not diff_text.strip():
        try:
            diff_text = subprocess.check_output(
                ["git", "show", "--no-color", "--patch", "--format="],
                stderr=subprocess.STDOUT
            ).decode("utf-8", errors="replace")
            if diff_text.strip():
                diff_text = "## LAST COMMIT PATCH (no working changes)\n" + diff_text
        except subprocess.CalledProcessError:
            diff_text = "(no changes detected)"

    (run_dir / "outputs" / "git_diff.txt").write_text(diff_text, encoding="utf-8")
    copy_clipboard(diff_text)

def cmd_prompt(args):
    run_dir = load_current()
    plan_file = run_dir / "outputs" / "plan.txt"
    if not plan_file.exists():
        raise SystemExit("Need plan first. Paste ChatGPT plan then: python agency.py ingest plan")

    plan = plan_file.read_text(encoding="utf-8")

    if args.stage == "review":
        diff_file = run_dir / "outputs" / "git_diff.txt"
        if not diff_file.exists():
            raise SystemExit("Need git diff first: python agency.py diff")
        diff_text = diff_file.read_text(encoding="utf-8")
        prompt = make_review_prompt(plan, diff_text)
        copy_clipboard(prompt)
        if args.open:
            webbrowser.open("https://chatgpt.com")
    elif args.stage == "refactor":
        tree = repo_tree()
        prompt = make_gemini_refactor_prompt(tree, plan)
        copy_clipboard(prompt)
        if args.open:
            webbrowser.open("https://gemini.google.com")
    else:
        raise SystemExit("stage must be one of: review, refactor")

    (run_dir / "inputs" / f"prompt_{args.stage}.txt").write_text(prompt, encoding="utf-8")
    print(f"✅ Prompt generated for: {args.stage}")

def cmd_status(_args):
    run_dir = load_current()
    done = sorted([p.name for p in (run_dir / "outputs").glob("*.txt")])
    print(f"📁 Active run: {run_dir}")
    print("🧾 Outputs:")
    for f in done:
        print(" -", f)

def main():
    p = argparse.ArgumentParser()
    sub = p.add_subparsers(dest="cmd", required=True)

    p_new = sub.add_parser("new")
    p_new.add_argument("task", nargs="?", default=None, help="task text (optional if --file or stdin)")
    p_new.add_argument("--file", type=str, help="read task text from file (e.g., prompt.txt)")
    p_new.add_argument("--open", action="store_true", help="open ChatGPT")
    p_new.set_defaults(func=cmd_new)

    p_ing = sub.add_parser("ingest")
    p_ing.add_argument("stage", choices=["plan", "review_json", "refactor"])
    p_ing.set_defaults(func=cmd_ingest)

    p_diff = sub.add_parser("diff")
    p_diff.set_defaults(func=cmd_diff)

    p_pr = sub.add_parser("prompt")
    p_pr.add_argument("stage", choices=["review", "refactor"])
    p_pr.add_argument("--open", action="store_true", help="open browser")
    p_pr.set_defaults(func=cmd_prompt)

    p_st = sub.add_parser("status")
    p_st.set_defaults(func=cmd_status)

    args = p.parse_args()
    args.func(args)

if __name__ == "__main__":
    main()
