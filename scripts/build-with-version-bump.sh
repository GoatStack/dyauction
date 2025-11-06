#!/bin/bash

# 색상 정의
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting EAS build process...${NC}"

# 플래그 확인
SKIP_BUMP=false
for arg in "$@"; do
  if [ "$arg" == "--skip-bump" ] || [ "$arg" == "--no-bump" ]; then
    SKIP_BUMP=true
    break
  fi
done

# 1. App version 업데이트 (patch 증가 + BUILD_NUMBER 리셋)
if [ "$SKIP_BUMP" == "false" ]; then
  echo -e "${BLUE}📝 Updating app version...${NC}"
  node ./scripts/bump-app-version.js

  if [ $? -ne 0 ]; then
    echo "❌ Failed to update app version"
    exit 1
  fi

  # 2. 변경사항을 git에 커밋
  if git diff --quiet app.json src/constants/version.ts; then
    echo "No changes to version files"
  else
    echo -e "${BLUE}💾 Committing version update...${NC}"
    git add app.json src/constants/version.ts
    git commit -m "chore: bump app version for store build"
  fi
else
  echo -e "${BLUE}⏭️  Skipping version bump${NC}"
fi

# 3. EAS 빌드 실행
echo -e "${GREEN}🔨 Starting EAS build...${NC}"
eas build --platform all --profile production --non-interactive

echo -e "${GREEN}✅ Build process completed!${NC}"
