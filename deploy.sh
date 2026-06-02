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

# ── 백업 태그 ────────────────────────────────────────────
BACKUP_TAG="backup-$(date '+%Y%m%d-%H%M%S')"
git tag "$BACKUP_TAG"

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
