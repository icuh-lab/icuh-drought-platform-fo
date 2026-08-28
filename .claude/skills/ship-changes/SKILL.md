---
name: ship-changes
description: Use when a unit of work is finished in this repository and the changes need to reach GitHub — committing, pushing, or opening a pull request. Also use when starting new work that needs a branch, when the user says 작업 끝났어 / 커밋해줘 / PR 올려줘, or when a commit message, branch name, or PR body must follow this project's conventions.
---

# Ship Changes

## Overview

이 저장소의 변경사항을 **브랜치 → 커밋 → 푸시 → PR**까지 한 흐름으로 내보내는 절차다.

핵심 원칙: **작업 단위가 끝나면 요청을 기다리지 말고 커밋한다.** 커밋 여부를 매번 되묻지 않는다.

## When to Use

- 하나의 논리적 작업(기능/수정/문서/설정)이 끝나고 검증까지 마쳤을 때
- 새 작업을 시작하는데 아직 기능 브랜치가 없을 때
- PR을 열어야 할 때

**When NOT to use:** 작업이 아직 진행 중일 때. 검증(lint/build/test)이 실패한 상태일 때는 커밋하지 말고 먼저 고친다.

## Quick Reference

| 항목 | 규칙 |
| --- | --- |
| 브랜치 전략 | 기능 브랜치 + PR. `develop`에 직접 커밋 금지 |
| 브랜치 이름 | `<type>/<영문-케밥-요약>` 예: `feat/article-search-filter` |
| 커밋 형식 | Conventional Commits, **본문 포함 전체 한국어** |
| 커밋 제목 | `<type>: <요약>` **50자 이내** (타입 접두사 포함) |
| PR base | **`develop`** — 저장소 기본 브랜치이자 배포 브랜치 |
| PR 라벨 | **`enhancement`** |
| 푸시 | 커밋 후 바로 푸시 |

### 커밋 타입

`feat` 기능 · `fix` 버그 · `docs` 문서 · `style` 포맷 · `refactor` 리팩터링 · `test` 테스트 · `chore` 빌드/설정

## Workflow

### 1. 브랜치 확인

```bash
git branch --show-current
```

`develop`이면 **먼저 기능 브랜치를 만든다.**

```bash
git checkout -b feat/article-search-filter develop
```

### 2. 변경사항 확인 후 커밋

작업 단위가 여러 개면 **논리 단위로 나눠 커밋한다.** 한 커밋에 섞지 않는다.

```bash
git status --short
git diff --stat
git add <관련 파일들>          # git add -A 는 무관한 변경까지 딸려온다
```

커밋 메시지는 heredoc으로 작성한다 (`-m` 반복은 본문 줄바꿈이 깨진다).

```bash
git commit -F - <<'EOF'
feat: 자료실 검색 필터에 지역 조건 추가

기존 문서유형/주제영역 필터만으로는 지역별 조회가 불가능했다.
regionMentions 를 기준으로 필터링하는 조건을 추가한다.

URL 쿼리스트링(?region=)에 상태를 보관해 링크 공유와
뒤로가기가 기존 필터와 동일하게 동작하도록 맞췄다.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
```

**제목 50자 검증** — 세지 말고 확인한다:

```bash
git log -1 --pretty=%s | tr -d '\n' | wc -m
```

50을 넘으면 `git commit --amend`로 줄인다.

> **`awk '{print length}'` 를 쓰지 말 것.** 로케일에 따라 문자가 아니라 바이트를 센다.
> 한글은 UTF-8 에서 3바이트라 28자 제목이 63으로 나와, 멀쩡한 제목을 넘쳤다고 오판한다.
> `wc -m` 은 문자 단위로 세므로 한글 제목에서도 정확하다.

### 3. 푸시

```bash
git push -u origin $(git branch --show-current)
```

### 4. PR 생성

```bash
gh pr create --base develop --label enhancement \
  --title "feat: 자료실 검색 필터에 지역 조건 추가" \
  --body-file - <<'EOF'
## 변경사항 요약

- 자료실 목록에 지역 필터를 추가했다
- 필터 상태를 URL 쿼리스트링(`?region=`)에 보관한다

## 상세

| 파일 | 변경 |
| --- | --- |
| `app/archive/page.tsx` | region 파라미터 파싱 및 push 연동 |
| `components/archive/SearchFilters.tsx` | 지역 선택 UI 추가 |

## 검증

- `npm run lint` 통과
- `npm run build` 통과

## 참고

백엔드 미연동 상태에서도 fallback 경로로 동작하는 것을 확인했다.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
```

PR 본문에는 **변경사항 요약을 반드시 포함한다.** 무엇을·왜 바꿨는지가 제목만으로 전달되지 않는다.

#### 웹 UI로 PR을 만드는 경우

기본 브랜치가 `develop`이라 base 드롭다운도 `develop`으로 초기화된다. 라벨만 우측
Labels에서 수동 선택하면 된다.

상단이 `base: develop ← compare: <기능 브랜치>` 로 표시되는지 확인한다.

### 5. 머지 후 검증

머지되었다고 끝이 아니다. **어느 브랜치가 실제로 움직였는지 확인한다.**

```bash
git fetch --prune origin
git ls-remote --heads origin
```

`develop`이 새 커밋을 가리켜야 한다.

**머지와 동시에 배포가 시작된다.** 실행을 확인한다.

```bash
gh run list --limit 1
gh run watch <run-id> --exit-status
```

로컬 정리:

```bash
git checkout develop && git pull && git branch -d <기능 브랜치>
```

## Common Mistakes

| 실수 | 결과 | 대응 |
| --- | --- | --- |
| 검증 없이 develop 머지 | 깨진 코드가 **바로 운영에 나간다** | 머지 전 lint·build·테스트 |
| 빈 디렉터리를 커밋했다고 착각 | git은 빈 폴더를 저장하지 않아 CI에서만 깨진다 | `.gitkeep` 추가 |
| 머지 후 확인 생략 | 잘못된 base를 놓친다 | `git ls-remote --heads origin` |
| `develop`에서 바로 커밋 | PR을 열 수 없다 | 커밋 전 `git branch --show-current` 확인 |
| `git add -A` 습관적 사용 | 무관한 변경이 섞인다 | 관련 파일만 지정 |
| 커밋 메시지 영어 작성 | 규칙 위반 | 제목·본문 모두 한국어 |
| 제목이 50자 초과 | 목록에서 잘린다 | `wc -m` 으로 확인 후 amend |
| 검증 없이 커밋 | 깨진 코드가 올라간다 | `npm run lint` 먼저 |

## 이 저장소 정보

- 원격: `git@github.com:icuh-lab/icuh-drought-platform-fo.git`
- 기본 브랜치: `develop` — 통합이자 배포. 머지 즉시 운영에 나간다 (`main` 없음)
- 검증 명령: `npm run lint`, `npm run build`
- 테스트: `npx tsx scripts/*.test.mts` (Node v20이라 `--experimental-strip-types` 불가)

## 전제 조건

`gh` CLI 인증이 필요하다. 안 돼 있으면:

```bash
gh auth status || gh auth login
```

`enhancement` 라벨이 없다면 (`gh label list`로 확인):

```bash
gh label create enhancement --color a2eeef --description "새 기능 또는 개선"
```

## 푸시 범위

커밋과 푸시는 요청 없이 진행한다. 다만 **다음은 반드시 사용자에게 확인받는다.**

- `git push --force` / `--force-with-lease`
- PR 머지, 브랜치 삭제
- `develop`으로의 직접 푸시 (배포가 걸린다)
