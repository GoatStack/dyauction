// 백엔드 API 기본 URL
// React Native 시뮬레이터에서는 localhost 대신 127.0.0.1 (iOS) 사용
const API_BASE_URL = __DEV__ 
  ? 'http://192.168.0.36:3000/api'  // iOS 시뮬레이터
  : 'http://192.168.0.36:3000/api';  // 프로덕션

// API 호출 헬퍼 함수
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  console.log('🌐 API 호출:', url, options.method || 'GET');
  
  try {
    // FormData인 경우 Content-Type 헤더를 자동으로 설정하도록 함
    const headers = options.body instanceof FormData 
      ? { ...options.headers }  // FormData는 Content-Type을 자동 설정
      : { 'Content-Type': 'application/json', ...options.headers };
    
    console.log('📤 요청 헤더:', headers);
    if (options.body) {
      console.log('📤 요청 본문 타입:', options.body instanceof FormData ? 'FormData' : 'JSON');
    }
    
    const response = await fetch(url, {
      headers,
      ...options,
    });
    
    console.log('📥 응답 상태:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'API 호출 실패';
      
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorMessage;
      } catch {
        errorMessage = `HTTP ${response.status}: ${errorText}`;
      }
      
      throw new Error(errorMessage);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    } else {
      return response.text();
    }
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
};

// 데이터베이스 초기화 (백엔드 서버 연결 확인)
export const initDatabase = async (): Promise<void> => {
  try {
    // 백엔드 서버 상태 확인 (루트 경로 사용)
    const response = await fetch('http://192.168.0.36:3000/');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    console.log('Backend server connected successfully:', data);
  } catch (error) {
    console.error('Backend server connection failed:', error);
    throw error;
  }
};

// 사용자 관련 API
export const authAPI = {
  // 회원가입
  signup: async (username: string, email: string, password: string, studentId?: string, photo?: any) => {
    // FormData를 사용하여 이미지와 텍스트 데이터 함께 전송
    const formData = new FormData();
    formData.append('username', username);
    formData.append('email', email);
    formData.append('password', password);
    if (studentId) {
      formData.append('studentId', studentId);
    }
    
    if (photo) {
      formData.append('idCardImage', {
        uri: photo.uri,
        type: photo.type || 'image/jpeg',
        name: photo.name || 'id_card.jpg',
      } as any);
    }
    
    return apiCall('/auth/signup', {
      method: 'POST',
      headers: {
        // FormData 사용 시 Content-Type 헤더 제거 (브라우저가 자동 설정)
      },
      body: formData,
    });
  },

  // 로그인
  login: async (email: string, password: string) => {
    return apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },
};

// 경매 관련 API
export const auctionAPI = {
  // 모든 활성 경매 조회
  getActiveAuctions: async () => {
    return apiCall('/auctions');
  },

  // 종료된 경매 조회
  getEndedAuctions: async () => {
    return apiCall('/auctions/ended');
  },

  // 핫한 경매 조회
  getHotAuction: async () => {
    return apiCall('/auctions/hot');
  },

  // 특정 경매 조회
  getAuction: async (id: string) => {
    return apiCall(`/auctions/${id}`);
  },

  // 새 경매 생성
  createAuction: async (data: {
    title: string;
    description: string;
    startingPrice: number;
    endTime?: string;
  }, token: string) => {
    return apiCall('/auctions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
  },

  // 입찰
  createBid: async (auctionId: string, amount: number, token: string) => {
    return apiCall(`/auctions/${auctionId}/bid`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ amount }),
    });
  },

  // 경매 종료
  endAuction: async (auctionId: string, token: string) => {
    return apiCall(`/auctions/${auctionId}/end`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },
};

// 사용자 관련 API
export const userAPI = {
  // 프로필 조회
  getProfile: async (token: string) => {
    return apiCall('/users/profile', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  // 프로필 업데이트
  updateProfile: async (data: { username?: string; email?: string }, token: string) => {
    return apiCall('/users/profile', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
  },

  // 사용자 경매 조회
  getUserAuctions: async (token: string) => {
    return apiCall('/users/auctions', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  // 사용자 입찰 조회
  getUserBids: async (token: string) => {
    return apiCall('/users/bids', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },
};
