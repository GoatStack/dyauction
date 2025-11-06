#!/bin/bash

# 색상 정의
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}📦 Publishing EAS Update...${NC}"
echo -e "${YELLOW}⚠️  Note: App version will NOT be changed (OTA update only)${NC}"

# 1. BUILD_NUMBER 증가
echo -e "${BLUE}📝 Bumping BUILD_NUMBER...${NC}"
node ./scripts/bump-update-version.js

if [ $? -ne 0 ]; then
  echo "❌ Failed to bump BUILD_NUMBER"
  exit 1
fi

# 2. 변경사항을 git에 커밋
if git diff --quiet src/constants/version.ts; then
  echo "No changes to src/constants/version.ts"
else
  echo -e "${BLUE}💾 Committing BUILD_NUMBER update...${NC}"
  git add src/constants/version.ts
  git commit -m "chore: bump BUILD_NUMBER for OTA update"
fi

# 3. EAS Update 배포
echo -e "${GREEN}🚀 Publishing update...${NC}"
eas update --auto

echo -e "${GREEN}✅ Update published successfully!${NC}"
