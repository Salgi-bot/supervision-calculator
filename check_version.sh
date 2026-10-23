#!/bin/bash
# 앱 버전 번호 검사 — index.html 이 배포본(origin/main)과 다른데 번호를 안 올렸으면 실패
# 사용: ./check_version.sh [커밋]   커밋을 주면 그 커밋의 index.html, 없으면 작업 파일을 검사
# 호출처: deploy.sh(커밋 전) · .git/hooks/pre-push(브랜치 push 전 — PR 경로도 여기서 걸린다)
# 규칙: 기능·서식 추가 = 가운데 자리(2.2→2.3), 오류 수정만 = 끝자리(2.2→2.2.1). <title> 과 배지 번호는 같아야 한다.
cd "$(dirname "$0")" || exit 1

badge_ver() { grep -o 'class="badge">v[0-9][0-9.]*' | head -1 | sed 's/.*>v//'; }
title_ver() { grep -o '<title>주택건설공사 v[0-9][0-9.]*' | head -1 | sed 's/.*v//'; }

if [ -n "$1" ]; then
  NEW=$(git show "$1:index.html" 2>/dev/null) || { echo "버전 검사: $1 에 index.html 없음 — 건너뜀"; exit 0; }
else
  NEW=$(cat index.html)
fi

git fetch -q origin main 2>/dev/null || echo "버전 검사: origin fetch 실패 — 마지막으로 받은 origin/main 기준"
BASE=$(git show origin/main:index.html 2>/dev/null) || { echo "버전 검사: origin/main 없음 — 건너뜀"; exit 0; }

[ "$NEW" = "$BASE" ] && exit 0   # index.html 변경 없음

NV=$(printf '%s' "$NEW" | badge_ver)
TV=$(printf '%s' "$NEW" | title_ver)
BV=$(printf '%s' "$BASE" | badge_ver)

if [ -z "$NV" ]; then
  echo "버전 검사 실패: 화면 배지(class=\"badge\">v…)에서 번호를 못 찾음"; exit 1
fi
if [ "$NV" != "$TV" ]; then
  echo "버전 검사 실패: 배지 v$NV ↔ <title> v$TV 불일치 — 둘을 같은 번호로"; exit 1
fi
if [ "$NV" = "$BV" ] || [ "$(printf '%s\n%s\n' "$BV" "$NV" | sort -V | tail -1)" != "$NV" ]; then
  echo "버전 검사 실패: index.html 이 배포본과 다른데 번호가 v$NV (배포본 v$BV) — 올려야 함"
  echo "  기능·서식 추가 = 가운데 자리 / 오류 수정만 = 끝자리 (배지 + <title> 두 곳)"
  exit 1
fi
echo "버전 검사 통과: v$BV → v$NV"
