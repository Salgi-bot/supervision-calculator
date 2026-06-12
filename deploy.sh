#!/bin/bash
set -o pipefail  # push 실패를 tee가 가리지 않도록 (배포 성공 오보 방지)
# 주택건설공사 — GitHub Pages 배포 스크립트
REPO="/Users/salgi/주택건설공사"
FILE="index.html"
GH_URL="https://salgi-bot.github.io/supervision-calculator/"
LOG="/tmp/deploy_verify.log"
LOCKDIR="/tmp/deploy_verify_supervision-calculator.lock"

# ── 락 ────────────────────────────────────────────────────
attempts=0
while ! mkdir "$LOCKDIR" 2>/dev/null; do
  sleep 0.3; attempts=$((attempts + 1))
  if [ $attempts -gt 60 ]; then echo "lock 타임아웃"; exit 0; fi
done
trap 'rmdir "$LOCKDIR" 2>/dev/null' EXIT

cd "$REPO" || exit 1
git add "$FILE"

if git diff --cached --quiet; then
  echo "변경 없음 — 배포 건너뜀"
  exit 0
fi

# ── 골든 테스트 게이트 (실패 시 배포 중단) ──────────────
command -v node >/dev/null 2>&1 || { echo "node 없음 — PATH 확인 후 재실행"; exit 1; }
if ! node "$REPO/test_calc.mjs" > /tmp/test_calc_last.log 2>&1; then
  echo "골든 테스트 실패 — 배포 중단 (로그: /tmp/test_calc_last.log)"
  tail -5 /tmp/test_calc_last.log
  exit 1
fi
echo "골든 테스트 통과"

# ── 백업 태그 ────────────────────────────────────────────
BACKUP_TAG="backup-$(date '+%Y%m%d-%H%M%S')"
git tag "$BACKUP_TAG" || { echo "백업 태그 생성 실패 ($BACKUP_TAG 중복 가능) — 배포 중단"; exit 1; }

# ── 커밋 & 푸시 ──────────────────────────────────────────
TIMESTAMP=$(date '+%Y-%m-%d %H:%M')
VERSION=$(grep -o 'v[0-9]\.[0-9]*' "$FILE" 2>/dev/null | head -1)

if git commit -m "deploy: $TIMESTAMP ${VERSION:+($VERSION)}"; then
  if git push origin main 2>&1 | tee -a "$LOG"; then
    echo ""
    echo "배포 성공! ${VERSION:+$VERSION }라이브 반영 완료 (1~2분 소요)"
    echo "백업 태그: $BACKUP_TAG"
    echo "$GH_URL"
    echo "[$(date '+%H:%M:%S')] 성공 ($VERSION)" >> "$LOG"
    # 백업 태그 정리 — 최근 20개만 유지
    git tag -l 'backup-*' | LC_ALL=C sort -r | tail -n +21 | xargs git tag -d >/dev/null 2>&1 || true
  else
    echo "푸시 실패 — 롤백 중..."
    git reset HEAD~1
    git tag -d "$BACKUP_TAG"
    exit 1
  fi
else
  git tag -d "$BACKUP_TAG"
  exit 1
fi
