import argparse
import datetime as dt
import json
import os
import re
import shutil
import subprocess
import sys
import textwrap
import webbrowser
from pathlib import Path
from urllib.parse import urlparse

try:
    import pyperclip  # pip install pyperclip
except Exception:
    pyperclip = None

AGENCY_DIR = Path(".agency")
CURRENT_FILE = AGENCY_DIR / "current.json"
EXCLUDE_DIRS = {".git", ".agency", "node_modules", ".venv", "venv", "__pycache__", "dist", "build", ".next"}


# -------------------------
# small utils
# -------------------------
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
    CURRENT_FILE.write_text(
        json.dumps({"run_dir": str(run_dir)}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def load_current() -> Path:
    if not CURRENT_FILE.exists():
        raise SystemExit("No active run. Start with: python agency.py new \"<task>\"")
    data = json.loads(CURRENT_FILE.read_text(encoding="utf-8"))
    return Path(data["run_dir"])


def run_meta_path(run_dir: Path) -> Path:
    return run_dir / "meta.json"


def load_run_meta(run_dir: Path) -> dict:
    p = run_meta_path(run_dir)
    if p.exists():
        try:
            return json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            return {}
    return {}


def save_run_meta(run_dir: Path, meta: dict):
    p = run_meta_path(run_dir)
    p.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")


def have_cmd(name: str) -> bool:
    return shutil.which(name) is not None


def run_cmd(cmd, cwd=None) -> str:
    try:
        out = subprocess.check_output(cmd, stderr=subprocess.STDOUT, cwd=cwd)
        return out.decode("utf-8", errors="replace")
    except FileNotFoundError:
        raise SystemExit(f"Command not found: {cmd[0]}")
    except subprocess.CalledProcessError as e:
        raise SystemExit(e.output.decode("utf-8", errors="replace"))


def copy_clipboard(text: str):
    if pyperclip is None:
        print("\n[!] pyperclip not installed. Printing instead:\n")
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


def ensure_git_repo():
    try:
        inside = git("rev-parse", "--is-inside-work-tree").strip()
    except SystemExit as e:
        raise SystemExit(f"Not a git repository.\n{e}")
    if inside != "true":
        raise SystemExit("Not inside a git working tree.")


def git(*args) -> str:
    return run_cmd(["git", *args])


def git_current_branch() -> str:
    return git("rev-parse", "--abbrev-ref", "HEAD").strip()


def git_branch_exists(branch: str) -> bool:
    r = subprocess.run(
        ["git", "show-ref", "--verify", "--quiet", f"refs/heads/{branch}"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    return r.returncode == 0


def git_has_changes() -> bool:
    # includes untracked
    return git("status", "--porcelain").strip() != ""


def filter_git_warnings(text: str) -> str:
    lines = []
    for line in text.splitlines():
        if line.lower().startswith("warning:"):
            continue
        lines.append(line)
    return "\n".join(lines).strip() + ("\n" if lines else "")


def get_remote_url(remote: str = "origin") -> str:
    return git("remote", "get-url", remote).strip()


def parse_github_repo(remote_url: str) -> str | None:
    # https://github.com/owner/repo(.git)
    # git@github.com:owner/repo(.git)
    if remote_url.startswith("git@"):
        m = re.match(r"git@github\.com:([^/]+)/(.+?)(?:\.git)?$", remote_url)
        if not m:
            return None
        owner, repo = m.group(1), m.group(2)
        return f"{owner}/{repo}"
    try:
        u = urlparse(remote_url)
        if "github.com" not in (u.netloc or ""):
            return None
        path = (u.path or "").lstrip("/")
        if path.endswith(".git"):
            path = path[:-4]
        if path.count("/") < 1:
            return None
        return path
    except Exception:
        return None


def make_compare_url(repo: str, base: str, head: str) -> str:
    # GitHub PR create page via compare
    return f"https://github.com/{repo}/compare/{base}...{head}?expand=1"


def repo_tree(max_files=400) -> str:
    lines = []
    count = 0
    for root, dirs, files in os.walk("."):
        root_path = Path(root)
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
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


# -------------------------
# prompts (ChatGPT/Gemini)
# -------------------------
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


# -------------------------
# commands
# -------------------------
def cmd_new(args):
    ensure_agency()
    run_slug = None

    # task source priority: --file > positional task > stdin/clipboard
    if args.file:
        task = Path(args.file).read_text(encoding="utf-8")
    elif args.task is not None:
        task = args.task
    else:
        task = read_clipboard_or_stdin()

    run_slug = slugify(task)
    run_dir = AGENCY_DIR / "runs" / f"{now_stamp()}-{run_slug}"
    run_dir.mkdir(parents=True, exist_ok=True)
    (run_dir / "inputs").mkdir(exist_ok=True)
    (run_dir / "outputs").mkdir(exist_ok=True)

    (run_dir / "task.txt").write_text(task, encoding="utf-8")
    save_current(run_dir)

    # meta init
    meta = load_run_meta(run_dir)
    meta.setdefault("task_slug", run_slug)
    meta.setdefault("created_at", dt.datetime.now().isoformat(timespec="seconds"))
    save_run_meta(run_dir, meta)

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


def cmd_diff(_args):
    run_dir = load_current()
    ensure_git_repo()

    # Prefer working tree diff; fallback to staged; fallback to last commit patch
    diff_text = filter_git_warnings(git("diff", "--no-color"))
    if diff_text.strip() == "":
        diff_text = filter_git_warnings(git("diff", "--staged", "--no-color"))
    if diff_text.strip() == "":
        # last resort: show HEAD if exists
        try:
            git("rev-parse", "--verify", "HEAD")
            diff_text = filter_git_warnings(git("show", "--no-color", "HEAD"))
        except SystemExit:
            diff_text = ""

    (run_dir / "outputs" / "git_diff.txt").write_text(diff_text, encoding="utf-8")
    if diff_text.strip():
        copy_clipboard(diff_text)
        print("✅ Wrote .agency outputs/git_diff.txt")
    else:
        print("⚠️ No diff found (working tree clean and no commits). Nothing to review from git diff.")


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
    meta = load_run_meta(run_dir)
    done = sorted([p.name for p in (run_dir / "outputs").glob("*.txt")])

    print(f"📁 Active run: {run_dir}")
    if meta:
        if meta.get("pr_url"):
            print(f"🔗 PR: {meta['pr_url']}")
        if meta.get("head_branch"):
            print(f"🌿 head_branch: {meta['head_branch']}")
        if meta.get("base_branch"):
            print(f"🌱 base_branch: {meta['base_branch']}")
    print("🧾 Outputs:")
    for f in done:
        print(" -", f)


def cmd_pr(args):
    """
    Create/update a PR for current run:
    - ensure git repo
    - create/check out head branch
    - commit changes (optional)
    - push
    - create PR (gh if available, else open compare URL)
    """
    run_dir = load_current()
    ensure_git_repo()

    meta = load_run_meta(run_dir)
    task = (run_dir / "task.txt").read_text(encoding="utf-8") if (run_dir / "task.txt").exists() else ""

    base = args.base or meta.get("base_branch") or git_current_branch()
    head_default = f"agency/{Path(run_dir).name}"
    head = args.head or meta.get("head_branch") or head_default
    remote = args.remote or meta.get("remote") or "origin"

    # checkout/create head branch
    cur = git_current_branch()
    if cur != head:
        if git_branch_exists(head):
            git("checkout", head)
        else:
            git("checkout", "-b", head)

    # commit (optional)
    if git_has_changes():
        git("add", "-A")
        msg = args.commit_message or f"wip: {slugify(task) or Path(run_dir).name}"
        try:
            git("commit", "-m", msg)
        except SystemExit as e:
            # ignore "nothing to commit"
            if "nothing to commit" not in str(e).lower():
                raise

    # push
    try:
        remote_url = get_remote_url(remote)
    except SystemExit:
        raise SystemExit(
            f"No git remote '{remote}'. Add one first:\n"
            f"  git remote add {remote} <your-github-repo-url>\n"
            f"  git push -u {remote} {head}"
        )

    git("push", "-u", remote, head)

    repo = parse_github_repo(remote_url)
    pr_url = None

    # try to create PR via gh
    if have_cmd("gh"):
        try:
            title = args.title or f"{Path(run_dir).name}: {task.splitlines()[0][:80] if task else head}"
            body = args.body or (f"Task:\n{task}\n\n(Generated by agency.py run: {Path(run_dir).name})").strip()
            out = run_cmd(["gh", "pr", "create", "--base", base, "--head", head, "--title", title, "--body", body])
            m = re.search(r"https?://\S+", out)
            if m:
                pr_url = m.group(0)
        except SystemExit as e:
            # fall back to compare URL
            pr_url = None

    # fallback: open compare URL for manual PR creation
    if pr_url is None and repo is not None:
        pr_url = make_compare_url(repo, base, head)

    meta["base_branch"] = base
    meta["head_branch"] = head
    meta["remote"] = remote
    if repo:
        meta["repo"] = repo
    if pr_url:
        meta["pr_url"] = pr_url
    save_run_meta(run_dir, meta)

    if pr_url:
        copy_clipboard(pr_url)
        print("✅ PR URL copied.")
        if args.open:
            webbrowser.open(pr_url)
            print("🌐 Opened PR page.")
    else:
        print("⚠️ Could not determine PR URL. If you're not on GitHub, Codex PR review won't work.")


def cmd_link_pr(args):
    run_dir = load_current()
    meta = load_run_meta(run_dir)
    meta["pr_url"] = args.url.strip()
    save_run_meta(run_dir, meta)
    print("✅ Saved PR URL to run meta.")


def cmd_codex_request(args):
    """
    Post @codex review comment to PR. Uses gh if available; otherwise copies the comment
    and opens PR page for manual posting.
    """
    run_dir = load_current()
    meta = load_run_meta(run_dir)
    pr_url = args.pr_url or meta.get("pr_url")

    if not pr_url:
        raise SystemExit("No PR URL set. Run: python agency.py pr --open  OR  python agency.py link-pr <PR_URL>")

    comment = "@codex review"
    if args.extra:
        comment += " " + args.extra.strip()

    # save request text
    (run_dir / "inputs" / "codex_request.txt").write_text(comment, encoding="utf-8")

    if have_cmd("gh"):
        run_cmd(["gh", "pr", "comment", pr_url, "--body", comment])
        print("✅ Posted Codex review request via gh.")
    else:
        copy_clipboard(comment)
        print("⚠️ gh not found. Copied the comment text. Paste it into the PR conversation.")
        if args.open:
            webbrowser.open(pr_url)

    if args.open:
        webbrowser.open(pr_url)


def cmd_codex_fetch(_args):
    """
    Fetch Codex review from PR and save to outputs/codex_review.txt.
    Requires gh CLI. If not available, user can copy the review manually and run:
      python agency.py ingest codex_review
    """
    run_dir = load_current()
    meta = load_run_meta(run_dir)
    pr_url = meta.get("pr_url")
    if not pr_url:
        raise SystemExit("No PR URL set. Run: python agency.py pr --open  OR  python agency.py link-pr <PR_URL>")

    if not have_cmd("gh"):
        raise SystemExit(
            "gh CLI not found.\n"
            "Option A) Install GitHub CLI and login (recommended), then re-run codex-fetch.\n"
            "Option B) Copy Codex review text from GitHub and run: python agency.py ingest codex_review"
        )

    raw = run_cmd(["gh", "pr", "view", pr_url, "--json", "url,title,comments,reviews"])
    data = json.loads(raw)

    def is_codex(author_obj: dict | None) -> bool:
        if not author_obj:
            return False
        login = (author_obj.get("login") or "").lower()
        return "codex" in login

    entries = []

    for c in data.get("comments", []) or []:
        author = c.get("author") or {}
        if is_codex(author) or ("@codex" in (c.get("body") or "")):
            entries.append({
                "kind": "comment",
                "ts": c.get("createdAt") or "",
                "author": author.get("login") or "",
                "body": c.get("body") or "",
            })

    for r in data.get("reviews", []) or []:
        author = r.get("author") or {}
        if is_codex(author):
            entries.append({
                "kind": "review",
                "ts": r.get("submittedAt") or "",
                "author": author.get("login") or "",
                "state": r.get("state") or "",
                "body": r.get("body") or "",
            })

    entries.sort(key=lambda x: x.get("ts", ""))

    out_path = run_dir / "outputs" / "codex_review.txt"

    if not entries:
        # save raw for debugging
        (run_dir / "outputs" / "codex_raw.json").write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        raise SystemExit("No Codex review found yet. Wait a bit after @codex review, then run codex-fetch again.")

    lines = []
    lines.append(f"PR: {data.get('url','')}")
    lines.append(f"Title: {data.get('title','')}")
    lines.append("")
    for e in entries:
        lines.append(f"--- {e['kind'].upper()} | {e.get('author','')} | {e.get('ts','')} {('('+e.get('state','')+')') if e.get('state') else ''}".strip())
        lines.append(e.get("body", "").rstrip())
        lines.append("")

    text = "\n".join(lines).strip() + "\n"
    out_path.write_text(text, encoding="utf-8")
    copy_clipboard(text)
    print(f"✅ Saved: {out_path} (and copied to clipboard)")


def main():
    p = argparse.ArgumentParser()
    sub = p.add_subparsers(dest="cmd", required=True)

    p_new = sub.add_parser("new")
    p_new.add_argument("task", nargs="?", default=None, help="task text (optional if --file or stdin)")
    p_new.add_argument("--file", type=str, help="read task text from file (e.g., prompt.txt)")
    p_new.add_argument("--open", action="store_true", help="open ChatGPT")
    p_new.set_defaults(func=cmd_new)

    p_ing = sub.add_parser("ingest")
    p_ing.add_argument("stage", choices=["plan", "review_json", "refactor", "codex_review"])
    p_ing.set_defaults(func=cmd_ingest)

    p_diff = sub.add_parser("diff")
    p_diff.set_defaults(func=cmd_diff)

    p_prm = sub.add_parser("prompt")
    p_prm.add_argument("stage", choices=["review", "refactor"])
    p_prm.add_argument("--open", action="store_true", help="open browser")
    p_prm.set_defaults(func=cmd_prompt)

    p_st = sub.add_parser("status")
    p_st.set_defaults(func=cmd_status)

    # PR publish / create
    p_pr = sub.add_parser("pr")
    p_pr.add_argument("--base", default=None, help="base branch (default: current)")
    p_pr.add_argument("--head", default=None, help="head branch (default: agency/<run_id>)")
    p_pr.add_argument("--remote", default="origin", help="git remote name (default: origin)")
    p_pr.add_argument("--commit-message", default=None, help="commit message (if changes exist)")
    p_pr.add_argument("--title", default=None, help="PR title (gh only)")
    p_pr.add_argument("--body", default=None, help="PR body (gh only)")
    p_pr.add_argument("--open", action="store_true", help="open PR page")
    p_pr.set_defaults(func=cmd_pr)

    # link PR url manually
    p_link = sub.add_parser("link-pr")
    p_link.add_argument("url", type=str, help="PR URL to save in current run")
    p_link.set_defaults(func=cmd_link_pr)

    # Codex request/fetch
    p_cr = sub.add_parser("codex-request")
    p_cr.add_argument("--extra", default="", help="extra focus, e.g. 'for security regressions'")
    p_cr.add_argument("--pr-url", default=None, help="override PR URL (optional)")
    p_cr.add_argument("--open", action="store_true", help="open PR page")
    p_cr.set_defaults(func=cmd_codex_request)

    p_cf = sub.add_parser("codex-fetch")
    p_cf.set_defaults(func=cmd_codex_fetch)

    args = p.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
