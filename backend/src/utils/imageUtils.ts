/**
 * 이미지 URL 처리 유틸리티 함수들
 */

import { config } from '../config/env';

// 환경변수에서 서버 URL 가져오기
const getServerUrl = (): string => {
  return config.serverUrl;
};

/**
 * 파일명을 완전한 이미지 URL로 변환
 * @param filename 파일명 (예: "1756922482041_864026841.jpg")
 * @returns 완전한 이미지 URL
 */
export const getImageUrl = (filename: string): string => {
  if (!filename) {
    return getDefaultImageUrl();
  }
  
  // 이미 완전한 URL인 경우 그대로 반환
  if (filename.startsWith('http://') || filename.startsWith('https://')) {
    return filename;
  }
  
  // 파일명만 있는 경우 서버 URL과 결합
  return `${getServerUrl()}/uploads/${filename}`;
};

/**
 * 이미지 URL 배열을 처리하여 완전한 URL 배열로 변환
 * @param imageUrls 이미지 URL 배열 (문자열 또는 배열)
 * @returns 완전한 이미지 URL 배열
 */
export const processImageUrls = (imageUrls: string | string[] | null | undefined): string[] => {
  if (!imageUrls) {
    return [];
  }
  
  let urls: string[] = [];
  
  // 문자열인 경우 JSON 파싱 시도
  if (typeof imageUrls === 'string') {
    try {
      urls = JSON.parse(imageUrls);
    } catch {
      // JSON이 아닌 경우 단일 URL로 처리
      urls = [imageUrls];
    }
  } else if (Array.isArray(imageUrls)) {
    urls = imageUrls;
  }
  
  // 각 URL을 완전한 URL로 변환
  return urls.map(url => getImageUrl(url));
};

/**
 * 기본 이미지 URL 반환 (이미지가 없을 때 사용)
 * @returns 기본 이미지 URL
 */
export const getDefaultImageUrl = (): string => {
  return 'https://via.placeholder.com/400x300/cccccc/666666?text=이미지+없음';
};

/**
 * 이미지 URL에서 파일명 추출
 * @param imageUrl 이미지 URL
 * @returns 파일명
 */
export const extractFilenameFromUrl = (imageUrl: string): string => {
  if (!imageUrl) return '';
  
  // URL에서 파일명 추출
  const urlParts = imageUrl.split('/');
  return urlParts[urlParts.length - 1];
};

/**
 * 로컬 파일 경로를 웹 URL로 변환
 * @param filePath 로컬 파일 경로
 * @returns 웹 URL
 */
export const convertLocalPathToUrl = (filePath: string): string => {
  if (!filePath) return getDefaultImageUrl();
  
  // file:// 프로토콜인 경우
  if (filePath.startsWith('file://')) {
    const filename = filePath.split('/').pop();
    return getImageUrl(filename || '');
  }
  
  // 로컬 경로인 경우
  if (filePath.includes('/uploads/')) {
    const filename = filePath.split('/').pop();
    return getImageUrl(filename || '');
  }
  
  // 파일명만 있는 경우
  if (filePath.includes('.jpg') || filePath.includes('.png') || filePath.includes('.jpeg')) {
    return getImageUrl(filePath);
  }
  
  return filePath;
};

/**
 * 경매 이미지 데이터를 포맷팅
 * @param auction 경매 데이터
 * @returns 포맷팅된 경매 데이터 (images, imageUrl 포함)
 */
export const formatAuctionImages = (auction: any) => {
  const images = processImageUrls(auction.images);
  const imageUrl = images.length > 0 ? images[0] : getDefaultImageUrl();
  
  return {
    ...auction,
    images,
    imageUrl
  };
};
