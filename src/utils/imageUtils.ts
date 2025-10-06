/**
 * 프론트엔드 이미지 URL 처리 유틸리티 함수들
 */

// 서버 URL 설정 (환경에 따라 변경 가능)
const getServerUrl = (): string => {
  // 환경변수나 설정에서 서버 URL 가져오기
  // 실제 환경에서는 API 설정에서 가져올 수 있음
  return 'https://40.82.159.69:65000'; // 기본 서버 URL
};

/**
 * 이미지 URL을 정규화하여 완전한 URL로 변환
 * @param imageUrl 이미지 URL (다양한 형태 가능)
 * @returns 완전한 이미지 URL
 */
export const normalizeImageUrl = (imageUrl: any): string => {
  // undefined, null 체크
  if (!imageUrl) {
    return getDefaultImageUrl();
  }
  
  // 배열인 경우 첫 번째 요소 사용
  if (Array.isArray(imageUrl)) {
    if (imageUrl.length > 0 && typeof imageUrl[0] === 'string') {
      return normalizeImageUrl(imageUrl[0]);
    }
    return getDefaultImageUrl();
  }
  
  // 문자열이 아닌 경우
  if (typeof imageUrl !== 'string') {
    return getDefaultImageUrl();
  }
  
  // 이미 웹 URL인 경우 /api/images/를 /api/auctions/images/로 수정
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    // /api/images/를 /api/auctions/images/로 수정
    if (imageUrl.includes('/api/images/') && !imageUrl.includes('/api/auctions/images/')) {
      return imageUrl.replace('/api/images/', '/api/auctions/images/');
    }
    return imageUrl;
  }
  
  // 로컬 파일 경로인 경우 웹 URL로 변환
  if (imageUrl.startsWith('file://')) {
    const filename = imageUrl.split('/').pop();
    return `${getServerUrl()}/uploads/${filename}`;
  }
  
  // 파일명만 있는 경우
  if (imageUrl.includes('.jpg') || imageUrl.includes('.png') || imageUrl.includes('.jpeg')) {
    return `${getServerUrl()}/uploads/${imageUrl}`;
  }
  
  return imageUrl;
};

/**
 * 기본 이미지 URL 반환 (이미지가 없을 때 사용)
 * @returns 기본 이미지 URL
 */
export const getDefaultImageUrl = (): string => {
  return 'https://via.placeholder.com/400x300/cccccc/666666?text=이미지+없음';
};

/**
 * 경매 이미지 배열을 처리하여 정규화된 URL 배열로 변환
 * @param images 이미지 배열 또는 JSON 문자열
 * @returns 정규화된 이미지 URL 배열
 */
export const processAuctionImages = (images: any): string[] => {
  if (!images) {
    return [];
  }
  
  let imageArray: string[] = [];
  
  // 문자열인 경우 JSON 파싱 시도
  if (typeof images === 'string') {
    try {
      imageArray = JSON.parse(images);
    } catch {
      // JSON이 아닌 경우 단일 URL로 처리
      imageArray = [images];
    }
  } else if (Array.isArray(images)) {
    imageArray = images;
  }
  
  // 각 URL을 정규화
  return imageArray.map(url => normalizeImageUrl(url));
};

/**
 * 경매 데이터의 이미지 정보를 포맷팅
 * @param auction 경매 데이터
 * @returns 포맷팅된 경매 데이터 (images, imageUrl 포함)
 */
export const formatAuctionImages = (auction: any) => {
  const images = processAuctionImages(auction.images);
  const imageUrl = images.length > 0 ? images[0] : getDefaultImageUrl();
  
  return {
    ...auction,
    images,
    imageUrl
  };
};

/**
 * 이미지 URL이 유효한지 확인
 * @param imageUrl 이미지 URL
 * @returns 유효성 여부
 */
export const isValidImageUrl = (imageUrl: string): boolean => {
  if (!imageUrl || typeof imageUrl !== 'string') {
    return false;
  }
  
  // 기본 이미지 URL인 경우 유효하지 않음으로 처리
  if (imageUrl.includes('placeholder.com')) {
    return false;
  }
  
  return imageUrl.startsWith('http://') || imageUrl.startsWith('https://');
};
